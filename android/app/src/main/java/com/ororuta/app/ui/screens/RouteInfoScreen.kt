package com.ororuta.app.ui.screens

import android.Manifest
import android.content.Intent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.DirectionsWalk
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.Dash
import com.google.android.gms.maps.model.Gap
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.LatLngBounds
import com.google.maps.android.compose.*
import com.ororuta.app.domain.fare.PassengerCategory
import com.ororuta.app.domain.fare.TraditionalFareResult
import com.ororuta.app.domain.fare.TraditionalJeepneyFareService
import com.ororuta.app.domain.models.Resource
import com.ororuta.app.domain.models.Route
import com.ororuta.app.domain.models.RouteDirection
import com.ororuta.app.ui.components.*
import com.ororuta.app.ui.location.LocationPermissions
import com.ororuta.app.ui.theme.*
import com.ororuta.app.ui.viewmodels.RouteInfoViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject

/**
 * Step-by-Step Jeepney Travel Guidance Screen.
 *
 * Replaces static route info with a practical 5-step journey guide:
 *  Step 1: Walk to the nearest verified boarding stop
 *  Step 2: Wait for and board the correct jeepney (route code + signboard)
 *  Step 3: Ride the jeepney (road sequence + intermediate stops)
 *  Step 4: Get off at the verified drop-off stop
 *  Step 5: Walk to the final destination
 */
