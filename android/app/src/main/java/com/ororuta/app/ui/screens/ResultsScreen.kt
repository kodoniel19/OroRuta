package com.ororuta.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ororuta.app.domain.models.Resource
import com.ororuta.app.domain.models.TripOption
import com.ororuta.app.ui.components.*
import com.ororuta.app.ui.theme.*
import com.ororuta.app.ui.viewmodels.ResultsViewModel

@Composable
fun ResultsScreen(
    viewModel: ResultsViewModel,
    from: String,
    to: String,
    fromLat: Double? = null,
    fromLng: Double? = null,
    toLat: Double? = null,
    toLng: Double? = null,
    onBack: () -> Unit,
    onEditSearch: () -> Unit,
    onSelectTrip: (tripOptionId: String, from: String, to: String) -> Unit,
    onStartNavigation: (tripOptionId: String) -> Unit,
    onNavigateOffline: () -> Unit,
    onNavigateRoutes: () -> Unit,
    onNavigateNearby: () -> Unit
) {
    LaunchedEffect(from, to) {
        viewModel.searchTrips(from, to, viewModel.currentSort, fromLat, fromLng, toLat, toLng)
    }

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
                    // Header bar with Back and Edit
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        IconButton(onClick = onBack, modifier = Modifier.size(40.dp)) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Ink)
                        }

                        // Search overview card
                        Surface(
                            onClick = onEditSearch,
                            color = Canvas,
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier
                                .weight(1f)
                                .padding(horizontal = 8.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = "$from → $to",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = Ink,
                                    maxLines = 1,
                                    modifier = Modifier.weight(1f)
                                )
                                Text(
                                    text = "Edit",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Brand600
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // Sort Criteria Chips
                    val sortOptions = listOf(
                        Pair("time", "Shortest travel time"),
                        Pair("fare", "Lowest estimated fare"),
                        Pair("walk", "Least walking"),
                        Pair("transfers", "Fewest transfers")
                    )

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        sortOptions.forEach { opt ->
                            FilterChip(
                                selected = viewModel.currentSort == opt.first,
                                onClick = { viewModel.changeSort(from, to, opt.first) },
                                label = { Text(opt.second, fontSize = 12.sp) }
                            )
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
            when (val state = viewModel.tripsState) {
                is Resource.Loading -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Text("Finding jeepney routes…", fontSize = 14.sp, color = InkMuted, fontWeight = FontWeight.Medium)
                        repeat(3) {
                            Surface(
                                color = Color.White,
                                shape = RoundedCornerShape(16.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(140.dp)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    CircularProgressIndicator(color = Brand600, strokeWidth = 2.dp)
                                }
                            }
                        }
                    }
                }

                is Resource.Error -> {
                    if (state.isOffline) {
                        EmptyState(
                            icon = Icons.Default.CloudOff,
                            title = "Can't search while offline",
                            message = "Search requires an internet connection. You can still access your downloaded routes.",
                            tone = EmptyTone.Warn,
                            action = {
                                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    OroButton(
                                        text = "View Offline Routes",
                                        onClick = onNavigateOffline,
                                        variant = ButtonVariant.Primary,
                                        size = ButtonSize.Md
                                    )
                                    OroButton(
                                        text = "Retry Connection",
                                        onClick = { viewModel.searchTrips(from, to, viewModel.currentSort) },
                                        variant = ButtonVariant.Ghost,
                                        size = ButtonSize.Md
                                    )
                                }
                            }
                        )
                    } else {
                        EmptyState(
                            icon = Icons.Default.ErrorOutline,
                            title = "Search Error",
                            message = state.message,
                            tone = EmptyTone.Warn,
                            action = {
                                OroButton(
                                    text = "Retry",
                                    onClick = { viewModel.searchTrips(from, to, viewModel.currentSort) },
                                    variant = ButtonVariant.Primary,
                                    size = ButtonSize.Md
                                )
                            }
                        )
                    }
                }

                is Resource.Success -> {
                    val trips = state.data
                    if (trips.isEmpty()) {
                        // 30. No Jeepney Route Found screen
                        EmptyState(
                            icon = Icons.Default.DirectionsBusFilled,
                            title = "No jeepney route found",
                            message = "We couldn't find a jeepney route matching your destination. Note that OroRuta only covers jeepney routes within Cagayan de Oro City.",
                            tone = EmptyTone.Warn,
                            action = {
                                Column(
                                    verticalArrangement = Arrangement.spacedBy(8.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    OroButton(
                                        text = "Change Destination",
                                        onClick = onEditSearch,
                                        variant = ButtonVariant.Primary,
                                        size = ButtonSize.Md,
                                        fullWidth = true
                                    )
                                    OroButton(
                                        text = "View Nearby Routes",
                                        onClick = onNavigateNearby,
                                        variant = ButtonVariant.Secondary,
                                        size = ButtonSize.Md,
                                        fullWidth = true
                                    )
                                    OroButton(
                                        text = "Browse All Routes",
                                        onClick = onNavigateRoutes,
                                        variant = ButtonVariant.Ghost,
                                        size = ButtonSize.Md,
                                        fullWidth = true
                                    )
                                }
                            },
                            modifier = Modifier.padding(top = 32.dp)
                        )
                    } else {
                        val criterionName = when (viewModel.currentSort) {
                            "fare" -> "lowest fare"
                            "walk" -> "least walking"
                            "transfers" -> "fewest transfers"
                            else -> "shortest travel time"
                        }

                        LazyColumn(
                            contentPadding = PaddingValues(16.dp),
                            verticalArrangement = Arrangement.spacedBy(14.dp)
                        ) {
                            item {
                                Text(
                                    text = "${trips.size} jeepney routes · sorted by $criterionName",
                                    fontSize = 13.sp,
                                    color = InkMuted,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }

                            items(trips) { trip ->
                                TripCard(
                                    trip = trip,
                                    onViewRoute = { onSelectTrip(trip.id, from, to) },
                                    onStartNav = { onStartNavigation(trip.id) }
                                )
                            }

                            item {
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = "Times and fares are estimates. Routes shown are jeepney routes only.",
                                    fontSize = 12.sp,
                                    color = InkMuted,
                                    lineHeight = 16.sp
                                )
                                Spacer(modifier = Modifier.height(16.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}
