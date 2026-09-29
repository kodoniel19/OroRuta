package com.ororuta.app.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ororuta.app.ui.components.*
import com.ororuta.app.ui.theme.*
import com.ororuta.app.ui.viewmodels.HomeUiState
import com.ororuta.app.ui.viewmodels.LocationStatus
import kotlinx.coroutines.delay
import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.ororuta.app.ui.location.LocationPermissions

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    uiState: HomeUiState,
    onAllowLocation: () -> Unit,
    onDenyLocation: () -> Unit,
    onSelectNearbyTab: (Int) -> Unit,
    onNavigateSearch: (prefillFrom: String, prefillTo: String) -> Unit,
    onNavigateResults: (from: String, to: String) -> Unit,
    onNavigateAnnouncements: () -> Unit,
    onNavigateAnnouncementDetail: (String) -> Unit,
    onNavigateNearby: () -> Unit,
    onNavigateNearbyDetail: (String, String) -> Unit,
    onNavigateMap: () -> Unit,
    onNavigateRoutes: () -> Unit,
    onNavigateSaved: () -> Unit,
    onNavigateOffline: () -> Unit,
    onNavigateFare: () -> Unit,
    onNavigateReport: () -> Unit,
    onNavigateSetStart: () -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    var didRequestPermission by remember { mutableStateOf(false) }

    val locationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val fineGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] ?: false
        val coarseGranted = permissions[Manifest.permission.ACCESS_COARSE_LOCATION] ?: false
        if (fineGranted || coarseGranted) {
            onAllowLocation()
        } else {
            onDenyLocation()
        }
    }

    // Ask for the system location permission on first launch.
    LaunchedEffect(uiState.locationStatus) {
        if (uiState.locationStatus == LocationStatus.UNKNOWN && !didRequestPermission) {
            didRequestPermission = true
            delay(400)
            locationPermissionLauncher.launch(LocationPermissions.runtimePermissions)
        }
    }

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME && LocationPermissions.hasAccess(context)) {
                onAllowLocation()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Canvas)
            .verticalScroll(rememberScrollState())
    ) {
        if (uiState.isOffline) {
            OfflineBanner(onClick = onNavigateOffline)
        }

        // 1. BRAND700 HERO HEADER
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(Brand700)
                .statusBarsPadding()
                .padding(start = 20.dp, end = 20.dp, top = 14.dp, bottom = 26.dp)
        ) {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        OroRutaLogo(size = 30.dp, tone = LogoTone.Light)
                        Text(
                            text = "OroRuta",
                            color = Color.White,
                            fontSize = 20.sp,
                            fontWeight = FontWeight.ExtraBold
                        )
                    }

                    // Bell button with oro notification dot
                    Box {
                        IconButton(
                            onClick = onNavigateAnnouncements,
                            modifier = Modifier.size(36.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Notifications,
                                contentDescription = "Announcements",
                                tint = Color.White,
                                modifier = Modifier.size(22.dp)
                            )
                        }
                        if (uiState.announcements.isNotEmpty()) {
                            Box(
                                modifier = Modifier
                                    .size(8.dp)
                                    .clip(CircleShape)
                                    .background(Oro500)
                                    .align(Alignment.TopEnd)
                                    .offset(x = (-4).dp, y = 4.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Location Line Chip
                val locLine = when {
                    uiState.manualStartPlace != null -> "Starting from ${uiState.manualStartPlace}"
                    uiState.locationStatus == LocationStatus.GRANTED -> uiState.userLocationName
                    else -> "Location is off"
                }
                Surface(
                    onClick = onNavigateSetStart,
                    color = Color.White.copy(alpha = 0.14f),
                    shape = RoundedCornerShape(20.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                    ) {
                        Icon(
                            imageVector = if (uiState.locationStatus == LocationStatus.GRANTED) Icons.Default.MyLocation else Icons.Default.LocationOff,
                            contentDescription = null,
                            tint = Oro400,
                            modifier = Modifier.size(15.dp)
                        )
                        Text(
                            text = locLine,
                            color = Color.White,
                            fontSize = 12.5.sp,
                            fontWeight = FontWeight.Medium,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                Text(
                    text = "Where are you going?",
                    color = Color.White,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = (-0.4).sp
                )
            }
        }

        // 2. OVERLAPPING WHITE SEARCH CARD
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .offset(y = (-16).dp)
                .padding(horizontal = 16.dp)
        ) {
            Surface(
                color = Color.White,
                shape = RoundedCornerShape(16.dp),
                shadowElevation = 4.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    // From Row
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .clickable { onNavigateSearch("", "") }
                            .padding(vertical = 6.dp, horizontal = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(10.dp)
                                .clip(CircleShape)
                                .background(Brand600)
                        )
                        Text(
                            text = uiState.manualStartPlace ?: if (uiState.locationStatus == LocationStatus.GRANTED) "Current Location" else "Starting location",
                            color = if (uiState.manualStartPlace != null || uiState.locationStatus == LocationStatus.GRANTED) Ink else InkMuted,
                            fontSize = 14.5.sp,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier.weight(1f)
                        )
                    }

                    HorizontalDivider(
                        modifier = Modifier.padding(vertical = 4.dp),
                        color = Line,
                        thickness = 1.dp
                    )

                    // To Row + swap glyph
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .clickable { onNavigateSearch("", "") }
                            .padding(vertical = 6.dp, horizontal = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(10.dp)
                                .clip(CircleShape)
                                .background(Bad600)
                        )
                        Text(
                            text = "Where are you going?",
                            color = InkMuted,
                            fontSize = 14.5.sp,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier.weight(1f)
                        )
                        Icon(
                            imageVector = Icons.Default.SwapVert,
                            contentDescription = "Swap",
                            tint = InkMuted,
                            modifier = Modifier.size(20.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // Action Buttons: Use My Location & Search Route
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        OroButton(
                            text = "Use My Location",
                            onClick = {
                                locationPermissionLauncher.launch(LocationPermissions.runtimePermissions)
                            },
                            variant = ButtonVariant.Secondary,
                            size = ButtonSize.Md,
                            icon = Icons.Default.MyLocation,
                            modifier = Modifier.weight(1f)
                        )
                        OroButton(
                            text = "Search Route",
                            onClick = { onNavigateSearch("", "") },
                            variant = ButtonVariant.Primary,
                            size = ButtonSize.Md,
                            icon = Icons.Default.Search,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }
        }


            // GPS Denied Warning Card (if applicable)
            if (uiState.locationStatus == LocationStatus.DENIED && uiState.manualStartPlace == null) {
                Surface(
                    color = Warn50,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 6.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Icon(imageVector = Icons.Default.Warning, contentDescription = null, tint = Warn600, modifier = Modifier.size(22.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text("GPS is turned off", fontWeight = FontWeight.Bold, color = Warn600, fontSize = 14.sp)
                            Text("The app still works. Enter a starting location or enable location in Settings.", fontSize = 12.sp, color = InkSoft)
                        }
                        TextButton(onClick = { LocationPermissions.openAppSettings(context) }) {
                            Text("Settings", color = Warn600, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // 3. QUICK ACTIONS: 3x3 GRID OF 9 TILES
            Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                Text(
                    text = "Quick Actions",
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold,
                    color = Ink
                )

                Spacer(modifier = Modifier.height(12.dp))

                val quickActions = listOf(
                    Triple("Find a Route", Icons.Default.Search, { onNavigateSearch("", "") }),
                    Triple("Nearby Jeepneys", Icons.Default.NearMe, onNavigateNearby),
                    Triple("View Map", Icons.Default.Map, onNavigateMap),
                    Triple("Route Directory", Icons.Default.AltRoute, onNavigateRoutes),
                    Triple("Saved Routes", Icons.Default.Bookmark, onNavigateSaved),
                    Triple("Offline Routes", Icons.Default.CloudDownload, onNavigateOffline),
                    Triple("Route Updates", Icons.Default.Campaign, onNavigateAnnouncements),
                    Triple("Fare Guide", Icons.Default.Payments, onNavigateFare),
                    Triple("Report Issue", Icons.Default.ReportProblem, onNavigateReport)
                )

                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    for (row in 0..2) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            for (col in 0..2) {
                                val item = quickActions[row * 3 + col]
                                QuickActionTile(
                                    title = item.first,
                                    icon = item.second,
                                    onClick = item.third,
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // 4. RECENT SEARCHES (from history)
            if (uiState.recentSearches.isNotEmpty()) {
                Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                    Text(
                        text = "Recent Searches",
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                        color = Ink
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    Surface(
                        color = Color.White,
                        shape = RoundedCornerShape(16.dp),
                        shadowElevation = 1.dp,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column {
                            uiState.recentSearches.forEachIndexed { idx, item ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable { onNavigateResults(item.from, item.to) }
                                        .padding(14.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.History,
                                        contentDescription = null,
                                        tint = InkMuted,
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(item.to, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Ink)
                                        Text("From: ${item.from}", fontSize = 12.sp, color = InkMuted)
                                    }
                                    Icon(
                                        imageVector = Icons.Default.ArrowForward,
                                        contentDescription = null,
                                        tint = InkMuted,
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                                if (idx < uiState.recentSearches.size - 1) {
                                    HorizontalDivider(color = Line, thickness = 1.dp)
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))
            }

            // 5. TRANSPORTATION UPDATES CAROUSEL
            if (uiState.announcements.isNotEmpty()) {
                Column {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Transportation Updates",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Bold,
                            color = Ink
                        )
                        TextButton(onClick = onNavigateAnnouncements) {
                            Text("See all", color = Brand600, fontWeight = FontWeight.SemiBold)
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    LazyRow(
                        contentPadding = PaddingValues(horizontal = 16.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(uiState.announcements.filter { it.status != "Expired" }) { ann ->
                            AnnouncementCard(
                                announcement = ann,
                                compact = true,
                                onClick = { onNavigateAnnouncementDetail(ann.id) }
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))
            }

            // 6. NEARBY JEEPNEYS & STOPS
            Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Nearby",
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                        color = Ink
                    )
                    TextButton(onClick = onNavigateNearby) {
                        Text("View all", color = Brand600, fontWeight = FontWeight.SemiBold)
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                SegmentedControl(
                    options = listOf("Routes", "Terminals", "Loading", "Unloading"),
                    selectedIndex = uiState.nearbyTab,
                    onSelect = onSelectNearbyTab
                )

                Spacer(modifier = Modifier.height(12.dp))

                if (uiState.nearbyItems.isEmpty()) {
                    Surface(
                        color = Color.White,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "No nearby items found in this area.",
                            color = InkMuted,
                            fontSize = 13.sp,
                            modifier = Modifier.padding(16.dp)
                        )
                    }
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        uiState.nearbyItems.forEach { item ->
                            NearbyRow(
                                item = item,
                                onClick = {
                                    val kindStr = when (uiState.nearbyTab) {
                                        0 -> "route"
                                        1 -> "terminal"
                                        2 -> "loading"
                                        else -> "unloading"
                                    }
                                    onNavigateNearbyDetail(item.id, kindStr)
                                }
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // 7. OFFLINE AVAILABILITY CARD
            Surface(
                onClick = onNavigateOffline,
                color = Color.White,
                shape = RoundedCornerShape(16.dp),
                shadowElevation = 1.dp,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .clip(CircleShape)
                            .background(Brand50),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.CloudDownload,
                            contentDescription = null,
                            tint = Brand600,
                            modifier = Modifier.size(24.dp)
                        )
                    }

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Offline Route Guide",
                            style = MaterialTheme.typography.titleSmall.copy(
                                fontWeight = FontWeight.Bold,
                                color = Ink
                            )
                        )
                        Text(
                            text = "${uiState.offlineRouteCount} routes available offline · CDO map included",
                            style = MaterialTheme.typography.bodySmall.copy(color = InkMuted)
                        )
                    }

                    Icon(
                        imageVector = Icons.Default.ChevronRight,
                        contentDescription = null,
                        tint = InkMuted,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
}

@Composable
fun QuickActionTile(
    title: String,
    icon: ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .clickable { onClick() }
            .padding(vertical = 6.dp, horizontal = 2.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier
                .size(46.dp)
                .clip(CircleShape)
                .background(Brand50),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = title,
                tint = Brand600,
                modifier = Modifier.size(22.dp)
            )
        }
        Spacer(modifier = Modifier.height(5.dp))
        Text(
            text = title,
            fontSize = 11.5.sp,
            fontWeight = FontWeight.SemiBold,
            color = InkSoft,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            lineHeight = 14.sp
        )
    }
}