@Composable
fun RouteInfoScreen(
    viewModel: RouteInfoViewModel,
    routeId: String,
    initialDestination: String? = null,
    initialDestLat: Double? = null,
    initialDestLng: Double? = null,
    initialDirection: String? = null,
    initialBoardingName: String? = null,
    initialBoardingLat: Double? = null,
    initialBoardingLng: Double? = null,
    initialDropoffName: String? = null,
    initialDropoffLat: Double? = null,
    initialDropoffLng: Double? = null,
    initialWalkDistanceMeters: Int? = null,
    initialOnboardDistanceKm: Double? = null,
    onBack: () -> Unit,
    onViewOnMap: (routeId: String, direction: String) -> Unit,
    onNavigateFare: (routeId: String) -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }

    var selectedDirection by remember { mutableStateOf(initialDirection ?: "Inbound") }
    var currentStep by remember { mutableIntStateOf(1) } // 1..5
    var selectedCategory by remember { mutableStateOf(PassengerCategory.REGULAR) }

    // Native GPS Location handling
    var hasLocationPermission by remember { mutableStateOf(LocationPermissions.hasAccess(context)) }
    var userLocation by remember { mutableStateOf<LatLng?>(null) }
    var isDetectingLocation by remember { mutableStateOf(false) }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val granted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        hasLocationPermission = granted
        if (granted) {
            coroutineScope.launch {
                isDetectingLocation = true
                try {
                    val loc = obtainBestDeviceLocation(context)
                    if (loc != null) {
                        userLocation = LatLng(loc.latitude, loc.longitude)
                    }
                } finally {
                    isDetectingLocation = false
                }
            }
        }
    }

    LaunchedEffect(Unit) {
        if (hasLocationPermission) {
            isDetectingLocation = true
            try {
                val loc = obtainBestDeviceLocation(context)
                if (loc != null) {
                    userLocation = LatLng(loc.latitude, loc.longitude)
                }
            } finally {
                isDetectingLocation = false
            }
        } else {
            permissionLauncher.launch(LocationPermissions.runtimePermissions)
        }
    }

    LaunchedEffect(routeId) {
        viewModel.loadRoute(routeId)
    }

    var stopsAccordionExpanded by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            ScreenHeader(
                title = "Travel Guidance",
                onBack = onBack,
                rightAction = {
                    IconButton(
                        onClick = {
                            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                type = "text/plain"
                                putExtra(Intent.EXTRA_SUBJECT, "OroRuta Jeepney Travel Guide")
                                putExtra(Intent.EXTRA_TEXT, "Check out this CDO jeepney step-by-step travel guide on OroRuta: https://ororuta.app/routes/$routeId")
                            }
                            context.startActivity(Intent.createChooser(shareIntent, "Share Guide"))
                        }
                    ) {
                        Icon(Icons.Default.Share, contentDescription = "Share", tint = Ink)
                    }
                }
            )
        },
        bottomBar = {
            val state = viewModel.routeState
            if (state is Resource.Success) {
                val route = state.data
                Surface(
                    color = Color.White,
                    shadowElevation = 8.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .navigationBarsPadding()
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Bookmark button
                        IconButton(
                            onClick = { viewModel.toggleSave(route) },
                            modifier = Modifier
                                .size(44.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(if (viewModel.isSaved) Brand50 else Canvas)
                        ) {
                            Icon(
                                imageVector = if (viewModel.isSaved) Icons.Default.Bookmark else Icons.Default.BookmarkBorder,
                                contentDescription = "Save route",
                                tint = if (viewModel.isSaved) Brand600 else InkSoft
                            )
                        }

                        // Previous Step button
                        OroButton(
                            text = "Previous",
                            onClick = {
                                if (currentStep > 1) currentStep -= 1
                            },
                            enabled = currentStep > 1,
                            variant = ButtonVariant.Secondary,
                            size = ButtonSize.Md,
                            icon = Icons.AutoMirrored.Filled.ArrowBack,
                            modifier = Modifier.weight(1f)
                        )

                        // Next Step / Finish button
                        OroButton(
                            text = if (currentStep < 5) "Next Step" else "Complete",
                            onClick = {
                                if (currentStep < 5) {
                                    currentStep += 1
                                } else {
                                    coroutineScope.launch {
                                        snackbarHostState.showSnackbar("You've completed the travel steps for this journey!")
                                    }
                                }
                            },
                            variant = ButtonVariant.Primary,
                            size = ButtonSize.Md,
                            icon = if (currentStep < 5) Icons.AutoMirrored.Filled.ArrowForward else Icons.Default.Check,
                            modifier = Modifier.weight(1.2f)
                        )
                    }
                }
            }
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(Canvas)
        ) {
            when (val state = viewModel.routeState) {
                is Resource.Loading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Brand600)
                    }
                }

                is Resource.Error -> {
                    EmptyState(
                        icon = if (state.isOffline) Icons.Default.CloudOff else Icons.Default.ErrorOutline,
                        title = "Could not load route guide",
                        message = state.message,
                        tone = EmptyTone.Warn,
                        action = {
                            OroButton(
                                text = "Retry",
                                onClick = { viewModel.loadRoute(routeId) },
                                variant = ButtonVariant.Primary,
                                size = ButtonSize.Sm,
                                icon = Icons.Default.Refresh
                            )
                        }
                    )
                }

                is Resource.Success -> {
                    val route = state.data
                    val routeGeomPts = remember(route, selectedDirection) {
                        parseGeometries(route, selectedDirection)
                    }

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

                    // 1. Determine destination and coordinates
                    val isOutbound = selectedDirection.equals("Outbound", ignoreCase = true)
                    val isInitialDir = selectedDirection.equals(initialDirection ?: "Inbound", ignoreCase = true)

                    val targetDestination = if (isInitialDir && !initialDestination.isNullOrBlank()) {
                        initialDestination
                    } else {
                        if (isOutbound) route.origin else route.destination
                    }

                    val targetDestCoords = remember(initialDestLat, initialDestLng, route, selectedDirection, isInitialDir, targetDestination, routeGeomPts) {
                        if (isInitialDir && initialDestLat != null && initialDestLng != null && initialDestLat != 0.0 && initialDestLng != 0.0) {
                            LatLng(initialDestLat, initialDestLng)
                        } else {
                            // Find stop or terminal matching destination name
                            val matchingStops = (route.terminals.map { LatLng(it.lat, it.lng) to it.name } +
                                    route.stops.map { LatLng(it.lat, it.lng) to it.name } +
                                    route.landmarks.map { LatLng(it.lat, it.lng) to it.name })
                                .filter { it.first.latitude != 0.0 && it.first.longitude != 0.0 }
                                .filter { it.second.contains(targetDestination, ignoreCase = true) || targetDestination.contains(it.second, ignoreCase = true) }

                            if (matchingStops.isNotEmpty() && routeGeomPts.isNotEmpty()) {
                                val endPt = routeGeomPts.last()
                                matchingStops.minByOrNull { computeDistanceMeters(it.first.latitude, it.first.longitude, endPt.latitude, endPt.longitude) }?.first
                            } else if (matchingStops.isNotEmpty()) {
                                matchingStops.first().first
                            } else if (targetDestination.contains("Cogon", ignoreCase = true)) {
                                LatLng(8.477160465033135, 124.65120822163647)
                            } else {
                                routeGeomPts.lastOrNull()
                            }
                        }
                    }

                    // 1. Determine candidate drop-off stops closest to the destination along the verified route geometry
                    val candidateDropoffStops = remember(route, targetDestCoords, routeGeomPts, selectedDirection) {
                        val list = mutableListOf<RouteStopPoint>()
                        val rawStops = mutableListOf<RouteStopPoint>()

                        route.terminals.filter { it.lat != 0.0 && it.lng != 0.0 && !it.name.contains("Miami", ignoreCase = true) }.forEach {
                            rawStops.add(RouteStopPoint(it.id, it.name, "terminal", it.lat, it.lng, it.note))
                        }
                        route.stops.filter { it.lat != 0.0 && it.lng != 0.0 && !it.name.contains("Miami", ignoreCase = true) }.forEach {
                            rawStops.add(RouteStopPoint(it.id, it.name, it.pointType.ifBlank { "loading" }, it.lat, it.lng, it.note))
                        }
                        route.transfers.filter { it.lat != 0.0 && it.lng != 0.0 }.forEach {
                            rawStops.add(RouteStopPoint(it.id, it.name, "transfer", it.lat, it.lng, it.note))
                        }

                        // Filter to stops aligned within 100m of the selected direction's route line
                        for (s in rawStops) {
                            if (routeGeomPts.isNotEmpty()) {
                                val minD = routeGeomPts.minOfOrNull { pt ->
                                    computeDistanceMeters(pt.latitude, pt.longitude, s.lat, s.lng)
                                } ?: Double.MAX_VALUE
                                if (minD <= 100.0) list.add(s)
                            } else {
                                list.add(s)
                            }
                        }

                        // If route passes close to destination along its geometry, add as verified roadside drop-off stop
                        if (targetDestCoords != null && routeGeomPts.isNotEmpty()) {
                            var minGeoDist = Double.MAX_VALUE
                            var closestGeoPt: LatLng? = null
                            for (pt in routeGeomPts) {
                                val d = computeDistanceMeters(pt.latitude, pt.longitude, targetDestCoords.latitude, targetDestCoords.longitude)
                                if (d < minGeoDist) {
                                    minGeoDist = d
                                    closestGeoPt = pt
                                }
                            }
                            if (closestGeoPt != null && minGeoDist <= 850.0) {
                                val desc = getDescriptiveCdoStopName(closestGeoPt.latitude, closestGeoPt.longitude, "Drop-off")
                                list.add(RouteStopPoint("geo_dest_drop_${selectedDirection.lowercase()}", desc, "unloading", closestGeoPt.latitude, closestGeoPt.longitude, "Near $targetDestination"))
                            }
                        }

                        // Always include the verified arrival terminus for this direction
                        if (routeGeomPts.isNotEmpty()) {
                            val endP = routeGeomPts.last()
                            val terminusName = if (isOutbound) {
                                if (route.origin.endsWith("Market", ignoreCase = true) || route.origin.endsWith("Evangelista", ignoreCase = true) || route.origin.endsWith("Terminal", ignoreCase = true)) route.origin else "${route.origin} Terminal"
                            } else {
                                if (route.destination.endsWith("Market", ignoreCase = true) || route.destination.endsWith("Evangelista", ignoreCase = true) || route.destination.endsWith("Terminal", ignoreCase = true)) route.destination else "${route.destination} Terminal"
                            }
                            val hasEnd = list.any { computeDistanceMeters(it.lat, it.lng, endP.latitude, endP.longitude) < 80.0 }
                            if (!hasEnd) {
                                list.add(RouteStopPoint("route_end_terminus_${selectedDirection.lowercase()}", terminusName, "terminal", endP.latitude, endP.longitude, "Route Terminus"))
                            }
                        }

                        list
                    }

                    // 2. Select drop-off stop
                    val dropoffStop = remember(initialDropoffLat, initialDropoffLng, initialDropoffName, candidateDropoffStops, targetDestCoords, routeGeomPts, isInitialDir, selectedDirection) {
                        val hasValidInitialDrop = isInitialDir && initialDropoffLat != null && initialDropoffLng != null &&
                                initialDropoffLat != 0.0 && initialDropoffLng != 0.0 &&
                                (initialDropoffName == null || !initialDropoffName.contains("Miami", ignoreCase = true)) &&
                                (routeGeomPts.isEmpty() || (routeGeomPts.minOfOrNull { computeDistanceMeters(it.latitude, it.longitude, initialDropoffLat, initialDropoffLng) } ?: Double.MAX_VALUE) <= 150.0)

                        if (hasValidInitialDrop) {
                            RouteStopPoint("initial_drop", initialDropoffName ?: targetDestination, "unloading", initialDropoffLat!!, initialDropoffLng!!, "Selected Drop-off Point")
                        } else if (targetDestCoords != null && candidateDropoffStops.isNotEmpty()) {
                            candidateDropoffStops.minByOrNull {
                                computeDistanceMeters(it.lat, it.lng, targetDestCoords.latitude, targetDestCoords.longitude)
                            }
                        } else {
                            candidateDropoffStops.lastOrNull()
                        } ?: if (routeGeomPts.isNotEmpty()) {
                            val p = routeGeomPts.last()
                            val endTitle = if (isOutbound) route.origin else route.destination
                            val endName = if (endTitle.endsWith("Market", ignoreCase = true) || endTitle.endsWith("Evangelista", ignoreCase = true) || endTitle.endsWith("Terminal", ignoreCase = true)) endTitle else "$endTitle Terminal"
                            RouteStopPoint("end_${selectedDirection.lowercase()}", endName, "terminal", p.latitude, p.longitude, "Route Corridor Drop-off")
                        } else {
                            RouteStopPoint("dest_default", route.destination, "terminal", 8.4822, 124.6472, "CDO Destination")
                        }
                    }

                    // 3. Determine candidate verified boarding stops aligned with direction and occurring BEFORE the drop-off stop
                    val dropoffIdx = remember(dropoffStop, routeGeomPts) {
                        if (dropoffStop != null && routeGeomPts.isNotEmpty()) {
                            routeGeomPts.indices.minByOrNull { computeDistanceMeters(routeGeomPts[it].latitude, routeGeomPts[it].longitude, dropoffStop.lat, dropoffStop.lng) } ?: (routeGeomPts.size - 1)
                        } else {
                            routeGeomPts.size - 1
                        }
                    }

                    val candidateBoardingStops = remember(route, routeGeomPts, selectedDirection, dropoffIdx) {
                        val list = mutableListOf<RouteStopPoint>()
                        val rawStops = mutableListOf<RouteStopPoint>()

                        route.terminals.filter { it.lat != 0.0 && it.lng != 0.0 && !it.name.contains("Miami", ignoreCase = true) }.forEach {
                            rawStops.add(RouteStopPoint(it.id, it.name, "terminal", it.lat, it.lng, it.note))
                        }
                        route.stops.filter { it.lat != 0.0 && it.lng != 0.0 && !it.pointType.equals("unloading", ignoreCase = true) && !it.name.contains("Miami", ignoreCase = true) }.forEach {
                            rawStops.add(RouteStopPoint(it.id, it.name, it.pointType.ifBlank { "loading" }, it.lat, it.lng, it.note))
                        }
                        route.transfers.filter { it.lat != 0.0 && it.lng != 0.0 }.forEach {
                            rawStops.add(RouteStopPoint(it.id, it.name, "transfer", it.lat, it.lng, it.note))
                        }

                        // Filter stops: must be within 100m of route line AND occur before drop-off stop along travel direction
                        for (s in rawStops) {
                            if (routeGeomPts.isNotEmpty()) {
                                val sIdx = routeGeomPts.indices.minByOrNull { computeDistanceMeters(routeGeomPts[it].latitude, routeGeomPts[it].longitude, s.lat, s.lng) } ?: 0
                                val minD = computeDistanceMeters(routeGeomPts[sIdx].latitude, routeGeomPts[sIdx].longitude, s.lat, s.lng)
                                if (minD <= 100.0 && (dropoffIdx <= 0 || sIdx < dropoffIdx)) {
                                    list.add(s)
                                }
                            } else {
                                list.add(s)
                            }
                        }

                        // Always include the verified starting terminus for this direction
                        if (routeGeomPts.isNotEmpty()) {
                            val startP = routeGeomPts.first()
                            val hasStart = list.any { computeDistanceMeters(it.lat, it.lng, startP.latitude, startP.longitude) < 80.0 }
                            if (!hasStart) {
                                val startName = if (isOutbound) {
                                    if (route.destination.endsWith("Market", ignoreCase = true) || route.destination.endsWith("Evangelista", ignoreCase = true) || route.destination.endsWith("Terminal", ignoreCase = true)) route.destination else "${route.destination} Departure Terminal"
                                } else {
                                    if (route.origin.endsWith("Market", ignoreCase = true) || route.origin.endsWith("Evangelista", ignoreCase = true) || route.origin.endsWith("Terminal", ignoreCase = true)) route.origin else "${route.origin} Terminal / Origin"
                                }
                                list.add(0, RouteStopPoint("origin_start_${selectedDirection.lowercase()}", startName, "terminal", startP.latitude, startP.longitude, "Route Origin"))
                            }
                        }

                        // Sort candidate boarding stops according to their sequence along routeGeomPts from start to dropoffIdx
                        if (routeGeomPts.isNotEmpty()) {
                            list.sortBy { s ->
                                routeGeomPts.indices.minByOrNull { computeDistanceMeters(routeGeomPts[it].latitude, routeGeomPts[it].longitude, s.lat, s.lng) } ?: 0
                            }
                        }

                        list
                    }

                    // 4. Select nearest valid boarding stop
                    val nearestBoardingStop = remember(initialBoardingLat, initialBoardingLng, initialBoardingName, candidateBoardingStops, userLocation, routeGeomPts, isInitialDir, dropoffIdx, selectedDirection) {
                        val hasValidInitialBoard = isInitialDir && initialBoardingLat != null && initialBoardingLng != null &&
                                initialBoardingLat != 0.0 && initialBoardingLng != 0.0 &&
                                (initialBoardingName == null || !initialBoardingName.contains("Miami", ignoreCase = true)) &&
                                (routeGeomPts.isEmpty() || (routeGeomPts.minOfOrNull { computeDistanceMeters(it.latitude, it.longitude, initialBoardingLat, initialBoardingLng) } ?: Double.MAX_VALUE) <= 120.0)

                        if (hasValidInitialBoard) {
                            val bIdx = if (routeGeomPts.isNotEmpty()) {
                                routeGeomPts.indices.minByOrNull { computeDistanceMeters(routeGeomPts[it].latitude, routeGeomPts[it].longitude, initialBoardingLat!!, initialBoardingLng!!) } ?: 0
                            } else 0
                            if (dropoffIdx <= 0 || bIdx < dropoffIdx) {
                                RouteStopPoint("initial_board", initialBoardingName ?: "Boarding Stop", "loading", initialBoardingLat!!, initialBoardingLng!!, "Selected Boarding Point")
                            } else {
                                candidateBoardingStops.firstOrNull() ?: RouteStopPoint("start_${selectedDirection.lowercase()}", "Boarding Point", "loading", routeGeomPts.first().latitude, routeGeomPts.first().longitude, "Route Origin")
                            }
                        } else {
                            candidateBoardingStops.firstOrNull() ?: if (routeGeomPts.isNotEmpty()) {
                                val p = routeGeomPts.first()
                                val originTitle = if (isOutbound) route.destination else route.origin
                                val startTitle = if (originTitle.endsWith("Market", ignoreCase = true) || originTitle.endsWith("Evangelista", ignoreCase = true) || originTitle.endsWith("Terminal", ignoreCase = true)) originTitle else "$originTitle Terminal"
                                RouteStopPoint("start_${selectedDirection.lowercase()}", startTitle, "terminal", p.latitude, p.longitude, "Route Corridor Boarding")
                            } else {
                                RouteStopPoint("default", route.origin, "terminal", 8.4822, 124.6472, "CDO Corridor")
                            }
                        }
                    }

                    // Verify whether destination is actually reachable within walking distance (<= 1000m)
                    val dropoffDistanceToDestM = remember(dropoffStop, targetDestCoords) {
                        if (targetDestCoords != null && dropoffStop != null) {
                            computeDistanceMeters(dropoffStop.lat, dropoffStop.lng, targetDestCoords.latitude, targetDestCoords.longitude).toInt()
                        } else {
                            0
                        }
                    }
                    val isDestinationReachable = remember(dropoffDistanceToDestM, initialDestination) {
                        if (initialDestination.isNullOrBlank()) true else dropoffDistanceToDestM <= 1000
                    }

                    // 3b. Calculate distance aboard jeepney along verified route geometry
                    val onboardDistanceKm = remember(initialOnboardDistanceKm, routeGeomPts, nearestBoardingStop, dropoffStop) {
                        if (initialOnboardDistanceKm != null && initialOnboardDistanceKm > 0.0) {
                            initialOnboardDistanceKm
                        } else if (nearestBoardingStop != null && dropoffStop != null && routeGeomPts.size >= 2) {
                            TraditionalJeepneyFareService.calculateOnboardDistanceKm(
                                routePoints = routeGeomPts,
                                boardingLat = nearestBoardingStop.lat,
                                boardingLng = nearestBoardingStop.lng,
                                dropoffLat = dropoffStop.lat,
                                dropoffLng = dropoffStop.lng
                            )
                        } else null
                    }

                    // 3c. Traditional jeepney fare calculation based on LTFRB Oct 8 2023 rates
                    val fareResult = remember(onboardDistanceKm, selectedCategory, route) {
                        if (onboardDistanceKm != null && onboardDistanceKm > 0.0) {
                            TraditionalJeepneyFareService.calculateFareForDistance(
                                distanceKm = onboardDistanceKm,
                                category = selectedCategory,
                                jeepneyType = route.jeepneyType
                            )
                        } else {
                            null
                        }
                    }

                    // 4. Calculate Road-based Walking Path from User to Boarding Stop (OSRM Pedestrian)
                    var walkToBoardCoords by remember { mutableStateOf<List<LatLng>>(emptyList()) }
                    var walkToBoardDistanceM by remember { mutableIntStateOf(0) }
                    var walkToBoardMinutes by remember { mutableIntStateOf(0) }

                    LaunchedEffect(userLocation, nearestBoardingStop) {
                        val uLoc = userLocation
                        val bStop = nearestBoardingStop
                        if (uLoc != null && bStop != null) {
                            val directDist = computeDistanceMeters(uLoc.latitude, uLoc.longitude, bStop.lat, bStop.lng).toInt()
                            if (directDist < 30) {
                                walkToBoardCoords = listOf(uLoc, LatLng(bStop.lat, bStop.lng))
                                walkToBoardDistanceM = directDist
                                walkToBoardMinutes = 1
                            } else if (directDist > 1500) {
                                // Beyond reasonable pedestrian path, do not fabricate long lines
                                walkToBoardCoords = emptyList()
                                walkToBoardDistanceM = directDist
                                walkToBoardMinutes = Math.max(1, (directDist / 83.0).toInt())
                            } else {
                                val osrm = fetchOsrmPedestrianRoute(uLoc.latitude, uLoc.longitude, bStop.lat, bStop.lng)
                                if (osrm != null) {
                                    walkToBoardCoords = osrm.first
                                    walkToBoardDistanceM = osrm.second
                                    walkToBoardMinutes = Math.max(1, (osrm.second / 83.0).toInt())
                                } else {
                                    // Fallback: Haversine distance with pedestrian road factor 1.35
                                    val roadDist = (directDist * 1.35).toInt()
                                    walkToBoardDistanceM = roadDist
                                    walkToBoardMinutes = Math.max(1, (roadDist / 83.0).toInt())
                                    val midLat = (uLoc.latitude + bStop.lat) / 2
                                    val midLng = (uLoc.longitude + bStop.lng) / 2
                                    walkToBoardCoords = listOf(uLoc, LatLng(midLat, uLoc.longitude), LatLng(midLat, midLng), LatLng(bStop.lat, bStop.lng))
                                }
                            }
                        }
                    }

                    // 5. Calculate Road-based Walking Path from Drop-off Stop to Final Destination (OSRM Pedestrian)
                    var walkFromDropCoords by remember { mutableStateOf<List<LatLng>>(emptyList()) }
                    var walkFromDropDistanceM by remember { mutableIntStateOf(0) }
                    var walkFromDropMinutes by remember { mutableIntStateOf(0) }

                    LaunchedEffect(dropoffStop, targetDestCoords, isDestinationReachable) {
                        val dStop = dropoffStop
                        val dCoords = targetDestCoords
                        if (dStop != null && dCoords != null) {
                            val directDist = computeDistanceMeters(dStop.lat, dStop.lng, dCoords.latitude, dCoords.longitude).toInt()
                            if (!isDestinationReachable || directDist > 1000) {
                                // Destination exceeds maximum walking limit (e.g. 5.7 km problem):
                                // Do NOT draw an unreasonable cross-city walking route!
                                walkFromDropCoords = emptyList()
                                walkFromDropDistanceM = directDist
                                walkFromDropMinutes = Math.max(1, (directDist / 83.0).toInt())
                            } else if (directDist < 35) {
                                walkFromDropCoords = listOf(LatLng(dStop.lat, dStop.lng), dCoords)
                                walkFromDropDistanceM = directDist
                                walkFromDropMinutes = 1
                            } else {
                                val osrm = fetchOsrmPedestrianRoute(dStop.lat, dStop.lng, dCoords.latitude, dCoords.longitude)
                                if (osrm != null) {
                                    walkFromDropCoords = osrm.first
                                    walkFromDropDistanceM = osrm.second
                                    walkFromDropMinutes = Math.max(1, (osrm.second / 83.0).toInt())
                                } else {
                                    val roadDist = (directDist * 1.35).toInt()
                                    walkFromDropDistanceM = roadDist
                                    walkFromDropMinutes = Math.max(1, (roadDist / 83.0).toInt())
                                    val midLat = (dStop.lat + dCoords.latitude) / 2
                                    val midLng = (dStop.lng + dCoords.longitude) / 2
                                    walkFromDropCoords = listOf(LatLng(dStop.lat, dStop.lng), LatLng(midLat, dStop.lng), LatLng(midLat, midLng), dCoords)
                                }
                            }
                        }
                    }

                    // Real journey time calculation
                    val rideTransitMinutes = remember(onboardDistanceKm, route.travelTime) {
                        if (onboardDistanceKm != null && onboardDistanceKm > 0.0) {
                            Math.max(5, Math.round(onboardDistanceKm * 3.5).toInt())
                        } else {
                            route.travelTime
                        }
                    }
                    val totalJourneyMinutes = remember(walkToBoardMinutes, rideTransitMinutes, walkFromDropMinutes, isDestinationReachable) {
                        if (isDestinationReachable) {
                            walkToBoardMinutes + 3 + rideTransitMinutes + walkFromDropMinutes
                        } else {
                            walkToBoardMinutes + 3 + rideTransitMinutes
                        }
                    }

                    // Signboard destination
                    val signboardDestination = if (selectedDirection.equals("Outbound", true)) route.origin else route.destination

                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState())
                    ) {
                        // Interactive Supporting Map with Step-by-Step Visualization
                        StepGuidanceMap(
                            route = route,
                            selectedDirection = selectedDirection,
                            currentStep = currentStep,
                            userLocation = userLocation,
                            boardingStop = nearestBoardingStop,
                            dropoffStop = dropoffStop,
                            destinationCoords = targetDestCoords,
                            destinationTitle = targetDestination,
                            walkToBoardCoords = walkToBoardCoords,
                            walkFromDropCoords = walkFromDropCoords,
                            isDestinationReachable = isDestinationReachable,
                            onDirectionChange = {
                                selectedDirection = it
                            },
                            onViewOnMap = {
                                onViewOnMap(route.id, selectedDirection)
                            },
                            modifier = Modifier.fillMaxWidth()
                        )

                        // Direction Segmented Control (Inbound / Outbound)
                        val directions = remember(route.directions) {
                            if (route.directions.isNotEmpty()) {
                                route.directions.map { it.direction }
                            } else {
                                listOf("Inbound", "Outbound")
                            }
                        }
                        Surface(color = Color.White, modifier = Modifier.fillMaxWidth()) {
                            Box(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                                OroSegmentedControl(
                                    items = directions,
                                    selectedItem = selectedDirection,
                                    onItemSelected = { selectedDirection = it },
                                    itemLabel = { dir ->
                                        val dirObj = route.directions.find { it.direction.equals(dir, ignoreCase = true) }
                                        val distStr = if (dirObj != null && dirObj.distanceKm > 0) " (${dirObj.distanceKm} km)" else ""
                                        "$dir$distStr"
                                    },
                                    itemIcon = { Icons.Default.AltRoute }
                                )
                            }
                        }

                        // Route Header Card
                        Surface(color = Color.White, modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                                    ) {
                                        RouteBadge(code = route.code, colorHex = route.color, size = BadgeSize.Md)
                                        Column {
                                            Text(
                                                text = route.name,
                                                fontSize = 16.sp,
                                                fontWeight = FontWeight.ExtraBold,
                                                color = Ink,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                            Text(
                                                text = if (!isDestinationReachable && !initialDestination.isNullOrBlank()) {
                                                    "Traditional Jeepney • Ends at ${dropoffStop.name}"
                                                } else {
                                                    "Traditional Jeepney • Serving $targetDestination"
                                                },
                                                fontSize = 12.sp,
                                                color = InkMuted
                                            )
                                        }
                                    }
                                    StatusPill(status = route.status)
                                }

                                if (!isDestinationReachable && !initialDestination.isNullOrBlank()) {
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Surface(
                                        color = Warn50,
                                        shape = RoundedCornerShape(8.dp),
                                        border = BorderStroke(1.dp, Oro600.copy(alpha = 0.5f)),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(8.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                                        ) {
                                            Icon(Icons.Default.Warning, contentDescription = null, tint = Warn600, modifier = Modifier.size(16.dp))
                                            Text(
                                                text = "Notice: Route terminates at ${dropoffStop.name} (~${dropoffDistanceToDestM}m away). A connecting route is needed for $targetDestination.",
                                                fontSize = 11.sp,
                                                color = Oro700,
                                                lineHeight = 15.sp
                                            )
                                        }
                                    }
                                }

                                Spacer(modifier = Modifier.height(10.dp))

                                // Quick stats
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    if (fareResult != null && fareResult.isAvailable) {
                                        Text(
                                            text = "₱${"%.2f".format(fareResult.selectedCategoryFare)}",
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.ExtraBold,
                                            color = Brand700
                                        )
                                        Text(
                                            text = if (selectedCategory.isDiscounted) "(${selectedCategory.displayName})" else "(₱${"%.2f".format(fareResult.discountedFare)} disc)",
                                            fontSize = 11.sp,
                                            color = InkMuted
                                        )
                                    } else {
                                        Text(
                                            text = "Fare unavailable",
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = InkMuted
                                        )
                                    }
                                    Text("·", color = InkMuted, fontWeight = FontWeight.Bold)
                                    Text(
                                        text = "~$totalJourneyMinutes mins",
                                        fontSize = 12.sp,
                                        color = InkSoft
                                    )
                                    if (onboardDistanceKm != null && onboardDistanceKm > 0) {
                                        Text("·", color = InkMuted, fontWeight = FontWeight.Bold)
                                        Text(
                                            text = "${"%.1f".format(onboardDistanceKm)} km aboard",
                                            fontSize = 12.sp,
                                            color = InkMuted
                                        )
                                    } else if (route.lengthKm > 0) {
                                        Text("·", color = InkMuted, fontWeight = FontWeight.Bold)
                                        Text(
                                            text = "${"%.1f".format(route.lengthKm)} km route",
                                            fontSize = 12.sp,
                                            color = InkMuted
                                        )
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        // Step Indicator (Horizontal clickable tabs 1..5)
                        StepIndicatorTabs(
                            currentStep = currentStep,
                            onSelectStep = { currentStep = it }
                        )

                        Spacer(modifier = Modifier.height(10.dp))

                        // Active Step Detailed Card
                        Surface(
                            color = Color.White,
                            shape = RoundedCornerShape(16.dp),
                            border = BorderStroke(1.dp, Line),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                when (currentStep) {
                                    1 -> Step1WalkCard(
                                        userLocation = userLocation,
                                        boardingStop = nearestBoardingStop,
                                        walkMeters = walkToBoardDistanceM,
                                        walkMinutes = walkToBoardMinutes,
                                        hasLocationPermission = hasLocationPermission,
                                        isDetectingLocation = isDetectingLocation,
                                        onRequestPermission = {
                                            permissionLauncher.launch(LocationPermissions.runtimePermissions)
                                        },
                                        onRefreshLocation = {
                                            coroutineScope.launch {
                                                isDetectingLocation = true
                                                try {
                                                    val loc = obtainBestDeviceLocation(context)
                                                    if (loc != null) {
                                                        userLocation = LatLng(loc.latitude, loc.longitude)
                                                    }
                                                } finally {
                                                    isDetectingLocation = false
                                                }
                                            }
                                        }
                                    )

                                    2 -> Step2WaitCard(
                                        route = route,
                                        boardingStop = nearestBoardingStop,
                                        dropoffStop = dropoffStop,
                                        signboardDestination = signboardDestination,
                                        selectedDirection = selectedDirection,
                                        fareResult = fareResult,
                                        selectedCategory = selectedCategory,
                                        onSelectCategory = { selectedCategory = it }
                                    )

                                    3 -> Step3RideCard(
                                        route = route,
                                        boardingStop = nearestBoardingStop,
                                        dropoffStop = dropoffStop,
                                        selectedDirection = selectedDirection,
                                        onboardDistanceKm = onboardDistanceKm,
                                        fareResult = fareResult,
                                        selectedCategory = selectedCategory,
                                        onSelectCategory = { selectedCategory = it }
                                    )

                                    4 -> Step4AlightCard(
                                        dropoffStop = dropoffStop,
                                        targetDestination = targetDestination,
                                        remainingWalkMeters = walkFromDropDistanceM,
                                        isDestinationReachable = isDestinationReachable
                                    )

                                    5 -> Step5DestinationCard(
                                        dropoffStop = dropoffStop,
                                        targetDestination = targetDestination,
                                        walkMeters = walkFromDropDistanceM,
                                        walkMinutes = walkFromDropMinutes,
                                        isDestinationReachable = isDestinationReachable
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        // Accordion: Full Route Stops & Terminal Catalog (Preserves original route info)
                        Surface(
                            color = Color.White,
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable { stopsAccordionExpanded = !stopsAccordionExpanded },
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text(
                                            text = "Route Details & Verified Stop Catalog",
                                            fontSize = 15.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Ink
                                        )
                                        Text(
                                            text = "Terminals, verified stops, road sequence, announcements",
                                            fontSize = 11.sp,
                                            color = InkMuted
                                        )
                                    }
                                    Icon(
                                        imageVector = if (stopsAccordionExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                                        contentDescription = null,
                                        tint = InkMuted
                                    )
                                }

                                AnimatedVisibility(visible = stopsAccordionExpanded) {
                                    Column(
                                        modifier = Modifier.padding(top = 12.dp),
                                        verticalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        if (!route.description.isNullOrBlank()) {
                                            Text(
                                                text = route.description,
                                                fontSize = 13.sp,
                                                color = InkSoft,
                                                lineHeight = 18.sp
                                            )
                                            HorizontalDivider(color = Line, modifier = Modifier.padding(vertical = 4.dp))
                                        }

                                        if (route.roads.isNotEmpty()) {
                                            Text("Verified Road Sequence:", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = InkMuted)
                                            Row(
                                                modifier = Modifier.horizontalScroll(rememberScrollState()),
                                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                                            ) {
                                                route.roads.forEach { rd ->
                                                    Surface(
                                                        shape = RoundedCornerShape(6.dp),
                                                        color = Canvas,
                                                        modifier = Modifier.padding(vertical = 2.dp)
                                                    ) {
                                                        Text(
                                                            text = rd.name,
                                                            fontSize = 11.sp,
                                                            color = InkSoft,
                                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                                        )
                                                    }
                                                }
                                            }
                                            HorizontalDivider(color = Line, modifier = Modifier.padding(vertical = 4.dp))
                                        }

                                        Text("All Verified Stops & Terminals:", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = InkMuted)
                                        route.terminals.forEach { t ->
                                            StopListItem(
                                                kind = StopKind.Terminal,
                                                name = t.name,
                                                note = if (t.lat != 0.0) t.note ?: "LPTRP Verified Terminal" else "Coordinates pending ground verification",
                                                isSelected = false,
                                                onClick = {}
                                            )
                                        }
                                        route.stops.forEach { s ->
                                            val isUnloading = s.pointType.equals("unloading", ignoreCase = true)
                                            StopListItem(
                                                kind = if (isUnloading) StopKind.Unloading else StopKind.Loading,
                                                name = s.name,
                                                note = if (s.lat != 0.0) s.note ?: if (isUnloading) "Drop-off Point" else "Loading Point" else "Coordinates pending ground verification",
                                                isSelected = false,
                                                onClick = {}
                                            )
                                        }
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(28.dp))
                    }
                }
            }
        }
    }
}

