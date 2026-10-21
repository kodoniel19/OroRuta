package com.ororuta.app.ui.screens

import android.content.Intent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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
import com.google.android.gms.maps.model.LatLng
import com.ororuta.app.domain.models.Resource
import com.ororuta.app.domain.models.TripLeg
import com.ororuta.app.domain.models.TripOption
import com.ororuta.app.ui.components.*
import com.ororuta.app.ui.theme.*
import com.ororuta.app.ui.viewmodels.TripDetailViewModel

@Composable
fun TripDetailScreen(
    viewModel: TripDetailViewModel,
    tripOptionId: String,
    from: String,
    to: String,
    onBack: () -> Unit,
    onOpenMapTrip: (tripOptionId: String) -> Unit,
    onStartNavigation: (tripOptionId: String) -> Unit,
    onNavigateFare: (optionId: String) -> Unit
) {
    val context = LocalContext.current

    LaunchedEffect(tripOptionId) {
        viewModel.loadTrip(tripOptionId, from, to)
    }

    var stopsAccordionExpanded by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            ScreenHeader(
                title = "Route Details",
                onBack = onBack,
                rightAction = {
                    IconButton(
                        onClick = {
                            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                type = "text/plain"
                                putExtra(Intent.EXTRA_SUBJECT, "OroRuta Jeepney Route")
                                putExtra(Intent.EXTRA_TEXT, "Jeepney route from $from to $to on OroRuta: https://ororuta.app/trips/$tripOptionId")
                            }
                            context.startActivity(Intent.createChooser(shareIntent, "Share Route"))
                        }
                    ) {
                        Icon(Icons.Default.Share, contentDescription = "Share", tint = Ink)
                    }
                }
            )
        },
        bottomBar = {
            val tripState = viewModel.tripState
            if (tripState is Resource.Success) {
                val trip = tripState.data
                Surface(
                    color = Color.White,
                    shadowElevation = 8.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .navigationBarsPadding()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Bookmark Toggle
                        IconButton(
                            onClick = { viewModel.toggleSave(trip) },
                            modifier = Modifier
                                .size(48.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(if (viewModel.isSaved) Brand50 else Canvas)
                        ) {
                            Icon(
                                imageVector = if (viewModel.isSaved) Icons.Default.Bookmark else Icons.Default.BookmarkBorder,
                                contentDescription = "Save route",
                                tint = if (viewModel.isSaved) Brand600 else InkSoft
                            )
                        }

                        // Start Navigation Button
                        OroButton(
                            text = "Start Navigation",
                            onClick = { onStartNavigation(trip.id) },
                            variant = ButtonVariant.Primary,
                            size = ButtonSize.Md,
                            icon = Icons.Default.Navigation,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(Canvas)
        ) {
            when (val state = viewModel.tripState) {
                is Resource.Loading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Brand600)
                    }
                }

                is Resource.Error -> {
                    EmptyState(
                        icon = Icons.Default.ErrorOutline,
                        title = "Could not load route details",
                        message = state.message,
                        tone = EmptyTone.Warn
                    )
                }

                is Resource.Success -> {
                    val trip = state.data
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState())
                    ) {
                        // 1. 220dp Map Preview
                        val walkToBoard = remember(trip) {
                            trip.walkToBoardCoordinates.mapNotNull { if (it.size >= 2) LatLng(it[1], it[0]) else null }
                        }
                        val jeepneyRoute = remember(trip) {
                            trip.jeepneyCoordinates.mapNotNull { if (it.size >= 2) LatLng(it[1], it[0]) else null }
                        }
                        val walkFromDrop = remember(trip) {
                            trip.walkFromDropCoordinates.mapNotNull { if (it.size >= 2) LatLng(it[1], it[0]) else null }
                        }
                        val detailMarkers = remember(trip) {
                            val list = mutableListOf<MapMarker>()
                            trip.originPlace?.let { list.add(MapMarker("orig", it.name, kind = "origin", lat = it.lat, lng = it.lng, note = "Origin")) }
                            if (trip.boardingLat != null && trip.boardingLng != null) {
                                list.add(MapMarker("board", trip.boardingName ?: "Board", kind = "loading", lat = trip.boardingLat, lng = trip.boardingLng, note = "Board here"))
                            }
                            if (trip.dropoffLat != null && trip.dropoffLng != null) {
                                list.add(MapMarker("drop", trip.dropoffName ?: "Drop", kind = "unloading", lat = trip.dropoffLat, lng = trip.dropoffLng, note = "Alight here"))
                            }
                            trip.destPlace?.let { list.add(MapMarker("dest", it.name, kind = "destination", lat = it.lat, lng = it.lng, note = "Destination")) }
                            list
                        }

                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(220.dp)
                                .clickable { onOpenMapTrip(trip.id) }
                        ) {
                            CdoCanvasMap(
                                activeWalkToBoard = walkToBoard,
                                activeJeepneyRoute = jeepneyRoute,
                                activeWalkFromDrop = walkFromDrop,
                                activeTripMarkers = detailMarkers,
                                showControls = false,
                                modifier = Modifier.fillMaxSize()
                            )
                            // "Open map" floating chip
                            Surface(
                                shape = RoundedCornerShape(20.dp),
                                color = Ink.copy(alpha = 0.85f),
                                modifier = Modifier
                                    .align(Alignment.BottomEnd)
                                    .padding(12.dp)
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Icon(Icons.Default.Map, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                                    Text("Open map", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }

                        // 2. White Header Info Section
                        Surface(
                            color = Color.White,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        trip.segments.forEach { seg ->
                                            RouteBadge(code = seg.code, colorHex = seg.color, size = BadgeSize.Lg)
                                        }
                                    }
                                    StatusPill(status = trip.status)
                                }

                                Spacer(modifier = Modifier.height(10.dp))

                                val combinedName = trip.segments.joinToString(" + ") { it.routeName }
                                Text(
                                    text = combinedName,
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = Ink
                                )

                                Text(
                                    text = "Jeepney · ${trip.direction ?: "Loop route"}",
                                    fontSize = 13.sp,
                                    color = InkMuted
                                )

                                Spacer(modifier = Modifier.height(16.dp))

                                // 4-Column Stats (Travel, Est. fare, Walk, Transfers)
                                Surface(
                                    color = Canvas,
                                    shape = RoundedCornerShape(12.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(vertical = 12.dp),
                                        horizontalArrangement = Arrangement.SpaceEvenly
                                    ) {
                                        StatCol(title = "Travel", value = "${trip.minutes}m")
                                        StatCol(title = "Est. fare", value = "₱${String.format("%.2f", trip.regularFare)}")
                                        StatCol(title = "Walk", value = "${trip.walkMeters}m")
                                        StatCol(title = "Transfers", value = "${trip.transfers}")
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        // 3. Boarding Point Card (ok50) & Drop-off Point Card (bad50)
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            if (trip.boardingName != null) {
                                Surface(
                                    color = Ok50,
                                    shape = RoundedCornerShape(12.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Row(
                                        modifier = Modifier.padding(14.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(28.dp)
                                                .clip(CircleShape)
                                                .background(Ok600),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Text("L", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                        }
                                        Column {
                                            Text("Boarding Point", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Ok600)
                                            Text(trip.boardingName, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = Ink)
                                        }
                                    }
                                }
                            }

                            if (trip.dropoffName != null) {
                                Surface(
                                    color = Bad50,
                                    shape = RoundedCornerShape(12.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Row(
                                        modifier = Modifier.padding(14.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(28.dp)
                                                .clip(CircleShape)
                                                .background(Bad600),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Text("U", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                        }
                                        Column {
                                            Text("Drop-off Point", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Bad600)
                                            Text(trip.dropoffName, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = Ink)
                                        }
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        // 4. "YOUR TRIP" VERTICAL TIMELINE OF LEGS
                        Surface(
                            color = Color.White,
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(
                                    text = "Your Trip",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Ink
                                )

                                Spacer(modifier = Modifier.height(14.dp))

                                val legs = if (trip.legs.isNotEmpty()) trip.legs else defaultLegs(trip)
                                legs.forEachIndexed { idx, leg ->
                                    TripLegItem(leg = leg, isLast = idx == legs.size - 1)
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        // 5. STOPS ON THIS ROUTE ACCORDION
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
                                    Text(
                                        text = "Stops on this route",
                                        fontSize = 16.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Ink
                                    )
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
                                        StopListItem(kind = StopKind.Terminal, name = "Bulua Westbound Terminal", note = "Start terminal")
                                        StopListItem(kind = StopKind.Loading, name = "Carmen Market Loading Area", note = "Near pedestrian crossing")
                                        StopListItem(kind = StopKind.Transfer, name = "Velez-Recto Intersection", note = "Transfer to Agora line")
                                        StopListItem(kind = StopKind.Unloading, name = "Limketkai Mall Drive", note = "Drop-off bay")
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        // 6. ESTIMATED FARE CARD
                        Surface(
                            onClick = { onNavigateFare(trip.id) },
                            color = Color.White,
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = "Estimated Fare",
                                        fontSize = 16.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Ink
                                    )
                                    Text(
                                        text = "View breakdown ›",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Brand600
                                    )
                                }

                                Spacer(modifier = Modifier.height(12.dp))

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Column {
                                        Text("Regular Fare", fontSize = 12.sp, color = InkMuted)
                                        Text("₱${String.format("%.2f", trip.regularFare)}", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Ink)
                                    }
                                    Column(horizontalAlignment = Alignment.End) {
                                        Text("Student / Senior / PWD (20% off)", fontSize = 12.sp, color = InkMuted)
                                        Text("₱${String.format("%.2f", trip.discountFare.takeIf { it > 0 } ?: (trip.regularFare * 0.8))}", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Ok600)
                                    }
                                }

                                Spacer(modifier = Modifier.height(12.dp))

                                FareNotice()
                            }
                        }

                        Spacer(modifier = Modifier.height(32.dp))
                    }
                }
            }
        }
    }
}

@Composable
fun StatCol(title: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(text = title, fontSize = 11.sp, color = InkMuted)
        Spacer(modifier = Modifier.height(2.dp))
        Text(text = value, fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = Ink)
    }
}

@Composable
fun TripLegItem(leg: TripLeg, isLast: Boolean) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Vertical step dot / line
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            when (leg.kind) {
                "walk" -> Box(modifier = Modifier.size(12.dp).clip(CircleShape).background(InkMuted))
                "board" -> Box(modifier = Modifier.size(12.dp).clip(CircleShape).background(Ok600))
                "stay" -> Box(modifier = Modifier.size(12.dp).clip(CircleShape).background(Brand500))
                "alight" -> Box(modifier = Modifier.size(12.dp).clip(CircleShape).background(Bad600))
                else -> Box(modifier = Modifier.size(12.dp).clip(CircleShape).background(Line))
            }

            if (!isLast) {
                Box(
                    modifier = Modifier
                        .width(2.dp)
                        .height(36.dp)
                        .background(Line)
                )
            }
        }

        // Leg content
        Column(modifier = Modifier.weight(1f).padding(bottom = if (isLast) 0.dp else 16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = leg.title,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = Ink
                )
                Text(
                    text = "~${leg.minutes}m",
                    fontSize = 12.sp,
                    color = InkMuted
                )
            }
            if (!leg.detail.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = leg.detail,
                    fontSize = 12.sp,
                    color = InkSoft
                )
            }
        }
    }
}

private fun defaultLegs(trip: TripOption): List<TripLeg> {
    return listOf(
        TripLeg(trip.id, 1, "walk", "Walk to ${trip.boardingName ?: "Loading point"}", "About 3 min walk · 150m", 3, 150),
        TripLeg(trip.id, 2, "board", "Board jeepney ${trip.segments.firstOrNull()?.code ?: ""}", "Wait at loading bay", 2, 0),
        TripLeg(trip.id, 3, "stay", "Ride for 6 stops", "Stay on the jeepney", 12, 2800),
        TripLeg(trip.id, 4, "alight", "Alight at ${trip.dropoffName ?: "Drop-off point"}", "Prepare fare before reaching stop", 1, 0),
        TripLeg(trip.id, 5, "walk", "Walk to destination", "About 2 min walk · 100m", 2, 100)
    )
}
