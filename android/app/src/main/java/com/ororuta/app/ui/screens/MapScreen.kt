package com.ororuta.app.ui.screens

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.location.Location
import android.location.LocationManager
import android.os.Build
import android.os.SystemClock
import android.provider.Settings
import android.view.MotionEvent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInteropFilter
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.ororuta.app.data.local.entities.RecentSearchEntity

import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.Dash
import com.google.android.gms.maps.model.Gap
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.LatLngBounds
import com.google.android.gms.tasks.CancellationTokenSource
import com.google.maps.android.compose.*
import androidx.hilt.navigation.compose.hiltViewModel
import com.ororuta.app.domain.fare.PassengerCategory
import com.ororuta.app.domain.fare.TraditionalJeepneyFareService
import com.ororuta.app.domain.models.Place
import com.ororuta.app.domain.models.Resource
import com.ororuta.app.domain.models.Route
import com.ororuta.app.ui.components.*
import com.ororuta.app.ui.location.LocationPermissions
import com.ororuta.app.ui.theme.*
import com.ororuta.app.ui.viewmodels.MapViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeoutOrNull
import org.json.JSONObject
import java.net.URLEncoder

data class CdoGeoStop(
    val id: String,
    val name: String,
    val kind: String,
    val lat: Double,
    val lng: Double,
    val routes: String,
    val area: String? = null
)

// High-performance thread-safe in-memory cache for parsed route GeoJSON coordinates
private val routeGeometriesCache = java.util.concurrent.ConcurrentHashMap<String, List<LatLng>>()
private val allRouteCoordinatesCache = java.util.concurrent.ConcurrentHashMap<String, List<LatLng>>()

/** Returns the index of the element with the minimum selector value, or 0 if list is empty. */
private fun <T> List<T>.indexOfMinBy(selector: (T) -> Double): Int {
    if (isEmpty()) return 0
    var minIdx = 0
    var minVal = selector(this[0])
    for (i in 1 until size) {
        val v = selector(this[i])
        if (v < minVal) { minVal = v; minIdx = i }
    }
    return minIdx
}

fun parseGeometries(route: com.ororuta.app.domain.models.Route, direction: String? = null): List<LatLng> {
    val dirKey = direction?.trim()?.lowercase() ?: "all"
    val cacheKey = "${route.id}_${dirKey}_${route.geometries.size}_${route.path.size}"
    routeGeometriesCache[cacheKey]?.let { return it }

    val allPts = mutableListOf<LatLng>()
    
    // Check if new geometries are available
    if (route.geometries.isNotEmpty()) {
        val filtered = if (!direction.isNullOrBlank()) {
            route.geometries.filter { it.direction.equals(direction, ignoreCase = true) }
        } else {
            route.geometries
        }
        val targetGeos = if (filtered.isNotEmpty()) filtered else route.geometries
        targetGeos.forEach { geo ->
            val jsonStr = geo.geometry
            if (!jsonStr.isNullOrBlank()) {
                try {
                    val root = JSONObject(jsonStr)
                    if (root.has("coordinates")) {
                        val coords = root.getJSONArray("coordinates")
                        for (i in 0 until coords.length()) {
                            val c = coords.getJSONArray(i)
                            // GeoJSON format is [longitude, latitude]
                            if (c.length() >= 2) {
                                allPts.add(LatLng(c.getDouble(1), c.getDouble(0)))
                            }
                        }
                    }
                } catch (e: Exception) {
                    // ignore malformed geometry
                }
            }
        }
    } else if (route.path.isNotEmpty()) {
        // Fallback to legacy path points
        route.path.filter { it.lat != 0.0 && it.lng != 0.0 }
            .forEach { allPts.add(LatLng(it.lat, it.lng)) }
    }
    
    routeGeometriesCache[cacheKey] = allPts
    return allPts
}

fun getAllRouteCoordinates(route: com.ororuta.app.domain.models.Route): List<LatLng> {
    val cacheKey = "${route.id}_all_coords_${route.terminals.size}_${route.stops.size}"
    allRouteCoordinatesCache[cacheKey]?.let { return it }

    val pts = parseGeometries(route).toMutableList()
    route.terminals.forEach { if (it.lat != 0.0 && it.lng != 0.0) pts.add(LatLng(it.lat, it.lng)) }
    route.stops.forEach { if (it.lat != 0.0 && it.lng != 0.0) pts.add(LatLng(it.lat, it.lng)) }
    route.transfers.forEach { if (it.lat != 0.0 && it.lng != 0.0) pts.add(LatLng(it.lat, it.lng)) }
    route.landmarks.forEach { if (it.lat != 0.0 && it.lng != 0.0) pts.add(LatLng(it.lat, it.lng)) }
    allRouteCoordinatesCache[cacheKey] = pts
    return pts
}

