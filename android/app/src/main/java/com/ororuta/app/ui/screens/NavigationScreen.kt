package com.ororuta.app.ui.screens

import android.app.Activity
import android.view.WindowManager
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
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
import com.google.android.gms.maps.model.LatLng
import com.ororuta.app.domain.models.Resource
import com.ororuta.app.domain.models.TripLeg
import com.ororuta.app.ui.components.*
import com.ororuta.app.ui.theme.*
import com.ororuta.app.ui.viewmodels.NavigationViewModel

@Composable
fun NavigationScreen(
    viewModel: NavigationViewModel,
    tripOptionId: String,
    onExitToHome: () -> Unit,
    onBackToDetails: () -> Unit,
    onDestinationReached: () -> Unit
) {
    val context = LocalContext.current

    // Keep screen on during navigation
    DisposableEffect(Unit) {
        val window = (context as? Activity)?.window
        window?.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        onDispose {
            window?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
    }

    LaunchedEffect(tripOptionId) {
        viewModel.loadTrip(tripOptionId)
    }

    var showExitDialog by remember { mutableStateOf(false) }

    val sampleLegs = remember {
        listOf(
            TripLeg("1", 1, "walk", "Walk to loading area", "About 2 min walk · 100m", 2, 100),
            TripLeg("2", 2, "board", "Board Jeepney", "Check signboard on jeepney", 2, 0),
            TripLeg("3", 3, "stay", "Ride towards destination", "Stay on jeepney, prepare fare", 10, 2000),
            TripLeg("4", 4, "alight", "Alight at drop-off stop", "Tell driver 'Lugar lang'", 1, 0),
            TripLeg("5", 5, "walk", "Walk to destination", "About 1 min walk", 1, 60)
        )
    }

    val trip = viewModel.trip
    val legs = if (trip != null && trip.legs.isNotEmpty()) trip.legs else sampleLegs
    val currentStep = legs.getOrElse(viewModel.currentStepIndex) { legs.last() }

    // Real road-snapped coordinates from OSRM
    val walkToBoard = remember(trip) {
        trip?.walkToBoardCoordinates?.mapNotNull {
            if (it.size >= 2) LatLng(it[1], it[0]) else null
        } ?: emptyList()
    }
    val jeepneyRoute = remember(trip) {
        trip?.jeepneyCoordinates?.mapNotNull {
            if (it.size >= 2) LatLng(it[1], it[0]) else null
        } ?: emptyList()
    }
    val walkFromDrop = remember(trip) {
        trip?.walkFromDropCoordinates?.mapNotNull {
            if (it.size >= 2) LatLng(it[1], it[0]) else null
        } ?: emptyList()
    }

    val activeMarkers = remember(trip) {
        val list = mutableListOf<MapMarker>()
        if (trip != null) {
            trip.originPlace?.let {
                list.add(MapMarker(id = "origin", name = it.name, kind = "origin", lat = it.lat, lng = it.lng, note = "Starting Point"))
            }
            if (trip.boardingLat != null && trip.boardingLng != null) {
                list.add(MapMarker(id = "boarding", name = trip.boardingName ?: "Loading Point", kind = "loading", lat = trip.boardingLat, lng = trip.boardingLng, note = "Board jeepney here"))
            }
            if (trip.dropoffLat != null && trip.dropoffLng != null) {
                list.add(MapMarker(id = "dropoff", name = trip.dropoffName ?: "Drop-off Point", kind = "unloading", lat = trip.dropoffLat, lng = trip.dropoffLng, note = "Alight jeepney here"))
            }
            trip.destPlace?.let {
                list.add(MapMarker(id = "dest", name = it.name, kind = "destination", lat = it.lat, lng = it.lng, note = "Destination"))
            }
        }
        list
    }

    if (viewModel.isDestinationReached) {
        LaunchedEffect(Unit) {
            onDestinationReached()
        }
    }

    // Exit confirm dialog
    if (showExitDialog) {
        AlertDialog(
            onDismissRequest = { showExitDialog = false },
            title = { Text("Exit Navigation?", fontWeight = FontWeight.Bold) },
            text = { Text("Are you sure you want to stop active navigation?") },
            confirmButton = {
                TextButton(onClick = {
                    showExitDialog = false
                    onExitToHome()
                }) {
                    Text("Exit to Home", color = Bad600, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showExitDialog = false }) {
                    Text("Keep navigating", color = Brand600)
                }
            }
        )
    }

    Box(modifier = Modifier.fillMaxSize()) {
        when (val state = viewModel.tripState) {
            is Resource.Loading -> {
                if (trip == null) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            CircularProgressIndicator(color = Brand600)
                            Text("Loading navigation route…", fontSize = 14.sp, color = InkMuted)
                        }
                    }
                }
            }
            is Resource.Error -> {
                if (trip == null) {
                    EmptyState(
                        icon = Icons.Default.ErrorOutline,
                        title = "Navigation Unavailable",
                        message = state.message,
                        tone = EmptyTone.Warn,
                        action = {
                            OroButton(
                                text = "Retry",
                                onClick = { viewModel.loadTrip(tripOptionId) },
                                variant = ButtonVariant.Primary,
                                size = ButtonSize.Md
                            )
                        },
                        modifier = Modifier.align(Alignment.Center)
                    )
                }
            }
            else -> {}
        }

        // Full screen map with road-snapped polylines
        CdoCanvasMap(
            activeWalkToBoard = walkToBoard,
            activeJeepneyRoute = jeepneyRoute,
            activeWalkFromDrop = walkFromDrop,
            activeTripMarkers = activeMarkers,
            showControls = true,
            modifier = Modifier.fillMaxSize()
        )

        // 1. TOP BRAND700 INSTRUCTION CARD
        Surface(
            color = Brand700,
            shape = RoundedCornerShape(bottomStart = 20.dp, bottomEnd = 20.dp),
            shadowElevation = 6.dp,
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Step ${viewModel.currentStepIndex + 1} of ${legs.size}",
                        color = Oro400,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.ExtraBold,
                        letterSpacing = 0.5.sp
                    )

                    IconButton(
                        onClick = { showExitDialog = true },
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(Icons.Default.Close, contentDescription = "Exit", tint = Color.White)
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    if (currentStep.routeCode != null) {
                        RouteBadge(code = currentStep.routeCode, colorHex = currentStep.routeColor ?: "#1471B0", size = BadgeSize.Sm)
                    }
                    Text(
                        text = currentStep.title,
                        color = Color.White,
                        fontSize = 17.sp,
                        fontWeight = FontWeight.ExtraBold
                    )
                }

                if (!currentStep.detail.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = currentStep.detail,
                        color = Color.White.copy(alpha = 0.85f),
                        fontSize = 13.sp
                    )
                }
            }
        }

        // 2. BOTTOM NAVIGATION SHEET
        Surface(
            color = Color.White,
            shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
            shadowElevation = 12.dp,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .navigationBarsPadding()
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // Location warning banners if GPS error or permission denied
                if (viewModel.isPermissionDenied) {
                    Surface(
                        color = Bad50,
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(Icons.Default.LocationDisabled, contentDescription = null, tint = Bad600, modifier = Modifier.size(18.dp))
                            Text(
                                text = "Location permission denied. Real-time GPS tracking is unavailable.",
                                fontSize = 12.sp,
                                color = Bad600,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                } else if (viewModel.locationError != null) {
                    Surface(
                        color = Oro50,
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(Icons.Default.GpsFixed, contentDescription = null, tint = Oro700, modifier = Modifier.size(18.dp))
                            Text(
                                text = viewModel.locationError ?: "Waiting for GPS fix…",
                                fontSize = 12.sp,
                                color = Oro700,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }

                // Remaining stats & Exit link
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        val destinationName = trip?.destPlace?.name ?: trip?.dropoffName ?: "Destination"
                        Text(
                            text = "${viewModel.remainingMinutes} min",
                            fontSize = 26.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Ink
                        )
                        Text(
                            text = "${String.format("%.1f", viewModel.remainingDistanceKm)} km left · to $destinationName",
                            fontSize = 13.sp,
                            color = InkMuted
                        )
                    }

                    TextButton(onClick = { showExitDialog = true }) {
                        Text("Exit", color = Bad600, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    }
                }

                // Horizontal Step Chips
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    legs.forEachIndexed { idx, _ ->
                        val (chipBg, chipTextColor) = when {
                            idx < viewModel.currentStepIndex -> Pair(Ok50, Ok600)
                            idx == viewModel.currentStepIndex -> Pair(Brand600, Color.White)
                            else -> Pair(Canvas, InkMuted)
                        }

                        Surface(
                            shape = CircleShape,
                            color = chipBg,
                            modifier = Modifier.height(28.dp)
                        ) {
                            Box(
                                contentAlignment = Alignment.Center,
                                modifier = Modifier.padding(horizontal = 12.dp)
                            ) {
                                Text(
                                    text = "Step ${idx + 1}",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = chipTextColor
                                )
                            }
                        }
                    }
                }

                // Contextual primary CTA
                val ctaText = when {
                    viewModel.currentStepIndex >= legs.size - 1 -> "I've arrived"
                    currentStep.kind == "walk" && viewModel.currentStepIndex == 0 -> "I'm at the loading point"
                    currentStep.kind == "board" -> "I'm on the jeepney"
                    currentStep.kind == "stay" -> "Approaching drop-off"
                    currentStep.kind == "alight" -> "I got off"
                    else -> "Next step"
                }

                OroButton(
                    text = ctaText,
                    onClick = { viewModel.nextStep() },
                    variant = ButtonVariant.Primary,
                    size = ButtonSize.Lg,
                    fullWidth = true
                )

                // Footnote
                Text(
                    text = "Uses your phone's location only. Jeepneys are not tracked.",
                    fontSize = 11.sp,
                    color = InkMuted,
                    modifier = Modifier.align(Alignment.CenterHorizontally)
                )
            }
        }
    }
}