/**
 * Step 1 Card: Walk to Boarding Stop
 */
@Composable
private fun Step1WalkCard(
    userLocation: LatLng?,
    boardingStop: RouteStopPoint,
    walkMeters: Int,
    walkMinutes: Int,
    hasLocationPermission: Boolean,
    isDetectingLocation: Boolean,
    onRequestPermission: () -> Unit,
    onRefreshLocation: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Surface(color = Brand50, shape = RoundedCornerShape(8.dp)) {
            Text(
                text = "STEP 1 OF 5",
                fontSize = 11.sp,
                fontWeight = FontWeight.ExtraBold,
                color = Brand700,
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
            )
        }

        if (isDetectingLocation) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                CircularProgressIndicator(modifier = Modifier.size(12.dp), strokeWidth = 1.5.dp, color = Brand600)
                Text("Locating...", fontSize = 11.sp, color = InkMuted)
            }
        } else if (userLocation != null) {
            IconButton(onClick = onRefreshLocation, modifier = Modifier.size(24.dp)) {
                Icon(Icons.Default.Refresh, contentDescription = "Refresh GPS", tint = Brand600, modifier = Modifier.size(16.dp))
            }
        }
    }

    Spacer(modifier = Modifier.height(10.dp))

    Text(
        text = "Walk to the Boarding Stop",
        fontSize = 18.sp,
        fontWeight = FontWeight.ExtraBold,
        color = Ink
    )

    Spacer(modifier = Modifier.height(6.dp))

    if (!hasLocationPermission) {
        Surface(color = Warn50, shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.LocationOff, contentDescription = null, tint = Warn600, modifier = Modifier.size(18.dp))
                    Text("Location Permission Required", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Warn600)
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Enable GPS to calculate walking distance and get pedestrian directions from where you are standing to ${boardingStop.name}.",
                    fontSize = 12.sp,
                    color = InkSoft
                )
                Spacer(modifier = Modifier.height(8.dp))
                OroButton(
                    text = "Enable Location",
                    onClick = onRequestPermission,
                    variant = ButtonVariant.Primary,
                    size = ButtonSize.Sm,
                    icon = Icons.Default.MyLocation
                )
            }
        }
        Spacer(modifier = Modifier.height(8.dp))
    } else if (userLocation == null) {
        Surface(color = Canvas, shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
            Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Brand600, strokeWidth = 2.dp)
                Text("Detecting your current GPS coordinates...", fontSize = 12.sp, color = InkSoft)
            }
        }
        Spacer(modifier = Modifier.height(8.dp))
    }

    // Walking metrics highlight
    Surface(
        color = Canvas,
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(Brand600),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.DirectionsWalk,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(22.dp)
                    )
                }
                Column {
                    val distLabel = if (walkMeters > 0) {
                        if (walkMeters < 1000) "Walk $walkMeters m" else "Walk ${"%.1f".format(walkMeters / 1000.0)} km"
                    } else "Boarding Stop Ahead"
                    Text(
                        text = distLabel,
                        fontSize = 17.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Ink
                    )
                    Text(
                        text = if (walkMinutes > 0) "~$walkMinutes min walk along pedestrian streets" else "Walk to verified stop",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = Ok600
                    )
                }
            }

            HorizontalDivider(color = Line, modifier = Modifier.padding(vertical = 10.dp))

            // Boarding Stop details
            Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Default.Place, contentDescription = null, tint = Brand600, modifier = Modifier.size(18.dp))
                Column {
                    Text(
                        text = boardingStop.name,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = Ink
                    )
                    Text(
                        text = "${boardingStop.type.replaceFirstChar { it.uppercase() }} Point • ${boardingStop.note ?: "Official Boarding Area"}",
                        fontSize = 12.sp,
                        color = InkMuted
                    )
                }
            }
        }
    }
}

