package com.ororuta.app.data.repository

import com.ororuta.app.data.local.dao.RouteDao
import com.ororuta.app.data.local.entities.CachedRoute
import com.ororuta.app.data.remote.OroRutaApi
import com.ororuta.app.domain.models.Resource
import com.ororuta.app.domain.models.Route
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RouteRepository @Inject constructor(
    private val api: OroRutaApi,
    private val dao: RouteDao,
    private val json: Json
) {
    /**
     * Fetches routes from the API. On success, caches them locally.
     * On IOException (offline), loads most recent cached routes and returns them.
     * The Resource wrapper carries an isOffline flag so the UI can distinguish.
     */
    fun getRoutes(q: String = "", type: String = "", hasUpdates: Boolean = false): Flow<Resource<List<Route>>> = flow {
        emit(Resource.Loading)
        try {
            val remote = api.getRoutes(q, type, if (hasUpdates) "true" else "")
            // Cache all routes
            dao.insertAll(remote.map { it.toCached() })
            emit(Resource.Success(remote))
        } catch (e: IOException) {
            // Offline: load cached routes and filter locally
            val cached = if (q.isNotBlank()) {
                dao.search(q)
            } else {
                dao.getAllSync()
            }
            if (cached.isNotEmpty()) {
                val routes = cached.mapNotNull { safeDecode(it) }
                    .let { list ->
                        var filtered = list
                        if (type.isNotBlank()) {
                            filtered = filtered.filter { it.jeepneyType == type }
                        }
                        if (hasUpdates) {
                            filtered = filtered.filter { it.status != "Active" }
                        }
                        filtered
                    }
                emit(Resource.Success(routes, isOffline = true))
            } else {
                emit(Resource.Error("You're offline and no cached routes are available.", isOffline = true))
            }
        } catch (e: Exception) {
            // Try cache as fallback for any error
            val cached = dao.getAllSync()
            if (cached.isNotEmpty()) {
                val routes = cached.mapNotNull { safeDecode(it) }
                emit(Resource.Success(routes, isOffline = true))
            } else {
                emit(Resource.Error(e.message ?: "Unknown error"))
            }
        }
    }

    suspend fun getRoute(id: String): Resource<Route> {
        return try {
            val route = api.getRoute(id)
            dao.insert(route.toCached())
            Resource.Success(route)
        } catch (e: IOException) {
            val cached = dao.getById(id)
            if (cached != null) {
                val route = safeDecode(cached)
                if (route != null) {
                    Resource.Success(route)
                } else {
                    Resource.Error("Route data is corrupted in cache.", isOffline = true)
                }
            } else {
                Resource.Error("Route not available offline.", isOffline = true)
            }
        } catch (e: Exception) {
            val cached = dao.getById(id)
            if (cached != null) {
                val route = safeDecode(cached)
                if (route != null) {
                    Resource.Success(route)
                } else {
                    Resource.Error(e.message ?: "Unknown error")
                }
            } else {
                Resource.Error(e.message ?: "Unknown error")
            }
        }
    }

    fun getOfflineRoutes(): Flow<List<CachedRoute>> = dao.getOfflineRoutes()

    suspend fun downloadOfflineBundle(routeId: String): Resource<Unit> {
        return try {
            val bundle = api.getOfflineBundle(routeId)
            // Mark as offline download in cache
            val cached = dao.getById(routeId)
            if (cached != null) {
                dao.insert(cached.copy(isOfflineDownload = true))
            }
            Resource.Success(Unit)
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Download failed")
        }
    }

    suspend fun removeOffline(routeId: String) = dao.removeOffline(routeId)

    /**
     * Get all cached routes (for MapScreen to show route polylines even offline).
     */
    suspend fun getCachedRoutes(): List<Route> {
        return dao.getAllSync().mapNotNull { safeDecode(it) }
    }

    private fun safeDecode(cached: CachedRoute): Route? {
        return try {
            json.decodeFromString<Route>(cached.jsonData)
        } catch (_: Exception) {
            null
        }
    }

    private fun Route.toCached() = CachedRoute(
        id = id, code = code, name = name, origin = origin, destination = destination,
        jeepneyType = jeepneyType, status = status, color = color, lengthKm = lengthKm,
        offlineSizeMb = offlineSizeMb, lastUpdatedAt = lastUpdatedAt,
        jsonData = json.encodeToString(this)
    )
}
