package com.ororuta.app.data.repository

import android.content.Context
import com.ororuta.app.data.local.dao.RouteDao
import com.ororuta.app.data.local.entities.CachedRoute
import com.ororuta.app.data.remote.NetworkMonitor
import com.ororuta.app.data.remote.OroRutaApi
import com.ororuta.app.domain.models.Resource
import com.ororuta.app.domain.models.Route
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.launch
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
    @Volatile
    private var isCacheSeeded = false

    @Volatile
    private var memoryRoutesCache: List<Route>? = null

    companion object {
        private const val BUNDLED_DATA_VERSION = 19  // bumped: all 17 verified Google My Maps routes marked as popular
    }

    /**
     * Ensures initial offline cache is pre-populated with verified CDO routes from assets
     * on initial launch. Reseeds whenever bundled data version updates or cache is incomplete.
     */
    private suspend fun ensureInitialCache() {
        if (isCacheSeeded) return
        try {
            val prefs = context.getSharedPreferences("ororuta_cache_prefs", Context.MODE_PRIVATE)
            val cachedVer = prefs.getInt("bundled_routes_version", 0)
            val existing = dao.getAllSync()
            if (cachedVer >= BUNDLED_DATA_VERSION && existing.isNotEmpty()) {
                isCacheSeeded = true
                return
            }

            if (existing.isEmpty() || cachedVer < BUNDLED_DATA_VERSION) {
                context.assets.open("bundled_routes.json").use { stream ->
                    val text = stream.bufferedReader().use { it.readText() }
                    val routes = json.decodeFromString<List<Route>>(text)
                    if (routes.isNotEmpty()) {
                        dao.replaceAll(routes.map { it.toCached() })
                        memoryRoutesCache = routes
                        prefs.edit().putInt("bundled_routes_version", BUNDLED_DATA_VERSION).apply()
                    }
                }
            }
            isCacheSeeded = true
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
            filtered = filtered.filter { it.hasUpdates || it.status != "Active" || it.announcements.isNotEmpty() }
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
        val currentMem = memoryRoutesCache
        if (currentMem != null && currentMem.isNotEmpty()) {
            val cached = filterRoutes(currentMem, q, type, hasUpdates)
            emit(Resource.Success(cached, isOffline = !networkMonitor.isOnline()))
        } else {
            emit(Resource.Loading)

            ensureInitialCache()

            val initialCache = if (q.isNotBlank()) dao.search(q) else dao.getAllSync()
            if (initialCache.isNotEmpty()) {
                val decoded = initialCache.mapNotNull { safeDecode(it) }
                if (decoded.isNotEmpty() && q.isBlank() && type.isBlank() && !hasUpdates) {
                    memoryRoutesCache = decoded
                }
                val cached = filterRoutes(decoded, q, type, hasUpdates)
                emit(Resource.Success(cached, isOffline = true))
            }
        }

        // Always attempt background network fetch so route status changes (Active/Inactive)
        // sync live without being blocked by network capability false-negatives (e.g. adb reverse).
        try {
            val remote = api.getRoutes(q, type, if (hasUpdates) "true" else "")
            if (q.isBlank() && type.isBlank() && !hasUpdates) {
                memoryRoutesCache = remote
                dao.replaceAll(remote.map { it.toCached() })
            } else if (remote.isNotEmpty()) {
                val remoteMap = remote.associateBy { it.id }
                memoryRoutesCache = memoryRoutesCache?.map { remoteMap[it.id] ?: it }
                dao.insertAll(remote.map { it.toCached() })
            }
            if (remote.isNotEmpty() || (memoryRoutesCache?.isNotEmpty() == true)) {
                val filtered = filterRoutes(remote, q, type, hasUpdates)
                emit(Resource.Success(filtered, isOffline = false))
            } else if (memoryRoutesCache.isNullOrEmpty() && dao.getAllSync().isEmpty()) {
                emit(Resource.Error("No routes available.", isOffline = false))
            }
        } catch (e: Exception) {
            if (memoryRoutesCache.isNullOrEmpty() && dao.getAllSync().isEmpty()) {
                val msg = classifyError(e)
                emit(Resource.Error(msg, isOffline = true))
            }
        }
    }

    /**
     * Directly fetches latest routes from the API and atomically updates database & memory cache.
     * Returns the fresh filtered route list, or null if network failed.
     */
    suspend fun refreshRemoteRoutes(q: String = "", type: String = "", hasUpdates: Boolean = false): List<Route>? {
        return try {
            val remote = api.getRoutes(q, type, if (hasUpdates) "true" else "")
            if (q.isBlank() && type.isBlank() && !hasUpdates) {
                memoryRoutesCache = remote
                dao.replaceAll(remote.map { it.toCached() })
            } else {
                val remoteMap = remote.associateBy { it.id }
                memoryRoutesCache = memoryRoutesCache?.map { remoteMap[it.id] ?: it }
                dao.insertAll(remote.map { it.toCached() })
            }
            filterRoutes(remote, q, type, hasUpdates)
        } catch (_: Exception) {
            null
        }
    }

    /**
     * Fast synchronously accessible route from in-memory cache, SQLite database, or bundled JSON.
     */
    suspend fun getCachedRoute(id: String): Route? {
        ensureInitialCache()

        // 1. In-memory cache
        val inMem = memoryRoutesCache?.firstOrNull { it.id == id || it.code.equals(id, true) }
        if (inMem != null) return inMem

        // 2. Local SQLite Room database
        val cached = dao.getById(id) ?: dao.getAllSync().firstOrNull { it.code.equals(id, true) }
        if (cached != null) {
            val route = safeDecode(cached)
            if (route != null) return route
        }

        // 3. Search in bundled_routes.json asset directly
        try {
            context.assets.open("bundled_routes.json").use { stream ->
                val text = stream.bufferedReader().use { it.readText() }
                val routes = json.decodeFromString<List<Route>>(text)
                val matching = routes.firstOrNull { it.id == id || it.code.equals(id, true) }
                if (matching != null) {
                    dao.insert(matching.toCached())
                    return matching
                }
            }
        } catch (_: Exception) {}

        return null
    }

    /**
     * Stale-while-revalidate route stream: emits cached route immediately (0ms)
     * so UI displays instantly, followed by freshest remote route from API.
     */
    fun getRouteStream(id: String): Flow<Resource<Route>> = flow {
        val cached = getCachedRoute(id)
        if (cached != null) {
            emit(Resource.Success(cached, isOffline = !networkMonitor.isOnline()))
        } else {
            emit(Resource.Loading)
        }

        try {
            val remote = api.getRoute(id)
            dao.insert(remote.toCached())
            memoryRoutesCache = memoryRoutesCache?.map { if (it.id == remote.id) remote else it }
            emit(Resource.Success(remote, isOffline = false))
        } catch (e: Exception) {
            if (cached == null) {
                emit(Resource.Error(classifyError(e), isOffline = true))
            }
        }
    }

    suspend fun getRoute(id: String, forceRefresh: Boolean = false): Resource<Route> {
        val cached = getCachedRoute(id)
        if (cached != null && !forceRefresh) {
            // Return cached route immediately; trigger background refresh if online
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val remote = api.getRoute(id)
                    dao.insert(remote.toCached())
                    memoryRoutesCache = memoryRoutesCache?.map { if (it.id == remote.id) remote else it }
                } catch (_: Exception) {}
            }
            return Resource.Success(cached, isOffline = !networkMonitor.isOnline())
        }

        try {
            val remote = api.getRoute(id)
            dao.insert(remote.toCached())
            memoryRoutesCache = memoryRoutesCache?.map { if (it.id == remote.id) remote else it }
            return Resource.Success(remote, isOffline = false)
        } catch (_: Exception) {}

        if (cached != null) {
            return Resource.Success(cached, isOffline = !networkMonitor.isOnline())
        }

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