/**
 * Passenger Category Selector Chips
 */
@Composable
private fun PassengerCategorySelector(
    selectedCategory: PassengerCategory,
    onSelectCategory: (PassengerCategory) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier) {
        Text(
            text = "PASSENGER FARE CATEGORY",
            fontSize = 11.sp,
            fontWeight = FontWeight.ExtraBold,
            color = InkMuted
        )
        Spacer(modifier = Modifier.height(6.dp))
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            PassengerCategory.values().forEach { cat ->
                val isSelected = cat == selectedCategory
                Surface(
                    onClick = { onSelectCategory(cat) },
                    shape = RoundedCornerShape(16.dp),
                    color = if (isSelected) Brand600 else Canvas,
                    border = BorderStroke(1.dp, if (isSelected) Brand600 else Line)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        if (isSelected) {
                            Icon(Icons.Default.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(12.dp))
                        }
                        Text(
                            text = cat.displayName,
                            fontSize = 12.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                            color = if (isSelected) Color.White else Ink
                        )
                    }
                }
            }
        }
    }
}

/**
 * Step 2 Card: Wait for the Correct Jeepney
 */
@Composable
private fun Step2WaitCard(
    route: Route,
    boardingStop: RouteStopPoint,
    dropoffStop: RouteStopPoint?,
    signboardDestination: String,
    selectedDirection: String,
    fareResult: TraditionalFareResult?,
    selectedCategory: PassengerCategory,
    onSelectCategory: (PassengerCategory) -> Unit
) {
    Surface(color = Brand50, shape = RoundedCornerShape(8.dp)) {
        Text(
            text = "STEP 2 OF 5",
            fontSize = 11.sp,
            fontWeight = FontWeight.ExtraBold,
            color = Brand700,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
        )
    }

    Spacer(modifier = Modifier.height(10.dp))

    Text(
        text = "Wait for the Correct Jeepney",
        fontSize = 18.sp,
        fontWeight = FontWeight.ExtraBold,
        color = Ink
    )

    Spacer(modifier = Modifier.height(4.dp))

    Text(
        text = "Wait at ${boardingStop.name} and check the front windshield signboard before boarding.",
        fontSize = 13.sp,
        color = InkSoft,
        lineHeight = 18.sp
    )

    Spacer(modifier = Modifier.height(12.dp))

    // Signboard callout card
    Surface(
        color = Canvas,
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.5.dp, Brand600.copy(alpha = 0.5f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(
                text = "LOOK FOR THIS SIGNBOARD",
                fontSize = 11.sp,
                fontWeight = FontWeight.ExtraBold,
                color = InkMuted
            )
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                RouteBadge(code = route.code, colorHex = route.color, size = BadgeSize.Lg)
                Column {
                    Text(
                        text = "${route.code} — $signboardDestination",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Ink
                    )
                    Text(
                        text = "Direction: $selectedDirection heading to $signboardDestination",
                        fontSize = 12.sp,
                        color = InkSoft
                    )
                }
            }
        }
    }

    Spacer(modifier = Modifier.height(12.dp))

    // Interactive Passenger Category Switcher
    PassengerCategorySelector(
        selectedCategory = selectedCategory,
        onSelectCategory = onSelectCategory
    )

    Spacer(modifier = Modifier.height(10.dp))

    // Estimated Fare Box
    Surface(
        color = Canvas,
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, Line),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Icon(Icons.Default.Payments, contentDescription = null, tint = Brand600, modifier = Modifier.size(18.dp))
                    Text(
                        text = "ESTIMATED JEEPNEY FARE",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = InkMuted
                    )
                }

                if (fareResult != null && fareResult.isAvailable) {
                    Surface(
                        color = Ok50,
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Text(
                            text = "Prepare coins",
                            color = Ok600,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            if (fareResult != null && fareResult.isAvailable) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Bottom
                ) {
                    Column {
                        Text(
                            text = "₱${"%.2f".format(fareResult.selectedCategoryFare)}",
                            fontSize = 26.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Brand700
                        )
                        Text(
                            text = "${selectedCategory.displayName} Fare (${"%.1f".format(fareResult.distanceKm)} km trip)",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Ink
                        )
                    }

                    Column(horizontalAlignment = Alignment.End) {
                        Text(
                            text = "Regular: ₱${"%.2f".format(fareResult.regularFare)}",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = InkSoft
                        )
                        Text(
                            text = "Disc: ₱${"%.2f".format(fareResult.discountedFare)}",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = if (selectedCategory.isDiscounted) Brand600 else InkMuted
                        )
                    }
                }

                HorizontalDivider(color = Line, modifier = Modifier.padding(vertical = 8.dp))

                Text(
                    text = fareResult.disclaimer,
                    fontSize = 10.sp,
                    color = InkMuted,
                    lineHeight = 14.sp
                )
            } else {
                Text(
                    text = "Fare unavailable",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = InkSoft
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "Boarding stop, drop-off stop, or route distance could not be verified along this corridor.",
                    fontSize = 11.sp,
                    color = InkMuted
                )
            }
        }
    }
}

