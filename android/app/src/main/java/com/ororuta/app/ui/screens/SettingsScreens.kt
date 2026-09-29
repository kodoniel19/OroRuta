package com.ororuta.app.ui.screens

import androidx.compose.animation.AnimatedVisibility
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
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ororuta.app.ui.components.*
import com.ororuta.app.ui.theme.*
import com.ororuta.app.ui.viewmodels.MoreViewModel

// 23. Notifications Screen
@Composable
fun NotificationsScreen(viewModel: MoreViewModel, onBack: () -> Unit) {
    Scaffold(topBar = { ScreenHeader(title = "Notification Preferences", onBack = onBack) }) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(Canvas)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Surface(color = Color.White, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    LayerSwitchRow("Changes to saved routes", viewModel.prefs.routeChanges) { viewModel.toggleRouteChanges(it) }
                    HorizontalDivider(color = Line, modifier = Modifier.padding(vertical = 8.dp))
                    LayerSwitchRow("Road closures & diversions", viewModel.prefs.closures) { viewModel.toggleClosures(it) }
                    HorizontalDivider(color = Line, modifier = Modifier.padding(vertical = 8.dp))
                    LayerSwitchRow("Terminal changes", viewModel.prefs.terminals) { viewModel.toggleTerminals(it) }
                    HorizontalDivider(color = Line, modifier = Modifier.padding(vertical = 8.dp))
                    LayerSwitchRow("Offline data update alerts", viewModel.prefs.offlineUpdates) { viewModel.toggleOfflineUpdates(it) }
                }
            }

            Text(
                text = "Notifications are delivered locally or via cloud updates to notify you of reroutes or fare changes.",
                fontSize = 12.sp,
                color = InkMuted
            )
        }
    }
}

// 24. Location Settings Screen
@Composable
fun LocationSettingsScreen(onBack: () -> Unit, onSetManualStart: () -> Unit) {
    var gpsEnabled by remember { mutableStateOf(true) }
    var preciseLocation by remember { mutableStateOf(true) }

    Scaffold(topBar = { ScreenHeader(title = "Location Settings", onBack = onBack) }) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(Canvas)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Surface(
                color = if (gpsEnabled) Brand50 else Warn50,
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(
                        imageVector = if (gpsEnabled) Icons.Default.MyLocation else Icons.Default.LocationOff,
                        contentDescription = null,
                        tint = if (gpsEnabled) Brand600 else Warn600,
                        modifier = Modifier.size(24.dp)
                    )
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = if (gpsEnabled) "GPS Location Enabled" else "GPS Location Disabled",
                            fontWeight = FontWeight.Bold,
                            color = if (gpsEnabled) Brand700 else Warn600,
                            fontSize = 15.sp
                        )
                        Text(
                            text = if (gpsEnabled) "Using device GPS for nearby route finding" else "Turn on GPS for automatic route guidance",
                            fontSize = 12.sp,
                            color = InkSoft
                        )
                    }
                    Switch(
                        checked = gpsEnabled,
                        onCheckedChange = { gpsEnabled = it },
                        colors = SwitchDefaults.colors(checkedTrackColor = Brand600)
                    )
                }
            }

            Surface(color = Color.White, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    LayerSwitchRow("Precise Location", preciseLocation) { preciseLocation = it }
                    HorizontalDivider(color = Line, modifier = Modifier.padding(vertical = 8.dp))
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onSetManualStart() }
                            .padding(vertical = 8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Manual Starting Location", fontSize = 14.sp, fontWeight = FontWeight.Medium, color = Ink)
                            Text("Set custom starting point instead of GPS", fontSize = 12.sp, color = InkMuted)
                        }
                        Icon(Icons.Default.ChevronRight, contentDescription = null, tint = InkMuted)
                    }
                }
            }

            Surface(color = Color.White, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("How OroRuta uses your location:", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Ink)
                    Text("• Your coordinates are only processed locally on your phone", fontSize = 12.sp, color = InkSoft)
                    Text("• OroRuta does not track jeepneys or record travel profiles", fontSize = 12.sp, color = InkSoft)
                    Text("• You can manually specify your origin at any time", fontSize = 12.sp, color = InkSoft)
                }
            }
        }
    }
}

