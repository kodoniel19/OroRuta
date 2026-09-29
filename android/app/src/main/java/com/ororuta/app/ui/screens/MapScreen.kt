package com.ororuta.app.ui.screens

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.LatLngBounds
import com.google.android.gms.tasks.CancellationTokenSource
import com.google.maps.android.compose.*
import com.ororuta.app.ui.components.*
import com.ororuta.app.ui.location.LocationPermissions
import com.ororuta.app.ui.theme.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

data class CdoGeoStop(
    val id: String,
    val name: String,
    val kind: String,
    val lat: Double,
    val lng: Double,
    val routes: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MapScreen(
    isPushed: Boolean = false,
    focusedTripOptionId: String? = null,
    onBack: (() -> Unit)? = null,
    onSearchClick: () -> Unit,
    onNavigateRouteInfo: (String) -> Unit,
    onStartNavigation: (String) -> Unit
) {
    var showLayersSheet by remember { mutableStateOf(false) }
    var selectedMarker by remember { mutableStateOf<MapMarker?>(null) }
    var selectedRouteId by remember { mutableStateOf<String?>(null) }

    // Layers toggle state
    var showJeepneyRoutes by remember { mutableStateOf(true) }
    var showTerminals by remember { mutableStateOf(true) }
    var showLoadingPoints by remember { mutableStateOf(true) }
    var showUnloadingPoints by remember { mutableStateOf(true) }
    var showTransferPoints by remember { mutableStateOf(true) }
    var showLandmarks by remember { mutableStateOf(true) }

    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val snackbarHostState = remember { SnackbarHostState() }
    var hasLocationPermission by remember { mutableStateOf(LocationPermissions.hasAccess(context)) }
    var showDeniedBanner by remember { mutableStateOf(false) }
    var mapReady by remember { mutableStateOf(false) }
    var userLocation by remember { mutableStateOf<LatLng?>(null) }
    var isLocating by remember { mutableStateOf(false) }

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

    // Immediate sanitization against any restored state pointing to (0,0) or outside CDO
    val currentTarget = cameraPositionState.position.target
    if ((currentTarget.latitude == 0.0 && currentTarget.longitude == 0.0) ||
        cameraPositionState.position.zoom < 10f ||
        !cdoCameraBounds.contains(currentTarget)
    ) {
        cameraPositionState.position = defaultCamera
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
                    fallback = cdoCenter,
                    onLocationFound = { loc ->
                        userLocation = loc
                    },
                    onUnavailable = {
                        snackbarHostState.showSnackbar("Location enabled. Waiting for GPS fix...")
                    }
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
            // If already permitted, fetch current location and update marker
            coroutineScope.launch {
                centerOnDeviceLocation(
                    context = context,
                    cameraPositionState = cameraPositionState,
                    fallback = null,
                    onLocationFound = { loc ->
                        userLocation = loc
                    },
                    onUnavailable = { }
                )
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
                    fallback = cdoCenter,
                    onLocationFound = { loc ->
                        userLocation = loc
                    },
                    onUnavailable = {
                        snackbarHostState.showSnackbar("Unable to detect current location. Please verify that GPS is turned on.")
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
                                fallback = cdoCenter,
                                onLocationFound = { loc -> userLocation = loc },
                                onUnavailable = { }
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

            // Out-of-bounds safety check (primary defense)
            if (!cdoCameraBounds.contains(currentTarget)) {
                cameraPositionState.animate(
                    CameraUpdateFactory.newLatLngZoom(cdoCenter, 14.0f),
                    500
                )
                return@LaunchedEffect
            }

            // Double-tap zoom correction
            if (savedTarget != null && savedZoom != null) {
                val zoomDelta = kotlin.math.abs(currentZoom - savedZoom)
                val latDelta = kotlin.math.abs(currentTarget.latitude - savedTarget.latitude)
                val lngDelta = kotlin.math.abs(currentTarget.longitude - savedTarget.longitude)

                // Signature: zoom changed AND center shifted more than ~220m
                // (0.002 degrees ≈ 220m at CDO latitude)
                // This catches double-tap-to-point but not pinch-to-zoom or regular pan
                if (zoomDelta > 0.3f && (latDelta > 0.002 || lngDelta > 0.002)) {
                    cameraPositionState.animate(
                        CameraUpdateFactory.newLatLngZoom(savedTarget, currentZoom),
                        250
                    )
                }
            }
        }
    }

    // Real CDO GPS Landmarks & Jeepney stops
    val cdoStops = remember {
        listOf(
            CdoGeoStop("t1", "Bulua Westbound Terminal", "terminal", 8.5132, 124.6190, "R1, R2, B1"),
            CdoGeoStop("t2", "Agora Eastbound Terminal (Lapasan)", "terminal", 8.4907, 124.6610, "R1, B1, C1"),
            CdoGeoStop("l1", "Carmen Public Market", "loading", 8.4804, 124.6369, "R1, C1"),
            CdoGeoStop("l2", "Divisoria Plaza (Golden Friendship)", "loading", 8.4772, 124.6465, "R1, R2, C1"),
            CdoGeoStop("x1", "Velez-Recto Junction (Centrio / Gaisano)", "transfer", 8.4871, 124.6508, "Transfer point: R1 ↔ C1"),
            CdoGeoStop("u1", "Limketkai Center Drop-off", "unloading", 8.4842, 124.6568, "R1, R2"),
            CdoGeoStop("u2", "Gusa Highway Drop-off Bay", "unloading", 8.4925, 124.6780, "B1, R1"),
            CdoGeoStop("m1", "Cogon Public Market", "loading", 8.4754, 124.6502, "C1, R2"),
            CdoGeoStop("p1", "Puerto Highway Terminal", "terminal", 8.4960, 124.7410, "B1")
        )
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

    Box(modifier = Modifier.fillMaxSize()) {
        // The map itself — double-tap zoom is DISABLED to prevent the native
        // behavior that shifts the camera center to the tapped screen point.
        // Instead, a transparent overlay (below the map controls) intercepts
        // double-taps and performs a smooth zoom at the current camera center.
        GoogleMap(
            modifier = Modifier.fillMaxSize(),
            cameraPositionState = cameraPositionState,
            properties = MapProperties(
                isMyLocationEnabled = hasLocationPermission,
                minZoomPreference = 11.0f,
                maxZoomPreference = 20.0f,
                latLngBoundsForCameraTarget = cdoCameraBounds
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
                if ((cur.latitude == 0.0 && cur.longitude == 0.0) || !cdoCameraBounds.contains(cur)) {
                    cameraPositionState.move(CameraUpdateFactory.newCameraPosition(defaultCamera))
                }
            },
            onMapClick = {
                selectedMarker = null
                selectedRouteId = null
            },
            onPOIClick = { }
        ) {
            // Real CDO Jeepney Route Polylines
            if (showJeepneyRoutes) {
                // R1: Bulua Terminal -> Kauswagan -> Carmen -> Divisoria -> Centrio -> Agora Terminal
                Polyline(
                    points = listOf(
                        LatLng(8.5132, 124.6190),
                        LatLng(8.4980, 124.6350),
                        LatLng(8.4804, 124.6369),
                        LatLng(8.4772, 124.6465),
                        LatLng(8.4871, 124.6508),
                        LatLng(8.4842, 124.6568),
                        LatLng(8.4907, 124.6610)
                    ),
                    color = Color(0xFF1471B0),
                    width = 12f
                )
                // C1: Carmen Market -> Velez -> Divisoria -> Cogon Market
                Polyline(
                    points = listOf(
                        LatLng(8.4804, 124.6369),
                        LatLng(8.4871, 124.6508),
                        LatLng(8.4772, 124.6465),
                        LatLng(8.4754, 124.6502)
                    ),
                    color = Color(0xFF1E8A4C),
                    width = 12f
                )
                // B1: Agora Terminal -> Lapasan Highway -> Gusa -> Puerto
                Polyline(
                    points = listOf(
                        LatLng(8.4907, 124.6610),
                        LatLng(8.4925, 124.6780),
                        LatLng(8.4960, 124.7410)
                    ),
                    color = Color(0xFF7A3EE6),
                    width = 12f
                )
            }

            // User location custom marker (alongside native Google Maps blue dot)
            if (hasLocationPermission && userLocation != null) {
                Marker(
                    state = rememberMarkerState(key = "user_current_location_marker", position = userLocation!!),
                    title = "Your Location",
                    snippet = "Current GPS position",
                    icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_AZURE)
                )
            }

            // Markers for CDO Stops
            cdoStops.forEach { stop ->
                val markerState = rememberMarkerState(
                    key = stop.id,
                    position = LatLng(stop.lat, stop.lng)
                )
                val shouldShow = when (stop.kind) {
                    "terminal" -> showTerminals
                    "loading" -> showLoadingPoints
                    "unloading" -> showUnloadingPoints
                    "transfer" -> showTransferPoints
                    else -> showLandmarks
                }
                if (shouldShow) {
                    Marker(
                        state = markerState,
                        title = stop.name,
                        snippet = "Jeepneys: ${stop.routes}",
                        onClick = {
                            selectedMarker = MapMarker(stop.id, stop.name, 0f, 0f, stop.kind)
                            true
                        }
                    )
                }
            }

            // NOTE: We do NOT use MapEffect with setOnCameraIdleListener/
            // setOnCameraMoveStartedListener here — that would override
            // maps-compose's internal listeners and break CameraPositionState sync.
        }

        // Layers button (Top-right below search pill)
        Surface(
            color = Color.White,
            shape = CircleShape,
            shadowElevation = 4.dp,
            modifier = Modifier
                .align(Alignment.TopEnd)
                .statusBarsPadding()
                .padding(top = 66.dp, end = 16.dp)
                .size(40.dp)
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

        // 1. TOP FLOATING SEARCH PILL
        Surface(
            color = Color.White,
            shape = RoundedCornerShape(24.dp),
            shadowElevation = 6.dp,
            modifier = Modifier
                .align(Alignment.TopCenter)
                .statusBarsPadding()
                .padding(horizontal = 16.dp, vertical = 8.dp)
                .fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .clickable { onSearchClick() }
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

                Text(
                    text = "Search jeepney routes or places…",
                    fontSize = 14.sp,
                    color = InkMuted,
                    modifier = Modifier.weight(1f)
                )

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

        // 2. CURRENT-LOCATION / GPS FLOATING BUTTON
        Surface(
            color = Color.White,
            shape = CircleShape,
            shadowElevation = 6.dp,
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(
                    end = 16.dp,
                    bottom = if (selectedMarker != null || focusedTripOptionId != null) 195.dp else 140.dp
                )
                .size(48.dp)
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
                    modifier = Modifier.size(24.dp)
                )
            }
        }

        // 3. BOTTOM CARD VARIANTS
        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp)
        ) {
            if (selectedMarker != null) {
                val m = selectedMarker!!
                // Selected Stop Card
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
                            Text(
                                text = m.kind.uppercase(),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = Brand600
                            )
                            IconButton(onClick = { selectedMarker = null }, modifier = Modifier.size(24.dp)) {
                                Icon(Icons.Default.Close, contentDescription = "Close", tint = InkMuted)
                            }
                        }

                        Text(
                            text = m.name,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = Ink
                        )

                        Text(
                            text = "Routes served: R1, R2, C1",
                            fontSize = 13.sp,
                            color = InkMuted
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        OroButton(
                            text = "Plan trip from here",
                            onClick = onSearchClick,
                            variant = ButtonVariant.Primary,
                            size = ButtonSize.Sm,
                            fullWidth = true
                        )
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
            } else {
                // Default: Horizontal Route Chips + Legend
                Surface(
                    color = Color.White,
                    shape = RoundedCornerShape(16.dp),
                    shadowElevation = 6.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        val cdoRouteChips = remember {
                            listOf(
                                Triple("r1", "R1", "#1471B0"),
                                Triple("r2", "R2", "#B45F00"),
                                Triple("c1", "C1", "#1E8A4C"),
                                Triple("b1", "B1", "#7A3EE6")
                            )
                        }

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            cdoRouteChips.forEach { (id, code, color) ->
                                Surface(
                                    onClick = { onNavigateRouteInfo(id) },
                                    shape = RoundedCornerShape(8.dp),
                                    color = Canvas,
                                    modifier = Modifier.padding(vertical = 2.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        RouteBadge(code = code, colorHex = color, size = BadgeSize.Sm)
                                        Text(text = "Route $code", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Ink)
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        // Map Legend
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceEvenly
                        ) {
                            LegendItem(color = Brand700, label = "Terminal")
                            LegendItem(color = Ok600, label = "Loading")
                            LegendItem(color = Bad600, label = "Unloading")
                            LegendItem(color = Oro500, label = "Transfer")
                        }
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
                        bottom = if (selectedMarker != null || focusedTripOptionId != null) 195.dp else 142.dp
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

@SuppressLint("MissingPermission")
private suspend fun centerOnDeviceLocation(
    context: Context,
    cameraPositionState: CameraPositionState,
    fallback: LatLng?,
    onLocationFound: ((LatLng) -> Unit)? = null,
    onUnavailable: suspend () -> Unit
) {
    if (!LocationPermissions.hasAccess(context)) {
        onUnavailable()
        return
    }
    try {
        val fused = LocationServices.getFusedLocationProviderClient(context)
        val cts = CancellationTokenSource()
        val loc = try {
            fused.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, cts.token).await()
                ?: fused.lastLocation.await()
        } catch (_: Exception) {
            fused.lastLocation.await()
        }

        val target = if (loc != null && !(loc.latitude == 0.0 && loc.longitude == 0.0)) {
            LatLng(loc.latitude, loc.longitude)
        } else {
            fallback
        }

        if (target != null) {
            onLocationFound?.invoke(target)
            cameraPositionState.animate(CameraUpdateFactory.newLatLngZoom(target, 16f), 700)
        } else {
            onUnavailable()
        }
    } catch (_: Exception) {
        if (fallback != null) {
            cameraPositionState.animate(CameraUpdateFactory.newLatLngZoom(fallback, 14.0f), 700)
        } else {
            onUnavailable()
        }
    }
}