/**
 * Step 3 Card: Ride the Jeepney
 */
@Composable
private fun Step3RideCard(
    route: Route,
    boardingStop: RouteStopPoint?,
    dropoffStop: RouteStopPoint?,
    selectedDirection: String,
    onboardDistanceKm: Double?,
    fareResult: TraditionalFareResult?,
    selectedCategory: PassengerCategory,
    onSelectCategory: (PassengerCategory) -> Unit
) {
    Surface(color = Brand50, shape = RoundedCornerShape(8.dp)) {
        Text(
            text = "STEP 3 OF 5",
            fontSize = 11.sp,
            fontWeight = FontWeight.ExtraBold,
            color = Brand700,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
        )
    }

    Spacer(modifier = Modifier.height(10.dp))

    Text(
        text = "Ride the Jeepney",
        fontSize = 18.sp,
        fontWeight = FontWeight.ExtraBold,
        color = Ink
    )

    Spacer(modifier = Modifier.height(4.dp))

    Text(
        text = "Board Route ${route.code} (${selectedDirection}) and stay seated while en route.",
        fontSize = 13.sp,
        color = InkSoft
    )

    Spacer(modifier = Modifier.height(12.dp))

    // Journey segment card
    Surface(
        color = Canvas,
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Verified Boarding Stop", fontSize = 11.sp, color = InkMuted)
                    Text(
                        text = boardingStop?.name ?: route.origin,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = Ink
                    )
                }
                Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, tint = Brand600, modifier = Modifier.size(16.dp))
                Column(horizontalAlignment = Alignment.End) {
                    Text("Verified Drop-off Stop", fontSize = 11.sp, color = InkMuted)
                    Text(
                        text = dropoffStop?.name ?: route.destination,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = Ink
                    )
                }
            }

            HorizontalDivider(color = Line, modifier = Modifier.padding(vertical = 10.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Distance Traveled Aboard Jeepney", fontSize = 11.sp, color = InkMuted)
                    Text(
                        text = if (onboardDistanceKm != null) "${"%.1f".format(onboardDistanceKm)} km onboard" else "Distance unavailable",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Ink
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text("Estimated Transit Time", fontSize = 11.sp, color = InkMuted)
                    Text(
                        text = "~${route.travelTime} mins",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Ink
                    )
                }
            }
        }
    }

    Spacer(modifier = Modifier.height(12.dp))

    // Passenger Category Switcher while on board
    PassengerCategorySelector(
        selectedCategory = selectedCategory,
        onSelectCategory = onSelectCategory
    )

    Spacer(modifier = Modifier.height(10.dp))

    // Payment guidance card
    Surface(
        color = Canvas,
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, Line),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "PAYMENT TO DRIVER",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = InkMuted
                )
                if (fareResult != null && fareResult.isAvailable) {
                    Text(
                        text = "₱${"%.2f".format(fareResult.selectedCategoryFare)}",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Brand700
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            if (fareResult != null && fareResult.isAvailable) {
                val baseText = if (selectedCategory.isDiscounted) "₱10.40" else "₱13.00"
                Text(
                    text = "• First 4 km base fare: $baseText (${selectedCategory.displayName})",
                    fontSize = 12.sp,
                    color = InkSoft
                )
                if (fareResult.distanceKm > 4.0) {
                    val rate = if (selectedCategory.isDiscounted) "₱1.44" else "₱1.80"
                    val extraDist = fareResult.distanceKm - 4.0
                    Text(
                        text = "• Succeeding distance: +${"%.1f".format(extraDist)} km @ $rate/km (rounded to ₱0.25)",
                        fontSize = 12.sp,
                        color = InkSoft
                    )
                }
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Say \"Bayad po\" and pass your fare to fellow passengers towards the driver.",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Brand700
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = fareResult.disclaimer,
                    fontSize = 10.sp,
                    color = InkMuted,
                    lineHeight = 14.sp
                )
            } else {
                Text(
                    text = "Fare unavailable — Confirm fare with driver based on your destination.",
                    fontSize = 12.sp,
                    color = InkMuted
                )
            }
        }
    }

    Spacer(modifier = Modifier.height(10.dp))

    // Notice about traditional jeepney vehicle tracking
    Surface(
        color = Canvas,
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Default.Info, contentDescription = null, tint = InkMuted, modifier = Modifier.size(16.dp))
                Text(
                    text = "Standard Traditional Jeepney Service • Live GPS vehicle tracking is not active. Keep track of approaching street signs and landmarks.",
                    fontSize = 11.sp,
                    color = InkSoft,
                    lineHeight = 16.sp
                )
            }

            if (route.roads.isNotEmpty()) {
                Spacer(modifier = Modifier.height(10.dp))
                Text("Road Sequence Passed:", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = InkMuted)
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = route.roads.joinToString(" → ") { it.name },
                    fontSize = 12.sp,
                    color = Ink,
                    lineHeight = 16.sp
                )
            }
        }
    }
}