// 25. Language Screen
@Composable
fun LanguageScreen(viewModel: MoreViewModel, onBack: () -> Unit) {
    val languages = listOf(
        Pair("en", "English"),
        Pair("ceb", "Cebuano (Sinugbuanon / Bisaya)"),
        Pair("fil", "Filipino (Tagalog)")
    )

    Scaffold(topBar = { ScreenHeader(title = "App Language", onBack = onBack) }) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(Canvas)
                .padding(16.dp)
        ) {
            Surface(color = Color.White, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    languages.forEachIndexed { idx, lang ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { viewModel.setLanguage(lang.first) }
                                .padding(vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            RadioButton(
                                selected = viewModel.currentLanguage == lang.first,
                                onClick = { viewModel.setLanguage(lang.first) },
                                colors = RadioButtonDefaults.colors(selectedColor = Brand600)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(lang.second, fontSize = 14.sp, fontWeight = FontWeight.Medium, color = Ink)
                        }
                        if (idx < languages.size - 1) {
                            HorizontalDivider(color = Line, modifier = Modifier.padding(vertical = 4.dp))
                        }
                    }
                }
            }
        }
    }
}

// 28. Help & Support Screen
@Composable
fun HelpScreen(onBack: () -> Unit, onNavigateReport: () -> Unit, onNavigateAbout: () -> Unit) {
    val guides = listOf(
        Pair("How OroRuta works", "OroRuta provides complete routes, stops, and schedules for traditional and modern jeepneys in CDO."),
        Pair("How to search routes", "Enter your starting point and destination in the search card on Home. You can compare routes by travel time, fare, walking distance, or transfers."),
        Pair("How to read jeepney routes", "Each route has an official code (like R1, R2, C1) matching the signage on the jeepney. Colors help distinguish modern vs traditional lines."),
        Pair("GPS navigation guidance", "Turn on GPS for step-by-step guidance showing where to board, stay on, and get off. Jeepneys are not tracked in real-time."),
        Pair("Using offline routes", "Download route bundles ahead of time. You can view routes and navigate without internet connection.")
    )

    var expandedIdx by remember { mutableIntStateOf(-1) }

    Scaffold(topBar = { ScreenHeader(title = "Help & Support", onBack = onBack) }) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(Canvas)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text("User Guides", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Ink)

            Surface(color = Color.White, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    guides.forEachIndexed { index, guide ->
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { expandedIdx = if (expandedIdx == index) -1 else index }
                                .padding(vertical = 8.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(guide.first, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = Ink)
                                Icon(
                                    imageVector = if (expandedIdx == index) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                                    contentDescription = null,
                                    tint = InkMuted
                                )
                            }
                            AnimatedVisibility(visible = expandedIdx == index) {
                                Text(
                                    text = guide.second,
                                    fontSize = 13.sp,
                                    color = InkSoft,
                                    modifier = Modifier.padding(top = 8.dp),
                                    lineHeight = 18.sp
                                )
                            }
                        }
                        if (index < guides.size - 1) {
                            HorizontalDivider(color = Line, modifier = Modifier.padding(vertical = 4.dp))
                        }
                    }
                }
            }

            Text("Quick Links", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Ink)

            Surface(color = Color.White, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                Column {
                    MenuRow(icon = Icons.Default.ReportProblem, label = "Report incorrect route info", onClick = onNavigateReport)
                    HorizontalDivider(color = Line)
                    MenuRow(icon = Icons.Default.Info, label = "About OroRuta research project", onClick = onNavigateAbout)
                }
            }
        }
    }
}