private fun haversine(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Double {
    val r = 6371000.0
    val dLat = Math.toRadians(lat2 - lat1)
    val dLng = Math.toRadians(lng2 - lng1)
    val a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2)
    return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

data class NearbyRoutesSheetTarget(

    val title: String,
    val subtitle: String = "Cagayan de Oro City",
    val lat: Double? = null,
    val lng: Double? = null,
    val note: String? = null,
    /** True when this target was obtained from the device's own GPS (not from a tapped marker) */
    val isGpsBasedNearMe: Boolean = false
)

data class NearbyRouteDisplayItem(
    val route: Route,
    val nearestStopName: String?,
    val nearestStopType: String?,
    val walkDistanceMeters: Int?,
    val matchReason: String,
    val nearestStopLat: Double? = null,
    val nearestStopLng: Double? = null,
    val destinationServed: String? = null,
    val onboardDistanceKm: Double? = null,
    val dropoffStopName: String? = null
)

data class RouteStopPoint(
    val id: String,
    val name: String,
    val type: String,
    val lat: Double,
    val lng: Double,
    val note: String? = null
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MapScreen(
    contentPadding: PaddingValues = PaddingValues(0.dp),
    isPushed: Boolean = false,
    focusedTripOptionId: String? = null,
    initialPlaceId: String? = null,
    initialPlaceName: String? = null,
    initialLat: Double? = null,
    initialLng: Double? = null,
    initialKind: String? = null,
    initialRouteId: String? = null,
    initialDirection: String? = null,
    onBack: (() -> Unit)? = null,
    onSearchClick: (() -> Unit)? = null,
    onNavigateRouteInfo: (String) -> Unit,
    onStartNavigation: (String) -> Unit,
    onPlanTrip: ((toName: String, toLat: Double, toLng: Double) -> Unit)? = null,
    viewModel: MapViewModel = hiltViewModel()
) {
    var showLayersSheet by remember { mutableStateOf(false) }
    var selectedMarker by remember { mutableStateOf<MapMarker?>(null) }
    var selectedRouteId by remember { mutableStateOf<String?>(null) }
    var nearbyRoutesTarget by remember { mutableStateOf<NearbyRoutesSheetTarget?>(null) }
    var mapSearchQuery by remember { mutableStateOf("") }
    var showSuggestions by remember { mutableStateOf(false) }
    var showManualOriginDialog by remember { mutableStateOf(false) }

    val recentSearches by viewModel.recentSearches.collectAsState()
    val focusManager = LocalFocusManager.current
    val keyboardController = LocalSoftwareKeyboardController.current

    // Database-driven routes and places from backend / cache
    val dbRoutes = viewModel.routes
    val dbPlaces = viewModel.places

    // Compute all routes passing by or nearby the selected marker (verified routes within 200m walking distance)
    val nearbyRoutesForSelectedMarker = remember(selectedMarker, dbRoutes) {
        val m = selectedMarker
        if (m == null) emptyList()
        else {
            val lat = m.lat ?: 0.0
            val lng = m.lng ?: 0.0
            val markerNameClean = m.name.lowercase().trim()

            dbRoutes.filter { route ->
                val isTraditional = route.jeepneyType.isBlank() || route.jeepneyType.equals("Traditional", ignoreCase = true)
                if (!isTraditional) return@filter false

                // 1. Explicit landmark association
                val hasLandmarkMatch = markerNameClean.length >= 3 && route.landmarks.any {
                    it.name.lowercase().contains(markerNameClean) || markerNameClean.contains(it.name.lowercase())
                }
                // 2. Stop, terminal, or transfer point match
                val hasStopMatch = markerNameClean.length >= 3 && (route.terminals.map { it.name } + route.stops.map { it.name } + route.transfers.map { it.name }).any {
                    it.lowercase().contains(markerNameClean) || markerNameClean.contains(it.lowercase())
                }
                // 3. Verified route geometry or stops genuinely pass within 200m walking distance
                val isSpatiallyClose = if (lat != 0.0 && lng != 0.0) {
                    val allPts = getAllRouteCoordinates(route)
                    allPts.any { pt ->
                        pt.latitude != 0.0 && pt.longitude != 0.0 &&
                        haversine(lat, lng, pt.latitude, pt.longitude) <= 200.0
                    }
                } else false

                // 4. Code match in note if present (e.g. "R1, C1")
                val hasCodeInNote = if (!m.note.isNullOrBlank()) {
                    m.note.split(",").map { it.trim().lowercase() }.contains(route.code.lowercase())
                } else false

                hasLandmarkMatch || hasStopMatch || isSpatiallyClose || hasCodeInNote
            }
        }
    }


    // Collect both route stops and all places/landmarks from DB catalog
    val cdoStops = remember(dbRoutes, dbPlaces) {
        val routesByName = mutableMapOf<String, MutableSet<String>>()
        val stopByName = mutableMapOf<String, CdoGeoStop>()

        // 1. Process all places from database/catalog (Landmarks, Malls, Schools, etc.)
        dbPlaces.forEach { p ->
            if (p.lat != 0.0 && p.lng != 0.0) {
                stopByName[p.name] = CdoGeoStop(
                    id = p.id,
                    name = p.name,
                    kind = p.kind,
                    lat = p.lat,
                    lng = p.lng,
                    routes = "",
                    area = p.area ?: "Cagayan de Oro City"
                )
            }
        }

        // 2. Process route sub-entities (terminals, loading points, transfers, landmarks)
        dbRoutes.forEach { route ->
            route.terminals.forEach { t ->
                if (t.lat != 0.0 && t.lng != 0.0) {
                    routesByName.getOrPut(t.name) { mutableSetOf() }.add(route.code)
                    if (!stopByName.containsKey(t.name)) {
                        stopByName[t.name] = CdoGeoStop(t.id, t.name, "terminal", t.lat, t.lng, "", "Cagayan de Oro City")
                    }
                }
            }
            route.stops.forEach { s ->
                if (s.lat != 0.0 && s.lng != 0.0) {
                    routesByName.getOrPut(s.name) { mutableSetOf() }.add(route.code)
                    if (!stopByName.containsKey(s.name)) {
                        stopByName[s.name] = CdoGeoStop(s.id, s.name, s.pointType.ifBlank { "loading" }, s.lat, s.lng, "", "Cagayan de Oro City")
                    }
                }
            }
            route.transfers.forEach { tr ->
                if (tr.lat != 0.0 && tr.lng != 0.0) {
                    routesByName.getOrPut(tr.name) { mutableSetOf() }.add(route.code)
                    if (!stopByName.containsKey(tr.name)) {
                        stopByName[tr.name] = CdoGeoStop(tr.id, tr.name, "transfer", tr.lat, tr.lng, "", "Cagayan de Oro City")
                    }
                }
            }
            route.landmarks.forEach { lm ->
                if (lm.lat != 0.0 && lm.lng != 0.0) {
                    routesByName.getOrPut(lm.name) { mutableSetOf() }.add(route.code)
                    if (!stopByName.containsKey(lm.name)) {
                        stopByName[lm.name] = CdoGeoStop(lm.id, lm.name, "landmark", lm.lat, lm.lng, "", "Cagayan de Oro City")
                    }
                }
            }
        }

        // 3. Match nearby jeepney routes for landmarks that are close to a route path (~650m)
        stopByName.forEach { (name, stop) ->
            if (routesByName[name].isNullOrEmpty()) {
                dbRoutes.forEach { route ->
                    val routePts = getAllRouteCoordinates(route)
                    val passesNearby = routePts.any { pt ->
                        val dLat = Math.abs(pt.latitude - stop.lat)
                        val dLng = Math.abs(pt.longitude - stop.lng)
                        dLat < 0.006 && dLng < 0.006
                    }
                    if (passesNearby) {
                        routesByName.getOrPut(name) { mutableSetOf() }.add(route.code)
                    }
                }
            }
        }

        val collected = stopByName.map { (name, stop) ->
            stop.copy(routes = routesByName[name]?.sorted()?.joinToString(", ") ?: "")
        }

        if (collected.isNotEmpty()) {
            collected
        } else {
            listOf(
                CdoGeoStop("t1", "Bulua Westbound Terminal", "terminal", 8.5132, 124.6190, "R1, R2, B1", "Bulua"),
                CdoGeoStop("t2", "Agora Eastbound Terminal (Lapasan)", "terminal", 8.4907, 124.6610, "R1, B1, C1", "Lapasan"),
                CdoGeoStop("pl-15", "St. Augustine Metropolitan Cathedral", "landmark", 8.4777, 124.6433, "R1, C1", "Poblacion"),
                CdoGeoStop("l1", "Carmen Public Market", "loading", 8.4804, 124.6369, "R1, C1", "Carmen"),
                CdoGeoStop("l2", "Divisoria Plaza (Golden Friendship)", "loading", 8.4772, 124.6465, "R1, R2, C1", "Divisoria"),
                CdoGeoStop("x1", "Velez-Recto Junction (Centrio / Gaisano)", "transfer", 8.4871, 124.6508, "R1, C1", "Recto"),
                CdoGeoStop("u1", "Limketkai Center Drop-off", "unloading", 8.4842, 124.6568, "R1, R2", "Limketkai"),
                CdoGeoStop("m1", "Cogon Public Market", "loading", 8.4754, 124.6502, "C1, R2", "Cogon"),
                CdoGeoStop("p1", "Puerto Highway Terminal", "terminal", 8.4960, 124.7410, "B1", "Puerto")
            )
        }
    }

    // Layers toggle state
    // Default showJeepneyRoutes = false → clean map on launch; routes appear only when selected
    var showJeepneyRoutes by remember { mutableStateOf(false) }
    var showTerminals by remember { mutableStateOf(false) }
    var showLoadingPoints by remember { mutableStateOf(false) }
    var showUnloadingPoints by remember { mutableStateOf(false) }
    var showTransferPoints by remember { mutableStateOf(false) }
    var showLandmarks by remember { mutableStateOf(false) }

    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val snackbarHostState = remember { SnackbarHostState() }
    var hasLocationPermission by remember { mutableStateOf(LocationPermissions.hasAccess(context)) }
    var showDeniedBanner by remember { mutableStateOf(false) }
    var mapReady by remember { mutableStateOf(false) }
    var userLocation by remember { mutableStateOf<LatLng?>(null) }
    val userMarkerState = rememberMarkerState()
    LaunchedEffect(userLocation) {
        userLocation?.let { userMarkerState.position = it }
    }

    var isLocating by remember { mutableStateOf(false) }
    var isLocatingForRoutes by remember { mutableStateOf(false) }

    val coroutineScope = rememberCoroutineScope()

    // Cagayan de Oro Geographic Center & Strict Camera Bounding Box
    // Prevents camera from ever drifting or jumping to (0,0), Africa, or outside CDO
    val cdoCenter = remember { LatLng(8.4822, 124.6472) }
    val cdoCameraBounds = remember {
        LatLngBounds(
            LatLng(8.3000, 124.4800), // Southwest (Bulua, Upper Carmen, Lumbia corridor)
            LatLng(8.6000, 124.8000)  // Northeast (Tagoloan, Bugo, Puerto, Macajalar Bay)
        )
    }

    val defaultCamera = remember { CameraPosition.fromLatLngZoom(cdoCenter, 14.0f) }
    val cameraPositionState = rememberCameraPositionState {
        position = defaultCamera
    }

    // Handle initial place selection from navigation (e.g. from Search Screen "View on Map")
    LaunchedEffect(initialPlaceName, initialLat, initialLng) {
        if (!initialPlaceName.isNullOrBlank() && initialLat != null && initialLat != 0.0 && initialLng != null && initialLng != 0.0) {
            val target = LatLng(initialLat, initialLng)
            selectedMarker = MapMarker(
                id = initialPlaceId ?: "init",
                name = initialPlaceName,
                kind = initialKind ?: "landmark",
                lat = initialLat,
                lng = initialLng,
                area = "Cagayan de Oro City"
            )
            delay(300)
            cameraPositionState.animate(CameraUpdateFactory.newLatLngZoom(target, 16f), 500)
        }
    }

    // Handle initial route selection from navigation (e.g. from RouteInfoScreen "View route on map")
    LaunchedEffect(initialRouteId, initialDirection) {
        if (!initialRouteId.isNullOrBlank()) {
            selectedRouteId = initialRouteId
            val dir = initialDirection ?: "Inbound"
            viewModel.selectRouteForGuidance(
                routeId = initialRouteId,
                direction = dir,
                userLoc = userLocation
            )
        }
    }

    // Continuous location updates when guidance is active with distance-based threshold (prevents thrashing)
    LaunchedEffect(viewModel.routeGuidance != null, hasLocationPermission) {
        if (hasLocationPermission && viewModel.routeGuidance != null) {
            viewModel.locationProvider.getLocationUpdates(5000L).collect { loc ->
                val newLatLng = LatLng(loc.latitude, loc.longitude)
                val prev = userLocation
                userLocation = newLatLng
                val moved = if (prev == null) true else {
                    val dLat = (newLatLng.latitude - prev.latitude) * 111000
                    val dLng = (newLatLng.longitude - prev.longitude) * 111000 * Math.cos(Math.toRadians(prev.latitude))
                    Math.hypot(dLat, dLng) >= 8.0
                }
                if (moved) {
                    viewModel.updateGuidanceLocation(newLatLng)
                }
            }
        }
    }

    // Auto-fit camera when guidance route points are loaded or direction switches
    LaunchedEffect(viewModel.routeGuidance?.route?.id, viewModel.routeGuidance?.direction) {
        val guidance = viewModel.routeGuidance
        if (guidance != null && guidance.routePoints.isNotEmpty()) {
            try {
                val boundsBuilder = LatLngBounds.builder()
                guidance.routePoints.forEach { boundsBuilder.include(it) }
                guidance.walkingPathToBoarding.forEach { boundsBuilder.include(it) }
                guidance.userLocation?.let { boundsBuilder.include(it) }
                val bounds = boundsBuilder.build()
                cameraPositionState.animate(
                    CameraUpdateFactory.newLatLngBounds(bounds, 120),
                    600
                )
            } catch (_: Exception) {
                val target = guidance.nearestBoardingStop?.let { LatLng(it.lat, it.lng) }
                    ?: guidance.routePoints.first()
                cameraPositionState.animate(
                    CameraUpdateFactory.newLatLngZoom(target, 14f),
                    600
                )
            }
        }
    }

    // Permission launcher with complete Allow and Deny response handling
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val granted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        hasLocationPermission = granted
        showDeniedBanner = !granted

        if (granted) {
            coroutineScope.launch {
                isLocating = true
                centerOnDeviceLocation(
                    context = context,
                    cameraPositionState = cameraPositionState,
                    onLocationFound = { loc ->
                        userLocation = loc
                        if (viewModel.routeGuidance != null) {
                            viewModel.updateGuidanceLocation(loc)
                        }
                    },
                    onUnavailable = { _ -> /* silent after permission grant; user can retry with button */ }
                )
                isLocating = false
            }
        } else {
            coroutineScope.launch {
                val result = snackbarHostState.showSnackbar(
                    message = "Location permission denied. Map functions remain available. You can enable GPS in Settings.",
                    actionLabel = "Settings",
                    duration = SnackbarDuration.Long
                )
                if (result == SnackbarResult.ActionPerformed) {
                    LocationPermissions.openAppSettings(context)
                }
            }
        }
    }

    // Prompt location permission automatically on first screen launch
    var didRequestInitialPermission by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        if (!hasLocationPermission && !didRequestInitialPermission) {
            didRequestInitialPermission = true
            delay(400)
            permissionLauncher.launch(LocationPermissions.runtimePermissions)
        } else if (hasLocationPermission) {
            // If already permitted, fetch current location and update marker silently
            coroutineScope.launch {
                centerOnDeviceLocation(
                    context = context,
                    cameraPositionState = cameraPositionState,
                    onLocationFound = { loc ->
                        userLocation = loc
                        if (viewModel.routeGuidance != null) {
                            viewModel.updateGuidanceLocation(loc)
                        }
                    },
                    onUnavailable = { /* silent on auto-launch; user can tap button to retry */ }
                )
            }
        }
    }

    // Whenever the Jeepney Routes bottom sheet is opened, ensure fresh GPS location is requested if not already acquired
    LaunchedEffect(nearbyRoutesTarget) {
        if (nearbyRoutesTarget != null && userLocation == null) {
            if (!hasLocationPermission) {
                permissionLauncher.launch(LocationPermissions.runtimePermissions)
            } else {
                isLocatingForRoutes = true
                try {
                    val loc = obtainBestDeviceLocation(context)
                    if (loc != null) {
                        userLocation = LatLng(loc.latitude, loc.longitude)
                    }
                } finally {
                    isLocatingForRoutes = false
                }
            }
        }
    }

    // Center on user location or prompt permissions when the location button is tapped
    fun requestLocationOrSettings() {
        if (hasLocationPermission) {
            coroutineScope.launch {
                isLocating = true
                centerOnDeviceLocation(
                    context = context,
                    cameraPositionState = cameraPositionState,
                    onLocationFound = { loc ->
                        userLocation = loc
                        if (viewModel.routeGuidance != null) {
                            viewModel.updateGuidanceLocation(loc)
                        }
                    },
                    onUnavailable = { reason ->
                        val result = snackbarHostState.showSnackbar(
                            message = reason,
                            actionLabel = if (reason.contains("disabled", ignoreCase = true) || reason.contains("off", ignoreCase = true) || reason.contains("settings", ignoreCase = true)) "Settings" else null,
                            duration = SnackbarDuration.Long
                        )
                        if (result == SnackbarResult.ActionPerformed) {
                            try {
                                context.startActivity(Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS).apply {
                                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                                })
                            } catch (_: Exception) {
                                LocationPermissions.openAppSettings(context)
                            }
                        }
                    }
                )
                isLocating = false
            }
            return
        }

        if (LocationPermissions.shouldShowRationale(context) || !showDeniedBanner) {
            permissionLauncher.launch(LocationPermissions.runtimePermissions)
        } else {
            coroutineScope.launch {
                val result = snackbarHostState.showSnackbar(
                    message = "Location permission is off. Enable it in app settings to show where you are.",
                    actionLabel = "Settings",
                    duration = SnackbarDuration.Long
                )
                if (result == SnackbarResult.ActionPerformed) {
                    LocationPermissions.openAppSettings(context)
                }
            }
        }
    }

    // Re-check permission on app resume (e.g. user toggled permission in Settings and returned)
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                val granted = LocationPermissions.hasAccess(context)
                val wasGranted = hasLocationPermission
                hasLocationPermission = granted
                if (granted) {
                    showDeniedBanner = false
                    if (!wasGranted) {
                        coroutineScope.launch {
                            centerOnDeviceLocation(
                                context = context,
                                cameraPositionState = cameraPositionState,
                                onLocationFound = { loc ->
                                    userLocation = loc
                                    if (viewModel.routeGuidance != null) {
                                        viewModel.updateGuidanceLocation(loc)
                                    }
                                },
                                onUnavailable = { /* silent on resume */ }
                            )
                        }
                    }
                }
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    // Track pre-gesture camera position to detect and correct double-tap zoom drift.
    // When a gesture-initiated zoom changes the center significantly (> ~220m),
    // we snap back to the pre-gesture center at the new zoom level.
    // This neutralizes the "zoom into tapped point" behavior of Google Maps' double-tap.
    var preGestureTarget by remember { mutableStateOf<LatLng?>(null) }
    var preGestureZoom by remember { mutableStateOf<Float?>(null) }

    LaunchedEffect(cameraPositionState.isMoving, mapReady) {
        if (!mapReady) return@LaunchedEffect

        if (cameraPositionState.isMoving) {
            // Camera movement started — save the pre-gesture state
            if (cameraPositionState.cameraMoveStartedReason == CameraMoveStartedReason.GESTURE) {
                if (preGestureTarget == null) {
                    preGestureTarget = cameraPositionState.position.target
                    preGestureZoom = cameraPositionState.position.zoom
                }
            }
        } else {
            // Camera movement ended — check for double-tap drift
            val savedTarget = preGestureTarget
            val savedZoom = preGestureZoom
            val currentTarget = cameraPositionState.position.target
            val currentZoom = cameraPositionState.position.zoom

            // Reset tracking state
            preGestureTarget = null
            preGestureZoom = null

            // Out-of-bounds / NaN safety check (prevents camera stranded at 0,0 or NaN)
            if ((currentTarget.latitude == 0.0 && currentTarget.longitude == 0.0) ||
                currentTarget.latitude.isNaN() || currentTarget.longitude.isNaN()
            ) {
                cameraPositionState.animate(
                    CameraUpdateFactory.newLatLngZoom(cdoCenter, 14.0f),
                    500
                )
                return@LaunchedEffect
            }

            // Allow smooth, natural user pan and zoom gestures without artificial jumps
            // Strict boundaries check above guarantees camera never leaves Cagayan de Oro
        }
    }



    if (showLayersSheet) {
        ModalBottomSheet(
            onDismissRequest = { showLayersSheet = false },
            containerColor = Color.White,
            shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp)
            ) {
                Text(
                    text = "Map Layers",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Ink
                )

                Spacer(modifier = Modifier.height(14.dp))

                LayerSwitchRow("Jeepney routes", showJeepneyRoutes) { showJeepneyRoutes = it }
                LayerSwitchRow("Terminals", showTerminals) { showTerminals = it }
                LayerSwitchRow("Loading points", showLoadingPoints) { showLoadingPoints = it }
                LayerSwitchRow("Unloading points", showUnloadingPoints) { showUnloadingPoints = it }
                LayerSwitchRow("Transfer points", showTransferPoints) { showTransferPoints = it }
                LayerSwitchRow("Landmarks", showLandmarks) { showLandmarks = it }

                Spacer(modifier = Modifier.height(20.dp))
            }
        }
    }

    if (nearbyRoutesTarget != null) {
        val target = nearbyRoutesTarget!!
        val matchedRoutesWithDetails = remember(target, dbRoutes, userLocation) {
            val uLat = userLocation?.latitude
            val uLng = userLocation?.longitude
            val hasUserLocation = uLat != null && uLng != null && !(uLat == 0.0 && uLng == 0.0)

            val targetLat = target.lat
            val targetLng = target.lng
            val hasTargetCoords = targetLat != null && targetLng != null && !(targetLat == 0.0 && targetLng == 0.0)
            val targetClean = target.title.lowercase().trim()
            val isNearMe = target.isGpsBasedNearMe

            fun haversine(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Double {
                val r = 6371000.0
                val dLat = Math.toRadians(lat2 - lat1)
                val dLng = Math.toRadians(lng2 - lng1)
                val a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                        Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                        Math.sin(dLng / 2) * Math.sin(dLng / 2)
                return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
            }

            if (!hasUserLocation) {
                return@remember emptyList<NearbyRouteDisplayItem>()
            }

            // Only traditional jeepneys
            val traditionalRoutes = dbRoutes.filter { route ->
                route.jeepneyType.equals("Traditional", ignoreCase = true) || route.jeepneyType.isBlank()
            }

            // Configurable walking limits for CDO urban transit
            val maxWalkToBoardMeters = 1000.0 // 1.0 km max walk to boarding
            val maxWalkFromDropMeters = 1000.0 // 1.0 km max walk to destination

            // Helper to get descriptive stop/point names instead of generic corridors
            fun getDescriptiveCdoStopName(lat: Double, lng: Double, defaultPrefix: String): String {
                return when {
                    lat in 8.483..8.490 && lng in 124.648..124.660 -> "$defaultPrefix along CM Recto Ave (Centrio / SM Downtown area)"
                    lat in 8.480..8.488 && lng in 124.654..124.665 -> "$defaultPrefix along Limketkai / Lapasan corridor"
                    lat in 8.484..8.495 && lng in 124.656..124.672 -> "$defaultPrefix near Agora Terminal / Valenzuela Ave"
                    lat in 8.473..8.482 && lng in 124.642..124.655 -> "$defaultPrefix near Cogon Market area"
                    lat in 8.475..8.485 && lng in 124.638..124.648 -> "$defaultPrefix near Divisoria area"
                    lat in 8.478..8.488 && lng in 124.630..124.640 -> "$defaultPrefix near Carmen Public Market area"
                    lat in 8.500..8.512 && lng in 124.605..124.625 -> "$defaultPrefix near Bulua Westbound Terminal corridor"
                    lat in 8.445..8.475 && lng in 124.615..124.635 -> "$defaultPrefix along Masterson Ave corridor"
                    lat in 8.490..8.505 && lng in 124.625..124.645 -> "$defaultPrefix along Kauswagan / Bonbon corridor"
                    lat in 8.475..8.510 && lng in 124.730..124.770 -> "$defaultPrefix along Puerto / Bugo Highway"
                    else -> "$defaultPrefix near CDO Transit Corridor"
                }
            }

            // Filter routes that serve the requested destination (if target is a destination/landmark)
            val suitableRoutes = if (isNearMe) {
                traditionalRoutes
            } else {
                traditionalRoutes.filter { route ->
                    val allPts = getAllRouteCoordinates(route)
                    val passesDestination = if (hasTargetCoords) {
                        allPts.any { pt ->
                            haversine(targetLat!!, targetLng!!, pt.latitude, pt.longitude) <= maxWalkFromDropMeters
                        } || (route.terminals.map { LatLng(it.lat, it.lng) } + route.stops.map { LatLng(it.lat, it.lng) }).any { pt ->
                            pt.latitude != 0.0 && pt.longitude != 0.0 && haversine(targetLat!!, targetLng!!, pt.latitude, pt.longitude) <= maxWalkFromDropMeters
                        }
                    } else false

                    if (hasTargetCoords) {
                        // When coordinates are known, route MUST actually reach within walking distance
                        passesDestination
                    } else {
                        val hasLandmarkMatch = route.landmarks.any {
                            it.name.contains(targetClean, true) || targetClean.contains(it.name, true)
                        }
                        val hasStopMatch = (route.terminals.map { it.name } + route.stops.map { it.name } + route.transfers.map { it.name }).any {
                            it.contains(targetClean, true) || targetClean.contains(it, true)
                        }
                        val hasEndpointMatch = route.origin.contains(targetClean, true) ||
                                route.destination.contains(targetClean, true) ||
                                targetClean.contains(route.origin, true) ||
                                targetClean.contains(route.destination, true)
                        hasLandmarkMatch || hasStopMatch || hasEndpointMatch
                    }
                }
            }

            // For each suitable route, find verified boarding stop closest to the USER'S CURRENT GPS LOCATION
            data class StopCandidate(val name: String, val type: String, val lat: Double, val lng: Double)

            val scoredItems = suitableRoutes.mapNotNull { route ->
                val candidates = mutableListOf<StopCandidate>()

                // Only terminals, loading points, and transfer points are verified boarding stops
                route.terminals.filter { it.lat != 0.0 && it.lng != 0.0 }.forEach {
                    candidates.add(StopCandidate(it.name, "Terminal", it.lat, it.lng))
                }
                route.stops.filter { it.lat != 0.0 && it.lng != 0.0 && !it.pointType.equals("unloading", true) }.forEach {
                    candidates.add(StopCandidate(it.name, "Loading Point", it.lat, it.lng))
                }
                route.transfers.filter { it.lat != 0.0 && it.lng != 0.0 }.forEach {
                    candidates.add(StopCandidate(it.name, "Transfer Point", it.lat, it.lng))
                }

                var bestStopName: String? = null
                var bestStopType: String? = null
                var bestDist = Double.MAX_VALUE
                var bestLat: Double? = null
                var bestLng: Double? = null

                for (cand in candidates) {
                    val d = haversine(uLat!!, uLng!!, cand.lat, cand.lng)
                    if (d < bestDist) {
                        bestDist = d
                        bestStopName = cand.name
                        bestStopType = cand.type
                        bestLat = cand.lat
                        bestLng = cand.lng
                    }
                }

                // If no specific stop was under walking threshold, check proximity to verified route line
                val geoPts = parseGeometries(route)
                if (bestDist > maxWalkToBoardMeters && geoPts.isNotEmpty()) {
                    var minGeoDist = Double.MAX_VALUE
                    var bestGeoPt: LatLng? = null
                    for (pt in geoPts) {
                        val d = haversine(uLat!!, uLng!!, pt.latitude, pt.longitude)
                        if (d < minGeoDist) {
                            minGeoDist = d
                            bestGeoPt = pt
                        }
                    }
                    if (minGeoDist <= maxWalkToBoardMeters) {
                        bestDist = minGeoDist
                        bestLat = bestGeoPt?.latitude
                        bestLng = bestGeoPt?.longitude
                        bestStopName = getDescriptiveCdoStopName(bestLat ?: 8.4822, bestLng ?: 124.6472, "Boarding Point")
                        bestStopType = "Boarding Point"
                    }
                }

                // Reject if boarding stop exceeds maximum walking distance
                if (bestDist > maxWalkToBoardMeters || bestLat == null || bestLng == null) {
                    return@mapNotNull null
                }

                // Calculate onboard ride distance between boarding stop and drop-off stop
                var bestDropLat = targetLat
                var bestDropLng = targetLng
                var bestDropName: String? = null
                var minDropDist = Double.MAX_VALUE

                if (hasTargetCoords && targetLat != null && targetLng != null) {
                    for (term in route.terminals) {
                        if (term.lat != 0.0 && term.lng != 0.0) {
                            val d = haversine(targetLat, targetLng, term.lat, term.lng)
                            if (d < minDropDist) {
                                minDropDist = d
                                bestDropLat = term.lat
                                bestDropLng = term.lng
                                bestDropName = term.name
                            }
                        }
                    }
                    for (s in route.stops) {
                        if (s.lat != 0.0 && s.lng != 0.0) {
                            val d = haversine(targetLat, targetLng, s.lat, s.lng)
                            if (d < minDropDist) {
                                minDropDist = d
                                bestDropLat = s.lat
                                bestDropLng = s.lng
                                bestDropName = s.name
                            }
                        }
                    }
                    if (minDropDist > 300.0 && geoPts.isNotEmpty()) {
                        for (pt in geoPts) {
                            val d = haversine(targetLat, targetLng, pt.latitude, pt.longitude)
                            if (d < minDropDist) {
                                minDropDist = d
                                bestDropLat = pt.latitude
                                bestDropLng = pt.longitude
                                bestDropName = getDescriptiveCdoStopName(pt.latitude, pt.longitude, "Drop-off")
                            }
                        }
                    }

                    // Reject if destination drop-off is beyond maximum walking distance (e.g. 5.7 km problem)
                    if (minDropDist > maxWalkFromDropMeters || bestDropLat == null || bestDropLng == null) {
                        return@mapNotNull null
                    }
                }

                val onboardKm = if (hasTargetCoords && bestDropLat != null && bestDropLng != null && geoPts.size >= 2) {
                    TraditionalJeepneyFareService.calculateOnboardDistanceKm(
                        routePoints = geoPts,
                        boardingLat = bestLat,
                        boardingLng = bestLng,
                        dropoffLat = bestDropLat,
                        dropoffLng = bestDropLng
                    )
                } else null

                // For destination search, must have a valid onboard ride segment (bIdx < dIdx)
                if (!isNearMe && hasTargetCoords && (onboardKm == null || onboardKm < 0.35)) {
                    return@mapNotNull null
                }

                NearbyRouteDisplayItem(
                    route = route,
                    nearestStopName = bestStopName ?: getDescriptiveCdoStopName(bestLat, bestLng, "Boarding Point"),
                    nearestStopType = bestStopType ?: "Boarding Stop",
                    walkDistanceMeters = bestDist.toInt(),
                    matchReason = if (!isNearMe) "Serves ${target.title}" else "Traditional Jeepney",
                    nearestStopLat = bestLat,
                    nearestStopLng = bestLng,
                    destinationServed = if (!isNearMe) target.title else null,
                    onboardDistanceKm = onboardKm,
                    dropoffStopName = bestDropName ?: if (hasTargetCoords) getDescriptiveCdoStopName(bestDropLat ?: 8.4822, bestDropLng ?: 124.6472, "Drop-off Point") else null
                )
            }

            // De-duplicate, sort by walking distance from user's current GPS location, take top 3–5
            scoredItems
                .distinctBy { "${it.route.id}_${it.nearestStopName}" }
                .sortedBy { it.walkDistanceMeters ?: Int.MAX_VALUE }
                .take(5)
        }

        ModalBottomSheet(
            onDismissRequest = { nearbyRoutesTarget = null },
            containerColor = Color.White,
            shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
            dragHandle = { BottomSheetDefaults.DragHandle() },
            modifier = Modifier.fillMaxHeight(0.85f)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 8.dp)
            ) {
                // Header Row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(Brand50),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.DirectionsBus,
                                contentDescription = null,
                                tint = Brand600,
                                modifier = Modifier.size(22.dp)
                            )
                        }
                        Column {
                            Text(
                                text = "Jeepney Routes",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = Ink
                            )
                            if (target.isGpsBasedNearMe) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.NearMe,
                                        contentDescription = null,
                                        tint = Ok600,
                                        modifier = Modifier.size(12.dp)
                                    )
                                    Text(
                                        text = "Nearest from My Location",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = Ok600
                                    )
                                }
                            } else {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.NearMe,
                                        contentDescription = null,
                                        tint = Brand600,
                                        modifier = Modifier.size(12.dp)
                                    )
                                    Text(
                                        text = "From My Location to ${target.title}",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = Brand600,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }
                        }
                    }

                    Row(
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Refresh button — available to refresh device GPS location
                        IconButton(
                            onClick = {
                                isLocatingForRoutes = true
                                coroutineScope.launch {
                                    try {
                                        val loc = obtainBestDeviceLocation(context)
                                        if (loc != null) {
                                            userLocation = LatLng(loc.latitude, loc.longitude)
                                            snackbarHostState.showSnackbar("Location refreshed")
                                        } else {
                                            snackbarHostState.showSnackbar("Unable to detect your location. Please check GPS.")
                                        }
                                    } catch (_: Exception) {
                                        snackbarHostState.showSnackbar("Location refresh failed.")
                                    } finally {
                                        isLocatingForRoutes = false
                                    }
                                }
                            },
                            modifier = Modifier.size(32.dp)
                        ) {
                            if (isLocatingForRoutes) {
                                CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Brand600, strokeWidth = 2.dp)
                            } else {
                                Icon(Icons.Default.Refresh, contentDescription = "Refresh location", tint = Brand600, modifier = Modifier.size(18.dp))
                            }
                        }

                        IconButton(
                            onClick = { nearbyRoutesTarget = null },
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(Icons.Default.Close, contentDescription = "Close", tint = InkMuted)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))
                HorizontalDivider(color = Line, thickness = 1.dp)
                Spacer(modifier = Modifier.height(12.dp))

                when {
                    !hasLocationPermission -> {
                        EmptyState(
                            icon = Icons.Default.LocationDisabled,
                            title = "Location Permission Needed",
                            message = "OroRuta requires your GPS location to calculate walking distance and recommend the nearest traditional jeepney routes.",
                            tone = EmptyTone.Neutral,
                            action = {
                                OroButton(
                                    text = "Enable Location",
                                    onClick = { permissionLauncher.launch(LocationPermissions.runtimePermissions) },
                                    variant = ButtonVariant.Primary,
                                    size = ButtonSize.Sm
                                )
                            }
                        )
                    }

                    isLocatingForRoutes -> {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 48.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                CircularProgressIndicator(color = Brand600, strokeWidth = 3.dp)
                                Text(
                                    text = "Detecting your current location…",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = InkSoft
                                )
                                Text(
                                    text = "Finding nearest verified boarding stops",
                                    fontSize = 12.sp,
                                    color = InkMuted
                                )
                            }
                        }
                    }

                    userLocation == null -> {
                        EmptyState(
                            icon = Icons.Default.GpsOff,
                            title = "GPS Unavailable",
                            message = "Unable to retrieve your current GPS coordinates. Please turn on Location in your device settings and try again.",
                            tone = EmptyTone.Neutral,
                            action = {
                                OroButton(
                                    text = "Turn On Location",
                                    onClick = {
                                        try {
                                            context.startActivity(Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS).apply {
                                                flags = Intent.FLAG_ACTIVITY_NEW_TASK
                                            })
                                        } catch (_: Exception) {
                                            LocationPermissions.openAppSettings(context)
                                        }
                                    },
                                    variant = ButtonVariant.Primary,
                                    size = ButtonSize.Sm
                                )
                            }
                        )
                    }

                    viewModel.routesState is Resource.Loading -> {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 48.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                CircularProgressIndicator(color = Brand600, strokeWidth = 3.dp)
                                Text(
                                    text = "Searching traditional jeepney routes…",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = InkSoft
                                )
                                Text(
                                    text = "Checking routes serving ${target.title}",
                                    fontSize = 12.sp,
                                    color = InkMuted
                                )
                            }
                        }
                    }

                    viewModel.routesState is Resource.Error -> {
                        val errMsg = (viewModel.routesState as Resource.Error).message
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 32.dp, horizontal = 16.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(52.dp)
                                        .clip(CircleShape)
                                        .background(Bad50),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.ErrorOutline,
                                        contentDescription = null,
                                        tint = Bad600,
                                        modifier = Modifier.size(28.dp)
                                    )
                                }
                                Text(
                                    text = "Failed to load routes",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Ink
                                )
                                Text(
                                    text = errMsg.ifBlank { "Could not connect to OroRuta servers. Please check your internet connection." },
                                    fontSize = 13.sp,
                                    color = InkMuted,
                                    textAlign = TextAlign.Center
                                )
                                Spacer(modifier = Modifier.height(6.dp))
                                OroButton(
                                    text = "Retry",
                                    onClick = { viewModel.loadRoutes() },
                                    variant = ButtonVariant.Primary,
                                    size = ButtonSize.Sm
                                )
                            }
                        }
                    }

                    matchedRoutesWithDetails.isEmpty() -> {
                        EmptyState(
                            icon = if (target.isGpsBasedNearMe) Icons.Default.NearMe else Icons.Default.DirectionsBus,
                            title = if (target.isGpsBasedNearMe) "No Nearby Routes Found" else "No verified jeepney route found for this destination",
                            message = if (target.isGpsBasedNearMe)
                                "No traditional jeepney boarding stops found within walking distance (maximum 1.0 km) of your current location. Please verify that you are within Cagayan de Oro transit corridors."
                            else
                                "No verified jeepney route found for this destination directly from your location within walking distance (maximum 1.0 km). You may need to transfer at Agora, Carmen, or Bulua terminals.",
                            tone = EmptyTone.Neutral,
                            action = {
                                OroButton(
                                    text = if (target.isGpsBasedNearMe) "Retry with GPS" else "Explore All Routes",
                                    onClick = {
                                        if (target.isGpsBasedNearMe) {
                                            isLocatingForRoutes = true
                                            coroutineScope.launch {
                                                try {
                                                    val loc = obtainBestDeviceLocation(context)
                                                    if (loc != null) userLocation = LatLng(loc.latitude, loc.longitude)
                                                } finally {
                                                    isLocatingForRoutes = false
                                                }
                                            }
                                        } else {
                                            nearbyRoutesTarget = null
                                            onSearchClick?.invoke()
                                        }
                                    },
                                    variant = ButtonVariant.Secondary,
                                    size = ButtonSize.Sm
                                )
                            }
                        )
                    }

                    else -> {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "${matchedRoutesWithDetails.size} nearest traditional jeepney ${if (matchedRoutesWithDetails.size == 1) "route" else "routes"}",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = Brand600
                            )
                            Text(
                                text = "Nearest boarding stops first",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium,
                                color = InkMuted
                            )
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        LazyColumn(
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                            contentPadding = PaddingValues(bottom = 32.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            items(matchedRoutesWithDetails, key = { it.route.id }) { item ->
                                val r = item.route
                                Surface(
                                    color = Color.White,
                                    shape = RoundedCornerShape(14.dp),
                                    shadowElevation = 2.dp,
                                    border = BorderStroke(1.dp, Line),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Column(modifier = Modifier.padding(14.dp)) {
                                        // Route Code, Name, Traditional Tag
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                                modifier = Modifier.weight(1f)
                                            ) {
                                                RouteBadge(code = r.code, colorHex = r.color, size = BadgeSize.Md)
                                                Column {
                                                    Text(
                                                        text = "Route ${r.code} – ${r.name}",
                                                        fontSize = 14.sp,
                                                        fontWeight = FontWeight.Bold,
                                                        color = Ink,
                                                        maxLines = 1,
                                                        overflow = TextOverflow.Ellipsis
                                                    )
                                                    Text(
                                                        text = "${r.origin} ⇄ ${r.destination}",
                                                        fontSize = 12.sp,
                                                        color = InkSoft,
                                                        maxLines = 1,
                                                        overflow = TextOverflow.Ellipsis
                                                    )
                                                }
                                            }

                                            Surface(
                                                color = Brand50,
                                                shape = RoundedCornerShape(6.dp)
                                            ) {
                                                Text(
                                                    text = "Traditional",
                                                    fontSize = 10.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = Brand700,
                                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                                                )
                                            }
                                        }

                                        Spacer(modifier = Modifier.height(10.dp))

                                        // Nearby stop / loading point info
                                        Surface(
                                            color = Canvas,
                                            shape = RoundedCornerShape(8.dp),
                                            modifier = Modifier.fillMaxWidth()
                                        ) {
                                            Column(modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp)) {
                                                Row(
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                                ) {
                                                    Icon(
                                                        imageVector = Icons.Default.DirectionsWalk,
                                                        contentDescription = null,
                                                        tint = Brand600,
                                                        modifier = Modifier.size(16.dp)
                                                    )
                                                    Column {
                                                        Text(
                                                            text = "${item.nearestStopType ?: "Boarding Stop"}: ${item.nearestStopName}",
                                                            fontSize = 12.sp,
                                                            fontWeight = FontWeight.SemiBold,
                                                            color = Ink
                                                        )
                                                        if (item.walkDistanceMeters != null) {
                                                            val distM = item.walkDistanceMeters
                                                            val distLabel = when {
                                                                distM < 1000 -> "Walk $distM m to boarding stop"
                                                                else -> "Walk ${"%.1f".format(distM / 1000.0)} km to boarding stop"
                                                            }
                                                            val walkMins = Math.max(1, Math.round(distM / 80.0).toInt())
                                                            Text(
                                                                text = "$distLabel (~$walkMins min walk)",
                                                                fontSize = 11.sp,
                                                                fontWeight = FontWeight.Medium,
                                                                color = Ok600
                                                            )
                                                        }
                                                    }
                                                }

                                                if (!item.destinationServed.isNullOrBlank()) {
                                                    Spacer(modifier = Modifier.height(4.dp))
                                                    Row(
                                                        verticalAlignment = Alignment.CenterVertically,
                                                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                                                    ) {
                                                        Icon(
                                                            imageVector = Icons.Default.CheckCircle,
                                                            contentDescription = null,
                                                            tint = Brand600,
                                                            modifier = Modifier.size(12.dp)
                                                        )
                                                        Text(
                                                            text = "Serves ${item.destinationServed}",
                                                            fontSize = 11.sp,
                                                            fontWeight = FontWeight.SemiBold,
                                                            color = Brand600
                                                        )
                                                    }
                                                }
                                            }
                                        }

                                        Spacer(modifier = Modifier.height(8.dp))

                                        // Route stats: Fare, Travel time, Distance along onboard segment
                                        val effectiveKm = item.onboardDistanceKm ?: if (r.lengthKm > 0) r.lengthKm else 4.0
                                        val fareRes = remember(effectiveKm, r.jeepneyType) {
                                            TraditionalJeepneyFareService.calculateFareForDistance(
                                                distanceKm = effectiveKm,
                                                category = PassengerCategory.REGULAR,
                                                jeepneyType = r.jeepneyType
                                            )
                                        }
                                        val travelMins = if (item.onboardDistanceKm != null) {
                                            Math.max(8, Math.round(item.onboardDistanceKm * 3.5).toInt())
                                        } else {
                                            r.travelTime
                                        }

                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.spacedBy(16.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            if (fareRes.isAvailable) {
                                                Row(
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                                ) {
                                                    Text(
                                                        text = "₱${"%.2f".format(fareRes.regularFare)}",
                                                        fontSize = 13.sp,
                                                        fontWeight = FontWeight.Bold,
                                                        color = Ink
                                                    )
                                                    Text(
                                                        text = "(₱${"%.2f".format(fareRes.discountedFare)} disc)",
                                                        fontSize = 11.sp,
                                                        color = InkMuted
                                                    )
                                                }
                                            } else {
                                                Text(
                                                    text = "Fare unavailable",
                                                    fontSize = 12.sp,
                                                    fontWeight = FontWeight.SemiBold,
                                                    color = InkMuted
                                                )
                                            }
                                            Text(
                                                text = "·",
                                                color = InkMuted,
                                                fontWeight = FontWeight.Bold
                                            )
                                            Text(
                                                text = "~$travelMins mins",
                                                fontSize = 12.sp,
                                                color = InkSoft
                                            )
                                            Text(
                                                text = "·",
                                                color = InkMuted,
                                                fontWeight = FontWeight.Bold
                                            )
                                            Text(
                                                text = "${"%.1f".format(effectiveKm)} km",
                                                fontSize = 12.sp,
                                                color = InkMuted
                                            )
                                        }

                                        Spacer(modifier = Modifier.height(12.dp))

                                        // Actions: Show on Map & View Details
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                                        ) {
                                            // Determine route direction based on stop ordering:
                                            // If nearest boarding stop appears before destination-related stop in
                                            // inbound path → Inbound; otherwise Outbound.
                                            val detectedDirection = remember(r, item, target) {
                                                val boardLat = item.nearestStopLat ?: return@remember "Inbound"
                                                val boardLng = item.nearestStopLng ?: return@remember "Inbound"
                                                val inboundPts = parseGeometries(r, "Inbound")
                                                if (inboundPts.size < 2) return@remember "Inbound"
                                                // Find the index of the nearest boarding point in inbound path
                                                val boardIdx = inboundPts.indexOfMinBy { pt ->
                                                    val dLat = pt.latitude - boardLat
                                                    val dLng = pt.longitude - boardLng
                                                    dLat * dLat + dLng * dLng
                                                }
                                                // Find the index of the nearest destination point in inbound path
                                                val destIdx = if (target.lat != null && target.lng != null) {
                                                    val tLat = target.lat
                                                    val tLng = target.lng
                                                    inboundPts.indexOfMinBy { pt ->
                                                        val dLat = pt.latitude - tLat
                                                        val dLng = pt.longitude - tLng
                                                        dLat * dLat + dLng * dLng
                                                    }
                                                } else inboundPts.size - 1
                                                if (boardIdx <= destIdx) "Inbound" else "Outbound"
                                            }

                                            OroButton(
                                                text = "Show on Map",
                                                onClick = {
                                                    selectedRouteId = r.id
                                                    nearbyRoutesTarget = null
                                                    viewModel.selectRouteForGuidance(r.id, detectedDirection, userLocation)
                                                    val pts = getAllRouteCoordinates(r)
                                                    if (pts.isNotEmpty()) {
                                                        coroutineScope.launch {
                                                            val builder = LatLngBounds.builder()
                                                            userLocation?.let { builder.include(it) }
                                                            if (item.nearestStopLat != null && item.nearestStopLng != null) {
                                                                builder.include(LatLng(item.nearestStopLat, item.nearestStopLng))
                                                            }
                                                            pts.forEach { builder.include(it) }
                                                            try {
                                                                cameraPositionState.animate(
                                                                    CameraUpdateFactory.newLatLngBounds(builder.build(), 120),
                                                                    600
                                                                )
                                                            } catch (_: Exception) {
                                                                val targetPt = userLocation ?: pts.first()
                                                                cameraPositionState.animate(
                                                                    CameraUpdateFactory.newLatLngZoom(targetPt, 15f),
                                                                    600
                                                                )
                                                            }
                                                        }
                                                    }
                                                },
                                                variant = ButtonVariant.Secondary,
                                                size = ButtonSize.Sm,
                                                modifier = Modifier.weight(1f)
                                            )

                                            OroButton(
                                                text = "View Details",
                                                onClick = {
                                                    val destTitle = (if (!target.isGpsBasedNearMe) target.title else null) ?: item.destinationServed ?: r.destination
                                                    val dLat = if (!target.isGpsBasedNearMe) target.lat else null
                                                    val dLng = if (!target.isGpsBasedNearMe) target.lng else null
                                                    val encodedDest = try { URLEncoder.encode(destTitle, "UTF-8") } catch (_: Exception) { destTitle }
                                                    val encodedBName = try { URLEncoder.encode(item.nearestStopName, "UTF-8") } catch (_: Exception) { item.nearestStopName }
                                                    val dropoffName = item.dropoffStopName ?: destTitle
                                                    val encodedDName = try { URLEncoder.encode(dropoffName, "UTF-8") } catch (_: Exception) { dropoffName }

                                                    val navPath = buildString {
                                                        append("route_info/${r.id}?destination=$encodedDest&direction=$detectedDirection")
                                                        if (dLat != null && dLng != null) append("&destLat=$dLat&destLng=$dLng")
                                                        if (item.nearestStopLat != null && item.nearestStopLng != null) {
                                                            append("&boardingName=$encodedBName&boardingLat=${item.nearestStopLat}&boardingLng=${item.nearestStopLng}")
                                                        }
                                                        if (dLat != null && dLng != null) {
                                                            append("&dropoffName=$encodedDName&dropoffLat=$dLat&dropoffLng=$dLng")
                                                        }
                                                        if (item.walkDistanceMeters != null) {
                                                            append("&walkDistanceMeters=${item.walkDistanceMeters}")
                                                        }
                                                        if (item.onboardDistanceKm != null) {
                                                            append("&onboardDistanceKm=${item.onboardDistanceKm}")
                                                        }
                                                    }
                                                    nearbyRoutesTarget = null
                                                    onNavigateRouteInfo(navPath)
                                                },
                                                variant = ButtonVariant.Primary,
                                                size = ButtonSize.Sm,
                                                modifier = Modifier.weight(1f)
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // CDO city-wide bounds for double-tap zoom-out: covers ~Bulua to Bugo/Puerto
    val cdoCityWideBounds = remember {
        LatLngBounds(
            LatLng(8.4200, 124.5700), // SW — Bulua / Upper Carmen
            LatLng(8.5350, 124.7550)  // NE — Bugo / Puerto / Macajalar Bay
        )
    }

    // Double-tap detection state (survives recomposition without triggering it)
    var lastTapDownTime by remember { mutableLongStateOf(0L) }
    var lastTapDownX by remember { mutableFloatStateOf(0f) }
    var lastTapDownY by remember { mutableFloatStateOf(0f) }

    @OptIn(ExperimentalComposeUiApi::class)
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(contentPadding)
            .pointerInteropFilter { event ->
                when (event.action) {
                    MotionEvent.ACTION_DOWN -> {
                        val now = SystemClock.uptimeMillis()
                        val dt = now - lastTapDownTime
                        val dx = event.x - lastTapDownX
                        val dy = event.y - lastTapDownY
                        val dist = Math.sqrt((dx * dx + dy * dy).toDouble()).toFloat()
                        if (event.pointerCount == 1 && dt in 40..350 && dist < 80f) {
                            // Detected a double-tap — animate to city-wide CDO view and consume
                            lastTapDownTime = 0L
                            coroutineScope.launch {
                                // padding: top 120dp for search pill, bottom 180dp for nav + cards
                                cameraPositionState.animate(
                                    CameraUpdateFactory.newLatLngBounds(cdoCityWideBounds, 100),
                                    600
                                )
                            }
                            true // consume — prevents Maps SDK from zoom-in
                        } else {
                            lastTapDownTime = now
                            lastTapDownX = event.x
                            lastTapDownY = event.y
                            false // pass through — single tap / drag start
                        }
                    }
                    else -> false
                }
            }
    ) {
        GoogleMap(
            modifier = Modifier.fillMaxSize(),
            cameraPositionState = cameraPositionState,
            properties = MapProperties(
                isMyLocationEnabled = hasLocationPermission,
                minZoomPreference = 3.0f,
                maxZoomPreference = 20.0f
            ),
            uiSettings = MapUiSettings(
                myLocationButtonEnabled = false, // Using our custom OroRuta styled location button
                zoomControlsEnabled = false,
                compassEnabled = true,
                mapToolbarEnabled = false,
                indoorLevelPickerEnabled = false,
                tiltGesturesEnabled = false,
                rotationGesturesEnabled = true,
                scrollGesturesEnabled = true,
                scrollGesturesEnabledDuringRotateOrZoom = true,
                zoomGesturesEnabled = true // pinch-to-zoom remains enabled
            ),
            onMapLoaded = {
                mapReady = true
                val cur = cameraPositionState.position.target
                if ((cur.latitude == 0.0 && cur.longitude == 0.0) || cur.latitude.isNaN() || cur.longitude.isNaN()) {
                    cameraPositionState.move(CameraUpdateFactory.newCameraPosition(defaultCamera))
                }
            },
            onMapClick = {
                showSuggestions = false
                selectedMarker = null
                selectedRouteId = null
                viewModel.clearDirections()
            },
            onPOIClick = { poi ->
                selectedMarker = MapMarker(
                    id = poi.placeId ?: poi.name,
                    name = poi.name,
                    x = 0f,
                    y = 0f,
                    kind = "landmark",
                    note = null,
                    lat = poi.latLng.latitude,
                    lng = poi.latLng.longitude,
                    area = "Cagayan de Oro City"
                )
                viewModel.saveRecentSearch(
                    placeId = poi.placeId,
                    name = poi.name,
                    address = "Cagayan de Oro City",
                    category = "landmark",
                    lat = poi.latLng.latitude,
                    lng = poi.latLng.longitude
                )
                selectedRouteId = null
                viewModel.clearDirections()
                coroutineScope.launch {
                    cameraPositionState.animate(
                        CameraUpdateFactory.newLatLngZoom(poi.latLng, 16f),
                        400
                    )
                }
            }
        ) {
            val currentGuidance = viewModel.routeGuidance
            val isSingleRouteMode = currentGuidance != null || !selectedRouteId.isNullOrBlank()

            if (isSingleRouteMode) {
                // ========================================================
                // 1. SPECIFIC SELECTED ROUTE MODE
                // Only render the active route's verified polyline & stops.
                // Hide ALL other routes and all citywide cdoStops.
                // ========================================================
                val activeRoute = currentGuidance?.route
                    ?: dbRoutes.find { it.id == selectedRouteId || it.code.equals(selectedRouteId, ignoreCase = true) }

                if (activeRoute != null) {
                    val activeDirection = currentGuidance?.direction ?: "Inbound"
                    val routePts = currentGuidance?.routePoints?.takeIf { it.isNotEmpty() }
                        ?: parseGeometries(activeRoute, activeDirection)

                    val gColor = try {
                        Color(android.graphics.Color.parseColor(activeRoute.color))
                    } catch (_: Exception) {
                        Brand600
                    }

                    // A. Walking path to boarding stop (if walking is needed)
                    if (currentGuidance != null && currentGuidance.walkingPathToBoarding.size >= 2) {
                        Polyline(
                            points = currentGuidance.walkingPathToBoarding,
                            color = Color(0x66000000),
                            width = 14f,
                            zIndex = 8f
                        )
                        Polyline(
                            points = currentGuidance.walkingPathToBoarding,
                            color = Color(0xFF1565C0),
                            width = 10f,
                            pattern = listOf(Dash(20f), Gap(12f)),
                            zIndex = 9f
                        )
                    }

                    // B. Selected Route Polyline (High-contrast casing + vibrant color)
                    if (routePts.size >= 2) {
                        Polyline(
                            points = routePts,
                            color = Color.White,
                            width = 18f,
                            zIndex = 6f
                        )
                        Polyline(
                            points = routePts,
                            color = gColor,
                            width = 13f,
                            zIndex = 7f,
                            clickable = true,
                            onClick = {
                                onNavigateRouteInfo(activeRoute.id)
                            }
                        )

                        // Origin Marker (Azure Pin)
                        val originPt = routePts.first()
                        Marker(
                            state = rememberMarkerState(
                                key = "origin_${activeRoute.id}_$activeDirection",
                                position = originPt
                            ),
                            title = "Origin: ${activeRoute.origin}",
                            snippet = "Start of $activeDirection Route",
                            icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_AZURE),
                            zIndex = 10f,
                            onClick = {
                                selectedMarker = MapMarker(
                                    id = "origin_${activeRoute.id}",
                                    name = "Origin: ${activeRoute.origin}",
                                    kind = "terminal",
                                    note = "Route start terminal/point",
                                    lat = originPt.latitude,
                                    lng = originPt.longitude,
                                    area = activeRoute.origin
                                )
                                true
                            }
                        )

                        // Destination Marker (Red Pin)
                        val destPt = routePts.last()
                        Marker(
                            state = rememberMarkerState(
                                key = "dest_${activeRoute.id}_$activeDirection",
                                position = destPt
                            ),
                            title = "Destination: ${activeRoute.destination}",
                            snippet = "End of $activeDirection Route",
                            icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_RED),
                            zIndex = 10f,
                            onClick = {
                                selectedMarker = MapMarker(
                                    id = "dest_${activeRoute.id}",
                                    name = "Destination: ${activeRoute.destination}",
                                    kind = "terminal",
                                    note = "Route destination terminal/point",
                                    lat = destPt.latitude,
                                    lng = destPt.longitude,
                                    area = activeRoute.destination
                                )
                                true
                            }
                        )
                    }

                    // C. Verified Terminals for this route (Orange)
                    activeRoute.terminals.filter { it.lat != 0.0 && it.lng != 0.0 }.forEach { term ->
                        Marker(
                            state = rememberMarkerState(key = "spec_term_${term.id}", position = LatLng(term.lat, term.lng)),
                            title = term.name,
                            snippet = "TERMINAL · ${term.note ?: "LPTRP Verified Terminal"}",
                            icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_ORANGE),
                            zIndex = 9f,
                            onClick = {
                                selectedMarker = MapMarker(
                                    id = term.id,
                                    name = term.name,
                                    kind = "terminal",
                                    note = term.note,
                                    lat = term.lat,
                                    lng = term.lng,
                                    area = "Cagayan de Oro City"
                                )
                                true
                            }
                        )
                    }

                    // D. Verified Loading Points for this route (Green)
                    activeRoute.stops.filter { it.lat != 0.0 && it.lng != 0.0 && !it.pointType.equals("unloading", ignoreCase = true) }.forEach { stop ->
                        Marker(
                            state = rememberMarkerState(key = "spec_loading_${stop.id}", position = LatLng(stop.lat, stop.lng)),
                            title = stop.name,
                            snippet = "LOADING POINT · ${stop.note ?: "Boarding Point"}",
                            icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_GREEN),
                            zIndex = 9f,
                            onClick = {
                                selectedMarker = MapMarker(
                                    id = stop.id,
                                    name = stop.name,
                                    kind = "loading",
                                    note = stop.note,
                                    lat = stop.lat,
                                    lng = stop.lng,
                                    area = "Cagayan de Oro City"
                                )
                                true
                            }
                        )
                    }

                    // E. Verified Unloading Points for this route (Rose/Red)
                    activeRoute.stops.filter { it.lat != 0.0 && it.lng != 0.0 && it.pointType.equals("unloading", ignoreCase = true) }.forEach { stop ->
                        Marker(
                            state = rememberMarkerState(key = "spec_unloading_${stop.id}", position = LatLng(stop.lat, stop.lng)),
                            title = stop.name,
                            snippet = "UNLOADING POINT · ${stop.note ?: "Drop-off Point"}",
                            icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_ROSE),
                            zIndex = 9f,
                            onClick = {
                                selectedMarker = MapMarker(
                                    id = stop.id,
                                    name = stop.name,
                                    kind = "unloading",
                                    note = stop.note,
                                    lat = stop.lat,
                                    lng = stop.lng,
                                    area = "Cagayan de Oro City"
                                )
                                true
                            }
                        )
                    }

                    // F. Verified Transfer Points for this route (Yellow/Amber)
                    activeRoute.transfers.filter { it.lat != 0.0 && it.lng != 0.0 }.forEach { tr ->
                        Marker(
                            state = rememberMarkerState(key = "spec_transfer_${tr.id}", position = LatLng(tr.lat, tr.lng)),
                            title = tr.name,
                            snippet = "TRANSFER POINT · ${tr.note ?: "Transfer Connection"}",
                            icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_YELLOW),
                            zIndex = 9f,
                            onClick = {
                                selectedMarker = MapMarker(
                                    id = tr.id,
                                    name = tr.name,
                                    kind = "transfer",
                                    note = tr.note,
                                    lat = tr.lat,
                                    lng = tr.lng,
                                    area = "Cagayan de Oro City"
                                )
                                true
                            }
                        )
                    }
                }
            } else {
                // ========================================================
                // 2. GENERAL MAP MODE (Normal Map Tab behavior)
                // Route polylines/stops are HIDDEN by default (showJeepneyRoutes = false).
                // They only appear when the user explicitly enables the layer toggle.
                // ========================================================
                if (showJeepneyRoutes && dbRoutes.isNotEmpty()) {
                    dbRoutes.forEach { route ->
                        val pts = parseGeometries(route)
                        if (pts.size >= 2) {
                            val color = try {
                                Color(android.graphics.Color.parseColor(route.color))
                            } catch (_: Exception) {
                                Color(0xFF1471B0)
                            }
                            val isHighlighted = selectedRouteId == route.id
                            Polyline(
                                points = pts,
                                color = if (isHighlighted) Color(0xFFFF9800) else color,
                                width = if (isHighlighted) 14f else 10f,
                                clickable = true,
                                onClick = {
                                    selectedRouteId = route.id
                                    viewModel.selectRouteForGuidance(route.id, "Inbound", userLocation)
                                }
                            )
                        }
                    }
                }
                // No fallback polyline — clean map by default.

                // Stop markers only shown when the respective layer is toggled on
                if (showTerminals || showLoadingPoints || showUnloadingPoints || showTransferPoints || showLandmarks) {
                    cdoStops.forEach { stop ->
                        val shouldShow = when (stop.kind) {
                            "terminal" -> showTerminals
                            "loading" -> showLoadingPoints
                            "unloading" -> showUnloadingPoints
                            "transfer" -> showTransferPoints
                            else -> showLandmarks
                        }
                        if (shouldShow) {
                            val markerHue = when (stop.kind) {
                                "terminal" -> BitmapDescriptorFactory.HUE_AZURE
                                "loading" -> BitmapDescriptorFactory.HUE_GREEN
                                "unloading" -> BitmapDescriptorFactory.HUE_ROSE
                                "transfer" -> BitmapDescriptorFactory.HUE_ORANGE
                                else -> BitmapDescriptorFactory.HUE_RED
                            }
                            Marker(
                                state = rememberMarkerState(
                                    key = "gen_${stop.id}",
                                    position = LatLng(stop.lat, stop.lng)
                                ),
                                title = stop.name,
                                snippet = "${stop.kind.uppercase()}${if (stop.routes.isNotBlank()) " · Routes: ${stop.routes}" else ""}",
                                icon = BitmapDescriptorFactory.defaultMarker(markerHue),
                                onClick = {
                                    selectedMarker = MapMarker(
                                        id = stop.id,
                                        name = stop.name,
                                        x = 0f,
                                        y = 0f,
                                        kind = stop.kind,
                                        note = stop.routes,
                                        lat = stop.lat,
                                        lng = stop.lng,
                                        area = stop.area
                                    )
                                    viewModel.saveRecentSearch(
                                        placeId = stop.id,
                                        name = stop.name,
                                        address = stop.area ?: "Cagayan de Oro City",
                                        category = stop.kind,
                                        lat = stop.lat,
                                        lng = stop.lng
                                    )
                                    coroutineScope.launch {
                                        cameraPositionState.animate(
                                            CameraUpdateFactory.newLatLngZoom(LatLng(stop.lat, stop.lng), 16f),
                                            500
                                        )
                                    }
                                    true
                                }
                            )
                        }
                    }
                }
            }

            // Calculated Directions Line Guide (Walking & Jeepney Polyline & Markers)
            val mapDir = viewModel.mapDirectionsState
            if (mapDir != null) {
                if (mapDir.noRouteFound && mapDir.walkingOnlyPoints != null && mapDir.walkingOnlyPoints.size >= 2) {
                    // Road-network walking line guide (dashed)
                    Polyline(
                        points = mapDir.walkingOnlyPoints,
                        color = Color(0x66000000),
                        width = 14f,
                        zIndex = 8f
                    )
                    Polyline(
                        points = mapDir.walkingOnlyPoints,
                        color = Color(0xFF1565C0),
                        width = 10f,
                        pattern = listOf(Dash(20f), Gap(12f)),
                        zIndex = 9f
                    )
                    Marker(
                        state = rememberMarkerState(key = "dir_origin_walk", position = LatLng(mapDir.originLat, mapDir.originLng)),
                        title = mapDir.originName,
                        snippet = "Trip Origin",
                        icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_AZURE),
                        zIndex = 12f
                    )
                    Marker(
                        state = rememberMarkerState(key = "dir_dest_walk", position = LatLng(mapDir.destinationLat, mapDir.destinationLng)),
                        title = mapDir.destinationName,
                        snippet = "Walking Destination",
                        icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_RED),
                        zIndex = 12f
                    )
                } else if (mapDir.selectedTrip != null) {
                    val trip = mapDir.selectedTrip!!
                    val rColor = try {
                        Color(android.graphics.Color.parseColor(trip.segments.firstOrNull()?.color ?: "#1471B0"))
                    } catch (_: Exception) {
                        Brand600
                    }

                    // Leg 1: Walk to boarding stop (dashed road-following)
                    if (mapDir.walkToBoardPoints.size >= 2) {
                        Polyline(
                            points = mapDir.walkToBoardPoints,
                            color = Color(0x66000000),
                            width = 14f,
                            zIndex = 8f
                        )
                        Polyline(
                            points = mapDir.walkToBoardPoints,
                            color = Color(0xFF1565C0),
                            width = 10f,
                            pattern = listOf(Dash(20f), Gap(12f)),
                            zIndex = 9f
                        )
                    }

                    // Leg 2: Jeepney ride segment (solid, visibly colored line using verified route geometry)
                    if (mapDir.jeepneyPoints.size >= 2) {
                        Polyline(
                            points = mapDir.jeepneyPoints,
                            color = Color.White,
                            width = 18f,
                            zIndex = 10f
                        )
                        Polyline(
                            points = mapDir.jeepneyPoints,
                            color = rColor,
                            width = 12f,
                            zIndex = 11f
                        )
                    }

                    // Leg 3: Walk from drop-off to destination (dashed road-following)
                    if (mapDir.walkFromDropPoints.size >= 2) {
                        Polyline(
                            points = mapDir.walkFromDropPoints,
                            color = Color(0x66000000),
                            width = 14f,
                            zIndex = 8f
                        )
                        Polyline(
                            points = mapDir.walkFromDropPoints,
                            color = Color(0xFF1565C0),
                            width = 10f,
                            pattern = listOf(Dash(20f), Gap(12f)),
                            zIndex = 9f
                        )
                    }

                    // Markers
                    // 1. Origin marker
                    Marker(
                        state = rememberMarkerState(key = "dir_origin_pt", position = LatLng(mapDir.originLat, mapDir.originLng)),
                        title = mapDir.originName,
                        snippet = "Trip Origin",
                        icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_AZURE),
                        zIndex = 13f
                    )

                    // 2. Boarding stop marker with label
                    if (trip.boardingLat != null && trip.boardingLng != null && (trip.boardingLat != 0.0 || trip.boardingLng != 0.0)) {
                        Marker(
                            state = rememberMarkerState(key = "dir_board_pt", position = LatLng(trip.boardingLat, trip.boardingLng)),
                            title = "Board: ${trip.boardingName ?: "Loading Point"}",
                            snippet = "Board Route ${trip.segments.firstOrNull()?.code ?: ""}",
                            icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_GREEN),
                            zIndex = 13f
                        )
                    }

                    // 3. Alighting stop marker with label
                    if (trip.dropoffLat != null && trip.dropoffLng != null && (trip.dropoffLat != 0.0 || trip.dropoffLng != 0.0)) {
                        Marker(
                            state = rememberMarkerState(key = "dir_drop_pt", position = LatLng(trip.dropoffLat, trip.dropoffLng)),
                            title = "Alight: ${trip.dropoffName ?: "Drop-off Point"}",
                            snippet = "Alight here ('Lugar lang')",
                            icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_ORANGE),
                            zIndex = 13f
                        )
                    }

                    // 4. Destination marker
                    Marker(
                        state = rememberMarkerState(key = "dir_dest_pt", position = LatLng(mapDir.destinationLat, mapDir.destinationLng)),
                        title = mapDir.destinationName,
                        snippet = "Trip Destination",
                        icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_RED),
                        zIndex = 13f
                    )
                }
            } else {
                val guide = viewModel.directionsGuide
                if (guide != null && guide.pathPoints.size >= 2) {
                    Polyline(
                        points = guide.pathPoints,
                        color = Color(0x66000000),
                        width = 18f
                    )
                    Polyline(
                        points = guide.pathPoints,
                        color = Color(0xFF1471B0),
                        width = 12f
                    )
                    Marker(
                        state = rememberMarkerState(key = "directions_origin_marker", position = LatLng(guide.originLat, guide.originLng)),
                        title = "Starting Point (${guide.originName})",
                        snippet = "GPS Current Location",
                        icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_AZURE)
                    )
                    Marker(
                        state = rememberMarkerState(key = "directions_dest_marker", position = LatLng(guide.destinationLat, guide.destinationLng)),
                        title = guide.destinationName,
                        snippet = "Selected Destination",
                        icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_RED)
                    )
                }
            }

            // User location custom marker (alongside native Google Maps blue dot)
            if (hasLocationPermission && userLocation != null && mapDir == null) {
                Marker(
                    state = userMarkerState,
                    title = "Your Location",
                    snippet = "Current GPS position",
                    icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_AZURE)
                )
            }

            // Selected place marker (from search or tapped marker)
            if (mapDir == null && selectedMarker != null && selectedMarker?.lat != null && selectedMarker?.lng != null) {
                val sm = selectedMarker!!
                val markerHue = when (sm.kind) {
                    "terminal" -> BitmapDescriptorFactory.HUE_AZURE
                    "loading" -> BitmapDescriptorFactory.HUE_GREEN
                    "unloading" -> BitmapDescriptorFactory.HUE_ROSE
                    "transfer" -> BitmapDescriptorFactory.HUE_ORANGE
                    else -> BitmapDescriptorFactory.HUE_RED
                }
                Marker(
                    state = rememberMarkerState(
                        key = "selected_marker_${sm.id}_${sm.lat}_${sm.lng}",
                        position = LatLng(sm.lat!!, sm.lng!!)
                    ),
                    title = sm.name,
                    snippet = sm.area ?: "Selected Location",
                    icon = BitmapDescriptorFactory.defaultMarker(markerHue),
                    zIndex = 20f
                )
            }

            // NOTE: We do NOT use MapEffect with setOnCameraIdleListener/
            // setOnCameraMoveStartedListener here — that would override
            // maps-compose's internal listeners and break CameraPositionState sync.
        }

        // Auto-fit camera for mapDirectionsState
        LaunchedEffect(viewModel.mapDirectionsState?.selectedTrip, viewModel.mapDirectionsState?.walkingOnlyPoints) {
            val dir = viewModel.mapDirectionsState ?: return@LaunchedEffect
            val pts = mutableListOf<LatLng>()
            pts.add(LatLng(dir.originLat, dir.originLng))
            pts.add(LatLng(dir.destinationLat, dir.destinationLng))
            dir.selectedTrip?.boardingLat?.let { bLat ->
                dir.selectedTrip?.boardingLng?.let { bLng ->
                    if (bLat != 0.0 && bLng != 0.0) pts.add(LatLng(bLat, bLng))
                }
            }
            dir.selectedTrip?.dropoffLat?.let { dLat ->
                dir.selectedTrip?.dropoffLng?.let { dLng ->
                    if (dLat != 0.0 && dLng != 0.0) pts.add(LatLng(dLat, dLng))
                }
            }
            pts.addAll(dir.walkToBoardPoints)
            pts.addAll(dir.jeepneyPoints)
            pts.addAll(dir.walkFromDropPoints)
            dir.walkingOnlyPoints?.let { pts.addAll(it) }

            val validPts = pts.filter { it.latitude != 0.0 && it.longitude != 0.0 && !it.latitude.isNaN() && !it.longitude.isNaN() }
            if (validPts.size >= 2) {
                val builder = LatLngBounds.builder()
                validPts.forEach { builder.include(it) }
                val bounds = builder.build()
                cameraPositionState.animate(
                    CameraUpdateFactory.newLatLngBounds(bounds, 130),
                    600
                )
            }
        }


        // Map Controls: Layers button and GPS / My Location button (Right side, stacked below search bar)
        Column(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .statusBarsPadding()
                .padding(top = 66.dp, end = 16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Layers button
            Surface(
                color = Color.White,
                shape = CircleShape,
                shadowElevation = 4.dp,
                modifier = Modifier
                    .size(42.dp)
                    .clickable { showLayersSheet = true }
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        Icons.Default.Layers,
                        contentDescription = "Layers",
                        tint = Brand600,
                        modifier = Modifier.size(22.dp)
                    )
                }
            }

            // GPS / Current Location button
            Surface(
                color = Color.White,
                shape = CircleShape,
                shadowElevation = 4.dp,
                modifier = Modifier
                    .size(42.dp)
                    .clickable { requestLocationOrSettings() }
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = when {
                            isLocating -> Icons.Default.LocationSearching
                            hasLocationPermission -> Icons.Default.MyLocation
                            else -> Icons.Default.LocationDisabled
                        },
                        contentDescription = "Center on current location",
                        tint = if (hasLocationPermission) Brand600 else InkMuted,
                        modifier = Modifier.size(22.dp)
                    )
                }
            }
        }

        // 1. TOP FLOATING SEARCH BAR & SUGGESTIONS
        var searchResultsPlaces by remember { mutableStateOf<List<Place>>(emptyList()) }
        var isSearchingPlaces by remember { mutableStateOf(false) }

        LaunchedEffect(mapSearchQuery) {
            val q = mapSearchQuery.trim()
            if (q.length < 2) {
                searchResultsPlaces = emptyList()
                isSearchingPlaces = false
            } else {
                isSearchingPlaces = true
                delay(250)
                searchResultsPlaces = viewModel.searchPlaces(q)
                isSearchingPlaces = false
            }
        }

        Column(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .statusBarsPadding()
                .padding(horizontal = 16.dp, vertical = 8.dp)
                .fillMaxWidth()
        ) {
            Surface(
                color = Color.White,
                shape = RoundedCornerShape(24.dp),
                shadowElevation = 6.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    if (isPushed && onBack != null) {
                        IconButton(onClick = onBack, modifier = Modifier.size(24.dp)) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Ink)
                        }
                    } else {
                        Icon(Icons.Default.Search, contentDescription = null, tint = Brand600)
                    }

                    BasicTextField(
                        value = mapSearchQuery,
                        onValueChange = {
                            mapSearchQuery = it
                            showSuggestions = true
                        },
                        singleLine = true,
                        textStyle = MaterialTheme.typography.bodyMedium.copy(color = Ink),
                        modifier = Modifier
                            .weight(1f)
                            .onFocusChanged { focusState ->
                                if (focusState.isFocused) {
                                    showSuggestions = true
                                }
                            },
                        decorationBox = { innerTextField ->
                            Box(contentAlignment = Alignment.CenterStart) {
                                if (mapSearchQuery.isEmpty()) {
                                    Text(
                                        text = "Search jeepney routes or places...",
                                        fontSize = 14.sp,
                                        color = InkMuted
                                    )
                                }
                                innerTextField()
                            }
                        }
                    )

                    if (mapSearchQuery.isNotBlank()) {
                        IconButton(
                            onClick = {
                                mapSearchQuery = ""
                                searchResultsPlaces = emptyList()
                                showSuggestions = true
                            },
                            modifier = Modifier.size(24.dp)
                        ) {
                            Icon(Icons.Default.Clear, contentDescription = "Clear", tint = InkMuted, modifier = Modifier.size(16.dp))
                        }
                    }

                    Box(
                        modifier = Modifier
                            .size(28.dp)
                            .clip(CircleShape)
                            .background(Brand50),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Tune, contentDescription = "Filter", tint = Brand600, modifier = Modifier.size(16.dp))
                    }
                }
            }

            // Recent Searches Panel (shown when search bar is focused and query is empty)
            if (showSuggestions && mapSearchQuery.trim().isEmpty()) {
                Spacer(modifier = Modifier.height(4.dp))
                Surface(
                    color = Color.White,
                    shape = RoundedCornerShape(16.dp),
                    shadowElevation = 8.dp,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(end = 56.dp)
                        .imePadding()
                ) {
                    Column(
                        modifier = Modifier
                            .padding(vertical = 8.dp)
                            .heightIn(max = 280.dp)
                            .verticalScroll(rememberScrollState())
                    ) {
                        // Header
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Default.History,
                                contentDescription = null,
                                tint = InkMuted,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Recent searches",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = InkMuted
                            )
                            Spacer(modifier = Modifier.weight(1f))
                            if (recentSearches.isNotEmpty()) {
                                Text(
                                    text = "Clear all",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = Brand600,
                                    modifier = Modifier
                                        .clickable { viewModel.clearAllRecentSearches() }
                                        .padding(4.dp)
                                )
                            }
                        }

                        val validRecents = remember(recentSearches) {
                            recentSearches.filter { it.lat != 0.0 && it.lng != 0.0 && !it.lat.isNaN() && !it.lng.isNaN() }
                        }

                        if (validRecents.isEmpty()) {
                            Text(
                                text = "No recent searches yet",
                                fontSize = 13.sp,
                                color = InkMuted,
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)
                            )
                        } else {
                            validRecents.forEach { recent ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable {
                                            showSuggestions = false
                                            focusManager.clearFocus()
                                            keyboardController?.hide()
                                            selectedRouteId = null
                                            selectedMarker = MapMarker(
                                                id = recent.placeId ?: recent.id,
                                                name = recent.name,
                                                kind = recent.category,
                                                lat = recent.lat,
                                                lng = recent.lng,
                                                area = recent.address
                                            )
                                            viewModel.saveRecentSearch(
                                                placeId = recent.placeId,
                                                name = recent.name,
                                                address = recent.address,
                                                category = recent.category,
                                                lat = recent.lat,
                                                lng = recent.lng
                                            )
                                            coroutineScope.launch {
                                                cameraPositionState.animate(
                                                    CameraUpdateFactory.newLatLngZoom(LatLng(recent.lat, recent.lng), 16.5f),
                                                    600
                                                )
                                            }
                                        }
                                        .padding(horizontal = 16.dp, vertical = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    Icon(
                                        Icons.Default.History,
                                        contentDescription = null,
                                        tint = InkMuted,
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = recent.name,
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Ink,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                        Text(
                                            text = recent.address ?: recent.category,
                                            fontSize = 12.sp,
                                            color = InkMuted,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }
                                    IconButton(
                                        onClick = { viewModel.removeRecentSearch(recent.id) },
                                        modifier = Modifier.size(24.dp)
                                    ) {
                                        Icon(
                                            Icons.Default.Close,
                                            contentDescription = "Remove",
                                            tint = InkMuted,
                                            modifier = Modifier.size(14.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            val matchingPlaces = remember(mapSearchQuery, searchResultsPlaces, dbPlaces) {
                if (mapSearchQuery.isBlank()) emptyList()
                else {
                    val combined = (searchResultsPlaces + dbPlaces.filter {
                        it.name.contains(mapSearchQuery, true) || (it.area?.contains(mapSearchQuery, true) == true)
                    })
                    val seen = mutableSetOf<String>()
                    combined.filter { seen.add(it.name.lowercase().trim()) }.take(6)
                }
            }
            val matchingRoutes = remember(mapSearchQuery, dbRoutes) {
                if (mapSearchQuery.isBlank()) emptyList()
                else dbRoutes.filter { it.code.contains(mapSearchQuery, true) || it.name.contains(mapSearchQuery, true) || it.destination.contains(mapSearchQuery, true) }.take(4)
            }

            if (showSuggestions && mapSearchQuery.trim().length >= 2) {
                Spacer(modifier = Modifier.height(4.dp))
                Surface(
                    color = Color.White,
                    shape = RoundedCornerShape(16.dp),
                    shadowElevation = 8.dp,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(end = 56.dp)
                        .imePadding()
                ) {
                    Column(
                        modifier = Modifier
                            .padding(vertical = 6.dp)
                            .heightIn(max = 280.dp)
                            .verticalScroll(rememberScrollState())
                    ) {
                        matchingPlaces.forEach { place ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        showSuggestions = false
                                        focusManager.clearFocus()
                                        keyboardController?.hide()
                                        selectedRouteId = null
                                        selectedMarker = MapMarker(
                                            id = place.id,
                                            name = place.name,
                                            kind = place.kind,
                                            lat = place.lat,
                                            lng = place.lng,
                                            area = place.area
                                        )
                                        viewModel.saveRecentSearch(
                                            placeId = place.id,
                                            name = place.name,
                                            address = place.area,
                                            category = place.kind,
                                            lat = place.lat,
                                            lng = place.lng
                                        )
                                        if (place.lat != 0.0 && place.lng != 0.0) {
                                            coroutineScope.launch {
                                                cameraPositionState.animate(
                                                    CameraUpdateFactory.newLatLngZoom(LatLng(place.lat, place.lng), 16.5f),
                                                    600
                                                )
                                            }
                                        }
                                    }
                                    .padding(horizontal = 16.dp, vertical = 10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Icon(Icons.Default.Place, contentDescription = null, tint = Brand600, modifier = Modifier.size(18.dp))
                                Column {
                                    Text(place.name, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Ink)
                                    Text(place.area ?: "Cagayan de Oro City", fontSize = 12.sp, color = InkMuted)
                                }
                            }
                        }

                        matchingRoutes.forEach { route ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        showSuggestions = false
                                        focusManager.clearFocus()
                                        keyboardController?.hide()
                                        onNavigateRouteInfo(route.id)
                                    }
                                    .padding(horizontal = 16.dp, vertical = 10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                RouteBadge(code = route.code, colorHex = route.color, size = BadgeSize.Sm)
                                Column {
                                    Text("Route ${route.code} — ${route.name}", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Ink)
                                    Text("${route.origin} → ${route.destination}", fontSize = 12.sp, color = InkMuted)
                                }
                            }
                        }

                        if (isSearchingPlaces && matchingPlaces.isEmpty() && matchingRoutes.isEmpty()) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp, vertical = 12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                CircularProgressIndicator(color = Brand600, strokeWidth = 2.dp, modifier = Modifier.size(16.dp))
                                Text("Searching locations…", fontSize = 13.sp, color = InkMuted)
                            }
                        } else if (!isSearchingPlaces && matchingPlaces.isEmpty() && matchingRoutes.isEmpty()) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp, vertical = 12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Icon(Icons.Default.SearchOff, contentDescription = null, tint = InkMuted, modifier = Modifier.size(18.dp))
                                Text("No matching locations found", fontSize = 13.sp, color = InkMuted)
                            }
                        }
                    }
                }
            }
        }


        // 3. BOTTOM CARD VARIANTS
        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp)
        ) {
            if (viewModel.mapDirectionsState != null) {
                val mapDir = viewModel.mapDirectionsState!!
                Surface(
                    color = Color.White,
                    shape = RoundedCornerShape(20.dp),
                    shadowElevation = 10.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier
                            .padding(16.dp)
                            .heightIn(max = 420.dp)
                            .verticalScroll(rememberScrollState())
                    ) {
                        // Header: Back icon + Title/Subtitle + Close icon
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                modifier = Modifier.weight(1f, fill = false)
                            ) {
                                IconButton(
                                    onClick = { viewModel.clearMapDirections() },
                                    modifier = Modifier.size(28.dp)
                                ) {
                                    Icon(
                                        Icons.AutoMirrored.Filled.ArrowBack,
                                        contentDescription = "Back to place card",
                                        tint = Ink
                                    )
                                }
                                Column {
                                    Text(
                                        text = "Directions to ${mapDir.destinationName}",
                                        fontSize = 15.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Ink,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Text(
                                        text = if (mapDir.isGpsOrigin) "From Your Location" else "From ${mapDir.originName}",
                                        fontSize = 11.sp,
                                        color = InkMuted
                                    )
                                }
                            }

                            IconButton(
                                onClick = {
                                    viewModel.clearMapDirections()
                                    selectedMarker = null
                                },
                                modifier = Modifier.size(28.dp)
                            ) {
                                Icon(Icons.Default.Close, contentDescription = "Close", tint = InkMuted)
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        if (mapDir.isLoading) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 24.dp),
                                horizontalArrangement = Arrangement.Center,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                CircularProgressIndicator(
                                    color = Brand600,
                                    strokeWidth = 2.dp,
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(modifier = Modifier.width(10.dp))
                                Text("Finding verified jeepney routes…", fontSize = 13.sp, color = InkSoft)
                            }
                        } else if (mapDir.noRouteFound) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(Color(0xFFFFF8E1), RoundedCornerShape(12.dp))
                                    .padding(12.dp),
                                verticalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Icon(Icons.Default.Info, contentDescription = null, tint = Warn600, modifier = Modifier.size(18.dp))
                                    Text(
                                        text = "No suitable verified jeepney route found",
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Ink
                                    )
                                }
                                Text(
                                    text = "No traditional jeepney routes directly serve this trip between ${mapDir.originName} and ${mapDir.destinationName}.",
                                    fontSize = 12.sp,
                                    color = InkSoft
                                )
                                if (mapDir.walkingOnlyPoints != null && mapDir.walkingOnlyPoints.isNotEmpty()) {
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        text = "A walking line guide is drawn on the map (~${mapDir.walkingDistanceMeters}m · ~${mapDir.walkingMinutes} min). Clearly labeled: Walking only, not a jeepney route.",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = Brand700
                                    )
                                }
                            }
                        } else if (mapDir.selectedTrip != null) {
                            val trip = mapDir.selectedTrip!!
                            val r = trip.segments.firstOrNull()

                            // Multiple valid itineraries switcher
                            if (mapDir.itineraries.size > 1) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .horizontalScroll(rememberScrollState()),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    mapDir.itineraries.forEachIndexed { idx, itOption ->
                                        val isSel = idx == mapDir.selectedIndex
                                        val itCode = itOption.segments.firstOrNull()?.code ?: "JEEP"
                                        Surface(
                                            onClick = { viewModel.selectDirectionsItinerary(idx) },
                                            shape = RoundedCornerShape(10.dp),
                                            color = if (isSel) Brand50 else Color(0xFFF7F9F8),
                                            border = BorderStroke(1.dp, if (isSel) Brand600 else Line),
                                            modifier = Modifier.padding(bottom = 6.dp)
                                        ) {
                                            Row(
                                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                                            ) {
                                                RouteBadge(code = itCode, colorHex = itOption.segments.firstOrNull()?.color ?: "#1471B0", size = BadgeSize.Sm)
                                                Text(
                                                    text = "${itOption.minutes} min · ₱${"%.2f".format(itOption.regularFare)}",
                                                    fontSize = 12.sp,
                                                    fontWeight = if (isSel) FontWeight.Bold else FontWeight.Normal,
                                                    color = if (isSel) Brand700 else Ink
                                                )
                                            }
                                        }
                                    }
                                }
                                Spacer(modifier = Modifier.height(6.dp))
                            }

                            // Summary row: Estimated time & Fare
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(Color(0xFFF4FBF7), RoundedCornerShape(10.dp))
                                    .padding(horizontal = 12.dp, vertical = 8.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(
                                        text = "${trip.minutes} mins (estimated)",
                                        fontSize = 15.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Ink
                                    )
                                    Text(
                                        text = "${(trip.totalKm * 10).toInt() / 10.0} km total distance",
                                        fontSize = 11.sp,
                                        color = InkMuted
                                    )
                                }
                                Column(horizontalAlignment = Alignment.End) {
                                    Text(
                                        text = "₱${"%.2f".format(trip.regularFare)} (estimated)",
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Brand600
                                    )
                                    Text(
                                        text = "Traditional Jeepney",
                                        fontSize = 11.sp,
                                        color = InkMuted
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(10.dp))

                            // Step-by-step Ordered itinerary:
                            // Origin -> walk to boarding -> ride route -> alight -> walk to dest
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(Color.White)
                                    .padding(vertical = 4.dp),
                                verticalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                // Step 1: Origin
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(24.dp)
                                            .clip(CircleShape)
                                            .background(Brand50),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(Icons.Default.MyLocation, contentDescription = null, tint = Brand600, modifier = Modifier.size(14.dp))
                                    }
                                    Column {
                                        Text(
                                            text = mapDir.originName,
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = Ink
                                        )
                                        Text(
                                            text = "Trip Starting Point",
                                            fontSize = 11.sp,
                                            color = InkMuted
                                        )
                                    }
                                }

                                // Step 2: Walk to boarding stop
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(24.dp)
                                            .clip(CircleShape)
                                            .background(Color(0xFFF0F4F8)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(Icons.Default.DirectionsWalk, contentDescription = null, tint = Color(0xFF1565C0), modifier = Modifier.size(14.dp))
                                    }
                                    Column {
                                        Text(
                                            text = "Walk to ${trip.boardingName ?: "Boarding Stop"}",
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = Ink
                                        )
                                        Text(
                                            text = "${trip.walkMeters / 2}m · ~${maxOf(1, trip.walkMeters / 160)} min walk",
                                            fontSize = 11.sp,
                                            color = InkMuted
                                        )
                                    }
                                }

                                // Step 3: Ride Jeepney
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    RouteBadge(code = r?.code ?: "JEEP", colorHex = r?.color ?: "#1471B0", size = BadgeSize.Sm)
                                    Column {
                                        Text(
                                            text = "Ride Route ${r?.code ?: ""} (${r?.routeName ?: "Jeepney"})",
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Ink
                                        )
                                        Text(
                                            text = "Direction: ${trip.direction ?: "Inbound"} · ${(trip.totalKm * 10).toInt() / 10.0} km",
                                            fontSize = 11.sp,
                                            color = Brand700
                                        )
                                    }
                                }

                                // Step 4: Alight at stop
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(24.dp)
                                            .clip(CircleShape)
                                            .background(Color(0xFFFFF3E0)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(Icons.Default.Place, contentDescription = null, tint = Warn600, modifier = Modifier.size(14.dp))
                                    }
                                    Column {
                                        Text(
                                            text = "Alight at ${trip.dropoffName ?: "Alighting Stop"}",
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = Ink
                                        )
                                        Text(
                                            text = "Signal driver to stop ('Lugar lang')",
                                            fontSize = 11.sp,
                                            color = InkMuted
                                        )
                                    }
                                }

                                // Step 5: Walk to destination
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(24.dp)
                                            .clip(CircleShape)
                                            .background(Color(0xFFF0F4F8)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(Icons.Default.DirectionsWalk, contentDescription = null, tint = Color(0xFF1565C0), modifier = Modifier.size(14.dp))
                                    }
                                    Column {
                                        Text(
                                            text = "Walk to ${mapDir.destinationName}",
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = Ink
                                        )
                                        Text(
                                            text = "${trip.walkMeters / 2}m · ~${maxOf(1, trip.walkMeters / 160)} min walk",
                                            fontSize = 11.sp,
                                            color = InkMuted
                                        )
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            // Start / Travel Guidance Button
                            OroButton(
                                text = "Start / Travel Guidance",
                                onClick = { onStartNavigation(trip.id) },
                                variant = ButtonVariant.Primary,
                                size = ButtonSize.Sm,
                                fullWidth = true
                            )
                        }
                    }
                }
            } else if (viewModel.routeGuidance != null) {
                val guidance = viewModel.routeGuidance!!
                val route = guidance.route


                Surface(
                    color = Color.White,
                    shape = RoundedCornerShape(16.dp),
                    shadowElevation = 8.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        // Header: Badge + Route Info + Close
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                modifier = Modifier.weight(1f, fill = false)
                            ) {
                                RouteBadge(code = route.code, colorHex = route.color, size = BadgeSize.Sm)
                                Column {
                                    Text(
                                        text = "Route ${route.code} Guidance",
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Brand600
                                    )
                                    Text(
                                        text = "${route.origin} ⇄ ${route.destination}",
                                        fontSize = 11.sp,
                                        color = InkMuted,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }

                            IconButton(
                                onClick = {
                                    viewModel.clearRouteGuidance()
                                    selectedRouteId = null
                                },
                                modifier = Modifier.size(24.dp)
                            ) {
                                Icon(Icons.Default.Close, contentDescription = "Close guidance", tint = InkMuted)
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        // Inbound / Outbound Direction Filter Pills
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            FilterChip(
                                selected = guidance.direction.equals("Inbound", ignoreCase = true),
                                onClick = {
                                    viewModel.setGuidanceDirection("Inbound", userLocation)
                                },
                                label = {
                                    Text(
                                        "Inbound (${route.origin.take(15)} →)",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Medium
                                    )
                                },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = Brand50,
                                    selectedLabelColor = Brand600
                                ),
                                border = FilterChipDefaults.filterChipBorder(
                                    enabled = true,
                                    selected = guidance.direction.equals("Inbound", ignoreCase = true),
                                    borderColor = Line,
                                    selectedBorderColor = Brand600
                                )
                            )

                            FilterChip(
                                selected = guidance.direction.equals("Outbound", ignoreCase = true),
                                onClick = {
                                    viewModel.setGuidanceDirection("Outbound", userLocation)
                                },
                                label = {
                                    Text(
                                        "Outbound (→ ${route.destination.take(15)})",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Medium
                                    )
                                },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = Brand50,
                                    selectedLabelColor = Brand600
                                ),
                                border = FilterChipDefaults.filterChipBorder(
                                    enabled = true,
                                    selected = guidance.direction.equals("Outbound", ignoreCase = true),
                                    borderColor = Line,
                                    selectedBorderColor = Brand600
                                )
                            )
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        // Commuter Guidance Banner (Truthful walking vs boarding vs riding)
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = when {
                                guidance.userLocation == null -> Canvas
                                guidance.isUserNearStop -> Ok50
                                else -> Brand50
                            },
                            border = BorderStroke(
                                1.dp,
                                when {
                                    guidance.userLocation == null -> Line
                                    guidance.isUserNearStop -> Ok600.copy(alpha = 0.3f)
                                    else -> Brand600.copy(alpha = 0.3f)
                                }
                            ),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Icon(
                                    imageVector = when {
                                        guidance.userLocation == null -> Icons.Default.LocationSearching
                                        guidance.isUserNearStop -> Icons.Default.CheckCircle
                                        else -> Icons.Default.DirectionsWalk
                                    },
                                    contentDescription = null,
                                    tint = when {
                                        guidance.userLocation == null -> InkMuted
                                        guidance.isUserNearStop -> Ok600
                                        else -> Brand600
                                    },
                                    modifier = Modifier.size(20.dp)
                                )
                                Column {
                                    Text(
                                        text = guidance.guidanceMessage,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = Ink
                                    )
                                    if (guidance.nearestBoardingStop != null && !guidance.isUserNearStop) {
                                        Text(
                                            text = "Boarding Point: ${guidance.nearestBoardingStop.name}",
                                            fontSize = 11.sp,
                                            color = InkMuted
                                        )
                                    }
                                }
                            }
                        }

                        // Verified Route Stops Row
                        val verifiedStopsForCard = remember(route, guidance.direction) {
                            val list = mutableListOf<RouteStopPoint>()
                            // Origin
                            if (guidance.routePoints.isNotEmpty()) {
                                list.add(RouteStopPoint("card_orig_${route.id}", route.origin, "terminal", guidance.routePoints.first().latitude, guidance.routePoints.first().longitude, "Route Origin Point"))
                            }
                            // Terminals
                            route.terminals.filter { it.lat != 0.0 && it.lng != 0.0 }.forEach {
                                list.add(RouteStopPoint(it.id, it.name, "terminal", it.lat, it.lng, it.note))
                            }
                            // Loading/Unloading Stops
                            route.stops.filter { it.lat != 0.0 && it.lng != 0.0 }.forEach {
                                val k = if (it.pointType.equals("unloading", ignoreCase = true)) "unloading" else "loading"
                                list.add(RouteStopPoint(it.id, it.name, k, it.lat, it.lng, it.note))
                            }
                            // Transfers
                            route.transfers.filter { it.lat != 0.0 && it.lng != 0.0 }.forEach {
                                list.add(RouteStopPoint(it.id, it.name, "transfer", it.lat, it.lng, it.note))
                            }
                            // Destination
                            if (guidance.routePoints.isNotEmpty() && list.none { it.name.equals(route.destination, ignoreCase = true) }) {
                                list.add(RouteStopPoint("card_dest_${route.id}", route.destination, "terminal", guidance.routePoints.last().latitude, guidance.routePoints.last().longitude, "Route Destination Point"))
                            }
                            list
                        }

                        if (verifiedStopsForCard.isNotEmpty()) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Verified Stops & Terminals (${verifiedStopsForCard.size}):",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = InkMuted
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .horizontalScroll(rememberScrollState()),
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                verifiedStopsForCard.forEach { stop ->
                                    val isSelected = selectedMarker?.id == stop.id || guidance.nearestBoardingStop?.id == stop.id
                                    Surface(
                                        onClick = {
                                            selectedMarker = MapMarker(
                                                id = stop.id,
                                                name = stop.name,
                                                kind = stop.type,
                                                note = stop.note,
                                                lat = stop.lat,
                                                lng = stop.lng,
                                                area = "Cagayan de Oro City"
                                            )
                                            coroutineScope.launch {
                                                cameraPositionState.animate(
                                                    CameraUpdateFactory.newLatLngZoom(LatLng(stop.lat, stop.lng), 16.5f),
                                                    500
                                                )
                                            }
                                        },
                                        shape = RoundedCornerShape(8.dp),
                                        color = if (isSelected) Brand50 else Canvas,
                                        border = BorderStroke(1.dp, if (isSelected) Brand600 else Line)
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                                        ) {
                                            val badgeChar = when (stop.type) {
                                                "terminal" -> "T"
                                                "loading" -> "L"
                                                "unloading" -> "U"
                                                "transfer" -> "X"
                                                else -> "•"
                                            }
                                            val badgeColor = when (stop.type) {
                                                "terminal" -> Brand700
                                                "loading" -> Ok600
                                                "unloading" -> Bad600
                                                "transfer" -> Oro500
                                                else -> Brand600
                                            }
                                            Box(
                                                modifier = Modifier
                                                    .size(16.dp)
                                                    .clip(CircleShape)
                                                    .background(badgeColor),
                                                contentAlignment = Alignment.Center
                                            ) {
                                                Text(badgeChar, color = Color.White, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                                            }
                                            Text(
                                                text = stop.name,
                                                fontSize = 11.sp,
                                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                                color = if (isSelected) Brand600 else Ink
                                            )
                                        }
                                    }
                                }
                            }
                        }

                        // Selected Marker Callout banner if a marker is tapped
                        if (selectedMarker != null) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Surface(
                                color = Brand50,
                                shape = RoundedCornerShape(10.dp),
                                border = BorderStroke(1.dp, Brand600),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Icon(Icons.Default.Place, contentDescription = null, tint = Brand600, modifier = Modifier.size(18.dp))
                                        Column {
                                            Text(
                                                text = selectedMarker!!.name,
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = Ink,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                            Text(
                                                text = "${selectedMarker!!.kind.uppercase()}${if (!selectedMarker!!.note.isNullOrBlank()) " · ${selectedMarker!!.note}" else ""}",
                                                fontSize = 10.sp,
                                                color = InkMuted
                                            )
                                        }
                                    }
                                    IconButton(
                                        onClick = { selectedMarker = null },
                                        modifier = Modifier.size(20.dp)
                                    ) {
                                        Icon(Icons.Default.Close, contentDescription = "Clear", tint = InkMuted, modifier = Modifier.size(16.dp))
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        // Bottom Actions: "Route Details" & "Center Boarding Stop / GPS"
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            OroButton(
                                text = "Route Details",
                                onClick = { onNavigateRouteInfo(route.id) },
                                variant = ButtonVariant.Secondary,
                                size = ButtonSize.Sm,
                                modifier = Modifier.weight(1f)
                            )

                            if (!hasLocationPermission) {
                                OroButton(
                                    text = "Enable GPS",
                                    onClick = { permissionLauncher.launch(LocationPermissions.runtimePermissions) },
                                    variant = ButtonVariant.Primary,
                                    size = ButtonSize.Sm,
                                    modifier = Modifier.weight(1f)
                                )
                            } else {
                                OroButton(
                                    text = "Center Stop",
                                    onClick = {
                                        coroutineScope.launch {
                                            val target = guidance.nearestBoardingStop?.let { LatLng(it.lat, it.lng) }
                                                ?: userLocation
                                                ?: cdoCenter
                                            cameraPositionState.animate(CameraUpdateFactory.newLatLngZoom(target, 16f), 500)
                                        }
                                    },
                                    variant = ButtonVariant.Primary,
                                    size = ButtonSize.Sm,
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }
                    }
                }
            } else if (viewModel.recommendedJeepneyTrip != null) {
                val rec = viewModel.recommendedJeepneyTrip!!
                val primarySegment = rec.segments.firstOrNull()
                val routeCode = primarySegment?.code ?: "R1"
                val routeColor = primarySegment?.color ?: "#1471B0"
                val routeName = primarySegment?.routeName ?: "Jeepney Route $routeCode"

                Surface(
                    color = Color.White,
                    shape = RoundedCornerShape(16.dp),
                    shadowElevation = 8.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                RouteBadge(code = routeCode, colorHex = routeColor, size = BadgeSize.Sm)
                                Text("Recommended Jeepney Route", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Brand600)
                            }
                            IconButton(
                                onClick = { viewModel.recommendedJeepneyTrip = null },
                                modifier = Modifier.size(24.dp)
                            ) {
                                Icon(Icons.Default.Close, contentDescription = "Close", tint = InkMuted)
                            }
                        }

                        Spacer(modifier = Modifier.height(6.dp))

                        Text(text = "Route $routeCode – $routeName", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Ink)

                        Spacer(modifier = Modifier.height(10.dp))

                        // Step-by-step guidance
                        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            val boardName = rec.boardingName ?: "Nearest Loading Point"
                            val dropName = rec.dropoffName ?: "Drop-off Point near destination"

                            // Use TripLeg breakdown if available (from backend), otherwise derive from walk total
                            val walkLegs = rec.legs.filter { it.kind == "walk" }
                            val boardLeg = walkLegs.firstOrNull()
                            val dropLeg = if (walkLegs.size > 1) walkLegs.last() else null
                            val walk1 = boardLeg?.distanceM ?: if (rec.walkMeters > 0) (rec.walkMeters * 0.55).toInt() else 250
                            val walk2 = dropLeg?.distanceM ?: if (rec.walkMeters > 0) (rec.walkMeters - walk1).coerceAtLeast(50) else 180

                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Icon(Icons.Default.DirectionsWalk, contentDescription = null, tint = InkMuted, modifier = Modifier.size(16.dp))
                                Text("Walk to: $boardName (~$walk1 m)", fontSize = 12.sp, color = InkSoft)
                            }
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Icon(Icons.Default.DirectionsBus, contentDescription = null, tint = Brand600, modifier = Modifier.size(16.dp))
                                Text(
                                    "Ride: Route $routeCode${if (rec.totalKm > 0) " (~${"%.1f".format(rec.totalKm)} km)" else ""}",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = Ink
                                )
                            }
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Icon(Icons.Default.PinDrop, contentDescription = null, tint = Bad600, modifier = Modifier.size(16.dp))
                                Text("Get off: $dropName", fontSize = 12.sp, color = InkSoft)
                            }
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Icon(Icons.Default.DirectionsWalk, contentDescription = null, tint = InkMuted, modifier = Modifier.size(16.dp))
                                Text("Walk to destination (~$walk2 m)", fontSize = 12.sp, color = InkSoft)
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                "Fare: ₱${"%.2f".format(rec.regularFare)} · Est: ${rec.minutes} mins",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = Ink
                            )

                            OroButton(
                                text = "View Route",
                                onClick = {
                                    if (primarySegment != null) {
                                        onNavigateRouteInfo(primarySegment.routeId)
                                    }
                                },
                                variant = ButtonVariant.Primary,
                                size = ButtonSize.Sm
                            )
                        }
                    }
                }
            } else if (selectedMarker != null) {
                val m = selectedMarker!!
                val isLandmark = m.kind !in listOf("terminal", "loading", "unloading", "transfer")

                // Selected Landmark / Place Card (Matches reference screenshot)
                Surface(
                    color = Color.White,
                    shape = RoundedCornerShape(20.dp),
                    shadowElevation = 8.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            val badgeColor = when (m.kind) {
                                "terminal" -> Brand600
                                "loading" -> Ok600
                                "unloading" -> Bad600
                                "transfer" -> Warn600
                                else -> Color(0xFFE65100) // Amber/Orange as in reference screenshot
                            }
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(badgeColor))
                                Text(
                                    text = when (m.kind) {
                                        "terminal" -> "TERMINAL"
                                        "loading" -> "LOADING POINT"
                                        "unloading" -> "UNLOADING POINT"
                                        "transfer" -> "TRANSFER POINT"
                                        "school" -> "SCHOOL / UNIVERSITY"
                                        "mall" -> "SHOPPING MALL"
                                        "government" -> "GOVERNMENT BUILDING"
                                        "hospital" -> "HOSPITAL"
                                        else -> "LANDMARK"
                                    },
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = badgeColor
                                )
                            }

                            IconButton(
                                onClick = {
                                    selectedMarker = null
                                    viewModel.clearDirections()
                                },
                                modifier = Modifier.size(24.dp)
                            ) {
                                Icon(Icons.Default.Close, contentDescription = "Close", tint = InkMuted)
                            }
                        }

                        Spacer(modifier = Modifier.height(6.dp))

                        Text(
                            text = m.name,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = Ink,
                            lineHeight = 22.sp
                        )

                        Spacer(modifier = Modifier.height(2.dp))

                        val rawArea = m.area?.trim().orEmpty()
                        val addressText = when {
                            rawArea.isEmpty() -> "Cagayan de Oro City"
                            rawArea.contains("Cagayan de Oro", ignoreCase = true) -> rawArea
                            else -> "$rawArea, Cagayan de Oro City"
                        }
                        Text(
                            text = addressText,
                            fontSize = 13.sp,
                            color = InkMuted
                        )

                        Spacer(modifier = Modifier.height(10.dp))

                        // Interactive Nearby Passing Jeepneys Section
                        if (nearbyRoutesForSelectedMarker.isNotEmpty()) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.DirectionsBus,
                                    contentDescription = null,
                                    tint = Brand600,
                                    modifier = Modifier.size(15.dp)
                                )
                                Text(
                                    text = "Nearby Jeepneys (${nearbyRoutesForSelectedMarker.size} routes):",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Ink
                                )
                            }

                            Spacer(modifier = Modifier.height(6.dp))

                            // Horizontal scrollable Route Badges
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .horizontalScroll(rememberScrollState()),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                nearbyRoutesForSelectedMarker.forEach { r ->
                                    val isHighlighted = selectedRouteId == r.id
                                    Surface(
                                        onClick = {
                                            if (selectedRouteId == r.id) {
                                                onNavigateRouteInfo(r.id)
                                            } else {
                                                selectedRouteId = r.id
                                            }
                                        },
                                        shape = RoundedCornerShape(10.dp),
                                        color = if (isHighlighted) Brand50 else Color(0xFFF7F9F8),
                                        border = androidx.compose.foundation.BorderStroke(
                                            1.dp,
                                            if (isHighlighted) Brand600 else Line
                                        )
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                                        ) {
                                            RouteBadge(code = r.code, colorHex = r.color, size = BadgeSize.Sm)
                                            Column {
                                                Text(
                                                    text = "${r.name} (${r.code})",
                                                    fontSize = 12.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = Ink
                                                )
                                                Text(
                                                    text = if (isHighlighted) "Highlighted on map · Tap for info" else "${r.origin} → ${r.destination}",
                                                    fontSize = 10.sp,
                                                    color = if (isHighlighted) Brand600 else InkMuted,
                                                    maxLines = 1,
                                                    overflow = TextOverflow.Ellipsis
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        } else {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.DirectionsBus,
                                    contentDescription = null,
                                    tint = InkMuted,
                                    modifier = Modifier.size(15.dp)
                                )
                                Text(
                                    text = "Nearby Jeepneys:",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Ink
                                )
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "No verified jeepney routes directly serve this location.",
                                fontSize = 12.sp,
                                color = InkMuted
                            )
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        // Interactive Action Buttons
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            // [Get Directions] Button
                            OroButton(
                                text = "Get Directions",
                                onClick = {
                                    val destLat = m.lat ?: cdoCenter.latitude
                                    val destLng = m.lng ?: cdoCenter.longitude
                                    if (hasLocationPermission && userLocation != null) {
                                        viewModel.startMapDirections(
                                            fromLat = userLocation!!.latitude,
                                            fromLng = userLocation!!.longitude,
                                            fromName = "Your Location",
                                            toLat = destLat,
                                            toLng = destLng,
                                            toName = m.name,
                                            isGpsOrigin = true
                                        )
                                    } else {
                                        showManualOriginDialog = true
                                    }
                                },
                                variant = ButtonVariant.Primary,
                                size = ButtonSize.Sm,
                                modifier = Modifier.weight(1f)
                            )

                            // [View Jeepney Routes] Button (Soft mint styling matching reference)
                            Surface(
                                onClick = {
                                    val rawAreaForTarget = m.area?.trim().orEmpty()
                                    val targetSubtitle = when {
                                        rawAreaForTarget.isEmpty() -> "Cagayan de Oro City"
                                        rawAreaForTarget.contains("Cagayan de Oro", ignoreCase = true) -> rawAreaForTarget
                                        else -> "$rawAreaForTarget, Cagayan de Oro City"
                                    }
                                    nearbyRoutesTarget = NearbyRoutesSheetTarget(
                                        title = m.name,
                                        subtitle = targetSubtitle,
                                        lat = m.lat,
                                        lng = m.lng,
                                        note = m.note
                                    )
                                    if (viewModel.routesState is Resource.Error || dbRoutes.isEmpty()) {
                                        viewModel.loadRoutes()
                                    }
                                },
                                shape = RoundedCornerShape(10.dp),
                                color = Brand50,
                                modifier = Modifier
                                    .weight(1f)
                                    .height(36.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Text(
                                        text = "View Jeepney Routes",
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = Brand700
                                    )
                                }
                            }
                        }
                    }
                }
            } else if (focusedTripOptionId != null) {
                // Trip Overview Variant
                Surface(
                    color = Color.White,
                    shape = RoundedCornerShape(16.dp),
                    shadowElevation = 8.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                RouteBadge(code = "R1", colorHex = "#1471B0", size = BadgeSize.Md)
                            }
                            Text("18 min · ₱13.00", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Ink)
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        Text("Walk to Carmen Market to board", fontSize = 13.sp, color = InkSoft)

                        Spacer(modifier = Modifier.height(12.dp))

                        OroButton(
                            text = "Start Navigation",
                            onClick = { onStartNavigation(focusedTripOptionId) },
                            variant = ButtonVariant.Primary,
                            size = ButtonSize.Sm,
                            fullWidth = true
                        )
                    }
                }
            }
        }

        // 4. LOCATION DENIED BANNER (Dismissible and non-blocking)
        if (showDeniedBanner && !hasLocationPermission) {
            Surface(
                color = Color.White,
                shape = RoundedCornerShape(14.dp),
                shadowElevation = 6.dp,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(
                        start = 16.dp,
                        end = 16.dp,
                        bottom = if (selectedMarker != null || focusedTripOptionId != null) 230.dp else 16.dp
                    )
                    .fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(Icons.Default.LocationOff, contentDescription = null, tint = Warn600, modifier = Modifier.size(20.dp))
                    Text(
                        text = "Location access is off. Map features remain available.",
                        fontSize = 12.sp,
                        color = InkSoft,
                        modifier = Modifier.weight(1f)
                    )
                    TextButton(onClick = { LocationPermissions.openAppSettings(context) }) {
                        Text("Settings", color = Brand600, fontWeight = FontWeight.Bold)
                    }
                    IconButton(onClick = { showDeniedBanner = false }, modifier = Modifier.size(24.dp)) {
                        Icon(Icons.Default.Close, contentDescription = "Dismiss", tint = InkMuted, modifier = Modifier.size(16.dp))
                    }
                }
            }
        }

        // 5. SNACKBAR HOST
        SnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 90.dp)
        )

        // Manual Origin Selection Dialog (when GPS is unavailable or denied)
        if (showManualOriginDialog && selectedMarker != null) {
            val m = selectedMarker!!
            val destLat = m.lat ?: cdoCenter.latitude
            val destLng = m.lng ?: cdoCenter.longitude

            AlertDialog(
                onDismissRequest = { showManualOriginDialog = false },
                title = {
                    Text(
                        text = "Choose Starting Point",
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp,
                        color = Ink
                    )
                },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text(
                            text = "GPS location is unavailable or location permission was not granted. Please enable GPS or select a starting location in Cagayan de Oro to get directions to ${m.name}:",
                            fontSize = 13.sp,
                            color = InkSoft
                        )

                        if (!hasLocationPermission) {
                            OroButton(
                                text = "Enable GPS Location",
                                onClick = {
                                    showManualOriginDialog = false
                                    permissionLauncher.launch(LocationPermissions.runtimePermissions)
                                },
                                variant = ButtonVariant.Secondary,
                                size = ButtonSize.Sm,
                                fullWidth = true
                            )
                        }

                        HorizontalDivider(color = Line)

                        Text(
                            text = "Common CDO Starting Points:",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = InkMuted
                        )

                        val hubs = listOf(
                            Triple("Carmen Public Market", 8.4831, 124.6364),
                            Triple("Cogon Public Market", 8.4772, 124.6496),
                            Triple("Divisoria Plaza", 8.4770, 124.6444),
                            Triple("Limketkai Center", 8.4837, 124.6567),
                            Triple("Agora / Eastbound Terminal", 8.4907, 124.6618),
                            Triple("Bulua / Westbound Terminal", 8.5085, 124.6190)
                        )

                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .heightIn(max = 200.dp)
                                .verticalScroll(rememberScrollState()),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            hubs.forEach { (hubName, hLat, hLng) ->
                                Surface(
                                    onClick = {
                                        showManualOriginDialog = false
                                        viewModel.startMapDirections(
                                            fromLat = hLat,
                                            fromLng = hLng,
                                            fromName = hubName,
                                            toLat = destLat,
                                            toLng = destLng,
                                            toName = m.name,
                                            isGpsOrigin = false
                                        )
                                    },
                                    shape = RoundedCornerShape(8.dp),
                                    color = Brand50,
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Row(
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Icon(
                                            Icons.Default.Place,
                                            contentDescription = null,
                                            tint = Brand600,
                                            modifier = Modifier.size(16.dp)
                                        )
                                        Text(
                                            text = hubName,
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Medium,
                                            color = Ink
                                        )
                                    }
                                }
                            }
                        }
                    }
                },
                confirmButton = {},
                dismissButton = {
                    TextButton(onClick = { showManualOriginDialog = false }) {
                        Text("Cancel", color = InkMuted)
                    }
                }
            )
        }
    }
}