/**
 * Step 4 Card: Get Off at Correct Stop
 */
@Composable
private fun Step4AlightCard(
    dropoffStop: RouteStopPoint,
    targetDestination: String,
    remainingWalkMeters: Int,
    isDestinationReachable: Boolean = true
) {
    Surface(color = Brand50, shape = RoundedCornerShape(8.dp)) {
        Text(
            text = "STEP 4 OF 5",
            fontSize = 11.sp,
            fontWeight = FontWeight.ExtraBold,
            color = Brand700,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
        )
    }

    Spacer(modifier = Modifier.height(10.dp))

    Text(
        text = "Get Off at ${dropoffStop.name}",
        fontSize = 18.sp,
        fontWeight = FontWeight.ExtraBold,
        color = Ink
    )

    Spacer(modifier = Modifier.height(6.dp))

    Surface(
        color = Canvas,
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Default.Place, contentDescription = null, tint = Bad600, modifier = Modifier.size(20.dp))
                Column {
                    Text(
                        text = dropoffStop.name,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Ink
                    )
                    Text(
                        text = "${dropoffStop.type.replaceFirstChar { it.uppercase() }} Area • ${dropoffStop.note ?: "Official Drop-off Area"}",
                        fontSize = 12.sp,
                        color = InkMuted
                    )
                }
            }

            HorizontalDivider(color = Line, modifier = Modifier.padding(vertical = 10.dp))

            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(Icons.Default.Campaign, contentDescription = null, tint = Brand600, modifier = Modifier.size(18.dp))
                Text(
                    text = "Notify the driver before arriving by clearly saying \"Lugar lang, nong!\"",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Brand700
                )
            }

            if (isDestinationReachable && remainingWalkMeters > 0) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "~$remainingWalkMeters m remaining distance to $targetDestination.",
                    fontSize = 12.sp,
                    color = InkSoft
                )
            } else if (!isDestinationReachable) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Alight here (Terminating stop for this route). Reaching $targetDestination (~${remainingWalkMeters}m away) requires transferring to another jeepney.",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Oro700
                )
            }
        }
    }
}

/**
 * Step 5 Card: Walk to Destination
 */
@Composable
private fun Step5DestinationCard(
    dropoffStop: RouteStopPoint,
    targetDestination: String,
    walkMeters: Int,
    walkMinutes: Int,
    isDestinationReachable: Boolean = true
) {
    Surface(color = Brand50, shape = RoundedCornerShape(8.dp)) {
        Text(
            text = "STEP 5 OF 5",
            fontSize = 11.sp,
            fontWeight = FontWeight.ExtraBold,
            color = Brand700,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
        )
    }

    Spacer(modifier = Modifier.height(10.dp))

    Text(
        text = if (isDestinationReachable) "Walk to Your Destination" else "Destination Arrival / Transfer",
        fontSize = 18.sp,
        fontWeight = FontWeight.ExtraBold,
        color = Ink
    )

    Spacer(modifier = Modifier.height(6.dp))

    if (isDestinationReachable) {
        Surface(
            color = Ok50,
            shape = RoundedCornerShape(12.dp),
            border = BorderStroke(1.dp, Ok600.copy(alpha = 0.3f)),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Ok600, modifier = Modifier.size(20.dp))
                    Text(
                        text = targetDestination,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Ok600
                    )
                }

                Spacer(modifier = Modifier.height(6.dp))

                if (walkMeters > 35) {
                    Text(
                        text = "Walk $walkMeters m (~$walkMinutes min walk) from ${dropoffStop.name} along verified pedestrian sidewalks and designated street crossings.",
                        fontSize = 13.sp,
                        color = InkSoft,
                        lineHeight = 18.sp
                    )
                } else {
                    Text(
                        text = "Direct Drop-off: The jeepney stops directly at or immediately in front of $targetDestination.",
                        fontSize = 13.sp,
                        color = InkSoft,
                        lineHeight = 18.sp
                    )
                }
            }
        }
    } else {
        Surface(
            color = Warn50,
            shape = RoundedCornerShape(12.dp),
            border = BorderStroke(1.dp, Oro600.copy(alpha = 0.5f)),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.Warning, contentDescription = null, tint = Warn600, modifier = Modifier.size(20.dp))
                    Text(
                        text = "Transfer Required for $targetDestination",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Oro700
                    )
                }

                Spacer(modifier = Modifier.height(6.dp))

                Text(
                    text = "This route terminates at ${dropoffStop.name}, which is ~$walkMeters m away from $targetDestination. A continuous walk of this distance is unreasonable — please take a connecting jeepney route to reach your final destination.",
                    fontSize = 12.sp,
                    color = InkSoft,
                    lineHeight = 17.sp
                )
            }
        }
    }
}

