package com.ororuta.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ororuta.app.ui.components.*
import com.ororuta.app.ui.theme.*
import com.ororuta.app.ui.viewmodels.SavedViewModel

@Composable
fun SavedScreen(
    viewModel: SavedViewModel,
    onNavigateResults: (from: String, to: String) -> Unit,
    onNavigateSearchPrefilled: (to: String) -> Unit,
    onStartNav: (String) -> Unit
) {
    val trips by viewModel.savedTrips.collectAsState()
    val dests by viewModel.savedDestinations.collectAsState()

    Scaffold(
        topBar = {
            Surface(color = Color.White, shadowElevation = 1.dp) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .statusBarsPadding()
                        .padding(horizontal = 16.dp, vertical = 12.dp)
                ) {
                    Text(
                        text = "Saved",
                        fontSize = 26.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Ink,
                        letterSpacing = (-0.5).sp
                    )
                    Text(
                        text = "Stored on this device · no account needed",
                        fontSize = 13.sp,
                        color = InkMuted
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    SegmentedControl(
                        options = listOf("Routes (${trips.size})", "Destinations (${dests.size})"),
                        selectedIndex = viewModel.activeTab,
                        onSelect = { viewModel.activeTab = it }
                    )
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
            if (viewModel.activeTab == 0) {
                // Saved Routes
                if (trips.isEmpty()) {
                    EmptyState(
                        icon = Icons.Default.BookmarkBorder,
                        title = "No saved routes yet",
                        message = "Save your frequent jeepney commutes for fast one-tap navigation.",
                        tone = EmptyTone.Neutral
                    )
                } else {
                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(trips) { trip ->
                            Surface(
                                color = Color.White,
                                shape = RoundedCornerShape(16.dp),
                                shadowElevation = 2.dp,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                            trip.routeIds.split(",").filter { it.isNotBlank() }.forEach { code ->
                                                RouteBadge(code = code.trim(), size = BadgeSize.Sm)
                                            }
                                        }
                                        IconButton(onClick = { viewModel.deleteTrip(trip.id) }, modifier = Modifier.size(28.dp)) {
                                            Icon(Icons.Default.DeleteOutline, contentDescription = "Delete", tint = InkMuted, modifier = Modifier.size(18.dp))
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(8.dp))

                                    Text(
                                        text = "${trip.fromLabel} → ${trip.toLabel}",
                                        fontSize = 15.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Ink
                                    )

                                    Spacer(modifier = Modifier.height(14.dp))

                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        OroButton(
                                            text = "Open route",
                                            onClick = { onNavigateResults(trip.fromLabel, trip.toLabel) },
                                            variant = ButtonVariant.Ghost,
                                            size = ButtonSize.Sm,
                                            modifier = Modifier.weight(1f)
                                        )
                                        OroButton(
                                            text = "Start navigation",
                                            onClick = { onStartNav(trip.tripOptionId ?: trip.id) },
                                            variant = ButtonVariant.Primary,
                                            size = ButtonSize.Sm,
                                            modifier = Modifier.weight(1f)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                // Saved Destinations
                if (dests.isEmpty()) {
                    EmptyState(
                        icon = Icons.Default.Place,
                        title = "No saved destinations",
                        message = "Save your home, work, or school for quick route searches.",
                        tone = EmptyTone.Neutral
                    )
                } else {
                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        items(dests) { dest ->
                            Surface(
                                onClick = { onNavigateSearchPrefilled(dest.placeName) },
                                color = Color.White,
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.padding(14.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                                    ) {
                                        val icon = when (dest.icon.lowercase()) {
                                            "home" -> Icons.Default.Home
                                            "work" -> Icons.Default.Work
                                            "school" -> Icons.Default.School
                                            else -> Icons.Default.Place
                                        }
                                        Box(
                                            modifier = Modifier.size(36.dp).clip(CircleShape).background(Brand50),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Icon(icon, contentDescription = null, tint = Brand600, modifier = Modifier.size(20.dp))
                                        }

                                        Column {
                                            Text(dest.label, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Ink)
                                            Text(dest.placeName, fontSize = 12.sp, color = InkMuted)
                                        }
                                    }

                                    IconButton(onClick = { viewModel.deleteDestination(dest.id) }) {
                                        Icon(Icons.Default.DeleteOutline, contentDescription = "Delete", tint = InkMuted, modifier = Modifier.size(18.dp))
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