@Composable
fun LayerSwitchRow(title: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(text = title, fontSize = 14.sp, fontWeight = FontWeight.Medium, color = Ink)
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = SwitchDefaults.colors(
                checkedThumbColor = Color.White,
                checkedTrackColor = Brand600,
                uncheckedTrackColor = Color(0xFFCBD3DC)
            )
        )
    }
}

@Composable
fun LegendItem(color: Color, label: String) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(color))
        Text(label, fontSize = 11.sp, color = InkMuted)
    }
}

internal fun isValidDeviceLocation(loc: Location?): Boolean {
    if (loc == null) return false
    val lat = loc.latitude
    val lng = loc.longitude
    if (lat == 0.0 && lng == 0.0) return false
    if (lat !in -90.0..90.0 || lng !in -180.0..180.0) return false
    if (lat.isNaN() || lng.isNaN()) return false
    return true
}

@SuppressLint("MissingPermission")
internal suspend fun obtainBestDeviceLocation(context: Context): Location? {
    if (!LocationPermissions.hasAccess(context)) return null
    val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
    val isLocationEnabled = if (locationManager == null) false else {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            locationManager.isLocationEnabled
        } else {
            locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER) ||
            locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
        }
    }
    if (!isLocationEnabled) return null

    val fused = LocationServices.getFusedLocationProviderClient(context)
    val cts = CancellationTokenSource()

    var loc: Location? = try {
        withTimeoutOrNull(10_000L) {
            fused.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, cts.token).await()
        }
    } catch (_: Exception) {
        null
    }

    if (loc == null || !isValidDeviceLocation(loc)) {
        val candidates = mutableListOf<Location>()
        try { fused.lastLocation.await()?.let { candidates.add(it) } } catch (_: Exception) {}
        try { locationManager?.getLastKnownLocation(LocationManager.GPS_PROVIDER)?.let { candidates.add(it) } } catch (_: Exception) {}
        try { locationManager?.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)?.let { candidates.add(it) } } catch (_: Exception) {}
        try { locationManager?.getLastKnownLocation(LocationManager.PASSIVE_PROVIDER)?.let { candidates.add(it) } } catch (_: Exception) {}

        loc = candidates.filter { isValidDeviceLocation(it) }.maxByOrNull { it.time }
    }

    return if (isValidDeviceLocation(loc)) loc else null
}

