package com.ororuta.app.ui.screens

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
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
            Surface(
                color = Color.White,
                shadowElevation = 0.5.dp,
                border = BorderStroke(0.5.dp, Line),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .statusBarsPadding()
                        .padding(start = 20.dp, end = 20.dp, top = 16.dp, bottom = 14.dp)
                ) {
                    Text(
                        text = "Saved Routes",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Ink,
                        letterSpacing = (-0.4).sp
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "Stored on this device · no account needed",
                        fontSize = 12.sp,
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
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    EmptyState(
                        icon = Icons.Default.BookmarkBorder,
                        title = "No saved routes yet",
                        message = "Bookmark your frequent CDO jeepney commutes for fast one-tap travel guidance.",
                        tone = EmptyTone.Neutral,
                        action = {
                            OroButton(
                                text = "Browse Available Routes",
                                onClick = onNavigateRoutes,
                                variant = ButtonVariant.Primary,
                                size = ButtonSize.Sm,
                                icon = Icons.Default.DirectionsBus
                            )
                        }
                    )
                }
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 14.dp, bottom = 24.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Compact Summary Bar
                    item {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 2.dp, vertical = 2.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(20.dp)
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(Brand50),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Bookmark,
                                        contentDescription = null,
                                        tint = Brand600,
                                        modifier = Modifier.size(13.dp)
                                    )
                                }
                                Text(
                                    text = "${trips.size} saved ${if (trips.size == 1) "route" else "routes"}",
                                    fontSize = 12.5.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Ink
                                )
                            }

                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = Color.White,
                                border = BorderStroke(1.dp, Line)
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(6.dp)
                                            .clip(CircleShape)
                                            .background(Ok600)
                                    )
                                    Text(
                                        text = "Offline ready",
                                        fontSize = 10.5.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = InkMuted
                                    )
                                }
                            }
                        }
                    }

                    // Redesigned Compact Route Cards
                    items(trips, key = { it.id }) { trip ->
                        val cardInteraction = remember { MutableInteractionSource() }
                        val isCardPressed by cardInteraction.collectIsPressedAsState()
                        val cardScale by animateFloatAsState(
                            targetValue = if (isCardPressed) 0.985f else 1f,
                            animationSpec = spring(dampingRatio = 0.72f, stiffness = 800f),
                            label = "savedCardScale"
                        )

                        Surface(
                            color = Color.White,
                            shape = RoundedCornerShape(14.dp),
                            shadowElevation = 1.dp,
                            border = BorderStroke(1.dp, Line),
                            modifier = Modifier
                                .fillMaxWidth()
                                .scale(cardScale)
                        ) {
                            Column(
                                modifier = Modifier.padding(14.dp)
                            ) {
                                // 1. Top Row: Route Badges + Delete Button
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        val codes = trip.routeIds.split(",").filter { it.isNotBlank() }
                                        if (codes.isNotEmpty()) {
                                            codes.forEach { code ->
                                                RouteBadge(code = code.trim(), size = BadgeSize.Sm)
                                            }
                                        } else {
                                            RouteBadge(code = "CDO", size = BadgeSize.Sm)
                                        }
                                        Text(
                                            text = "Traditional Jeepney",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Medium,
                                            color = InkMuted
                                        )
                                    }

                                    // Compact Delete Action Button
                                    Surface(
                                        onClick = { deletingTrip = trip },
                                        color = Color(0xFFFEF2F2),
                                        shape = RoundedCornerShape(8.dp),
                                        border = BorderStroke(1.dp, Color(0xFFFEE2E2)),
                                        modifier = Modifier.size(32.dp)
                                    ) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Icon(
                                                imageVector = Icons.Default.DeleteOutline,
                                                contentDescription = "Delete saved route",
                                                tint = Bad600,
                                                modifier = Modifier.size(16.dp)
                                            )
                                        }
                                    }
                                }

                                Spacer(modifier = Modifier.height(10.dp))

                                // 2. Route Path: Origin to Destination with Adaptive Transit Timeline
                                Column(
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    // Origin Row
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(8.dp)
                                                .clip(CircleShape)
                                                .background(Brand600)
                                        )
                                        Text(
                                            text = trip.fromLabel,
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = Ink,
                                            maxLines = 2,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }

                                    // Transit Connector Line
                                    Box(
                                        modifier = Modifier
                                            .padding(start = 3.dp, top = 2.dp, bottom = 2.dp)
                                            .width(2.dp)
                                            .height(10.dp)
                                            .background(Color(0xFFCBD5E1))
                                    )

                                    // Destination Row
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(8.dp)
                                                .clip(CircleShape)
                                                .background(Bad600)
                                        )
                                        Text(
                                            text = trip.toLabel,
                                            fontSize = 13.5.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Ink,
                                            maxLines = 2,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.height(12.dp))

                                // 3. Primary Action: Compact "Travel Guidance" Button
                                Surface(
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
                                    color = Brand600,
                                    shape = RoundedCornerShape(10.dp),
                                    shadowElevation = 1.dp,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(38.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxSize(),
                                        horizontalArrangement = Arrangement.Center,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Directions,
                                            contentDescription = null,
                                            tint = Color.White,
                                            modifier = Modifier.size(16.dp)
                                        )
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text(
                                            text = "Travel Guidance",
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color.White,
                                            maxLines = 1
                                        )
                                    }
                                }
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
            title = {
                Text(
                    text = "Delete Saved Route?",
                    fontWeight = FontWeight.Bold,
                    fontSize = 17.sp,
                    color = Ink
                )
            },
            text = {
                Text(
                    text = "Are you sure you want to remove '${trip.fromLabel} → ${trip.toLabel}' from your saved routes?",
                    fontSize = 13.5.sp,
                    color = InkSoft,
                    lineHeight = 18.sp
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        viewModel.deleteTrip(trip.id)
                        deletingTrip = null
                    }
                ) {
                    Text(
                        text = "Delete",
                        color = Bad600,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.5.sp
                    )
                }
            },
            dismissButton = {
                TextButton(onClick = { deletingTrip = null }) {
                    Text(
                        text = "Cancel",
                        color = InkMuted,
                        fontWeight = FontWeight.Medium,
                        fontSize = 13.5.sp
                    )
                }
            },
            shape = RoundedCornerShape(16.dp),
            containerColor = Color.White
        )
    }
}
