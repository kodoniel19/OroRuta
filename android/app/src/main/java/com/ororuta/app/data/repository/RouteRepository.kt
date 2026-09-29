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
    fun getRoutes(q: String = "", type: String = "", hasUpdates: Boolean = false): Flow<Resource<List<Route>>> = flow {
        emit(Resource.Loading)
        try {
            val remote = api.getRoutes(q, type, if (hasUpdates) "true" else "")
            // Cache
            dao.insertAll(remote.map { it.toCached() })
            emit(Resource.Success(remote))
        } catch (e: IOException) {
            val cached = dao.getAll()
            emit(Resource.Error("You're offline. Showing cached routes.", isOffline = true))
        } catch (e: Exception) {
            emit(Resource.Error(e.message ?: "Unknown error"))
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
                val route = json.decodeFromString<Route>(cached.jsonData)
                Resource.Success(route)
            } else {
                Resource.Error("Route not available offline.", isOffline = true)
            }
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Unknown error")
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

    private fun Route.toCached() = CachedRoute(
        id = id, code = code, name = name, origin = origin, destination = destination,
        jeepneyType = jeepneyType, status = status, color = color, lengthKm = lengthKm,
        offlineSizeMb = offlineSizeMb, lastUpdatedAt = lastUpdatedAt,
        jsonData = json.encodeToString(this)
    )
}
