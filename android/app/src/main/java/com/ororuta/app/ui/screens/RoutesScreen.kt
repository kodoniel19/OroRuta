package com.ororuta.app.ui.screens

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.AltRoute
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ororuta.app.domain.fare.PassengerCategory
import com.ororuta.app.domain.fare.TraditionalJeepneyFareService
import com.ororuta.app.domain.models.Resource
import com.ororuta.app.domain.models.Route
import com.ororuta.app.ui.components.BadgeSize
import com.ororuta.app.ui.components.RouteBadge
import com.ororuta.app.ui.components.StatusPill
import com.ororuta.app.ui.theme.*
import com.ororuta.app.ui.viewmodels.RoutesViewModel

@Composable
fun RoutesScreen(
    viewModel: RoutesViewModel,
    onSelectRoute: (routeId: String) -> Unit
) {
    val state = viewModel.routesState

    Scaffold(
        topBar = {
            Surface(
                color = Color.White,
                shadowElevation = 1.dp,
                border = BorderStroke(0.5.dp, Line)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .statusBarsPadding()
                        .padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 12.dp)
                ) {
                    // Header title row with transit badge
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(Brand50),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.DirectionsBus,
                                contentDescription = null,
                                tint = Brand600,
                                modifier = Modifier.size(20.dp)
                            )
                        }

                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Jeepney routes",
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold,
                                color = Ink,
                                letterSpacing = (-0.3).sp
                            )
                            Text(
                                text = "Official routes in Cagayan de Oro City",
                                fontSize = 12.sp,
                                color = InkMuted
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Modern mobility search bar (Google Maps / Grab style)
                    var isSearchFocused by remember { mutableStateOf(false) }
                    Surface(
                        color = Canvas,
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(
                            width = if (isSearchFocused) 1.5.dp else 1.dp,
                            color = if (isSearchFocused) Brand600 else Line
                        ),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(46.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(horizontal = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Search,
                                contentDescription = null,
                                tint = if (isSearchFocused) Brand600 else InkMuted,
                                modifier = Modifier.size(20.dp)
                            )

                            Box(modifier = Modifier.weight(1f)) {
                                if (viewModel.searchQuery.isEmpty()) {
                                    Text(
                                        text = "Search routes, stops, or landmarks...",
                                        fontSize = 13.5.sp,
                                        color = InkMuted
                                    )
                                }
                                BasicTextField(
                                    value = viewModel.searchQuery,
                                    onValueChange = { viewModel.onSearchChange(it) },
                                    singleLine = true,
                                    textStyle = TextStyle(
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = Ink
                                    ),
                                    cursorBrush = SolidColor(Brand600),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .onFocusChanged {
                                            isSearchFocused = it.isFocused
                                        }
                                )
                            }

                            if (viewModel.searchQuery.isNotEmpty()) {
                                IconButton(
                                    onClick = { viewModel.onSearchChange("") },
                                    modifier = Modifier.size(28.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Close,
                                        contentDescription = "Clear",
                                        tint = InkMuted,
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // Polished pill-shaped filter chips with subtle icons
                    val filterChips = listOf(
                        Triple("All", "All routes", Icons.AutoMirrored.Filled.AltRoute),
                        Triple("Popular", "Popular Routes", Icons.AutoMirrored.Filled.TrendingUp),
                        Triple("Updated", "With updates", Icons.Default.Update)
                    )
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        filterChips.forEach { (chipKey, label, icon) ->
                            val isSelected = viewModel.selectedFilter == chipKey
                            Surface(
                                onClick = { viewModel.onFilterChange(chipKey) },
                                shape = RoundedCornerShape(20.dp),
                                color = if (isSelected) Brand600 else Color.White,
                                border = if (isSelected) null else BorderStroke(1.dp, Line),
                                shadowElevation = if (isSelected) 1.dp else 0.dp,
                                modifier = Modifier.height(32.dp)
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 12.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Icon(
                                        imageVector = icon,
                                        contentDescription = null,
                                        tint = if (isSelected) Color.White else InkMuted,
                                        modifier = Modifier.size(13.dp)
                                    )
                                    Text(
                                        text = label,
                                        fontSize = 12.sp,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                        color = if (isSelected) Color.White else InkSoft
                                    )
                                }
                            }
                        }
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
            when (state) {
                is Resource.Loading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Brand600, strokeWidth = 3.dp)
                    }
                }

                is Resource.Error -> {
                    Box(modifier = Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Icon(
                                imageVector = if (state.isOffline) Icons.Default.CloudOff else Icons.Default.WifiOff,
                                contentDescription = null,
                                tint = Warn600,
                                modifier = Modifier.size(48.dp)
                            )
                            Text(
                                text = if (state.isOffline) "No cached routes available" else "Unable to load routes",
                                color = Ink,
                                fontSize = 17.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = state.message,
                                color = InkMuted,
                                fontSize = 13.sp,
                                textAlign = TextAlign.Center
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Button(
                                onClick = { viewModel.loadRoutes() },
                                colors = ButtonDefaults.buttonColors(containerColor = Brand600),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Retry", color = Color.White, fontWeight = FontWeight.SemiBold)
                            }
                        }
                    }
                }

                is Resource.Success<*> -> {
                    @Suppress("UNCHECKED_CAST")
                    val routes = (state as Resource.Success<List<Route>>).data
                    if (routes.isEmpty()) {
                        Box(modifier = Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.SearchOff,
                                    contentDescription = null,
                                    tint = InkMuted,
                                    modifier = Modifier.size(40.dp)
                                )
                                Text(
                                    text = "No routes found",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Ink
                                )
                                Text(
                                    text = "Try adjusting your search or filters.",
                                    fontSize = 13.sp,
                                    color = InkMuted
                                )
                            }
                        }
                    } else {
                        LazyColumn(
                            contentPadding = PaddingValues(
                                start = 12.dp,
                                end = 12.dp,
                                top = 8.dp,
                                bottom = 12.dp
                            ),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            item {
                                Text(
                                    text = "${routes.size} routes found",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = InkMuted,
                                    modifier = Modifier.padding(start = 4.dp, bottom = 2.dp)
                                )
                            }

                            items(routes, key = { it.id }) { route ->
                                CompactRouteCard(route = route, onClick = { onSelectRoute(route.id) })
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun CompactRouteCard(route: Route, onClick: () -> Unit) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.98f else 1f,
        animationSpec = spring(dampingRatio = 0.75f, stiffness = 800f),
        label = "routeCardScale"
    )
    val elevation by animateDpAsState(
        targetValue = if (isPressed) 0.dp else 1.dp,
        label = "routeCardElevation"
    )

    // Precompute fare
    val fareRes = remember(route) {
        TraditionalJeepneyFareService.calculateFareForDistance(
            distanceKm = if (route.lengthKm > 0) route.lengthKm else 4.0,
            category = PassengerCategory.REGULAR,
            jeepneyType = route.jeepneyType
        )
    }

    Surface(
        onClick = onClick,
        interactionSource = interactionSource,
        color = Color.White,
        shape = RoundedCornerShape(12.dp),
        shadowElevation = elevation,
        modifier = Modifier
            .fillMaxWidth()
            .scale(scale)
    ) {
        Row(
            modifier = Modifier.padding(10.dp),
            verticalAlignment = Alignment.Top,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // Compact route badge — vertically centered in the card
            Box(
                modifier = Modifier.padding(top = 2.dp)
            ) {
                RouteBadge(code = route.code, colorHex = route.color, size = BadgeSize.Md)
            }

            // Route information column
            Column(modifier = Modifier.weight(1f)) {
                // Route name + status
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = route.name,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Ink,
                        lineHeight = 18.sp,
                        modifier = Modifier.weight(1f, fill = false)
                    )
                    if (route.status != "Active") {
                        Spacer(modifier = Modifier.width(6.dp))
                        StatusPill(status = route.status)
                    }
                }

                Spacer(modifier = Modifier.height(2.dp))

                // Origin → destination
                Text(
                    text = "${route.origin} → ${route.destination}",
                    fontSize = 12.sp,
                    color = InkSoft,
                    fontWeight = FontWeight.Normal,
                    lineHeight = 16.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )

                // Via roads
                if (route.roads.isNotEmpty()) {
                    Text(
                        text = "Via " + route.roads.joinToString(", ") { it.name },
                        fontSize = 11.sp,
                        color = InkMuted,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        lineHeight = 14.sp
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))

                // Bottom info row: terminals · stops · fare
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    // Terminals & stops
                    Text(
                        text = "${route.terminalCount} terminals · ${route.stopCount} stops",
                        fontSize = 11.sp,
                        color = InkMuted
                    )

                    // Fare
                    if (fareRes.isAvailable) {
                        Text("·", fontSize = 11.sp, color = InkMuted)
                        Text(
                            text = "₱${"%.2f".format(fareRes.regularFare)}",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Brand600
                        )
                        Text(
                            text = "(₱${"%.2f".format(fareRes.discountedFare)} disc)",
                            fontSize = 10.sp,
                            color = Brand700
                        )
                    }
                }
            }

            // Chevron indicator
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = Line,
                modifier = Modifier
                    .size(18.dp)
                    .align(Alignment.CenterVertically)
            )
        }
    }
}
