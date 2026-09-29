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
import com.ororuta.app.ui.viewmodels.OfflineRoutesViewModel

@Composable
fun OfflineRoutesScreen(
    viewModel: OfflineRoutesViewModel,
    onBack: () -> Unit,
    onOpenRoute: (String) -> Unit
) {
    val routes by viewModel.offlineRoutes.collectAsState()

    Scaffold(
        topBar = {
            ScreenHeader(title = "Offline Routes", subtitle = "Use OroRuta without internet", onBack = onBack)
        }
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(Canvas),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Connection & Storage card
            item {
                Surface(
                    color = Color.White,
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(Ok600))
                                Text("Online · Ready to sync", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Ink)
                            }
                            TextButton(onClick = { viewModel.sync() }) {
                                Text("Sync Now", color = Brand600, fontWeight = FontWeight.Bold)
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Text("Offline Storage: 4.8 MB used of 200 MB", fontSize = 12.sp, color = InkMuted)

                        Spacer(modifier = Modifier.height(6.dp))

                        LinearProgressIndicator(
                            progress = { 0.024f },
                            color = Brand600,
                            trackColor = Canvas,
                            modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp))
                        )
                    }
                }
            }

            // City Map Pack Row
            item {
                Surface(
                    color = Color.White,
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Box(
                            modifier = Modifier.size(40.dp).clip(CircleShape).background(Brand50),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.Map, contentDescription = null, tint = Brand600, modifier = Modifier.size(20.dp))
                        }
                        Column(modifier = Modifier.weight(1f)) {
                            Text("CDO City Base Map", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Ink)
                            Text("4.2 MB · Downloaded & ready", fontSize = 12.sp, color = Ok600, fontWeight = FontWeight.Medium)
                        }
                        Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Ok600, modifier = Modifier.size(20.dp))
                    }
                }
            }

            // Saved offline routes
            item {
                Text(
                    text = "Saved Offline Routes (${routes.size})",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = Ink
                )
            }

            if (routes.isEmpty()) {
                item {
                    Surface(
                        color = Color.White,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "No routes saved for offline use yet. Browse routes and tap 'Download' to save them.",
                            fontSize = 13.sp,
                            color = InkMuted,
                            modifier = Modifier.padding(16.dp)
                        )
                    }
                }
            } else {
                items(routes) { r ->
                    Surface(
                        onClick = { onOpenRoute(r.id) },
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
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                RouteBadge(code = r.code, colorHex = r.color, size = BadgeSize.Sm)
                                Column {
                                    Text(r.name, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Ink)
                                    Text("${r.origin} → ${r.destination}", fontSize = 12.sp, color = InkMuted)
                                }
                            }
                            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = InkMuted)
                        }
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(10.dp))
                Text(
                    text = "Downloaded routes are stored locally in Room database and can be accessed without internet connectivity.",
                    fontSize = 11.sp,
                    color = InkMuted,
                    lineHeight = 16.sp
                )
            }
        }
    }
}
