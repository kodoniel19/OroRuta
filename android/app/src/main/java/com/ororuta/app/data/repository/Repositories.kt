package com.ororuta.app.data.repository

import android.content.Context
import android.location.Geocoder
import com.ororuta.app.data.local.dao.*
import com.ororuta.app.data.local.entities.*
import com.ororuta.app.data.remote.OroRutaApi
import com.ororuta.app.domain.models.*
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.net.URLEncoder
import java.util.Locale
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton
import com.ororuta.app.BuildConfig

@Singleton
class TripRepository @Inject constructor(
    private val api: OroRutaApi,
    private val routeDao: RouteDao,
    private val json: Json
) {
    /**
     * Search for jeepney trip options.
     * Primary: backend /trips/search API (uses verified route geometry + loading points).
     * Fallback (when backend unreachable on physical device): local Room-based match
     *   that searches cached routes by destination keyword and synthesises TripOption stubs
     *   so the UI never shows "Can't search while offline" for a fully local device.
     */
    suspend fun searchTrips(
        from: String,
        to: String,
        fromLat: Double? = null,
        fromLng: Double? = null,
        toLat: Double? = null,
        toLng: Double? = null,
        sort: String = "time"
    ): Resource<List<TripOption>> {
        return try {
            val results = api.searchTrips(from, to, fromLat, fromLng, toLat, toLng, sort)
            results.forEach { cachedTripOptions[it.id] = it }
            Resource.Success(results)
        } catch (e: IOException) {
            // Backend unreachable (no adb reverse on physical device, or no Wi-Fi)
            // Attempt a local match from Room-cached routes
            val localTrips = buildLocalTrips(to, toLat, toLng, fromLat, fromLng)
            localTrips.forEach { cachedTripOptions[it.id] = it }
            if (localTrips.isNotEmpty()) {
                Resource.Success(localTrips, isOffline = true)
            } else {

                Resource.Error(
                    "Can't reach OroRuta server. Connect to Wi-Fi or use adb reverse tcp:3000 tcp:3000 while on the same network as your dev machine.",
                    isOffline = true
                )
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Search failed")
        }
    }

    /**
     * Build basic TripOption stubs from locally cached routes that match [destination].
     * Results are sorted by estimated travel time.
     */
    private suspend fun buildLocalTrips(
        destination: String,
        toLat: Double?,
        toLng: Double?,
        fromLat: Double?,
        fromLng: Double?
    ): List<TripOption> {
        val destClean = destination.trim().lowercase()
        if (destClean.length < 2 && toLat == null) return emptyList()

        val fLat = fromLat ?: 8.4822
        val fLng = fromLng ?: 124.6472
        val tLat = toLat ?: 8.4842
        val tLng = toLng ?: 124.6568

        fun haversine(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Double {
            val r = 6371000.0
            val dLat = Math.toRadians(lat2 - lat1)
            val dLng = Math.toRadians(lng2 - lng1)
            val a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                    Math.sin(dLng / 2) * Math.sin(dLng / 2)
            return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        }

        val cleanTokens = destClean
            .replace(Regex("[-–—\\(\\)]"), " ")
            .split("\\s+".toRegex())
            .filter { it.length >= 3 && it !in setOf("main", "campus", "university", "school", "center", "mall", "market", "terminal", "hospital", "area", "park", "plaza") }

        return try {
            val cached = routeDao.getAllSync()
            val matched = cached.mapNotNull { cachedRoute ->
                try { json.decodeFromString<Route>(cachedRoute.jsonData) } catch (_: Exception) { null }
            }.filter { route ->
                route.jeepneyType.equals("Traditional", ignoreCase = true) || route.jeepneyType.isBlank()
            }.filter { route ->
                val candidatePoints = mutableListOf<Pair<Double, Double>>()
                route.terminals.forEach { if (it.lat != 0.0 && it.lng != 0.0) candidatePoints.add(Pair(it.lat, it.lng)) }
                route.stops.forEach { if (it.lat != 0.0 && it.lng != 0.0) candidatePoints.add(Pair(it.lat, it.lng)) }
                route.transfers.forEach { if (it.lat != 0.0 && it.lng != 0.0) candidatePoints.add(Pair(it.lat, it.lng)) }

                val hasStopNearTarget = candidatePoints.any { (lat, lng) ->
                    haversine(tLat, tLng, lat, lng) <= 1200.0
                }
                val hasGeomNearTarget = route.geometries.any { g ->
                    try {
                        val coords = org.json.JSONObject(g.geometry ?: "").getJSONArray("coordinates")
                        (0 until coords.length()).any { i ->
                            val pt = coords.getJSONArray(i)
                            haversine(tLat, tLng, pt.getDouble(1), pt.getDouble(0)) <= 800.0
                        }
                    } catch (_: Exception) { false }
                }
                val textMatch = cleanTokens.isNotEmpty() && cleanTokens.any { token ->
                    route.destination.lowercase().contains(token) ||
                    route.name.lowercase().contains(token) ||
                    route.landmarks.any { it.name.lowercase().contains(token) } ||
                    route.stops.any { it.name.lowercase().contains(token) } ||
                    route.terminals.any { it.name.lowercase().contains(token) }
                }
                hasStopNearTarget || hasGeomNearTarget || textMatch
            }.take(5)

            matched.mapIndexed { idx, route ->
                val stopCandidates = mutableListOf<Triple<String, Double, Double>>()
                route.terminals.filter { it.lat != 0.0 && it.lng != 0.0 }.forEach { stopCandidates.add(Triple(it.name, it.lat, it.lng)) }
                route.stops.filter { it.lat != 0.0 && it.lng != 0.0 && !it.pointType.equals("unloading", true) }.forEach { stopCandidates.add(Triple(it.name, it.lat, it.lng)) }
                route.transfers.filter { it.lat != 0.0 && it.lng != 0.0 }.forEach { stopCandidates.add(Triple(it.name, it.lat, it.lng)) }

                val bestBoarding = stopCandidates.minByOrNull { haversine(fLat, fLng, it.second, it.third) }
                    ?: Triple(route.origin, fLat, fLng)

                val dropCandidates = mutableListOf<Triple<String, Double, Double>>()
                route.terminals.filter { it.lat != 0.0 && it.lng != 0.0 }.forEach { dropCandidates.add(Triple(it.name, it.lat, it.lng)) }
                route.stops.filter { it.lat != 0.0 && it.lng != 0.0 }.forEach { dropCandidates.add(Triple(it.name, it.lat, it.lng)) }
                route.transfers.filter { it.lat != 0.0 && it.lng != 0.0 }.forEach { dropCandidates.add(Triple(it.name, it.lat, it.lng)) }

                val bestDrop = dropCandidates.minByOrNull { haversine(tLat, tLng, it.second, it.third) }
                    ?: Triple(destination.ifBlank { route.destination }, tLat, tLng)

                val walkToBoardDist = haversine(fLat, fLng, bestBoarding.second, bestBoarding.third).toInt()
                val walkFromDropDist = haversine(bestDrop.second, bestDrop.third, tLat, tLng).toInt()
                val rideDistKm = haversine(bestBoarding.second, bestBoarding.third, bestDrop.second, bestDrop.third) / 1000.0
                val totalMeters = walkToBoardDist + (rideDistKm * 1000).toInt() + walkFromDropDist
                val estMins = Math.max(10, (totalMeters / 250.0).toInt())

                val effectiveKm = if (rideDistKm > 0.5) rideDistKm else 4.0
                val fareCalc = com.ororuta.app.domain.fare.TraditionalJeepneyFareService.calculateFareForDistance(
                    distanceKm = effectiveKm,
                    category = com.ororuta.app.domain.fare.PassengerCategory.REGULAR,
                    jeepneyType = route.jeepneyType
                )

                TripOption(
                    id = "local_${route.id}_$idx",
                    originPlaceId = route.id,
                    destinationPlaceId = route.id,
                    minutes = estMins,
                    walkMeters = walkToBoardDist + walkFromDropDist,
                    transfers = 0,
                    direction = "Inbound",
                    status = route.status,
                    boardingName = bestBoarding.first,
                    boardingLat = bestBoarding.second,
                    boardingLng = bestBoarding.third,
                    dropoffName = bestDrop.first,
                    dropoffLat = bestDrop.second,
                    dropoffLng = bestDrop.third,
                    segments = listOf(
                        TripSegment(
                            tripOptionId = "local_${route.id}_$idx",
                            seq = 1,
                            routeId = route.id,
                            code = route.code,
                            routeName = route.name,
                            color = route.color,
                            jeepneyType = route.jeepneyType,
                            routeStatus = route.status,
                            km = effectiveKm,
                            minutes = estMins,
                            fare = fareCalc.regularFare,
                            discountFare = fareCalc.discountedFare
                        )
                    ),
                    totalKm = effectiveKm,
                    regularFare = fareCalc.regularFare,
                    discountFare = fareCalc.discountedFare,
                    isEstimatedFare = true
                )
            }
        } catch (_: Exception) {
            emptyList()
        }
    }

    private val cachedTripOptions = java.util.concurrent.ConcurrentHashMap<String, TripOption>()

    fun cacheTripOption(option: TripOption) {
        cachedTripOptions[option.id] = option
    }

    suspend fun getTripOption(id: String): Resource<TripOption> {
        cachedTripOptions[id]?.let { return Resource.Success(it) }
        return try {
            val trip = api.getTrip(id)
            cachedTripOptions[trip.id] = trip
            Resource.Success(trip)
        } catch (e: IOException) {
            Resource.Error("You're offline. Cannot load trip details.", isOffline = true)
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Failed to load trip option")
        }
    }


    suspend fun recordCompleted(tripOptionId: String?) {
        try { api.recordCompleted(mapOf("tripOptionId" to (tripOptionId ?: ""))) } catch (_: Exception) {}
    }
}

@Singleton
class PlaceRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val api: OroRutaApi,
    private val dao: PlaceDao,
    private val okHttpClient: OkHttpClient,
    private val json: Json
) {
    companion object {
        val CURATED_CDO_LANDMARKS = listOf(
            Place("pl-limketkai", "Limketkai Center", "Lapasan", "mall", 124.65600665305024, 8.481879913395911, 8.481879913395911, 124.65600665305024),
            Place("pl-sm-downtown", "SM CDO Downtown Premier", "Lapasan", "mall", 124.65492954347054, 8.484385998039096, 8.484385998039096, 124.65492954347054),
            Place("pl-centrio", "Centrio Mall", "Poblacion", "mall", 124.65132166064039, 8.48569470716317, 8.48569470716317, 124.65132166064039),
            Place("pl-cogon", "Cogon Market", "Cogon", "market", 124.65120822163647, 8.477160465033135, 8.477160465033135, 124.65120822163647),
            Place("pl-carmen", "Carmen Public Market", "Carmen", "market", 124.63681954401368, 8.479497843594105, 8.479497843594105, 124.63681954401368),
            Place("pl-patag", "Camp Evangelista", "Patag", "military", 124.625586, 8.487848, 8.487848, 124.625586),
            Place("pl-cathedral", "St. Augustine Metropolitan Cathedral", "Poblacion", "landmark", 124.6433, 8.4777, 8.4777, 124.6433),
            Place("pl-miami-inn", "Miami Inn Carmen", "Carmen", "landmark", 124.637633, 8.477285, 8.477285, 124.637633),
            Place("pl-madonna-hospital", "Madonna and Child Hospital", "Carmen", "hospital", 124.6352344, 8.4772152, 8.4772152, 124.6352344)
        )

        private val LANDMARK_ALIASES = mapOf(
            "pl-limketkai" to listOf("limketkai", "limkdtkai", "ketkai", "limket", "limketkai mall", "limketkai center"),
            "pl-sm-downtown" to listOf("sm downtown", "sm cdo downtown", "sm premier", "sm downtown premier", "smdt", "sm cd downtown", "sm cdo", "sm premier cdo"),
            "pl-centrio" to listOf("centrio", "ayala centrio", "centrio mall", "ayala mall"),
            "pl-cogon" to listOf("cogon", "cogon market", "cogon public market", "palengke cogon"),
            "pl-cathedral" to listOf("cathedral", "st augustine", "san agustin", "st. augustine cathedral", "san agustin church"),
            "pl-miami-inn" to listOf("miami inn", "miami inn carmen", "vamenta miami", "miami carmen"),
            "pl-madonna-hospital" to listOf("madonna", "madonna hospital", "madonna & child", "madonna and child", "madonna & child hospital", "madonna and child hospital")
        )
    }

    /**
     * Search places across CDO using:
     * 1. Curated verified CDO landmarks with typo/alias tolerance
     * 2. Backend /places API results + Room offline cache
     * 3. Google Maps Places API Autocomplete (when enabled)
     * 4. OpenStreetMap Nominatim Geocoding API bounded to Cagayan de Oro
     * 5. Android Geocoder fallback
     */
    @Suppress("DEPRECATION")
    suspend fun search(q: String, filter: String = "all"): Resource<List<Place>> = withContext(Dispatchers.IO) {
        val cleanQ = q.trim().lowercase()

        // 1. Check curated key CDO landmarks (instant offline guarantee)
        val curatedMatches = mutableListOf<Place>()
        if (cleanQ.isNotBlank()) {
            for ((id, aliases) in LANDMARK_ALIASES) {
                if (aliases.any { it.contains(cleanQ) || cleanQ.contains(it) || (cleanQ.length >= 4 && it.take(4) == cleanQ.take(4)) }) {
                    CURATED_CDO_LANDMARKS.find { it.id == id }?.let { curatedMatches.add(it) }
                }
            }
        } else if (filter == "all" || filter == "landmarks") {
            curatedMatches.addAll(CURATED_CDO_LANDMARKS)
        }

        // 2. Query backend /places API (or SQLite cache if offline)
        val apiResults = try {
            val results = api.getPlaces(cleanQ, filter = filter)
            val seen = mutableSetOf<String>()
            val unique = results.filter { seen.add(it.name.trim().lowercase()) }
            dao.insertAll(unique.map { CachedPlace(it.id, it.name, it.area, it.kind, it.mapX, it.mapY, it.lat, it.lng) })
            unique
        } catch (e: IOException) {
            val cached = dao.search(cleanQ)
            val seen = mutableSetOf<String>()
            cached.filter { seen.add(it.name.trim().lowercase()) }
                .map { Place(it.id, it.name, it.area, it.kind, it.mapX, it.mapY, it.lat, it.lng) }
        } catch (e: Exception) {
            emptyList()
        }

        // 3. Online geocoding & place search (Nominatim & Places API) when typing 2+ characters
        val onlinePlaces = mutableListOf<Place>()
        if (cleanQ.length >= 2) {
            // A. OpenStreetMap Nominatim bounded to Cagayan de Oro
            try {
                val encodedQ = URLEncoder.encode(cleanQ, "UTF-8")
                val nomUrl = "https://nominatim.openstreetmap.org/search?q=$encodedQ&viewbox=124.40,8.65,124.85,8.30&countrycodes=ph&format=json&addressdetails=1&limit=8"
                val request = Request.Builder()
                    .url(nomUrl)
                    .header("User-Agent", "OroRuta/1.0 (transit@ororuta.ph)")
                    .build()
                val response = okHttpClient.newCall(request).execute()
                if (response.isSuccessful) {
                    val bodyStr = response.body?.string()
                    if (!bodyStr.isNullOrBlank()) {
                        val array = JSONArray(bodyStr)
                        for (i in 0 until array.length()) {
                            val obj = array.getJSONObject(i)
                            val lat = obj.optDouble("lat", 0.0)
                            val lon = obj.optDouble("lon", 0.0)
                            if (lat in 8.30..8.65 && lon in 124.45..124.85) {
                                val rawName = obj.optString("name").ifBlank {
                                    obj.optString("display_name").split(",").firstOrNull()?.trim() ?: cleanQ
                                }
                                val addrObj = obj.optJSONObject("address")
                                val area = addrObj?.optString("suburb")?.ifBlank { null }
                                    ?: addrObj?.optString("neighbourhood")?.ifBlank { null }
                                    ?: addrObj?.optString("quarter")?.ifBlank { null }
                                    ?: addrObj?.optString("city")?.ifBlank { null }
                                    ?: "Cagayan de Oro City"
                                val rawType = obj.optString("type", "")
                                val rawClass = obj.optString("class", "")
                                val kind = when {
                                    rawType.contains("hospital", true) || rawName.contains("Hospital", true) -> "hospital"
                                    rawType.contains("mall", true) || rawClass.contains("shop", true) || rawName.contains("Mall", true) || rawName.contains("SM", true) -> "mall"
                                    rawType.contains("school", true) || rawType.contains("university", true) || rawType.contains("college", true) || rawName.contains("School", true) || rawName.contains("University", true) -> "school"
                                    rawType.contains("market", true) || rawName.contains("Market", true) -> "market"
                                    rawType.contains("bus", true) || rawType.contains("terminal", true) || rawName.contains("Terminal", true) -> "terminal"
                                    rawType.contains("highway", true) || rawType.contains("residential", true) || rawClass.contains("highway", true) || rawName.contains("Street", true) || rawName.contains("Avenue", true) || rawName.contains("Road", true) -> "street"
                                    rawType.contains("church", true) || rawName.contains("Cathedral", true) || rawName.contains("Church", true) -> "church"
                                    else -> "landmark"
                                }
                                onlinePlaces.add(
                                    Place(
                                        id = "geo_${lat}_${lon}",
                                        name = rawName,
                                        area = area,
                                        kind = kind,
                                        mapX = lon,
                                        mapY = lat,
                                        lat = lat,
                                        lng = lon
                                    )
                                )
                            }
                        }
                    }
                }
            } catch (_: Exception) {}

            // B. Android System Geocoder fallback for street addresses
            try {
                val geocoder = Geocoder(context, Locale.getDefault())
                val addresses = geocoder.getFromLocationName("$cleanQ, Cagayan de Oro", 5, 8.35, 124.50, 8.60, 124.80)
                addresses?.filter { addr ->
                    addr.hasLatitude() && addr.hasLongitude() &&
                    addr.latitude in 8.30..8.65 && addr.longitude in 124.45..124.85
                }?.forEach { addr ->
                    val rawName = addr.featureName ?: addr.thoroughfare ?: addr.subLocality ?: addr.locality ?: return@forEach
                    val lower = rawName.trim().lowercase()
                    if ((lower == "cagayan de oro" || lower == "cagayan de oro city" || lower == "misamis oriental") &&
                        !cleanQ.contains("cagayan") && !cleanQ.contains("cdo") && !cleanQ.contains("oro")) {
                        return@forEach
                    }
                    val area = addr.subLocality ?: addr.locality ?: "Cagayan de Oro City"
                    onlinePlaces.add(
                        Place(
                            id = "geoc_${addr.latitude}_${addr.longitude}",
                            name = rawName,
                            area = area,
                            kind = "street",
                            mapX = addr.longitude,
                            mapY = addr.latitude,
                            lat = addr.latitude,
                            lng = addr.longitude
                        )
                    )
                }
            } catch (_: Exception) {}
        }

        // 4. Merge, deduplicate by normalized name and close proximity
        val combined = (curatedMatches + apiResults + onlinePlaces)
        val seenNames = mutableSetOf<String>()
        val seenCoords = mutableListOf<Pair<Double, Double>>()
        val uniquePlaces = mutableListOf<Place>()

        for (p in combined) {
            if (p.lat == 0.0 || p.lng == 0.0) continue
            val normName = p.name.trim().lowercase()
            val isDuplicateCoord = seenCoords.any { (lat, lng) ->
                Math.abs(lat - p.lat) < 0.0003 && Math.abs(lng - p.lng) < 0.0003
            }
            if (seenNames.add(normName) && !isDuplicateCoord) {
                seenCoords.add(Pair(p.lat, p.lng))
                uniquePlaces.add(p)
            }
        }

        // Cache any new geocoded places in Room for offline resilience
        if (uniquePlaces.isNotEmpty()) {
            try {
                dao.insertAll(uniquePlaces.map { CachedPlace(it.id, it.name, it.area, it.kind, it.mapX, it.mapY, it.lat, it.lng) })
            } catch (_: Exception) {}
        }

        if (uniquePlaces.isNotEmpty()) {
            Resource.Success(uniquePlaces)
        } else {
            Resource.Error("No matching places found. Try searching by landmark, hospital, mall, market, or street name.")
        }
    }
}

@Singleton
class AnnouncementRepository @Inject constructor(
    private val api: OroRutaApi,
    private val dao: AnnouncementDao,
    private val json: Json
) {
    fun getAnnouncements(status: String? = null): Flow<Resource<List<Announcement>>> = flow {
        emit(Resource.Loading)
        val queryStatus = status?.takeIf { it.isNotBlank() } ?: ""
        try {
            val remote = api.getAnnouncements(queryStatus)
            dao.insertAll(remote.map {
                CachedAnnouncement(
                    id = it.id,
                    title = it.title,
                    date = it.date,
                    category = it.category,
                    status = it.status,
                    jsonData = json.encodeToString(it)
                )
            })
            emit(Resource.Success(remote))
        } catch (e: IOException) {
            val cached = if (queryStatus.isNotBlank()) dao.getByStatusSync(queryStatus) else dao.getAllSync()
            if (cached.isNotEmpty()) {
                val list = cached.mapNotNull { safeDecode(it) }
                emit(Resource.Success(list, isOffline = true))
            } else {
                emit(Resource.Error("You are offline. Connect to the internet to load transportation updates.", isOffline = true))
            }
        } catch (e: Exception) {
            val cached = if (queryStatus.isNotBlank()) dao.getByStatusSync(queryStatus) else dao.getAllSync()
            if (cached.isNotEmpty()) {
                val list = cached.mapNotNull { safeDecode(it) }
                emit(Resource.Success(list, isOffline = true))
            } else {
                emit(Resource.Error(e.message ?: "Could not load updates"))
            }
        }
    }

    suspend fun getAnnouncement(id: String): Resource<Announcement> = try {
        Resource.Success(api.getAnnouncement(id))
    } catch (e: Exception) { Resource.Error(e.message ?: "Error") }

    private fun safeDecode(cached: CachedAnnouncement): Announcement? {
        return try {
            if (cached.jsonData.isNotBlank()) {
                json.decodeFromString<Announcement>(cached.jsonData)
            } else {
                Announcement(id = cached.id, title = cached.title, date = cached.date, category = cached.category, status = cached.status)
            }
        } catch (_: Exception) {
            Announcement(id = cached.id, title = cached.title, date = cached.date, category = cached.category, status = cached.status)
        }
    }
}

@Singleton
class HistoryRepository @Inject constructor(
    private val api: OroRutaApi, private val dao: HistoryDao
) {
    fun getHistory(): Flow<List<LocalHistory>> = dao.getAll().map { list ->
        // Deduplicate in-memory by normalized (from, to) to guarantee zero UI duplicates
        val seen = mutableSetOf<String>()
        val result = mutableListOf<LocalHistory>()
        for (item in list) {
            val key = "${item.from.trim().lowercase()}->${item.to.trim().lowercase()}"
            if (seen.add(key)) {
                result.add(item)
            }
        }
        result.take(10)
    }

    suspend fun add(from: String, to: String) {
        val cleanFrom = from.trim()
        val cleanTo = to.trim()
        if (cleanFrom.isBlank() || cleanTo.isBlank()) return

        try { api.addHistory(mapOf("from" to cleanFrom, "to" to cleanTo)) } catch (_: Exception) {}

        val existing = dao.findExact(cleanFrom, cleanTo)
        if (existing != null) {
            val now = System.currentTimeMillis()
            dao.updateTimestamp(existing.id, now)
            dao.deleteDuplicates(cleanFrom, cleanTo, existing.id)
        } else {
            val deterministicId = UUID.nameUUIDFromBytes("${cleanFrom.lowercase()}->${cleanTo.lowercase()}".toByteArray()).toString()
            dao.insert(LocalHistory(deterministicId, cleanFrom, cleanTo, System.currentTimeMillis()))
        }
        dao.pruneOld(10)
    }

    suspend fun delete(id: String) {
        try { api.deleteHistory(id) } catch (_: Exception) {}
        dao.delete(id)
    }

    suspend fun clearAll() {
        try { api.clearHistory() } catch (_: Exception) {}
        dao.clearAll()
    }
}

@Singleton
class SavedRepository @Inject constructor(
    private val api: OroRutaApi,
    private val tripsDao: SavedTripsDao
) {
    fun getSavedTrips(): Flow<List<LocalSavedTrip>> = tripsDao.getAll()

    suspend fun saveTrip(fromLabel: String, toLabel: String, routeIds: List<String>, tripOptionId: String?): Resource<String> {
        return try {
            val resp = api.saveTrip(mapOf("fromLabel" to fromLabel, "toLabel" to toLabel,
                "routeIds" to routeIds, "tripOptionId" to (tripOptionId ?: "")))
            val id = resp["id"] ?: UUID.randomUUID().toString()
            tripsDao.insert(LocalSavedTrip(id, fromLabel, toLabel, routeIds.joinToString(","), tripOptionId))
            Resource.Success(id)
        } catch (e: Exception) {
            val id = UUID.randomUUID().toString()
            tripsDao.insert(LocalSavedTrip(id, fromLabel, toLabel, routeIds.joinToString(","), tripOptionId))
            Resource.Success(id)
        }
    }

    suspend fun deleteTrip(id: String) {
        try { api.deleteSavedTrip(id) } catch (_: Exception) {}
        tripsDao.delete(id)
    }
}

@Singleton
class ReportRepository @Inject constructor(
    private val api: OroRutaApi, private val dao: PendingReportDao
) {
    suspend fun submit(type: String, description: String, locationText: String?, lat: Double?, lng: Double?): Resource<ReportResponse> {
        return try {
            val resp = api.submitReport(ReportSubmission(type, description, locationText, lat, lng))
            Resource.Success(resp)
        } catch (e: IOException) {
            // Queue for later
            dao.insert(PendingReport(UUID.randomUUID().toString(), type, description, locationText, lat, lng))
            Resource.Error("Report queued — will be sent when you are back online.", isOffline = true)
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Submission failed")
        }
    }
}

@Singleton
class ContentRepository @Inject constructor(private val api: OroRutaApi) {
    suspend fun getPage(slug: String): Resource<ContentPage> = try {
        Resource.Success(api.getContent(slug))
    } catch (e: Exception) { Resource.Error(e.message ?: "Error") }

    suspend fun getHelpTopics(): Resource<List<HelpTopic>> = try {
        Resource.Success(api.getHelpTopics())
    } catch (e: Exception) { Resource.Error(e.message ?: "Error") }

    suspend fun getFaqs(): Resource<List<Faq>> = try {
        Resource.Success(api.getFaqs())
    } catch (e: Exception) { Resource.Error(e.message ?: "Error") }
}

@Singleton
class FareRepository @Inject constructor(private val api: OroRutaApi) {
    suspend fun getRules(): Resource<List<FareRule>> = try {
        Resource.Success(api.getFareRules())
    } catch (e: Exception) { Resource.Error(e.message ?: "Error") }

    suspend fun estimate(routeId: String? = null, optionId: String? = null, category: String = "Regular"): Resource<FareEstimate> = try {
        Resource.Success(api.estimateFare(routeId, optionId, category))
    } catch (e: Exception) { Resource.Error(e.message ?: "Error") }
}

@Singleton
class NearbyRepository @Inject constructor(private val api: OroRutaApi) {
    suspend fun getNearby(lat: Double?, lng: Double?, kind: String = "route"): Resource<List<NearbyResult>> = try {
        val resp = api.getNearby(lat, lng, kind)
        Resource.Success(resp.results)
    } catch (e: Exception) {
        Resource.Error(e.message ?: "Could not load nearby items")
    }
}

@Singleton
class PreferencesRepository @Inject constructor(private val api: OroRutaApi) {
    suspend fun getPreferences(): Resource<DevicePreferences> = try {
        Resource.Success(api.getPreferences())
    } catch (e: Exception) { Resource.Error(e.message ?: "Error") }

    suspend fun updatePreferences(prefs: Map<String, Any>): Resource<Boolean> = try {
        api.updatePreferences(prefs)
        Resource.Success(true)
    } catch (e: Exception) { Resource.Error(e.message ?: "Error") }
}

