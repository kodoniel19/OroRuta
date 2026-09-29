package com.ororuta.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ororuta.app.ui.components.OroRutaLogo
import com.ororuta.app.ui.theme.*
import com.ororuta.app.ui.viewmodels.MoreViewModel

@Composable
fun MoreScreen(
    viewModel: MoreViewModel,
    onNavigateSaved: () -> Unit,
    onNavigateHistory: () -> Unit,
    onNavigateOffline: () -> Unit,
    onNavigateNotifications: () -> Unit,
    onNavigateLocationSettings: () -> Unit,
    onNavigateLanguage: () -> Unit,
    onNavigateReport: () -> Unit,
    onNavigateHelp: () -> Unit,
    onNavigateAbout: () -> Unit,
    onNavigatePrivacy: () -> Unit,
    onNavigateTerms: () -> Unit
) {
    val savedCount by viewModel.savedCount.collectAsState()
    val historyCount by viewModel.historyCount.collectAsState()
    val offlineCount by viewModel.offlineCount.collectAsState()

    Scaffold { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(Canvas)
                .verticalScroll(rememberScrollState())
        ) {
            // Header
            Surface(color = Color.White, modifier = Modifier.fillMaxWidth()) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .statusBarsPadding()
                        .padding(horizontal = 20.dp, vertical = 16.dp)
                ) {
                    Text(
                        text = "More",
                        fontSize = 26.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Ink,
                        letterSpacing = (-0.5).sp
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    // Guest Device Card
                    Surface(
                        color = Canvas,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(44.dp)
                                    .clip(CircleShape)
                                    .background(Brand50),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.PhoneAndroid, contentDescription = null, tint = Brand600)
                            }
                            Column {
                                Text("Guest Device Identity", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Ink)
                                Text("All data saved privately on this device · No login required", fontSize = 12.sp, color = InkMuted)
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Group 1: Your Library
            MenuGroupTitle("YOUR LIBRARY")
            Surface(
                color = Color.White,
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
            ) {
                Column {
                    MenuRow(icon = Icons.Default.Bookmark, label = "Saved Routes", badge = "$savedCount", onClick = onNavigateSaved)
                    HorizontalDivider(color = Line)
                    MenuRow(icon = Icons.Default.History, label = "Search History", badge = "$historyCount", onClick = onNavigateHistory)
                    HorizontalDivider(color = Line)
                    MenuRow(icon = Icons.Default.CloudDownload, label = "Offline Routes", badge = "$offlineCount", onClick = onNavigateOffline)
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Group 2: Preferences
            MenuGroupTitle("PREFERENCES")
            Surface(
                color = Color.White,
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
            ) {
                Column {
                    MenuRow(icon = Icons.Default.Notifications, label = "Notifications", onClick = onNavigateNotifications)
                    HorizontalDivider(color = Line)
                    MenuRow(icon = Icons.Default.LocationOn, label = "Location Settings", badge = "Enabled", onClick = onNavigateLocationSettings)
                    HorizontalDivider(color = Line)
                    val langName = when (viewModel.currentLanguage) {
                        "ceb" -> "Cebuano"
                        "fil" -> "Filipino"
                        else -> "English"
                    }
                    MenuRow(icon = Icons.Default.Language, label = "Language", badge = langName, onClick = onNavigateLanguage)
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Group 3: Support
            MenuGroupTitle("SUPPORT")
            Surface(
                color = Color.White,
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
            ) {
                Column {
                    MenuRow(icon = Icons.Default.ReportProblem, label = "Report an Issue", onClick = onNavigateReport)
                    HorizontalDivider(color = Line)
                    MenuRow(icon = Icons.Default.Help, label = "Help & Support", onClick = onNavigateHelp)
                    HorizontalDivider(color = Line)
                    MenuRow(icon = Icons.Default.Info, label = "About OroRuta", onClick = onNavigateAbout)
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Group 4: Legal
            MenuGroupTitle("LEGAL")
            Surface(
                color = Color.White,
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
            ) {
                Column {
                    MenuRow(icon = Icons.Default.Policy, label = "Privacy Policy", onClick = onNavigatePrivacy)
                    HorizontalDivider(color = Line)
                    MenuRow(icon = Icons.Default.Gavel, label = "Terms & Disclaimer", onClick = onNavigateTerms)
                }
            }

            Spacer(modifier = Modifier.height(28.dp))

            Text(
                text = "OroRuta 1.0 (Build 1)\nCDO Jeepney Guide · Academic Research Project",
                fontSize = 12.sp,
                color = InkMuted,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(36.dp))
        }
    }
}

@Composable
fun MenuGroupTitle(title: String) {
    Text(
        text = title,
        fontSize = 11.sp,
        fontWeight = FontWeight.Bold,
        color = InkMuted,
        letterSpacing = 0.5.sp,
        modifier = Modifier.padding(horizontal = 24.dp, vertical = 6.dp)
    )
}

@Composable
fun MenuRow(
    icon: ImageVector,
    label: String,
    badge: String? = null,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Icon(imageVector = icon, contentDescription = null, tint = Brand600, modifier = Modifier.size(20.dp))
            Text(label, fontSize = 14.sp, fontWeight = FontWeight.Medium, color = Ink)
        }

        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            if (badge != null) {
                Text(badge, fontSize = 13.sp, color = InkMuted)
            }
            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = InkMuted, modifier = Modifier.size(18.dp))
        }
    }
}
