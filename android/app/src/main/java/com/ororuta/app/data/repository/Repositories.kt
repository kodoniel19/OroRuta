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
    /**
     * Build accurate TripOption recommendations from locally cached routes.
     * Uses route geometries and verified stops to ensure correct direction of travel,
     * accurate boarding and drop-off points, and ranks by overall convenience.
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
            val allRoutes = cached.mapNotNull { cachedRoute ->
                try { json.decodeFromString<Route>(cachedRoute.jsonData) } catch (_: Exception) { null }
            }.filter { route ->
                route.jeepneyType.equals("Traditional", ignoreCase = true) || route.jeepneyType.isBlank()
            }

            data class LocalCandidate(
                val route: Route,
                val direction: String,
                val boardingName: String,
                val boardingLat: Double,
                val boardingLng: Double,
                val dropoffName: String,
                val dropoffLat: Double,
                val dropoffLng: Double,
                val rideKm: Double,
                val walkToBoardM: Int,
                val walkFromDropM: Int,
                val totalMinutes: Int,
                val compositeScore: Double,
                val regularFare: Double,
                val discountFare: Double,
                val rideCoords: List<List<Double>>
            )

            val candidateList = mutableListOf<LocalCandidate>()

            for (route in allRoutes) {
                val textMatch = cleanTokens.isNotEmpty() && cleanTokens.any { token ->
                    route.destination.lowercase().contains(token) ||
                    route.name.lowercase().contains(token) ||
                    route.landmarks.any { it.name.lowercase().contains(token) } ||
                    route.stops.any { it.name.lowercase().contains(token) } ||
                    route.terminals.any { it.name.lowercase().contains(token) }
                }

                var routeMatched = false
                for (g in route.geometries) {
                    val dir = g.direction ?: "Inbound"
                    val coords = mutableListOf<Pair<Double, Double>>() // (lat, lng)
                    try {
                        val geoObj = org.json.JSONObject(g.geometry ?: "")
                        val coordArray = geoObj.getJSONArray("coordinates")
                        for (i in 0 until coordArray.length()) {
                            val pt = coordArray.getJSONArray(i)
                            coords.add(Pair(pt.getDouble(1), pt.getDouble(0)))
                        }
                    } catch (_: Exception) {}

                    if (coords.size < 4) continue

                    // Find candidate boarding indices (within 850m of origin)
                    val origIndices = mutableListOf<Pair<Int, Double>>()
                    for (i in coords.indices) {
                        val d = haversine(fLat, fLng, coords[i].first, coords[i].second)
                        if (d <= 850.0) origIndices.add(Pair(i, d))
                    }
                    if (origIndices.isEmpty()) continue

                    // Find candidate drop-off indices (within 750m of destination)
                    val destIndices = mutableListOf<Pair<Int, Double>>()
                    for (i in coords.indices) {
                        val d = haversine(tLat, tLng, coords[i].first, coords[i].second)
                        if (d <= 750.0) destIndices.add(Pair(i, d))
                    }
                    if (destIndices.isEmpty()) continue

                    // Find best valid pair where boardIdx < dropIdx
                    var bestPair: Triple<Int, Int, Double>? = null
                    var minPairCost = Double.MAX_VALUE

                    for (o in origIndices) {
                        for (d in destIndices) {
                            if (o.first >= d.first || (d.first - o.first) < 3) continue
                            val cost = (o.second * 1.2) + (d.second * 2.2)
                            if (cost < minPairCost) {
                                minPairCost = cost
                                bestPair = Triple(o.first, d.first, cost)
                            }
                        }
                    }

                    if (bestPair != null) {
                        val bIdx = bestPair.first
                        val dIdx = bestPair.second
                        val walkBoard = haversine(fLat, fLng, coords[bIdx].first, coords[bIdx].second).toInt()
                        val walkDrop = haversine(tLat, tLng, coords[dIdx].first, coords[dIdx].second).toInt()

                        var polyMeters = 0.0
                        for (k in bIdx until dIdx) {
                            polyMeters += haversine(coords[k].first, coords[k].second, coords[k + 1].first, coords[k + 1].second)
                        }
                        if (polyMeters < 300.0) continue

                        val rideKm = Math.max(0.5, Math.round((polyMeters / 1000.0) * 10.0) / 10.0)
                        val walkMinutesToBoard = Math.max(1, (walkBoard / 75.0).toInt())
                        val walkMinutesFromDrop = Math.max(1, (walkDrop / 75.0).toInt())
                        val rideMinutes = Math.max(3, (rideKm / 18.0 * 60.0).toInt())
                        val totalMinutes = walkMinutesToBoard + walkMinutesFromDrop + rideMinutes

                        val fareCalc = com.ororuta.app.domain.fare.TraditionalJeepneyFareService.calculateFareForDistance(
                            distanceKm = rideKm,
                            category = com.ororuta.app.domain.fare.PassengerCategory.REGULAR,
                            jeepneyType = route.jeepneyType
                        )

                        val dropPenalty = if (walkDrop > 200) Math.pow((walkDrop - 200.0) / 45.0, 1.35) * 3.5 else 0.0
                        val boardPenalty = if (walkBoard > 350) Math.pow((walkBoard - 350.0) / 60.0, 1.2) * 2.0 else 0.0
                        val directBonus = if (textMatch) 10.0 else 0.0
                        val compositeScore = (walkMinutesToBoard * 1.8) + (walkMinutesFromDrop * 2.5) + (rideMinutes * 1.0) + (fareCalc.regularFare * 0.2) + dropPenalty + boardPenalty - directBonus

                        val bStop = route.stops.filter { !it.name.contains("Miami", ignoreCase = true) }.minByOrNull { haversine(coords[bIdx].first, coords[bIdx].second, it.lat, it.lng) }
                        val dStop = route.stops.filter { !it.name.contains("Miami", ignoreCase = true) }.minByOrNull { haversine(coords[dIdx].first, coords[dIdx].second, it.lat, it.lng) }
                        val boardName = bStop?.name?.takeIf { haversine(coords[bIdx].first, coords[bIdx].second, bStop.lat, bStop.lng) <= 120 }
                            ?: "Loading point on ${route.name.take(24)}"
                        val dropName = dStop?.name?.takeIf { haversine(coords[dIdx].first, coords[dIdx].second, dStop.lat, dStop.lng) <= 120 }
                            ?: (if (destination.isNotBlank()) "Stop near $destination" else "Drop-off stop")

                        val rideCoordsSlice = (bIdx..dIdx).map { listOf(coords[it].second, coords[it].first) }

                        candidateList.add(
                            LocalCandidate(
                                route = route,
                                direction = dir,
                                boardingName = boardName,
                                boardingLat = coords[bIdx].first,
                                boardingLng = coords[bIdx].second,
                                dropoffName = dropName,
                                dropoffLat = coords[dIdx].first,
                                dropoffLng = coords[dIdx].second,
                                rideKm = rideKm,
                                walkToBoardM = walkBoard,
                                walkFromDropM = walkDrop,
                                totalMinutes = totalMinutes,
                                compositeScore = compositeScore,
                                regularFare = fareCalc.regularFare,
                                discountFare = fareCalc.discountedFare,
                                rideCoords = rideCoordsSlice
                            )
                        )
                        routeMatched = true
                    }
                }

                if (!routeMatched && textMatch) {
                    val allStops = route.terminals.filter { it.lat != 0.0 && it.lng != 0.0 && !it.name.contains("Miami", ignoreCase = true) }.map { Triple(it.name, it.lat, it.lng) } +
                                   route.stops.filter { it.lat != 0.0 && it.lng != 0.0 && !it.name.contains("Miami", ignoreCase = true) }.map { Triple(it.name, it.lat, it.lng) }
                    val dStop = allStops.minByOrNull { haversine(tLat, tLng, it.second, it.third) }
                    val eligibleBoarding = allStops.filter {
                        dStop != null && haversine(it.second, it.third, dStop.second, dStop.third) > 300.0 &&
                        !it.first.equals(dStop.first, ignoreCase = true)
                    }
                    val bStop = eligibleBoarding.minByOrNull { haversine(fLat, fLng, it.second, it.third) }

                    if (bStop != null && dStop != null) {
                        val walkBoard = haversine(fLat, fLng, bStop.second, bStop.third).toInt()
                        val walkDrop = haversine(tLat, tLng, dStop.second, dStop.third).toInt()
                        if (walkBoard <= 850 && walkDrop <= 750) {
                            val straightKm = haversine(bStop.second, bStop.third, dStop.second, dStop.third) / 1000.0 * 1.3
                            val rideKm = Math.max(1.0, Math.round(straightKm * 10.0) / 10.0)
                            val walkMinutes = Math.max(1, ((walkBoard + walkDrop) / 75.0).toInt())
                            val rideMinutes = Math.max(3, (rideKm / 18.0 * 60.0).toInt())
                            val fareCalc = com.ororuta.app.domain.fare.TraditionalJeepneyFareService.calculateFareForDistance(
                                distanceKm = rideKm,
                                category = com.ororuta.app.domain.fare.PassengerCategory.REGULAR,
                                jeepneyType = route.jeepneyType
                            )
                            val compScore = (walkMinutes * 2.0) + rideMinutes + (fareCalc.regularFare * 0.2)
                            candidateList.add(
                                LocalCandidate(
                                    route = route,
                                    direction = "Inbound",
                                    boardingName = bStop.first,
                                    boardingLat = bStop.second,
                                    boardingLng = bStop.third,
                                    dropoffName = dStop.first,
                                    dropoffLat = dStop.second,
                                    dropoffLng = dStop.third,
                                    rideKm = rideKm,
                                    walkToBoardM = walkBoard,
                                    walkFromDropM = walkDrop,
                                    totalMinutes = walkMinutes + rideMinutes,
                                    compositeScore = compScore,
                                    regularFare = fareCalc.regularFare,
                                    discountFare = fareCalc.discountedFare,
                                    rideCoords = listOf(listOf(bStop.third, bStop.second), listOf(dStop.third, dStop.second))
                                )
                            )
                        }
                    }
                }
            }

            // Deduplicate by route code, keeping lowest compositeScore
            val bestByCode = mutableMapOf<String, LocalCandidate>()
            for (c in candidateList) {
                val key = c.route.code
                if (!bestByCode.containsKey(key) || c.compositeScore < bestByCode[key]!!.compositeScore) {
                    bestByCode[key] = c
                }
            }

            // Filter out options with excessive dropoff walk (> 500m) if close option (<= 300m) exists
            val hasCloseOption = bestByCode.values.any { it.walkFromDropM <= 300 }
            val viableCandidates = if (hasCloseOption) {
                bestByCode.values.filter { it.walkFromDropM <= 500 }
            } else {
                bestByCode.values.toList()
            }

            // Sort by convenience: compositeScore ranks the most convenient and accurate route first!
            val sorted = viableCandidates.sortedBy { it.compositeScore }.take(5)

            sorted.mapIndexed { idx, cand ->
                TripOption(
                    id = "local_${cand.route.id}_$idx",
                    originPlaceId = cand.route.id,
                    destinationPlaceId = cand.route.id,
                    minutes = cand.totalMinutes,
                    walkMeters = cand.walkToBoardM + cand.walkFromDropM,
                    transfers = 0,
                    direction = cand.direction,
                    status = cand.route.status,
                    boardingName = cand.boardingName,
                    boardingLat = cand.boardingLat,
                    boardingLng = cand.boardingLng,
                    dropoffName = cand.dropoffName,
                    dropoffLat = cand.dropoffLat,
                    dropoffLng = cand.dropoffLng,
                    jeepneyCoordinates = cand.rideCoords,
                    segments = listOf(
                        TripSegment(
                            tripOptionId = "local_${cand.route.id}_$idx",
                            seq = 1,
                            routeId = cand.route.id,
                            code = cand.route.code,
                            routeName = cand.route.name,
                            color = cand.route.color,
                            jeepneyType = cand.route.jeepneyType,
                            routeStatus = cand.route.status,
                            km = cand.rideKm,
                            minutes = cand.totalMinutes,
                            fare = cand.regularFare,
                            discountFare = cand.discountFare
                        )
                    ),
                    totalKm = cand.rideKm,
                    regularFare = cand.regularFare,
                    discountFare = cand.discountFare,
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
            Place("pl-madonna-hospital", "Madonna and Child Hospital", "Carmen", "hospital", 124.6352344, 8.4772152, 8.4772152, 124.6352344),
            Place("pl-agora", "Agora Terminal", "Lapasan", "terminal", 124.6589, 8.4857, 8.4857, 124.6589),
            Place("pl-bulua", "Bulua Terminal", "Bulua", "terminal", 124.6115, 8.5040, 8.5040, 124.6115),
            Place("pl-liceo", "Liceo de Cagayan University", "Kauswagan", "school", 124.6407, 8.4965, 8.4965, 124.6407),
            Place("pl-xavier", "Xavier University", "Poblacion", "school", 124.6489, 8.4784, 8.4784, 124.6489),
            Place("pl-ustp", "USTP Lapasan", "Lapasan", "school", 124.6572, 8.4852, 8.4852, 124.6572),
            Place("pl-nmmc", "NMMC", "Poblacion", "hospital", 124.6468, 8.4875, 8.4875, 124.6468),
            Place("pl-polymedic", "Cagayan de Oro Polymedic Plaza", "Kauswagan", "hospital", 124.6305, 8.4940, 8.4940, 124.6305),
            Place("pl-sm-uptown", "SM CDO Uptown", "Upper Carmen", "mall", 124.6225, 8.4578, 8.4578, 124.6225),
            Place("pl-gaisano", "Gaisano City Mall", "Lapasan", "mall", 124.6515, 8.4842, 8.4842, 124.6515)
        )

        private val LANDMARK_ALIASES = mapOf(
            "pl-limketkai" to listOf("limketkai", "limkdtkai", "ketkai", "limket", "limketkai mall", "limketkai center"),
            "pl-sm-downtown" to listOf("sm downtown", "sm cdo downtown", "sm premier", "sm downtown premier", "smdt", "sm cd downtown", "sm cdo", "sm premier cdo"),
            "pl-centrio" to listOf("centrio", "ayala centrio", "centrio mall", "ayala mall"),
            "pl-cogon" to listOf("cogon", "cogon market", "cogon public market", "palengke cogon"),
            "pl-cathedral" to listOf("cathedral", "st augustine", "san agustin", "st. augustine cathedral", "san agustin church"),
            "pl-miami-inn" to listOf("miami inn", "miami inn carmen", "vamenta miami", "miami carmen"),
            "pl-madonna-hospital" to listOf("madonna", "madonna hospital", "madonna & child", "madonna and child", "madonna & child hospital", "madonna and child hospital"),
            "pl-agora" to listOf("agora", "agora terminal", "agora market", "eastbound terminal"),
            "pl-bulua" to listOf("bulua", "bulua terminal", "wtpm", "westbound", "westbound terminal"),
            "pl-liceo" to listOf("liceo", "liceo university", "liceo main", "liceo de cagayan", "ldcu"),
            "pl-xavier" to listOf("xavier", "xu", "ateneo", "ateneo de cagayan", "xavier university"),
            "pl-ustp" to listOf("ustp", "must", "ustp lapasan"),
            "pl-nmmc" to listOf("nmmc", "provincial hospital", "northern mindanao medical center"),
            "pl-polymedic" to listOf("polymedic", "polymedic plaza", "polymedic kauswagan"),
            "pl-sm-uptown" to listOf("sm uptown", "sm cdo uptown", "uptown sm"),
            "pl-gaisano" to listOf("gaisano", "gaisano city", "gaisano mall")
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

