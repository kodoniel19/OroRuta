package com.ororuta.app.ui.screens

import android.Manifest
import android.content.Intent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
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
import com.ororuta.app.ui.viewmodels.nearestVerifiedBoardingStop
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
                    val targetDestination = initialDestination?.ifBlank { null } ?: route.destination
                    val targetDestCoords = remember(initialDestLat, initialDestLng, route) {
                        if (initialDestLat != null && initialDestLng != null && initialDestLat != 0.0 && initialDestLng != 0.0) {
                            LatLng(initialDestLat, initialDestLng)
                        } else {
                            // Find stop or terminal matching destination name
                            val matchingStop = (route.terminals.map { LatLng(it.lat, it.lng) to it.name } +
                                    route.stops.map { LatLng(it.lat, it.lng) to it.name } +
                                    route.landmarks.map { LatLng(it.lat, it.lng) to it.name })
                                .filter { it.first.latitude != 0.0 && it.first.longitude != 0.0 }
                                .firstOrNull { it.second.contains(targetDestination, ignoreCase = true) || targetDestination.contains(it.second, ignoreCase = true) }
                            matchingStop?.first ?: routeGeomPts.lastOrNull()
                        }
                    }

                    // 2. Candidate verified boarding stops (Terminals, Loading Points, Transfer Points; not pure unloading)
                    val candidateBoardingStops = remember(route) {
                        val list = mutableListOf<RouteStopPoint>()
                        route.terminals.filter { it.lat != 0.0 && it.lng != 0.0 }.forEach {
                            list.add(RouteStopPoint(it.id, it.name, "terminal", it.lat, it.lng, it.note))
                        }
                        route.stops.filter { it.lat != 0.0 && it.lng != 0.0 && !it.pointType.equals("unloading", ignoreCase = true) }.forEach {
                            list.add(RouteStopPoint(it.id, it.name, it.pointType.ifBlank { "loading" }, it.lat, it.lng, it.note))
                        }
                        route.transfers.filter { it.lat != 0.0 && it.lng != 0.0 }.forEach {
                            list.add(RouteStopPoint(it.id, it.name, "transfer", it.lat, it.lng, it.note))
                        }
                        list
                    }

                    // Nearest verified boarding stop from user's current GPS location or passed initial boarding point
                    val nearestBoardingStop = remember(initialBoardingLat, initialBoardingLng, initialBoardingName, candidateBoardingStops, userLocation, routeGeomPts) {
                        if (initialBoardingLat != null && initialBoardingLng != null && initialBoardingLat != 0.0 && initialBoardingLng != 0.0) {
                            RouteStopPoint("initial_board", initialBoardingName ?: "Boarding Stop", "loading", initialBoardingLat, initialBoardingLng, "Selected Boarding Point")
                        } else {
                            nearestVerifiedBoardingStop(userLocation, candidateBoardingStops)
                        }
                    }

                    // 3. Candidate verified drop-off stops including closest verified route corridor points
                    val candidateDropoffStops = remember(route, targetDestCoords, routeGeomPts) {
                        val list = mutableListOf<RouteStopPoint>()
                        route.terminals.filter { it.lat != 0.0 && it.lng != 0.0 }.forEach {
                            list.add(RouteStopPoint(it.id, it.name, "terminal", it.lat, it.lng, it.note))
                        }
                        route.stops.filter { it.lat != 0.0 && it.lng != 0.0 }.forEach {
                            list.add(RouteStopPoint(it.id, it.name, it.pointType.ifBlank { "loading" }, it.lat, it.lng, it.note))
                        }
                        route.transfers.filter { it.lat != 0.0 && it.lng != 0.0 }.forEach {
                            list.add(RouteStopPoint(it.id, it.name, "transfer", it.lat, it.lng, it.note))
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
                                list.add(RouteStopPoint("geo_dest_drop", desc, "unloading", closestGeoPt.latitude, closestGeoPt.longitude, "Near $targetDestination"))
                            }
                        }
                        list
                    }

                    // Suitable drop-off stop closest to the destination or passed initial drop-off point
                    val dropoffStop = remember(initialDropoffLat, initialDropoffLng, initialDropoffName, candidateDropoffStops, targetDestCoords, routeGeomPts) {
                        if (initialDropoffLat != null && initialDropoffLng != null && initialDropoffLat != 0.0 && initialDropoffLng != 0.0) {
                            RouteStopPoint("initial_drop", initialDropoffName ?: targetDestination, "unloading", initialDropoffLat, initialDropoffLng, "Selected Drop-off Point")
                        } else if (targetDestCoords != null && candidateDropoffStops.isNotEmpty()) {
                            candidateDropoffStops.minByOrNull {
                                computeDistanceMeters(it.lat, it.lng, targetDestCoords.latitude, targetDestCoords.longitude)
                            }
                        } else {
                            candidateDropoffStops.lastOrNull()
                        } ?: if (routeGeomPts.isNotEmpty()) {
                            val p = routeGeomPts.last()
                            RouteStopPoint("end", getDescriptiveCdoStopName(p.latitude, p.longitude, "Alighting Point"), "unloading", p.latitude, p.longitude, "Route Corridor Drop-off")
                        } else {
                            RouteStopPoint("dest_default", route.destination, "terminal", 8.4822, 124.6472, "CDO Destination")
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

                        // Direction Tabs (Inbound / Outbound)
                        val directions = if (route.directions.isNotEmpty()) {
                            route.directions
                        } else {
                            listOf(
                                RouteDirection("1", route.id, "Inbound", route.inboundDistanceKm, ""),
                                RouteDirection("2", route.id, "Outbound", route.outboundDistanceKm, "")
                            )
                        }
                        Surface(color = Color.White, modifier = Modifier.fillMaxWidth()) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp, vertical = 8.dp),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                directions.forEach { dir ->
                                    val isSelected = dir.direction.equals(selectedDirection, ignoreCase = true)
                                    Surface(
                                        shape = RoundedCornerShape(20.dp),
                                        color = if (isSelected) Brand600 else Canvas,
                                        border = BorderStroke(1.dp, if (isSelected) Brand600 else Line),
                                        modifier = Modifier
                                            .weight(1f)
                                            .clickable { selectedDirection = dir.direction }
                                    ) {
                                        Row(
                                            horizontalArrangement = Arrangement.Center,
                                            verticalAlignment = Alignment.CenterVertically,
                                            modifier = Modifier.padding(vertical = 7.dp)
                                        ) {
                                            Text(
                                                text = "${dir.direction} (${dir.distanceKm} km)",
                                                color = if (isSelected) Color.White else Ink,
                                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                                fontSize = 12.sp
                                            )
                                        }
                                    }
                                }
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
    boardingStop: RouteStopPoint?,
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
                    text = if (boardingStop != null) "Enable GPS to calculate walking distance and get pedestrian directions from where you are standing to ${boardingStop.name}." else "A verified boarding point is not available for this route yet.",
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
                        text = boardingStop?.name ?: "Verified boarding point unavailable",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = Ink
                    )
                    Text(
                        text = boardingStop?.let { "${it.type.replaceFirstChar { c -> c.uppercase() }} Point • ${it.note ?: "Official Boarding Area"}" } ?: "No stop data is available; follow posted local boarding rules.",
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
    boardingStop: RouteStopPoint?,
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
        text = boardingStop?.let { "Wait at ${it.name} and check the front windshield signboard before boarding." } ?: "Verified boarding location unavailable. Confirm a legal boarding point locally before waiting.",
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
        1 to "1. Walk",
        2 to "2. Wait",
        3 to "3. Ride",
        4 to "4. Alight",
        5 to "5. Arrive"
    )

    Surface(color = Color.White, modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            steps.forEach { (num, label) ->
                val isActive = currentStep == num
                val isDone = currentStep > num
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = when {
                        isActive -> Brand600
                        isDone -> Brand50
                        else -> Canvas
                    },
                    border = BorderStroke(
                        1.dp,
                        when {
                            isActive -> Brand600
                            isDone -> Brand600.copy(alpha = 0.3f)
                            else -> Line
                        }
                    ),
                    modifier = Modifier
                        .weight(1f)
                        .clickable { onSelectStep(num) }
                ) {
                    Column(
                        modifier = Modifier.padding(vertical = 6.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Text(
                            text = label,
                            fontSize = 11.sp,
                            fontWeight = if (isActive) FontWeight.ExtraBold else FontWeight.SemiBold,
                            color = when {
                                isActive -> Color.White
                                isDone -> Brand700
                                else -> InkMuted
                            },
                            maxLines = 1
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
            Color(android.graphics.Color.parseColor(route.color))
        } catch (_: Exception) {
            Brand600
        }
    }

    val cameraPositionState = rememberCameraPositionState()

    // Smoothly focus map camera based on active step
    LaunchedEffect(currentStep, userLocation, boardingStop, dropoffStop, destinationCoords, pts, isDestinationReachable) {
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
                    // Focus on full jeepney route
                    if (pts.size >= 2) {
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
            // 1. Verified Jeepney Route Polyline (White casing + Route Color)
            if (pts.size >= 2) {
                Polyline(
                    points = pts,
                    color = Color.White,
                    width = 18f,
                    zIndex = 4f
                )
                Polyline(
                    points = pts,
                    color = routeColor,
                    width = 12f,
                    zIndex = 5f
                )
            }

            // 2. Walking Path to Boarding Stop (Emerald Polyline)
            if (walkToBoardCoords.size >= 2) {
                Polyline(
                    points = walkToBoardCoords,
                    color = Color.White,
                    width = 14f,
                    zIndex = 7f
                )
                Polyline(
                    points = walkToBoardCoords,
                    color = Color(0xFF00A86B), // Vibrant Emerald
                    width = 8f,
                    zIndex = 8f
                )
            }

            // 3. Walking Path from Drop-off to Destination (Indigo Polyline)
            if (walkFromDropCoords.size >= 2) {
                Polyline(
                    points = walkFromDropCoords,
                    color = Color.White,
                    width = 14f,
                    zIndex = 7f
                )
                Polyline(
                    points = walkFromDropCoords,
                    color = Color(0xFF6366F1), // Vibrant Indigo
                    width = 8f,
                    zIndex = 8f
                )
            }

            // 4. User Current Location Pin
            userLocation?.let { uLoc ->
                Marker(
                    state = rememberMarkerState(key = "guide_user_loc", position = uLoc),
                    title = "Your Current Location",
                    snippet = "Start of pedestrian walk",
                    icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_AZURE),
                    zIndex = 12f
                )
            }

            // 5. Boarding Stop Pin (Green)
            boardingStop?.let { bStop ->
                Marker(
                    state = rememberMarkerState(key = "guide_boarding_${bStop.id}", position = LatLng(bStop.lat, bStop.lng)),
                    title = "Boarding Stop: ${bStop.name}",
                    snippet = "Step 1: Board Jeepney ${route.code} Here",
                    icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_GREEN),
                    zIndex = 11f
                )
            }

            // 6. Drop-off Stop Pin (Orange)
            dropoffStop?.let { dStop ->
                Marker(
                    state = rememberMarkerState(key = "guide_dropoff_${dStop.id}", position = LatLng(dStop.lat, dStop.lng)),
                    title = "Drop-off Stop: ${dStop.name}",
                    snippet = "Step 4: Alight Jeepney Here",
                    icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_ORANGE),
                    zIndex = 11f
                )
            }

            // 7. Destination Pin (Red)
            destinationCoords?.let { dCoords ->
                Marker(
                    state = rememberMarkerState(key = "guide_destination", position = dCoords),
                    title = "Destination: $destinationTitle",
                    snippet = "Step 5: Final Destination",
                    icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_RED),
                    zIndex = 12f
                )
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