/**
 * Clickable 5-Step Progress Tabs
 */
@Composable
private fun StepIndicatorTabs(
    currentStep: Int,
    onSelectStep: (Int) -> Unit
) {
    val steps = listOf(
        Triple(1, "Walk", Icons.AutoMirrored.Filled.DirectionsWalk),
        Triple(2, "Wait", Icons.Default.Schedule),
        Triple(3, "Ride", Icons.Default.DirectionsBus),
        Triple(4, "Alight", Icons.Default.Place),
        Triple(5, "Arrive", Icons.Default.CheckCircle)
    )

    Surface(
        color = Color.White,
        shadowElevation = 1.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            steps.forEach { (num, label, icon) ->
                val isActive = currentStep == num
                val isDone = currentStep > num

                val animatedBg by animateColorAsState(
                    targetValue = when {
                        isActive -> Brand600
                        isDone -> Ok50
                        else -> Canvas
                    },
                    label = "stepBg"
                )
                val animatedColor by animateColorAsState(
                    targetValue = when {
                        isActive -> Color.White
                        isDone -> Ok700
                        else -> InkMuted
                    },
                    label = "stepColor"
                )

                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = animatedBg,
                    border = BorderStroke(
                        1.dp,
                        when {
                            isActive -> Brand600
                            isDone -> Ok600.copy(alpha = 0.35f)
                            else -> Line
                        }
                    ),
                    modifier = Modifier
                        .weight(1f)
                        .clickable { onSelectStep(num) }
                ) {
                    Column(
                        modifier = Modifier.padding(vertical = 7.dp, horizontal = 2.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(3.dp)
                        ) {
                            Icon(
                                imageVector = if (isDone) Icons.Default.Check else icon,
                                contentDescription = null,
                                tint = animatedColor,
                                modifier = Modifier.size(13.dp)
                            )
                            Text(
                                text = "$num",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = animatedColor
                            )
                        }
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = label,
                            fontSize = 11.sp,
                            fontWeight = if (isActive) FontWeight.Bold else FontWeight.Medium,
                            color = animatedColor,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }
        }
    }
}

/**
 * Supporting Map displaying Route Geometry, Walking Paths, and Step Highlights
 */