@SuppressLint("MissingPermission")
private suspend fun centerOnDeviceLocation(
    context: Context,
    cameraPositionState: CameraPositionState,
    onLocationFound: ((LatLng) -> Unit)? = null,
    onUnavailable: suspend (String) -> Unit
) {
    if (!LocationPermissions.hasAccess(context)) {
        onUnavailable("Location permission is not granted.")
        return
    }

    // Verify GPS/network provider is enabled before requesting a fix
    val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
    val isLocationEnabled = if (locationManager == null) false else {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            locationManager.isLocationEnabled
        } else {
            locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER) ||
            locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
        }
    }
    if (!isLocationEnabled) {
        onUnavailable("GPS is disabled. Please turn on Location in your device settings.")
        return
    }

    try {
        val loc = obtainBestDeviceLocation(context)
        if (loc != null) {
            val target = LatLng(loc.latitude, loc.longitude)
            onLocationFound?.invoke(target)
            cameraPositionState.animate(CameraUpdateFactory.newLatLngZoom(target, 16.5f), 700)
        } else {
            onUnavailable("Unable to detect your current location. Make sure GPS is on and try again.")
        }
    } catch (_: Exception) {
        onUnavailable("Location detection failed. Please verify that GPS is enabled and try again.")
    }
}
