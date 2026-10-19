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
import java.io.IOException
import java.util.Locale
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

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
            Resource.Success(results)
        } catch (e: IOException) {
            // Backend unreachable (no adb reverse on physical device, or no Wi-Fi)
            // Attempt a local match from Room-cached routes
            val localTrips = buildLocalTrips(to, toLat, toLng)
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
    private suspend fun buildLocalTrips(destination: String, toLat: Double?, toLng: Double?): List<TripOption> {
        val destClean = destination.trim().lowercase()
        if (destClean.length < 2) return emptyList()

        return try {
            val cached = routeDao.getAllSync()
            val matched = cached.mapNotNull { cachedRoute ->
                try { json.decodeFromString<Route>(cachedRoute.jsonData) } catch (_: Exception) { null }
            }.filter { route ->
                route.jeepneyType.equals("Traditional", ignoreCase = true) || route.jeepneyType.isBlank()
            }.filter { route ->
                val inDest = route.destination.lowercase().contains(destClean) || destClean.contains(route.destination.lowercase())
                val inOrigin = route.origin.lowercase().contains(destClean) || destClean.contains(route.origin.lowercase())
                val inLandmarks = route.landmarks.any { it.name.lowercase().contains(destClean) || destClean.contains(it.name.lowercase()) }
                val inStops = route.stops.any { it.name.lowercase().contains(destClean) || destClean.contains(it.name.lowercase()) }
                val inTerminals = route.terminals.any { it.name.lowercase().contains(destClean) || destClean.contains(it.name.lowercase()) }
                inDest || inOrigin || inLandmarks || inStops || inTerminals
            }.take(5)

            matched.mapIndexed { idx, route ->
                val dropoffTerminal = route.terminals.firstOrNull { it.name.lowercase().contains(destClean) }
                    ?: route.terminals.lastOrNull()
                val boardingTerminal = route.terminals.firstOrNull()
                TripOption(
                    id = "local_${route.id}_$idx",
                    originPlaceId = route.id,
                    destinationPlaceId = route.id,
                    minutes = route.travelTime,
                    walkMeters = 300,
                    transfers = 0,
                    direction = "Inbound",
                    status = route.status,
                    boardingName = boardingTerminal?.name ?: route.origin,
                    boardingLat = boardingTerminal?.lat,
                    boardingLng = boardingTerminal?.lng,
                    dropoffName = dropoffTerminal?.name ?: route.destination,
                    dropoffLat = dropoffTerminal?.lat ?: toLat,
                    dropoffLng = dropoffTerminal?.lng ?: toLng,
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
                            km = route.lengthKm
                        )
                    ),
                    totalKm = route.lengthKm,
                    regularFare = route.fare,
                    discountFare = route.fare * 0.8
                )
            }
        } catch (_: Exception) {
            emptyList()
        }
    }

    suspend fun getTripOption(id: String): Resource<TripOption> {
        return try {
            val trip = api.getTrip(id)
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
    private val dao: PlaceDao
) {
    companion object {
        val CURATED_CDO_LANDMARKS = listOf(
            Place("pl-limketkai", "Limketkai Center", "Lapasan", "mall", 124.6568, 8.4842, 8.4842, 124.6568),
            Place("pl-sm-downtown", "SM CDO Downtown Premier", "Lapasan", "mall", 124.6535, 8.4855, 8.4855, 124.6535),
            Place("pl-centrio", "Centrio Mall", "Poblacion", "mall", 124.6517, 8.4877, 8.4877, 124.6517),
            Place("pl-cogon", "Cogon Market", "Cogon", "market", 124.6497, 8.4735, 8.4735, 124.6497),
            Place("pl-cathedral", "St. Augustine Metropolitan Cathedral", "Poblacion", "landmark", 124.6433, 8.4777, 8.4777, 124.6433),
            Place("pl-miami-inn", "Miami Inn Carmen", "Carmen", "landmark", 124.637633, 8.477285, 8.477285, 124.637633)
        )

        private val LANDMARK_ALIASES = mapOf(
            "pl-limketkai" to listOf("limketkai", "limkdtkai", "ketkai", "limket"),
            "pl-sm-downtown" to listOf("sm downtown", "sm cdo downtown", "sm premier", "smdt", "sm cd downtown"),
            "pl-centrio" to listOf("centrio", "ayala centrio", "centrio mall"),
            "pl-cogon" to listOf("cogon", "cogon market", "cogon public market"),
            "pl-cathedral" to listOf("cathedral", "st augustine", "san agustin", "st. augustine cathedral"),
            "pl-miami-inn" to listOf("miami inn", "miami inn carmen", "vamenta miami")
        )
    }

    /**
     * Search places. Merges:
     * 1. Backend /places API results (includes fuzzy and alias matching)
     * 2. Curated key CDO landmarks (offline fallback & destination suggestions)
     * 3. Room cache (offline fallback)
     * 4. Android Geocoder results for free-text searches within CDO bounds
     */
    @Suppress("DEPRECATION")
    suspend fun search(q: String, filter: String = "all"): Resource<List<Place>> {
        val cleanQ = q.trim().lowercase()

        val apiResults = try {
            val results = api.getPlaces(cleanQ, filter = filter)
            val seen = mutableSetOf<String>()
            val unique = results.filter { seen.add(it.name.trim().lowercase()) }
            // Only upsert, not clear — prevents cache thrash on every keystroke
            dao.insertAll(unique.map { CachedPlace(it.id, it.name, it.area, it.kind, it.mapX, it.mapY, it.lat, it.lng) })
            unique
        } catch (e: IOException) {
            // Offline: serve cache
            val cached = dao.search(cleanQ)
            val seen = mutableSetOf<String>()
            cached.filter { seen.add(it.name.trim().lowercase()) }
                .map { Place(it.id, it.name, it.area, it.kind, it.mapX, it.mapY, it.lat, it.lng) }
        } catch (e: Exception) {
            emptyList()
        }

        // Check curated landmark matches if API returned empty or for offline typo matching
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

        // Geocoder fallback for free-text searches 2+ chars not already covered by API / curated results
        val geocoderResults = if (cleanQ.length >= 2 && apiResults.isEmpty() && curatedMatches.isEmpty()) {
            try {
                val geocoder = Geocoder(context, Locale.getDefault())
                // Search within CDO bounds: 8.35–8.60 N, 124.50–124.80 E
                val addresses = geocoder.getFromLocationName("$cleanQ, Cagayan de Oro", 5, 8.35, 124.50, 8.60, 124.80)
                val existingNames = (apiResults + curatedMatches).map { it.name.trim().lowercase() }.toSet()
                addresses
                    ?.filter { addr ->
                        addr.hasLatitude() && addr.hasLongitude()
                        && addr.latitude in 8.30..8.65
                        && addr.longitude in 124.45..124.85
                    }
                    ?.mapNotNull { addr ->
                        val rawName = addr.featureName ?: addr.thoroughfare ?: addr.subLocality ?: addr.locality ?: return@mapNotNull null
                        // Filter out generic city-wide results when user didn't search for "cagayan" or "cdo"
                        val lowerRaw = rawName.trim().lowercase()
                        if ((lowerRaw == "cagayan de oro" || lowerRaw == "cagayan de oro city" || lowerRaw == "misamis oriental")
                            && !cleanQ.contains("cagayan") && !cleanQ.contains("cdo") && !cleanQ.contains("oro")) {
                            return@mapNotNull null
                        }
                        val area = addr.subLocality ?: addr.locality ?: "Cagayan de Oro City"
                        if (lowerRaw in existingNames) return@mapNotNull null
                        Place(
                            id = "geo_${addr.latitude}_${addr.longitude}",
                            name = rawName,
                            area = area,
                            kind = "landmark",
                            mapX = addr.longitude,
                            mapY = addr.latitude,
                            lat = addr.latitude,
                            lng = addr.longitude
                        )
                    } ?: emptyList()
            } catch (_: Exception) {
                emptyList()
            }
        } else emptyList()

        val merged = (curatedMatches + apiResults + geocoderResults)
            .let {
                val seen = mutableSetOf<String>()
                it.filter { p -> seen.add(p.name.trim().lowercase()) }
            }
        return if (merged.isNotEmpty()) {
            Resource.Success(merged)
        } else {
            Resource.Error("No matching places found. Try searching by landmark name (e.g., Limketkai, Centrio, Cogon).")
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
    private val tripsDao: SavedTripsDao,
    private val destsDao: SavedDestinationsDao
) {
    fun getSavedTrips(): Flow<List<LocalSavedTrip>> = tripsDao.getAll()
    fun getSavedDestinations(): Flow<List<LocalSavedDestination>> = destsDao.getAll()

    suspend fun saveTrip(fromLabel: String, toLabel: String, routeIds: List<String>, tripOptionId: String?): Resource<String> {
        return try {
            val resp = api.saveTrip(mapOf("fromLabel" to fromLabel, "toLabel" to toLabel,
                "routeIds" to routeIds, "tripOptionId" to (tripOptionId ?: "")))
            val id = resp["id"] ?: UUID.randomUUID().toString()
            tripsDao.insert(LocalSavedTrip(id, fromLabel, toLabel, routeIds.joinToString(","), tripOptionId))
            Resource.Success(id)
        } catch (e: Exception) {
            // Save locally even if offline
            val id = UUID.randomUUID().toString()
            tripsDao.insert(LocalSavedTrip(id, fromLabel, toLabel, routeIds.joinToString(","), tripOptionId))
            Resource.Success(id)
        }
    }

    suspend fun deleteTrip(id: String) {
        try { api.deleteSavedTrip(id) } catch (_: Exception) {}
        tripsDao.delete(id)
    }

    suspend fun saveDestination(label: String, placeName: String, icon: String): Resource<String> {
        return try {
            val resp = api.saveDestination(mapOf("label" to label, "placeName" to placeName, "icon" to icon))
            val id = resp["id"] ?: UUID.randomUUID().toString()
            destsDao.insert(LocalSavedDestination(id, label, placeName, icon))
            Resource.Success(id)
        } catch (e: Exception) {
            val id = UUID.randomUUID().toString()
            destsDao.insert(LocalSavedDestination(id, label, placeName, icon))
            Resource.Success(id)
        }
    }

    suspend fun deleteDestination(id: String) {
        try { api.deleteDestination(id) } catch (_: Exception) {}
        destsDao.delete(id)
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