@Composable
private fun StepGuidanceMap(
    route: Route,
    selectedDirection: String,
    currentStep: Int,
    userLocation: LatLng?,
    boardingStop: RouteStopPoint?,
    dropoffStop: RouteStopPoint?,
    destinationCoords: LatLng?,
    destinationTitle: String,
    walkToBoardCoords: List<LatLng>,
    walkFromDropCoords: List<LatLng>,
    isDestinationReachable: Boolean = true,
    onDirectionChange: (String) -> Unit,
    onViewOnMap: () -> Unit,
    modifier: Modifier = Modifier
) {
    val pts = remember(route, selectedDirection) {
        parseGeometries(route, selectedDirection)
    }

    val routeColor = remember(route.color) {
        try {
            val parsed = android.graphics.Color.parseColor(route.color)
            val r = android.graphics.Color.red(parsed) / 255.0
            val g = android.graphics.Color.green(parsed) / 255.0
            val b = android.graphics.Color.blue(parsed) / 255.0
            val lum = 0.299 * r + 0.587 * g + 0.114 * b
            if (lum > 0.72) {
                // Darken/saturate pale/light colors so they remain highly visible against light map tiles
                val hsv = FloatArray(3)
                android.graphics.Color.colorToHSV(parsed, hsv)
                hsv[1] = Math.min(1.0f, hsv[1] * 1.4f + 0.25f)
                hsv[2] = Math.max(0.25f, hsv[2] * 0.65f)
                Color(android.graphics.Color.HSVToColor(hsv))
            } else {
                Color(parsed)
            }
        } catch (_: Exception) {
            Brand600
        }
    }

    // Slice the exact ride segment from boarding stop to dropoff stop along road geometry
    val rideSegmentPts = remember(pts, boardingStop, dropoffStop, route) {
        if (pts.size >= 2 && boardingStop != null && dropoffStop != null) {
            val bLoc = LatLng(boardingStop.lat, boardingStop.lng)
            val dLoc = LatLng(dropoffStop.lat, dropoffStop.lng)

            fun distM(p1: LatLng, p2: LatLng): Double {
                val r = 6371000.0
                val dLat = Math.toRadians(p2.latitude - p1.latitude)
                val dLng = Math.toRadians(p2.longitude - p1.longitude)
                val a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                        Math.cos(Math.toRadians(p1.latitude)) * Math.cos(Math.toRadians(p2.latitude)) *
                        Math.sin(dLng / 2) * Math.sin(dLng / 2)
                return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
            }

            val bIdx = pts.indices.minByOrNull { distM(pts[it], bLoc) } ?: 0
            val dIdx = pts.indices.minByOrNull { distM(pts[it], dLoc) } ?: (pts.size - 1)

            val isPhysicallyClosedLoop = distM(pts.first(), pts.last()) < 200.0

            when {
                // Forward segment along the route
                bIdx < dIdx -> {
                    val sub = mutableListOf<LatLng>()
                    if (distM(bLoc, pts[bIdx]) in 2.0..250.0) sub.add(bLoc)
                    sub.addAll(pts.subList(bIdx, dIdx + 1))
                    if (distM(dLoc, pts[dIdx]) in 2.0..250.0) sub.add(dLoc)
                    if (sub.size >= 2) sub else pts
                }
                // Reverse direction in loop route (wraps around end back to beginning ONLY IF it is physically closed)
                bIdx > dIdx && isPhysicallyClosedLoop -> {
                    val sub = mutableListOf<LatLng>()
                    if (distM(bLoc, pts[bIdx]) in 2.0..250.0) sub.add(bLoc)
                    sub.addAll(pts.subList(bIdx, pts.size))
                    sub.addAll(pts.subList(0, dIdx + 1))
                    if (distM(dLoc, pts[dIdx]) in 2.0..250.0) sub.add(dLoc)
                    if (sub.size >= 2) sub else pts
                }
                // Reverse direction along bidirectional road corridor
                bIdx > dIdx && !isPhysicallyClosedLoop -> {
                    val sub = mutableListOf<LatLng>()
                    if (distM(bLoc, pts[bIdx]) in 2.0..250.0) sub.add(bLoc)
                    sub.addAll(pts.subList(dIdx, bIdx + 1).reversed())
                    if (distM(dLoc, pts[dIdx]) in 2.0..250.0) sub.add(dLoc)
                    if (sub.size >= 2) sub else pts
                }
                // Same index or unresolved: display entire verified route
                else -> pts
            }
        } else {
            pts
        }
    }

    val cameraPositionState = rememberCameraPositionState()

    // Smoothly focus map camera based on active step
    LaunchedEffect(currentStep, userLocation, boardingStop, dropoffStop, destinationCoords, pts, rideSegmentPts, isDestinationReachable) {
        try {
            when (currentStep) {
                1 -> {
                    // Focus on User + Boarding Stop + Walk path
                    val builder = LatLngBounds.builder()
                    var count = 0
                    userLocation?.let { builder.include(it); count++ }
                    boardingStop?.let { builder.include(LatLng(it.lat, it.lng)); count++ }
                    walkToBoardCoords.forEach { builder.include(it); count++ }
                    if (count >= 2) {
                        cameraPositionState.animate(CameraUpdateFactory.newLatLngBounds(builder.build(), 70), 500)
                    } else if (boardingStop != null) {
                        cameraPositionState.animate(CameraUpdateFactory.newLatLngZoom(LatLng(boardingStop.lat, boardingStop.lng), 16f), 500)
                    }
                }
                2 -> {
                    // Focus on Boarding Stop
                    if (boardingStop != null) {
                        cameraPositionState.animate(CameraUpdateFactory.newLatLngZoom(LatLng(boardingStop.lat, boardingStop.lng), 16.5f), 500)
                    }
                }
                3 -> {
                    // Focus on active ride segment
                    if (rideSegmentPts.size >= 2) {
                        val builder = LatLngBounds.builder()
                        rideSegmentPts.forEach { builder.include(it) }
                        boardingStop?.let { builder.include(LatLng(it.lat, it.lng)) }
                        dropoffStop?.let { builder.include(LatLng(it.lat, it.lng)) }
                        cameraPositionState.animate(CameraUpdateFactory.newLatLngBounds(builder.build(), 60), 500)
                    } else if (pts.size >= 2) {
                        val builder = LatLngBounds.builder()
                        pts.forEach { builder.include(it) }
                        cameraPositionState.animate(CameraUpdateFactory.newLatLngBounds(builder.build(), 60), 500)
                    }
                }
                4 -> {
                    // Focus on Drop-off Stop
                    if (dropoffStop != null) {
                        cameraPositionState.animate(CameraUpdateFactory.newLatLngZoom(LatLng(dropoffStop.lat, dropoffStop.lng), 16.5f), 500)
                    }
                }
                5 -> {
                    if (isDestinationReachable) {
                        // Focus on Drop-off + Destination + final walk path
                        val builder = LatLngBounds.builder()
                        var count = 0
                        dropoffStop?.let { builder.include(LatLng(it.lat, it.lng)); count++ }
                        destinationCoords?.let { builder.include(it); count++ }
                        walkFromDropCoords.forEach { builder.include(it); count++ }
                        if (count >= 2) {
                            cameraPositionState.animate(CameraUpdateFactory.newLatLngBounds(builder.build(), 70), 500)
                        } else if (destinationCoords != null) {
                            cameraPositionState.animate(CameraUpdateFactory.newLatLngZoom(destinationCoords, 16f), 500)
                        }
                    } else {
                        // Unreachable without transfer: focus on final drop-off stop
                        if (dropoffStop != null) {
                            cameraPositionState.animate(CameraUpdateFactory.newLatLngZoom(LatLng(dropoffStop.lat, dropoffStop.lng), 16f), 500)
                        } else if (destinationCoords != null) {
                            cameraPositionState.animate(CameraUpdateFactory.newLatLngZoom(destinationCoords, 15f), 500)
                        }
                    }
                }
            }
        } catch (_: Exception) {
            val center = boardingStop?.let { LatLng(it.lat, it.lng) } ?: userLocation ?: LatLng(8.4822, 124.6472)
            cameraPositionState.move(CameraUpdateFactory.newLatLngZoom(center, 14.5f))
        }
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(230.dp)
    ) {
        GoogleMap(
            modifier = Modifier.fillMaxSize(),
            cameraPositionState = cameraPositionState,
            uiSettings = MapUiSettings(
                zoomControlsEnabled = false,
                compassEnabled = false,
                myLocationButtonEnabled = false,
                mapToolbarEnabled = false,
                scrollGesturesEnabled = true,
                zoomGesturesEnabled = true,
                tiltGesturesEnabled = false,
                rotationGesturesEnabled = false
            )
        ) {
            // 1. Complete Verified Jeepney Route Polyline (High-contrast casing + clear contextual route color)
            // Always fully rendered so the entire road-following path is clear above map tiles
            if (pts.size >= 2) {
                Polyline(
                    points = pts,
                    color = Color.White,
                    width = 14f,
                    zIndex = 4f
                )
                Polyline(
                    points = pts,
                    color = routeColor.copy(alpha = 0.55f),
                    width = 9f,
                    zIndex = 5f
                )
            }

            // 2. Active Ride Segment (Extra prominent casing + solid vivid color connecting boarding to alighting)
            if (rideSegmentPts.size >= 2) {
                Polyline(
                    points = rideSegmentPts,
                    color = Color.White,
                    width = 22f,
                    zIndex = 6f
                )
                Polyline(
                    points = rideSegmentPts,
                    color = routeColor,
                    width = 15f,
                    zIndex = 7f
                )
            }

            // 3. Walking Path to Boarding Stop (Dashed Blue Polyline)
            if (walkToBoardCoords.size >= 2) {
                Polyline(
                    points = walkToBoardCoords,
                    color = Color.White,
                    width = 14f,
                    zIndex = 8f
                )
                Polyline(
                    points = walkToBoardCoords,
                    color = Color(0xFF1565C0),
                    width = 8f,
                    pattern = listOf(Dash(20f), Gap(12f)),
                    zIndex = 9f
                )
            }

            // 4. Walking Path from Drop-off to Destination (Dashed Indigo Polyline)
            if (walkFromDropCoords.size >= 2) {
                Polyline(
                    points = walkFromDropCoords,
                    color = Color.White,
                    width = 14f,
                    zIndex = 8f
                )
                Polyline(
                    points = walkFromDropCoords,
                    color = Color(0xFF6366F1), // Vibrant Indigo
                    width = 8f,
                    pattern = listOf(Dash(20f), Gap(12f)),
                    zIndex = 9f
                )
            }

            // 5. User Current Location Pin
            userLocation?.let { uLoc ->
                Marker(
                    state = rememberMarkerState(key = "guide_user_loc", position = uLoc),
                    title = "Your Current Location",
                    snippet = "Start of pedestrian walk",
                    icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_AZURE),
                    zIndex = 12f
                )
            }

            // 6. Boarding Stop Pin (Green) with Info Window
            boardingStop?.let { bStop ->
                val bKey = "guide_boarding_${selectedDirection}_${bStop.id}_${(bStop.lat * 10000).toInt()}_${(bStop.lng * 10000).toInt()}"
                val markerState = rememberMarkerState(key = bKey, position = LatLng(bStop.lat, bStop.lng))
                LaunchedEffect(bStop.lat, bStop.lng, selectedDirection) {
                    markerState.position = LatLng(bStop.lat, bStop.lng)
                }
                LaunchedEffect(currentStep, bStop, selectedDirection) {
                    if (currentStep == 1 || currentStep == 2) markerState.showInfoWindow()
                }
                Marker(
                    state = markerState,
                    title = "🟢 BOARD HERE: ${bStop.name}",
                    snippet = "Step 1: Board Jeepney ${route.code} Here",
                    icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_GREEN),
                    zIndex = 12f
                )
            }

            // 7. Drop-off Stop Pin (Rose/Red) with Info Window
            dropoffStop?.let { dStop ->
                val dKey = "guide_dropoff_${selectedDirection}_${dStop.id}_${(dStop.lat * 10000).toInt()}_${(dStop.lng * 10000).toInt()}"
                val markerState = rememberMarkerState(key = dKey, position = LatLng(dStop.lat, dStop.lng))
                LaunchedEffect(dStop.lat, dStop.lng, selectedDirection) {
                    markerState.position = LatLng(dStop.lat, dStop.lng)
                }
                LaunchedEffect(currentStep, dStop, selectedDirection) {
                    if (currentStep == 4) markerState.showInfoWindow()
                }
                Marker(
                    state = markerState,
                    title = "🔴 ALIGHT HERE: ${dStop.name}",
                    snippet = "Step 4: Alight Jeepney Here",
                    icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_ROSE),
                    zIndex = 12f
                )
            }

            // 8. Destination Pin (Red)
            destinationCoords?.let { dCoords ->
                Marker(
                    state = rememberMarkerState(key = "guide_dest_${dCoords.latitude}_${dCoords.longitude}", position = dCoords),
                    title = "Destination: $destinationTitle",
                    snippet = "Step 5: Final Destination",
                    icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_RED),
                    zIndex = 12f
                )
            }
        }

        // Map Legend Overlay
        Surface(
            color = Color.White.copy(alpha = 0.94f),
            shape = RoundedCornerShape(8.dp),
            shadowElevation = 3.dp,
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(8.dp)
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(Color(0xFF10B981)))
                    Text("Board", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Ink)
                }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(Color(0xFFF43F5E)))
                    Text("Alight", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Ink)
                }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Box(modifier = Modifier.width(14.dp).height(4.dp).background(routeColor))
                    Text("Ride Segment", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Ink)
                }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Box(modifier = Modifier.width(12.dp).height(2.5.dp).background(routeColor.copy(alpha = 0.65f)))
                    Text("Full Route", fontSize = 10.sp, fontWeight = FontWeight.Medium, color = InkMuted)
                }
            }
        }

        // Top Step Badge overlay
        Surface(
            color = Color.Black.copy(alpha = 0.65f),
            shape = RoundedCornerShape(8.dp),
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(10.dp)
        ) {
            val stepLabel = when (currentStep) {
                1 -> "Step 1 • Walk to Boarding"
                2 -> "Step 2 • Board Jeepney"
                3 -> "Step 3 • Riding Route"
                4 -> "Step 4 • Drop-off"
                else -> "Step 5 • Destination"
            }
            Text(
                text = stepLabel,
                color = Color.White,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
            )
        }

        // Expand Map button
        Surface(
            color = Color.Black.copy(alpha = 0.60f),
            shape = RoundedCornerShape(20.dp),
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(8.dp)
                .clickable { onViewOnMap() }
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
            ) {
                Icon(Icons.Default.Fullscreen, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
                Text("View on Map", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

/**
 * Calculates pedestrian distance in meters using Haversine formula.
 */
private fun computeDistanceMeters(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
    val r = 6371000.0
    val dLat = Math.toRadians(lat2 - lat1)
    val dLon = Math.toRadians(lon2 - lon1)
    val a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
    val c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return r * c
}

/**
 * Road-following pedestrian walking path fetcher from OSRM foot routing engine.
 */
private suspend fun fetchOsrmPedestrianRoute(
    fromLat: Double, fromLng: Double,
    toLat: Double, toLng: Double
): Pair<List<LatLng>, Int>? {
    return withContext(Dispatchers.IO) {
        try {
            val url = "https://router.project-osrm.org/route/v1/foot/" +
                    "$fromLng,$fromLat;$toLng,$toLat" +
                    "?overview=full&geometries=geojson&steps=false"
            val client = OkHttpClient()
            val request = Request.Builder().url(url).build()
            val response = client.newCall(request).execute()
            if (!response.isSuccessful) return@withContext null
            val body = response.body?.string() ?: return@withContext null
            val json = JSONObject(body)
            if (json.optString("code") != "Ok") return@withContext null
            val routes = json.optJSONArray("routes") ?: return@withContext null
            if (routes.length() == 0) return@withContext null
            val r = routes.getJSONObject(0)
            val dist = r.optDouble("distance", 0.0).toInt()
            val coords = r.optJSONObject("geometry")?.optJSONArray("coordinates") ?: return@withContext null
            val pts = mutableListOf<LatLng>()
            for (i in 0 until coords.length()) {
                val pt = coords.getJSONArray(i)
                pts.add(LatLng(pt.getDouble(1), pt.getDouble(0)))
            }
            if (pts.size < 2) null else Pair(pts, dist)
        } catch (_: Exception) {
            null
        }
    }
}
