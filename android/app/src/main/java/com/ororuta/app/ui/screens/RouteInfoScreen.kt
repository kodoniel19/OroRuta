package com.ororuta.app.ui.screens

import android.content.Intent
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
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.LatLngBounds
import com.google.maps.android.compose.*
import com.ororuta.app.domain.models.Resource
import com.ororuta.app.domain.models.Route
import com.ororuta.app.domain.models.RouteDirection
import com.ororuta.app.ui.components.*
import com.ororuta.app.ui.theme.*
import com.ororuta.app.ui.viewmodels.RouteInfoViewModel

@Composable
fun RouteInfoScreen(
    viewModel: RouteInfoViewModel,
    routeId: String,
    onBack: () -> Unit,
    onViewOnMap: (routeId: String) -> Unit,
    onNavigateFare: (routeId: String) -> Unit
) {
    val context = LocalContext.current

    LaunchedEffect(routeId) {
        viewModel.loadRoute(routeId)
    }

    var stopsAccordionExpanded by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            ScreenHeader(
                title = "Route Information",
                onBack = onBack,
                rightAction = {
                    IconButton(
                        onClick = {
                            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                                type = "text/plain"
                                putExtra(Intent.EXTRA_SUBJECT, "OroRuta Jeepney Route")
                                putExtra(Intent.EXTRA_TEXT, "Check out this CDO jeepney route on OroRuta: https://ororuta.app/routes/$routeId")
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
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(
                            onClick = { viewModel.toggleSave(route) },
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

                        OroButton(
                            text = "View route on map",
                            onClick = { onViewOnMap(route.id) },
                            variant = ButtonVariant.Primary,
                            size = ButtonSize.Md,
                            icon = Icons.Default.Map,
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
            when (val state = viewModel.routeState) {
                is Resource.Loading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Brand600)
                    }
                }

                is Resource.Error -> {
                    EmptyState(
                        icon = Icons.Default.ErrorOutline,
                        title = "Could not load route",
                        message = state.message,
                        tone = EmptyTone.Warn
                    )
                }

                is Resource.Success -> {
                    val route = state.data
                    var selectedDirection by remember { mutableStateOf("Inbound") }

                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState())
                    ) {
                        // Verified Route Map Preview with Inbound / Outbound Switcher
                        RouteMapPreview(
                            route = route,
                            selectedDirection = selectedDirection,
                            onDirectionChange = { selectedDirection = it },
                            onClick = { onViewOnMap(route.id) },
                            modifier = Modifier.fillMaxWidth()
                        )

                        // Info section
                        Surface(color = Color.White, modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    RouteBadge(code = route.code, colorHex = route.color, size = BadgeSize.Lg)
                                    StatusPill(status = route.status)
                                }

                                Spacer(modifier = Modifier.height(10.dp))

                                Text(
                                    text = route.name,
                                    fontSize = 20.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = Ink
                                )

                                Text(
                                    text = "Jeepney · ${route.jeepneyType}",
                                    fontSize = 13.sp,
                                    color = InkMuted
                                )

                                Spacer(modifier = Modifier.height(14.dp))

                                // Origin / Destination Card
                                Surface(
                                    color = Canvas,
                                    shape = RoundedCornerShape(12.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Column(modifier = Modifier.padding(12.dp)) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(Brand600))
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Text("Origin: ${route.origin}", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Ink)
                                        }
                                        HorizontalDivider(color = Line, modifier = Modifier.padding(vertical = 8.dp))
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(Bad600))
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Text("Destination: ${route.destination}", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Ink)
                                        }
                                    }
                                }

                                if (!route.description.isNullOrBlank()) {
                                    Spacer(modifier = Modifier.height(12.dp))
                                    Text(text = route.description, fontSize = 13.sp, color = InkSoft, lineHeight = 18.sp)
                                }

                                // Major Roads Chips
                                if (route.roads.isNotEmpty()) {
                                    Spacer(modifier = Modifier.height(12.dp))
                                    Text("Major Roads:", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = InkMuted)
                                    Spacer(modifier = Modifier.height(6.dp))
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
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        // Related active announcements (if any)
                        if (route.announcements.isNotEmpty()) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                route.announcements.forEach { ann ->
                                    Surface(
                                        color = Warn50,
                                        shape = RoundedCornerShape(12.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                            Icon(Icons.Default.Warning, contentDescription = null, tint = Warn600, modifier = Modifier.size(18.dp))
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Text(ann.title, color = Warn600, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            }
                            Spacer(modifier = Modifier.height(12.dp))
                        }

                        // Accordion of Terminals / Loading / Unloading / Transfer points
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
                                        text = "Route Stops & Terminals",
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
                                        verticalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        route.terminals.forEach { t ->
                                            StopListItem(kind = StopKind.Terminal, name = t.name, note = t.note)
                                        }
                                        route.stops.forEach { s ->
                                            val k = if (s.pointType == "unloading") StopKind.Unloading else StopKind.Loading
                                            StopListItem(kind = k, name = s.name, note = s.note)
                                        }
                                        route.transfers.forEach { tr ->
                                            StopListItem(kind = StopKind.Transfer, name = tr.name, note = tr.note)
                                        }
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        // Offline download card
                        Surface(
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
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                                    ) {
                                        Icon(Icons.Default.CloudDownload, contentDescription = null, tint = Brand600)
                                        Column {
                                            Text("Offline Access", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Ink)
                                            Text("${route.offlineSizeMb} MB · Includes map & stops", fontSize = 12.sp, color = InkMuted)
                                        }
                                    }

                                    if (viewModel.isDownloaded) {
                                        Surface(shape = CircleShape, color = Ok50) {
                                            Text(
                                                "Downloaded",
                                                color = Ok600,
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold,
                                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                            )
                                        }
                                    } else {
                                        OroButton(
                                            text = "Download",
                                            onClick = { viewModel.downloadOffline(route.id) },
                                            variant = ButtonVariant.Secondary,
                                            size = ButtonSize.Sm
                                        )
                                    }
                                }
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
fun RouteMapPreview(
    route: Route,
    selectedDirection: String,
    onDirectionChange: (String) -> Unit,
    onClick: () -> Unit,
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

    // Fit camera to the verified route bounds when points are loaded
    LaunchedEffect(pts) {
        if (pts.size >= 2) {
            val builder = LatLngBounds.builder()
            pts.forEach { builder.include(it) }
            val bounds = builder.build()
            cameraPositionState.animate(
                CameraUpdateFactory.newLatLngBounds(bounds, 64),
                500
            )
        } else if (pts.size == 1) {
            cameraPositionState.move(CameraUpdateFactory.newLatLngZoom(pts[0], 14f))
        } else {
            cameraPositionState.move(CameraUpdateFactory.newLatLngZoom(LatLng(8.4822, 124.6472), 13.5f))
        }
    }

    Column(modifier = modifier) {
        // Map Viewport
        Box(
            modifier = Modifier
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
                ),
                onMapClick = { onClick() }
            ) {
                if (pts.size >= 2) {
                    Polyline(
                        points = pts,
                        color = routeColor,
                        width = 14f
                    )
                    // Origin Pin (Azure)
                    Marker(
                        state = rememberMarkerState(position = pts.first()),
                        title = "Origin: ${route.origin}",
                        icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_AZURE)
                    )
                    // Destination Pin (Red)
                    Marker(
                        state = rememberMarkerState(position = pts.last()),
                        title = "Destination: ${route.destination}",
                        icon = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_RED)
                    )
                }
            }

            // Expand Map pill button
            Surface(
                color = Color.Black.copy(alpha = 0.55f),
                shape = RoundedCornerShape(20.dp),
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(8.dp)
                    .clickable { onClick() }
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

        // Inbound / Outbound Direction Switcher Tabs
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
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                directions.forEach { dir ->
                    val isSelected = dir.direction.equals(selectedDirection, ignoreCase = true)
                    Surface(
                        shape = RoundedCornerShape(20.dp),
                        color = if (isSelected) Brand600 else Canvas,
                        border = BorderStroke(1.dp, if (isSelected) Brand600 else Line),
                        modifier = Modifier
                            .weight(1f)
                            .clickable { onDirectionChange(dir.direction) }
                    ) {
                        Row(
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(vertical = 8.dp)
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
    }
}
