package com.ororuta.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ororuta.app.data.local.entities.LocalSavedTrip
import com.ororuta.app.ui.components.*
import com.ororuta.app.ui.theme.*
import com.ororuta.app.ui.viewmodels.SavedViewModel

@Composable
fun SavedScreen(
    viewModel: SavedViewModel,
    onOpenRouteInfo: (routeId: String) -> Unit = {},
    onNavigateResults: (from: String, to: String) -> Unit = { _, _ -> },
    onNavigateRoutes: () -> Unit = {},
    onStartNav: (String) -> Unit = {}
) {
    val trips by viewModel.savedTrips.collectAsState()
    var deletingTrip by remember { mutableStateOf<LocalSavedTrip?>(null) }

    Scaffold(
        topBar = {
            Surface(color = Color.White, shadowElevation = 1.dp) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .statusBarsPadding()
                        .padding(horizontal = 16.dp, vertical = 14.dp)
                ) {
                    Text(
                        text = "Saved Routes",
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
            if (trips.isEmpty()) {
                EmptyState(
                    icon = Icons.Default.BookmarkBorder,
                    title = "No saved routes yet",
                    message = "Save your frequent jeepney commutes for fast one-tap navigation.",
                    tone = EmptyTone.Neutral,
                    action = {
                        OroButton(
                            text = "Browse Available Routes",
                            onClick = onNavigateRoutes,
                            variant = ButtonVariant.Primary,
                            size = ButtonSize.Md
                        )
                    }
                )
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    item {
                        Text(
                            text = "${trips.size} saved route${if (trips.size > 1) "s" else ""}",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = InkMuted
                        )
                    }

                    items(trips, key = { it.id }) { trip ->
                        Surface(
                            color = Color.White,
                            shape = RoundedCornerShape(16.dp),
                            shadowElevation = 2.dp,
                            border = BorderStroke(1.dp, Line),
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
                                    IconButton(
                                        onClick = { deletingTrip = trip },
                                        modifier = Modifier.size(44.dp)
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.DeleteOutline,
                                            contentDescription = "Delete Saved Route",
                                            tint = Bad600,
                                            modifier = Modifier.size(20.dp)
                                        )
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

                                OroButton(
                                    text = "Travel Guidance",
                                    onClick = {
                                        val primaryRoute = trip.routeIds.split(",").map { it.trim() }.firstOrNull { it.isNotBlank() }
                                        if (!primaryRoute.isNullOrBlank()) {
                                            onOpenRouteInfo(primaryRoute)
                                        } else if (!trip.tripOptionId.isNullOrBlank()) {
                                            onStartNav(trip.tripOptionId)
                                        } else {
                                            onNavigateResults(trip.fromLabel, trip.toLabel)
                                        }
                                    },
                                    variant = ButtonVariant.Primary,
                                    size = ButtonSize.Sm,
                                    icon = Icons.Default.Directions,
                                    fullWidth = true
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    // Delete Confirmation Dialog
    if (deletingTrip != null) {
        val trip = deletingTrip!!
        AlertDialog(
            onDismissRequest = { deletingTrip = null },
            title = { Text("Delete Saved Route", fontWeight = FontWeight.Bold) },
            text = { Text("Are you sure you want to delete '${trip.fromLabel} → ${trip.toLabel}' from your saved routes?") },
            confirmButton = {
                TextButton(
                    onClick = {
                        viewModel.deleteTrip(trip.id)
                        deletingTrip = null
                    }
                ) {
                    Text("Delete", color = Bad600, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { deletingTrip = null }) {
                    Text("Cancel", color = InkMuted)
                }
            }
        )
    }
}
