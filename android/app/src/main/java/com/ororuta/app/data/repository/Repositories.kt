package com.ororuta.app.data.repository

import com.ororuta.app.data.local.dao.*
import com.ororuta.app.data.local.entities.*
import com.ororuta.app.data.remote.OroRutaApi
import com.ororuta.app.domain.models.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.io.IOException
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TripRepository @Inject constructor(private val api: OroRutaApi) {
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
            Resource.Error("You're offline. Cannot search for routes.", isOffline = true)
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Search failed")
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
    private val api: OroRutaApi, private val dao: PlaceDao
) {
    suspend fun search(q: String, filter: String = "all"): Resource<List<Place>> {
        return try {
            val results = api.getPlaces(q, filter = filter)
            val seen = mutableSetOf<String>()
            val uniqueResults = results.filter {
                val key = it.name.trim().lowercase()
                seen.add(key)
            }
            dao.clearAll()
            dao.insertAll(uniqueResults.map { CachedPlace(it.id, it.name, it.area, it.kind, it.mapX, it.mapY, it.lat, it.lng) })
            Resource.Success(uniqueResults)
        } catch (e: IOException) {
            val cached = dao.search(q)
            val seen = mutableSetOf<String>()
            val uniqueCached = cached.filter {
                val key = it.name.trim().lowercase()
                seen.add(key)
            }
            Resource.Success(uniqueCached.map { Place(it.id, it.name, it.area, it.kind, it.mapX, it.mapY, it.lat, it.lng) })
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Search failed")
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

