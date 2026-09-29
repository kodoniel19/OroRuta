package com.ororuta.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Map
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ororuta.app.domain.models.Resource
import com.ororuta.app.ui.components.*
import com.ororuta.app.ui.theme.*
import com.ororuta.app.ui.viewmodels.NearbyViewModel

@Composable
fun NearbyScreen(
    viewModel: NearbyViewModel,
    onBack: () -> Unit,
    onOpenMap: () -> Unit,
    onSelectNearby: (id: String, kind: String) -> Unit
) {
    Scaffold(
        topBar = {
            ScreenHeader(
                title = "Nearby Jeepneys",
                subtitle = "Around your location in Cagayan de Oro",
                onBack = onBack,
                rightAction = {
                    IconButton(onClick = onOpenMap) {
                        Icon(Icons.Default.Map, contentDescription = "Map view", tint = Ink)
                    }
                }
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(Canvas)
        ) {
            // 190dp Map preview with markers
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(190.dp)
            ) {
                CdoCanvasMap(showControls = false, modifier = Modifier.fillMaxSize())
            }

            // Segmented control: Routes | Terminals | Loading | Unloading
            val tabOptions = listOf("Routes", "Terminals", "Loading", "Unloading")
            val selectedIdx = when (viewModel.selectedKind) {
                "terminal" -> 1
                "loading" -> 2
                "unloading" -> 3
                else -> 0
            }

            Surface(color = Color.White, modifier = Modifier.fillMaxWidth()) {
                Box(modifier = Modifier.padding(16.dp)) {
                    SegmentedControl(
                        options = tabOptions,
                        selectedIndex = selectedIdx,
                        onSelect = { idx ->
                            val k = when (idx) {
                                1 -> "terminal"
                                2 -> "loading"
                                3 -> "unloading"
                                else -> "route"
                            }
                            viewModel.setKind(k)
                        }
                    )
                }
            }

            // Nearby items list
            when (val state = viewModel.nearbyState) {
                is Resource.Loading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Brand600)
                    }
                }

                is Resource.Error -> {
                    Box(modifier = Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
                        Text(state.message, color = InkMuted, fontSize = 14.sp)
                    }
                }

                is Resource.Success -> {
                    val items = state.data
                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        item {
                            Text(
                                text = "${items.size} found nearby",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = InkMuted
                            )
                        }

                        items(items) { item ->
                            NearbyRow(
                                item = item,
                                onClick = { onSelectNearby(item.id, viewModel.selectedKind) }
                            )
                        }

                        item {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Distances are straight-line estimates from your device's location.",
                                fontSize = 11.sp,
                                color = InkMuted
                            )
                        }
                    }
                }
            }
        }
    }
}
