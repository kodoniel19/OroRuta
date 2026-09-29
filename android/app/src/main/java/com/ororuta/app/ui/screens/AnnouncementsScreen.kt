package com.ororuta.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ororuta.app.domain.models.Resource
import com.ororuta.app.ui.components.AnnouncementCard
import com.ororuta.app.ui.components.ScreenHeader
import com.ororuta.app.ui.theme.Brand600
import com.ororuta.app.ui.theme.Canvas
import com.ororuta.app.ui.theme.InkMuted
import com.ororuta.app.ui.viewmodels.AnnouncementsViewModel

@Composable
fun AnnouncementsScreen(
    viewModel: AnnouncementsViewModel,
    onBack: () -> Unit,
    onSelectAnnouncement: (String) -> Unit
) {
    Scaffold(
        topBar = {
            Column {
                ScreenHeader(
                    title = "Transportation Updates",
                    subtitle = "Jeepney route changes & advisories",
                    onBack = onBack
                )
                // Filter chips: All | Active | Updated | Temporary | Expired
                val filters = listOf("All", "Active", "Updated", "Temporary", "Expired")
                Surface(color = Color.White, modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState())
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        filters.forEach { chip ->
                            FilterChip(
                                selected = viewModel.selectedFilter == chip,
                                onClick = { viewModel.setFilter(chip) },
                                label = { Text(chip, fontSize = 12.sp) }
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
            when (val state = viewModel.announcementsState) {
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
                    val announcements = state.data
                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(announcements) { ann ->
                            AnnouncementCard(
                                announcement = ann,
                                compact = false,
                                onClick = { onSelectAnnouncement(ann.id) }
                            )
                        }
                    }
                }
            }
        }
    }
}
