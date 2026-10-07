package com.ororuta.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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

                    // Filter chips: All routes | Traditional | Modern | With updates
                    val filterChips = listOf("All", "Traditional", "Modern", "Updated")
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
                                        text = if (chip == "All") "All routes" else if (chip == "Updated") "With updates" else chip,
                                        fontSize = 12.sp
                                    )
                                }
                            )
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
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text(
                                text = if (state.isOffline) "No cached routes available" else "Unable to load routes",
                                color = Ink,
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = state.message,
                                color = InkMuted,
                                fontSize = 13.sp
                            )
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
    Surface(
        onClick = onClick,
        color = Color.White,
        shape = RoundedCornerShape(14.dp),
        shadowElevation = 1.dp,
        modifier = Modifier.fillMaxWidth()
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

                Text(
                    text = "${route.jeepneyType} · ${route.terminalCount} terminals · ${route.stopCount} stops",
                    fontSize = 11.sp,
                    color = InkMuted
                )
            }
        }
    }
}
