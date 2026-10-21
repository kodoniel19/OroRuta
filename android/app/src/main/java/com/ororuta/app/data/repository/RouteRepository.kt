package com.ororuta.app.data.repository

import android.content.Context
import com.ororuta.app.data.local.dao.RouteDao
import com.ororuta.app.data.local.entities.CachedRoute
import com.ororuta.app.data.remote.NetworkMonitor
import com.ororuta.app.data.remote.OroRutaApi
import com.ororuta.app.domain.models.Resource
import com.ororuta.app.domain.models.Route
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import retrofit2.HttpException
import java.io.IOException
import java.net.ConnectException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RouteRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val api: OroRutaApi,
    private val dao: RouteDao,
    private val networkMonitor: NetworkMonitor,
    private val json: Json
) {
    /**
     * Ensures initial offline cache is pre-populated with verified CDO routes from assets
     * and kept up-to-date with bundled route geometries.
     */
    private suspend fun ensureInitialCache() {
        try {
            context.assets.open("bundled_routes.json").use { stream ->
                val text = stream.bufferedReader().use { it.readText() }
                val routes = json.decodeFromString<List<Route>>(text)
                if (routes.isNotEmpty()) {
                    dao.insertAll(routes.map { it.toCached() })
                }
            }
        } catch (_: Exception) {}
    }

    /**
     * Classifies network errors into clear, actionable messages for the user.
     */
    private fun classifyError(e: Throwable): String {
        return when (e) {
            is ConnectException -> "Unable to connect to OroRuta server. Please verify the backend is running."
            is SocketTimeoutException -> "OroRuta server request timed out. Please try again."
            is UnknownHostException -> "Cannot resolve OroRuta server address. Please check your connection."
            is HttpException -> {
                when (e.code()) {
                    404 -> "Route was not found on the server."
                    500, 502, 503 -> "Server error (${e.code()}). Service temporarily unavailable."
                    else -> "Server returned code ${e.code()}: ${e.message()}"
                }
            }
            is IOException -> e.localizedMessage ?: "Network communication error"
            else -> e.localizedMessage ?: "Unexpected error occurred"
        }
    }

    private fun filterRoutes(list: List<Route>, q: String, type: String, hasUpdates: Boolean): List<Route> {
        var filtered = list
        if (q.isNotBlank()) {
            val query = q.lowercase().trim()
            filtered = filtered.filter {
                it.code.lowercase().contains(query) ||
                it.name.lowercase().contains(query) ||
                it.origin.lowercase().contains(query) ||
                it.destination.lowercase().contains(query) ||
                (it.description?.lowercase()?.contains(query) == true) ||
                it.stops.any { s -> s.name.lowercase().contains(query) } ||
                it.terminals.any { t -> t.name.lowercase().contains(query) } ||
                it.landmarks.any { l -> l.name.lowercase().contains(query) }
            }
        }
        if (type.isNotBlank()) {
            filtered = filtered.filter { it.jeepneyType.equals(type, ignoreCase = true) }
        }
        if (hasUpdates) {
            filtered = filtered.filter { it.status != "Active" }
        }
        return filtered
    }

    /**
     * Fetches routes from the API. On success, caches them locally.
     * When offline or if API is unreachable, loads cached routes.
     *
     * Emission strategy (stale-while-revalidate):
     *   1. Immediately emit any cached data as Resource.Success(isOffline=true) — never block UI.
     *   2. If device is online, attempt a background refresh and emit an updated result.
     *   3. If network fails but cache was already served, the UI keeps showing cached data.
     *   4. Only emit Resource.Error if there is NOTHING to show (no cache, no network).
     */
    fun getRoutes(q: String = "", type: String = "", hasUpdates: Boolean = false): Flow<Resource<List<Route>>> = flow {
        emit(Resource.Loading)

        // Step 1: Seed cache from bundled JSON if the DB is nearly empty (first launch)
        ensureInitialCache()

        // Step 2: Serve cached data immediately — this guarantees the screen is never blank
        val initialCache = if (q.isNotBlank()) dao.search(q) else dao.getAllSync()
        if (initialCache.isNotEmpty()) {
            val cached = filterRoutes(initialCache.mapNotNull { safeDecode(it) }, q, type, hasUpdates)
            emit(Resource.Success(cached, isOffline = true))
        }

        // Step 3: If there's no network, we're done — show the cached data (or an error if empty)
        val isDeviceOnline = networkMonitor.isOnline()
        if (!isDeviceOnline) {
            if (initialCache.isEmpty()) {
                emit(Resource.Error("You're offline and no cached routes are available.", isOffline = true))
            }
            return@flow
        }

        // Step 4: Online — attempt a background refresh against the real API
        try {
            val remote = api.getRoutes(q, type, if (hasUpdates) "true" else "")
            if (remote.isNotEmpty()) {
                dao.insertAll(remote.map { it.toCached() })
                val filtered = filterRoutes(remote, q, type, hasUpdates)
                emit(Resource.Success(filtered, isOffline = false))
            } else if (initialCache.isEmpty()) {
                // Server returned empty AND we had nothing cached → show error
                emit(Resource.Error("No routes available.", isOffline = false))
            }
            // If remote is empty but cache was served → keep the cached result (no new emit)
        } catch (e: Exception) {
            // Network request failed — cache was already served in Step 2, so only emit
            // an error if we had nothing cached to show the user.
            if (initialCache.isEmpty()) {
                val msg = classifyError(e)
                emit(Resource.Error(msg, isOffline = false))
            }
            // Otherwise: cache result stays displayed; no additional action needed.
        }
    }

    suspend fun getRoute(id: String): Resource<Route> {
        // 1. Check existing local Room cache first
        ensureInitialCache()
        val cached = dao.getById(id)
        if (cached != null) {
            val route = safeDecode(cached)
            if (route != null) {
                return Resource.Success(route, isOffline = !networkMonitor.isOnline())
            }
        }

        // 2. If online, attempt API fetch
        val isDeviceOnline = networkMonitor.isOnline()
        if (isDeviceOnline) {
            try {
                val remote = api.getRoute(id)
                dao.insert(remote.toCached())
                return Resource.Success(remote, isOffline = false)
            } catch (_: Exception) {}
        }

        // 3. Fallback: Search in bundled_routes.json asset directly
        try {
            context.assets.open("bundled_routes.json").use { stream ->
                val text = stream.bufferedReader().use { it.readText() }
                val routes = json.decodeFromString<List<Route>>(text)
                val matching = routes.firstOrNull { it.id == id || it.code.equals(id, true) }
                if (matching != null) {
                    dao.insert(matching.toCached())
                    return Resource.Success(matching, isOffline = true)
                }
            }
        } catch (_: Exception) {}

        return Resource.Error("Route not available offline.", isOffline = true)
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
            Resource.Error(classifyError(e))
        }
    }

    suspend fun removeOffline(routeId: String) = dao.removeOffline(routeId)

    /**
     * Get all cached routes (for MapScreen to show route polylines even offline).
     */
    suspend fun getCachedRoutes(): List<Route> {
        ensureInitialCache()
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
