package com.ororuta.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Help
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
import com.ororuta.app.ui.theme.*
import com.ororuta.app.ui.viewmodels.MoreViewModel

@Composable
fun MoreScreen(
    viewModel: MoreViewModel,
    onNavigateSaved: () -> Unit,
    onNavigateHistory: () -> Unit,
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
                        text = "More",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Ink,
                        letterSpacing = (-0.4).sp
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "Preferences, commuter tools & support",
                        fontSize = 12.sp,
                        color = InkMuted
                    )
                }
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(Canvas)
                .verticalScroll(rememberScrollState())
        ) {
            Spacer(modifier = Modifier.height(14.dp))

            // 1. Guest Device Identity Card (Compact & Modern)
            Surface(
                color = Color.White,
                shape = RoundedCornerShape(14.dp),
                border = BorderStroke(1.dp, Line),
                shadowElevation = 0.5.dp,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 11.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(Brand50),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.PhoneAndroid,
                            contentDescription = null,
                            tint = Brand600,
                            modifier = Modifier.size(19.dp)
                        )
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text(
                                text = "Guest Device Identity",
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.5.sp,
                                color = Ink
                            )
                            Surface(
                                shape = RoundedCornerShape(6.dp),
                                color = Ok50
                            ) {
                                Text(
                                    text = "Private",
                                    fontSize = 9.5.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Ok700,
                                    modifier = Modifier.padding(horizontal = 5.dp, vertical = 1.5.dp)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = "All data saved privately on this device · No login required",
                            fontSize = 11.5.sp,
                            color = InkMuted,
                            lineHeight = 15.sp
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            // 2. Group 1: YOUR LIBRARY
            MenuGroupTitle("YOUR LIBRARY")
            Surface(
                color = Color.White,
                shape = RoundedCornerShape(14.dp),
                border = BorderStroke(1.dp, Line),
                shadowElevation = 0.5.dp,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
            ) {
                Column {
                    MenuRow(
                        icon = Icons.Default.Bookmark,
                        label = "Saved Routes",
                        badge = "$savedCount",
                        badgeColor = Brand600,
                        onClick = onNavigateSaved
                    )
                    HorizontalDivider(
                        color = Line.copy(alpha = 0.7f),
                        thickness = 0.8.dp,
                        modifier = Modifier.padding(start = 56.dp, end = 14.dp)
                    )
                    MenuRow(
                        icon = Icons.Default.History,
                        label = "Search History",
                        badge = "$historyCount",
                        badgeColor = InkMuted,
                        onClick = onNavigateHistory
                    )
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            // 3. Group 2: PREFERENCES
            MenuGroupTitle("PREFERENCES")
            Surface(
                color = Color.White,
                shape = RoundedCornerShape(14.dp),
                border = BorderStroke(1.dp, Line),
                shadowElevation = 0.5.dp,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
            ) {
                Column {
                    MenuRow(
                        icon = Icons.Default.Notifications,
                        label = "Notifications",
                        badge = "Advisories",
                        badgeColor = InkSoft,
                        onClick = onNavigateNotifications
                    )
                    HorizontalDivider(
                        color = Line.copy(alpha = 0.7f),
                        thickness = 0.8.dp,
                        modifier = Modifier.padding(start = 56.dp, end = 14.dp)
                    )
                    MenuRow(
                        icon = Icons.Default.LocationOn,
                        label = "Location Settings",
                        badge = "Enabled",
                        badgeColor = Ok700,
                        onClick = onNavigateLocationSettings
                    )
                    HorizontalDivider(
                        color = Line.copy(alpha = 0.7f),
                        thickness = 0.8.dp,
                        modifier = Modifier.padding(start = 56.dp, end = 14.dp)
                    )
                    val langName = when (viewModel.currentLanguage) {
                        "ceb" -> "Cebuano"
                        "fil" -> "Filipino"
                        else -> "English"
                    }
                    MenuRow(
                        icon = Icons.Default.Language,
                        label = "Language",
                        badge = langName,
                        badgeColor = InkSoft,
                        onClick = onNavigateLanguage
                    )
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            // 4. Group 3: SUPPORT & ASSISTANCE (Fully accessible and unclipped)
            MenuGroupTitle("SUPPORT")
            Surface(
                color = Color.White,
                shape = RoundedCornerShape(14.dp),
                border = BorderStroke(1.dp, Line),
                shadowElevation = 0.5.dp,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
            ) {
                Column {
                    MenuRow(
                        icon = Icons.Default.ReportProblem,
                        label = "Report an Issue",
                        onClick = onNavigateReport,
                        iconBgColor = Oro100,
                        iconTint = Oro700
                    )
                    HorizontalDivider(
                        color = Line.copy(alpha = 0.7f),
                        thickness = 0.8.dp,
                        modifier = Modifier.padding(start = 56.dp, end = 14.dp)
                    )
                    MenuRow(
                        icon = Icons.AutoMirrored.Filled.Help,
                        label = "Help & Commuter Guide",
                        onClick = onNavigateHelp
                    )
                    HorizontalDivider(
                        color = Line.copy(alpha = 0.7f),
                        thickness = 0.8.dp,
                        modifier = Modifier.padding(start = 56.dp, end = 14.dp)
                    )
                    MenuRow(
                        icon = Icons.Default.Info,
                        label = "About OroRuta",
                        onClick = onNavigateAbout
                    )
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            // 5. Group 4: LEGAL & POLICIES
            MenuGroupTitle("LEGAL")
            Surface(
                color = Color.White,
                shape = RoundedCornerShape(14.dp),
                border = BorderStroke(1.dp, Line),
                shadowElevation = 0.5.dp,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
            ) {
                Column {
                    MenuRow(
                        icon = Icons.Default.Policy,
                        label = "Privacy Policy",
                        onClick = onNavigatePrivacy
                    )
                    HorizontalDivider(
                        color = Line.copy(alpha = 0.7f),
                        thickness = 0.8.dp,
                        modifier = Modifier.padding(start = 56.dp, end = 14.dp)
                    )
                    MenuRow(
                        icon = Icons.Default.Gavel,
                        label = "Terms & Disclaimer",
                        onClick = onNavigateTerms
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // 6. Footer Branding & Version Info
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "OroRuta v1.0 (Build 1) • CDO Jeepney Guide",
                    fontSize = 11.5.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = InkMuted,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "Academic Research Project • USTP / Liceo de Cagayan University",
                    fontSize = 10.5.sp,
                    color = Color(0xFF94A3B8),
                    textAlign = TextAlign.Center
                )
            }

            // Comfortable clearance so the bottom items are never covered by navigation bar
            Spacer(modifier = Modifier.height(36.dp))
        }
    }
}

@Composable
fun MenuGroupTitle(title: String) {
    Text(
        text = title,
        fontSize = 10.5.sp,
        fontWeight = FontWeight.ExtraBold,
        color = Color(0xFF64748B),
        letterSpacing = 0.8.sp,
        modifier = Modifier.padding(start = 22.dp, end = 22.dp, top = 12.dp, bottom = 5.dp)
    )
}

@Composable
fun MenuRow(
    icon: ImageVector,
    label: String,
    badge: String? = null,
    badgeColor: Color = InkMuted,
    iconBgColor: Color = Brand50,
    iconTint: Color = Brand600,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 11.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Row(
            modifier = Modifier.weight(1f),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(30.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(iconBgColor),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = iconTint,
                    modifier = Modifier.size(17.dp)
                )
            }
            Text(
                text = label,
                fontSize = 13.5.sp,
                fontWeight = FontWeight.SemiBold,
                color = Ink
            )
        }

        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            if (badge != null) {
                Text(
                    text = badge,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    color = badgeColor
                )
            }
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = Color(0xFF94A3B8),
                modifier = Modifier.size(16.dp)
            )
        }
    }
}