// 29. About OroRuta Screen
@Composable
fun AboutScreen(onBack: () -> Unit) {
    Scaffold(topBar = { ScreenHeader(title = "About OroRuta", onBack = onBack) }) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(Canvas)
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            OroRutaLogo(size = 72.dp, tone = LogoTone.Brand)

            Spacer(modifier = Modifier.height(16.dp))

            Text("OroRuta", fontSize = 24.sp, fontWeight = FontWeight.ExtraBold, color = Ink)
            Text("Version 1.0 · Build 1", fontSize = 12.sp, color = InkMuted)

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "OroRuta is a public transportation route guide dedicated exclusively to traditional and modern jeepneys in Cagayan de Oro City, Philippines.",
                fontSize = 14.sp,
                color = InkSoft,
                textAlign = TextAlign.Center,
                lineHeight = 20.sp
            )

            Spacer(modifier = Modifier.height(20.dp))

            // Research credit card
            Surface(color = Brand50, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Academic Research Project", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Brand700)
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "Compiled for academic research at the College of Information Technology, Liceo de Cagayan University (BSIT program).\n\nBased on official Cagayan de Oro Local Public Transport Route Plan (LPTRP).\n\nSupports UN Sustainable Development Goals (SDG 9, 11, 13).",
                        fontSize = 12.sp,
                        color = InkSoft,
                        lineHeight = 18.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Disclaimer card
            Surface(color = Color.White, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Disclaimer", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Ink)
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "OroRuta is an independent student information system. Route schedules and fares are estimates based on published LTFRB CDO data and may vary depending on local conditions and traffic.",
                        fontSize = 12.sp,
                        color = InkMuted,
                        lineHeight = 16.sp
                    )
                }
            }
        }
    }
}

// 26 & 27. Privacy & Terms Content Screen
@Composable
fun ContentPageScreen(title: String, slug: String, onBack: () -> Unit) {
    Scaffold(topBar = { ScreenHeader(title = title, onBack = onBack) }) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(Canvas)
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            Surface(color = Color.White, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Text(title, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = Ink)

                    if (slug == "privacy") {
                        Text("1. Guest Identity & Data Collection", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Ink)
                        Text("OroRuta does not require registration, login, or any personal identifying credentials. An anonymous device UUID is generated locally on your phone to store saved trips and preferences.", fontSize = 13.sp, color = InkSoft, lineHeight = 18.sp)

                        Text("2. Location Privacy", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Ink)
                        Text("Your device GPS coordinates are used exclusively on-device for finding nearby jeepneys and step-by-step navigation. Your location is never shared with third parties or saved to public databases.", fontSize = 13.sp, color = InkSoft, lineHeight = 18.sp)
                    } else {
                        Text("1. Scope of Service", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Ink)
                        Text("OroRuta covers public jeepney routes in Cagayan de Oro City only. It does not provide information for taxis, tricycles, or ride-hailing services.", fontSize = 13.sp, color = InkSoft, lineHeight = 18.sp)

                        Text("2. Fare & Schedule Estimates", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Ink)
                        Text("All fares and travel durations are estimates calculated according to official LTFRB guidelines. Actual jeepney operations may vary.", fontSize = 13.sp, color = InkSoft, lineHeight = 18.sp)
                    }
                }
            }
        }
    }
}

// 4. Set Starting Location (Manual)
@Composable
fun SetStartLocationScreen(onBack: () -> Unit, onSelectLocation: (String) -> Unit) {
    var searchQuery by remember { mutableStateOf("") }
    val commonStarts = listOf(
        "Carmen Public Market",
        "Bulua Westbound Terminal",
        "Agora Eastbound Terminal",
        "Divisoria Plaza",
        "Limketkai Center",
        "Liceo de Cagayan University",
        "Xavier University Ateneo de Cagayan",
        "USTP CDO Campus"
    )

    Scaffold(topBar = { ScreenHeader(title = "Set Starting Location", onBack = onBack) }) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(Canvas)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Search landmark or area…", fontSize = 13.sp) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = InkMuted) },
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(focusedContainerColor = Color.White, unfocusedContainerColor = Color.White),
                modifier = Modifier.fillMaxWidth()
            )

            Surface(color = Color.White, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Popular Starting Points", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = InkMuted)

                    Spacer(modifier = Modifier.height(10.dp))

                    commonStarts.filter { it.contains(searchQuery, ignoreCase = true) }.forEach { place ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onSelectLocation(place) }
                                .padding(vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Icon(Icons.Default.Place, contentDescription = null, tint = Brand600, modifier = Modifier.size(18.dp))
                            Text(place, fontSize = 14.sp, fontWeight = FontWeight.Medium, color = Ink)
                        }
                        HorizontalDivider(color = Line)
                    }
                }
            }
        }
    }
}
