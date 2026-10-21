package com.ororuta.app.ui.screens

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
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
                shadowElevation = 1.dp
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .statusBarsPadding()
                        .padding(horizontal = 16.dp, vertical = 12.dp)
                ) {
                    Text(
                        text = "Jeepney routes",
                        fontSize = 26.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Ink,
                        letterSpacing = (-0.5).sp
                    )
                    Text(
                        text = "Official routes in Cagayan de Oro City",
                        fontSize = 13.sp,
                        color = InkMuted
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    // Search field
                    OutlinedTextField(
                        value = viewModel.searchQuery,
                        onValueChange = { newValue: String -> viewModel.onSearchChange(newValue) },
                        placeholder = { Text("Search routes, stops, or landmarks…", fontSize = 13.sp) },
                        leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = InkMuted) },
                        trailingIcon = {
                            if (viewModel.searchQuery.isNotBlank()) {
                                IconButton(onClick = { viewModel.onSearchChange("") }) {
                                    Icon(Icons.Default.Clear, contentDescription = "Clear", tint = InkMuted)
                                }
                            }
                        },
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Brand600,
                            unfocusedBorderColor = Line,
                            focusedContainerColor = Canvas,
                            unfocusedContainerColor = Canvas
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    // Filter chips: All routes | Popular Routes | With updates
                    val filterChips = listOf("All", "Popular", "Updated")
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        filterChips.forEach { chip ->
                            FilterChip(
                                selected = viewModel.selectedFilter == chip,
                                onClick = { viewModel.onFilterChange(chip) },
                                label = {
                                    Text(
                                        text = when (chip) {
                                            "All" -> "All routes"
                                            "Popular" -> "Popular Routes"
                                            else -> "With updates"
                                        },
                                        fontSize = 12.sp
                                    )
                                }
                            )
                        }
                    }

                    if (viewModel.selectedFilter == "Popular") {
                        Surface(
                            color = Brand50,
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 8.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Star,
                                    contentDescription = null,
                                    tint = Brand600,
                                    modifier = Modifier.size(14.dp)
                                )
                                Text(
                                    text = "Curated collection of commonly used Cagayan de Oro routes",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = Brand700
                                )
                            }
                        }
                    }
                    val isOffline = (state as? Resource.Success<*>)?.isOffline == true
                    if (isOffline) {
                        Surface(
                            color = Warn50,
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 8.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(8.dp)
                                        .clip(RoundedCornerShape(4.dp))
                                        .background(Warn600)
                                )
                                Text(
                                    text = "Offline – Showing cached routes",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = Warn600
                                )
                            }
                        }
                    } else if (state is Resource.Success<*>) {
                        Surface(
                            color = Ok50,
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 8.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(8.dp)
                                        .clip(RoundedCornerShape(4.dp))
                                        .background(Ok600)
                                )
                                Text(
                                    text = "Online – Updated just now",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = Ok600
                                )
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
                        CircularProgressIndicator(color = Brand600)
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
                            contentPadding = PaddingValues(16.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            item {
                                Text(
                                    text = "${routes.size} routes found",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = InkMuted
                                )
                            }

                            items(routes) { route ->
                                RouteDirectoryRow(route = route, onClick = { onSelectRoute(route.id) })
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun RouteDirectoryRow(route: Route, onClick: () -> Unit) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.975f else 1f,
        animationSpec = spring(
            dampingRatio = 0.75f,
            stiffness = 800f
        ),
        label = "routeRowScale"
    )
    val elevation by animateDpAsState(
        targetValue = if (isPressed) 0.5.dp else 1.5.dp,
        label = "routeRowElevation"
    )

    Surface(
        onClick = onClick,
        interactionSource = interactionSource,
        color = Color.White,
        shape = RoundedCornerShape(14.dp),
        shadowElevation = elevation,
        border = BorderStroke(1.dp, Line),
        modifier = Modifier
            .fillMaxWidth()
            .scale(scale)
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            RouteBadge(code = route.code, colorHex = route.color, size = BadgeSize.Lg)

            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = route.name,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = Ink,
                        modifier = Modifier.weight(1f, fill = false)
                    )
                    if (route.status != "Active") {
                        StatusPill(status = route.status)
                    }
                }

                Spacer(modifier = Modifier.height(2.dp))

                Text(
                    text = "${route.origin} → ${route.destination}",
                    fontSize = 13.sp,
                    color = InkSoft,
                    fontWeight = FontWeight.Medium
                )

                if (route.roads.isNotEmpty()) {
                    Text(
                        text = "Via " + route.roads.joinToString(", ") { it.name },
                        fontSize = 11.sp,
                        color = InkMuted,
                        maxLines = 1
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))

                val fareRes = remember(route) {
                    TraditionalJeepneyFareService.calculateFareForDistance(
                        distanceKm = if (route.lengthKm > 0) route.lengthKm else 4.0,
                        category = PassengerCategory.REGULAR,
                        jeepneyType = route.jeepneyType
                    )
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = "${route.terminalCount} terminals · ${route.stopCount} stops",
                        fontSize = 11.sp,
                        color = InkMuted
                    )
                    if (fareRes.isAvailable) {
                        Text("·", fontSize = 11.sp, color = InkMuted)
                        Text(
                            text = "₱${"%.2f".format(fareRes.regularFare)} (₱${"%.2f".format(fareRes.discountedFare)} disc)",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Brand700
                        )
                    }
                }
            }
        }
    }
}
