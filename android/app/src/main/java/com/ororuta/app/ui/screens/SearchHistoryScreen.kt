package com.ororuta.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.History
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ororuta.app.data.local.entities.LocalHistory
import com.ororuta.app.ui.components.*
import com.ororuta.app.ui.theme.*

@Composable
fun SearchHistoryScreen(
    historyList: List<LocalHistory>,
    onBack: () -> Unit,
    onRepeatSearch: (from: String, to: String) -> Unit,
    onDeleteItem: (id: String) -> Unit,
    onClearAll: () -> Unit
) {
    var showClearConfirm by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            ScreenHeader(
                title = "Search History",
                onBack = onBack,
                rightAction = {
                    if (historyList.isNotEmpty()) {
                        TextButton(onClick = { showClearConfirm = true }) {
                            Text("Clear all", color = Bad600, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            )
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(Canvas)
        ) {
            if (historyList.isEmpty()) {
                EmptyState(
                    icon = Icons.Default.History,
                    title = "No search history",
                    message = "Your recent jeepney route searches will show up here.",
                    tone = EmptyTone.Neutral
                )
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    if (showClearConfirm) {
                        item {
                            Surface(
                                color = Bad50,
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(14.dp)) {
                                    Text("Clear all search history?", fontWeight = FontWeight.Bold, color = Bad600, fontSize = 14.sp)
                                    Text("This will delete all past route searches from this device.", fontSize = 12.sp, color = InkSoft)
                                    Spacer(modifier = Modifier.height(10.dp))
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        OroButton(
                                            text = "Yes, Clear",
                                            onClick = {
                                                onClearAll()
                                                showClearConfirm = false
                                            },
                                            variant = ButtonVariant.Danger,
                                            size = ButtonSize.Sm
                                        )
                                        OroButton(
                                            text = "Cancel",
                                            onClick = { showClearConfirm = false },
                                            variant = ButtonVariant.Ghost,
                                            size = ButtonSize.Sm
                                        )
                                    }
                                }
                            }
                        }
                    }

                    items(historyList) { item ->
                        Surface(
                            onClick = { onRepeatSearch(item.from, item.to) },
                            color = Color.White,
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(14.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(text = item.to, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Ink)
                                    Text(text = "From: ${item.from}", fontSize = 12.sp, color = InkMuted)
                                }

                                IconButton(onClick = { onDeleteItem(item.id) }, modifier = Modifier.size(32.dp)) {
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
