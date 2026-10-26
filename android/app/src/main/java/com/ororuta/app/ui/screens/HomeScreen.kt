package com.ororuta.app.ui.screens

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.AltRoute
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ororuta.app.ui.components.*
import com.ororuta.app.ui.theme.*
import com.ororuta.app.ui.viewmodels.HomeUiState
import kotlinx.coroutines.launch

private data class PopularRouteItem(
    val id: String,
    val code: String,
    val name: String,
    val origin: String,
    val destination: String,
    val colorHex: String,
    val estFare: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    uiState: HomeUiState,
    onNavigateSearch: () -> Unit = {},
    onNavigateAnnouncements: () -> Unit,
    onNavigateAnnouncementDetail: (String) -> Unit,
    onNavigateSaved: () -> Unit,
    onNavigateFare: () -> Unit,
    onNavigateResults: (from: String, to: String) -> Unit,
    onNavigateRoutes: () -> Unit = {},
    onNavigateNearby: () -> Unit = {},
    onSelectRoute: (String) -> Unit = {}
) {
    // Popular CDO Jeepney Routes preview
    val popularRoutes = remember {
        listOf(
            PopularRouteItem("c2_patag_cogon", "C2", "Patag - Cogon via Bulua & Carmen", "Camp Evangelista, Patag", "Cogon Public Market", "#0284C7", "₱15.50"),
            PopularRouteItem("r1_bulua_agora", "R1", "Bulua - Agora via National Highway", "Bulua Terminal", "Agora Integrated Terminal", "#1565C0", "₱16.75"),
            PopularRouteItem("r2_bulua_cogon", "R2", "Bulua - Cogon via Kauswagan", "Bulua Westbound Terminal", "Cogon Public Market", "#10B981", "₱15.50"),
            PopularRouteItem("rc_carmen_cogon", "RC", "Carmen - Cogon Loop", "Carmen Public Market", "Cogon Public Market", "#8B5CF6", "₱13.00"),
            PopularRouteItem("ra_agora_carmen", "RA", "Agora - Carmen Direct", "Agora Lapasan", "Carmen Public Market", "#EA580C", "₱14.00")
        )
    }

    // Gentle entrance animations
    val contentAlpha = remember { Animatable(0f) }
    val contentOffsetY = remember { Animatable(16f) }

    LaunchedEffect(Unit) {
        launch {
            contentAlpha.animateTo(
                targetValue = 1f,
                animationSpec = tween(durationMillis = 320, easing = FastOutSlowInEasing)
            )
        }
        launch {
            contentOffsetY.animateTo(
                targetValue = 0f,
                animationSpec = tween(durationMillis = 350, easing = FastOutSlowInEasing)
            )
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Canvas)
            .verticalScroll(rememberScrollState())
    ) {
        // 1. BRAND HERO HEADER WITH OFFICIAL ORORUTA LOGO & DARK NAVY PALETTE
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(bottomStart = 28.dp, bottomEnd = 28.dp))
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Brand900, Brand700)
                    )
                )
                .statusBarsPadding()
                .padding(start = 20.dp, end = 20.dp, top = 16.dp, bottom = 24.dp)
        ) {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        // Official OroRuta Logo (High resolution PNG)
                        OroRutaLogo(size = 42.dp, tone = LogoTone.Light)

                        Text(
                            text = buildAnnotatedString {
                                withStyle(style = SpanStyle(color = Color.White)) {
                                    append("Oro")
                                }
                                withStyle(style = SpanStyle(color = Oro400)) {
                                    append("Ruta")
                                }
                            },
                            fontSize = 24.sp,
                            fontWeight = FontWeight.ExtraBold,
                            letterSpacing = (-0.5).sp
                        )
                    }

                    // Bell button with tactile feedback and notification dot
                    val bellInteraction = remember { MutableInteractionSource() }
                    val isBellPressed by bellInteraction.collectIsPressedAsState()
                    val bellScale by animateFloatAsState(
                        targetValue = if (isBellPressed) 0.88f else 1f,
                        animationSpec = spring(dampingRatio = 0.7f, stiffness = 800f),
                        label = "bellScale"
                    )

                    Box(contentAlignment = Alignment.Center) {
                        IconButton(
                            onClick = onNavigateAnnouncements,
                            interactionSource = bellInteraction,
                            modifier = Modifier
                                .size(42.dp)
                                .scale(bellScale)
                                .clip(CircleShape)
                                .background(Color.White.copy(alpha = 0.14f))
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
                                    .size(9.dp)
                                    .clip(CircleShape)
                                    .background(Oro400)
                                    .border(1.5.dp, Brand700, CircleShape)
                                    .align(Alignment.TopEnd)
                                    .offset(x = (-2).dp, y = 2.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(18.dp))

                // Welcoming Commuter Greeting
                Text(
                    text = "Maayong adlaw, Commuter! 👋",
                    fontSize = 19.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Find verified jeepney routes, boarding stops & official fares",
                    fontSize = 13.sp,
                    color = Color.White.copy(alpha = 0.82f),
                    lineHeight = 18.sp
                )
            }
        }

        // 2. ANIMATED BODY
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .offset(y = contentOffsetY.value.dp)
                .alpha(contentAlpha.value)
        ) {
            Spacer(modifier = Modifier.height(20.dp))

            // 3. QUICK ACTIONS: 4-COLUMN TACTILE TILES
            Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                Text(
                    text = "Commuter Shortcuts",
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold,
                    color = Ink
                )

                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    QuickActionTile(
                        title = "All Routes",
                        icon = Icons.AutoMirrored.Filled.AltRoute,
                        onClick = onNavigateRoutes,
                        accentColor = Brand600,
                        accentBg = Brand50,
                        modifier = Modifier.weight(1f)
                    )
                    QuickActionTile(
                        title = "Nearby Stops",
                        icon = Icons.Default.NearMe,
                        onClick = onNavigateNearby,
                        accentColor = Ok600,
                        accentBg = Ok50,
                        modifier = Modifier.weight(1f)
                    )
                    QuickActionTile(
                        title = "Saved",
                        icon = Icons.Default.Bookmark,
                        onClick = onNavigateSaved,
                        accentColor = Oro600,
                        accentBg = Oro100,
                        modifier = Modifier.weight(1f)
                    )
                    QuickActionTile(
                        title = "Fare Matrix",
                        icon = Icons.Default.Payments,
                        onClick = onNavigateFare,
                        accentColor = Bad600,
                        accentBg = Bad50,
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // 4. TRANSPORTATION UPDATES & OFFICIAL ADVISORIES (Prominently featured under shortcuts)
            Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(28.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(Brand50),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Campaign,
                                contentDescription = null,
                                tint = Brand600,
                                modifier = Modifier.size(17.dp)
                            )
                        }
                        Text(
                            text = "Transit Updates",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Bold,
                            color = Ink
                        )
                        val activeCount = uiState.announcements.count { it.status != "Expired" }
                        if (activeCount > 0) {
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = Oro100
                            ) {
                                Text(
                                    text = "$activeCount Active",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Oro700,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }

                    TextButton(
                        onClick = onNavigateAnnouncements,
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = if (uiState.announcements.isNotEmpty()) "See all" else "View notices",
                            color = Brand600,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                val activeList = uiState.announcements.filter { it.status != "Expired" }
                if (activeList.isNotEmpty()) {
                    val featured = activeList.first()

                    // Prominent Featured Announcement Card
                    Surface(
                        onClick = { onNavigateAnnouncementDetail(featured.id) },
                        color = Color.White,
                        shape = RoundedCornerShape(16.dp),
                        shadowElevation = 2.dp,
                        border = BorderStroke(1.dp, Line),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Surface(
                                        shape = RoundedCornerShape(6.dp),
                                        color = Brand50
                                    ) {
                                        Text(
                                            text = featured.category.ifBlank { "Notice" }.uppercase(),
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.ExtraBold,
                                            color = Brand700,
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                                        )
                                    }
                                    StatusPill(status = featured.status)
                                }

                                Text(
                                    text = featured.date,
                                    fontSize = 11.sp,
                                    color = InkMuted
                                )
                            }

                            Spacer(modifier = Modifier.height(8.dp))

                            Text(
                                text = featured.title,
                                fontSize = 14.5.sp,
                                fontWeight = FontWeight.Bold,
                                color = Ink,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )

                            if (!featured.description.isNullOrBlank()) {
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = featured.description,
                                    fontSize = 12.sp,
                                    color = InkSoft,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis,
                                    lineHeight = 16.sp
                                )
                            }

                            if (featured.routes.isNotEmpty()) {
                                Spacer(modifier = Modifier.height(10.dp))
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Text("Affects: ", fontSize = 11.sp, color = InkMuted)
                                    featured.routes.take(4).forEach { r ->
                                        RouteBadge(code = r.code, colorHex = r.color, size = BadgeSize.Sm)
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(10.dp))
                            HorizontalDivider(color = Line.copy(alpha = 0.6f), thickness = 1.dp)
                            Spacer(modifier = Modifier.height(8.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "Read advisory & details",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Brand600
                                )
                                Icon(
                                    imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                                    contentDescription = null,
                                    tint = Brand600,
                                    modifier = Modifier.size(14.dp)
                                )
                            }
                        }
                    }

                    // Carousel for additional active advisories if more than 1
                    if (activeList.size > 1) {
                        Spacer(modifier = Modifier.height(10.dp))
                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            items(activeList.drop(1), key = { it.id }) { ann ->
                                AnnouncementCard(
                                    announcement = ann,
                                    compact = true,
                                    onClick = { onNavigateAnnouncementDetail(ann.id) }
                                )
                            }
                        }
                    }
                } else {
                    // Reassuring normal operations banner
                    Surface(
                        onClick = onNavigateAnnouncements,
                        color = Color.White,
                        shape = RoundedCornerShape(14.dp),
                        border = BorderStroke(1.dp, Line),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(CircleShape)
                                    .background(Ok50),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.CheckCircle,
                                    contentDescription = null,
                                    tint = Ok600,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "All Jeepney Routes Normal",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Ink
                                )
                                Text(
                                    text = "No active rerouting or service disruptions reported.",
                                    fontSize = 11.sp,
                                    color = InkMuted
                                )
                            }
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                                contentDescription = null,
                                tint = InkMuted,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // 5. POPULAR CDO ROUTES CAROUSEL
            Column {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Popular CDO Routes",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Bold,
                            color = Ink
                        )
                        Text(
                            text = "Official active traditional jeepney routes",
                            fontSize = 11.sp,
                            color = InkMuted
                        )
                    }
                    TextButton(
                        onClick = onNavigateRoutes,
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text("See all", color = Brand600, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                LazyRow(
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(popularRoutes, key = { it.id }) { route ->
                        Surface(
                            onClick = { onSelectRoute(route.id) },
                            color = Color.White,
                            shape = RoundedCornerShape(16.dp),
                            shadowElevation = 2.dp,
                            border = BorderStroke(1.dp, Line),
                            modifier = Modifier
                                .width(220.dp)
                                .heightIn(min = 120.dp)
                        ) {
                            Column(
                                modifier = Modifier.padding(14.dp),
                                verticalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    RouteBadge(code = route.code, colorHex = route.colorHex, size = BadgeSize.Sm)
                                    Surface(
                                        color = Ok50,
                                        shape = RoundedCornerShape(4.dp)
                                    ) {
                                        Text(
                                            text = route.estFare,
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Ok700,
                                            modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.height(8.dp))

                                Text(
                                    text = route.name,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Ink,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis
                                )

                                Spacer(modifier = Modifier.height(6.dp))

                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Place,
                                        contentDescription = null,
                                        tint = InkMuted,
                                        modifier = Modifier.size(13.dp)
                                    )
                                    Text(
                                        text = "${route.origin.take(12)} ⇄ ${route.destination.take(12)}",
                                        fontSize = 11.sp,
                                        color = InkMuted,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // 5. RECENT SEARCHES
            if (uiState.recentSearches.isNotEmpty()) {
                Spacer(modifier = Modifier.height(24.dp))

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
                        shadowElevation = 2.dp,
                        border = BorderStroke(1.dp, Line),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column {
                            uiState.recentSearches.forEachIndexed { idx, item ->
                                val rowInteraction = remember { MutableInteractionSource() }
                                val isRowPressed by rowInteraction.collectIsPressedAsState()
                                val rowScale by animateFloatAsState(
                                    targetValue = if (isRowPressed) 0.985f else 1f,
                                    animationSpec = spring(dampingRatio = 0.75f, stiffness = 800f),
                                    label = "recentRowScale"
                                )
                                val rowBg by animateColorAsState(
                                    targetValue = if (isRowPressed) Brand50.copy(alpha = 0.5f) else Color.White,
                                    label = "recentRowBg"
                                )

                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .scale(rowScale)
                                        .background(rowBg)
                                        .clickable(
                                            interactionSource = rowInteraction,
                                            indication = null
                                        ) { onNavigateResults(item.from, item.to) }
                                        .padding(horizontal = 16.dp, vertical = 13.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(36.dp)
                                            .clip(RoundedCornerShape(10.dp))
                                            .background(Brand50),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.History,
                                            contentDescription = null,
                                            tint = Brand600,
                                            modifier = Modifier.size(19.dp)
                                        )
                                    }
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = item.to,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 14.sp,
                                            color = Ink,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                        Spacer(modifier = Modifier.height(2.dp))
                                        Text(
                                            text = "From: ${item.from}",
                                            fontSize = 12.sp,
                                            color = InkMuted,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }
                                    Box(
                                        modifier = Modifier
                                            .size(28.dp)
                                            .clip(CircleShape)
                                            .background(Canvas),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                                            contentDescription = null,
                                            tint = Brand600,
                                            modifier = Modifier.size(14.dp)
                                        )
                                    }
                                }
                                if (idx < uiState.recentSearches.size - 1) {
                                    HorizontalDivider(color = Line.copy(alpha = 0.8f), thickness = 1.dp)
                                }
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

@Composable
fun QuickActionTile(
    title: String,
    icon: ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    accentColor: Color = Brand600,
    accentBg: Color = Brand50
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.94f else 1f,
        animationSpec = spring(dampingRatio = 0.72f, stiffness = 800f),
        label = "qaScale"
    )
    val elevation by animateDpAsState(
        targetValue = if (isPressed) 1.dp else 2.dp,
        label = "qaElevation"
    )

    Surface(
        onClick = onClick,
        interactionSource = interactionSource,
        color = Color.White,
        shape = RoundedCornerShape(16.dp),
        shadowElevation = elevation,
        border = BorderStroke(1.dp, Line),
        modifier = modifier
            .scale(scale)
            .heightIn(min = 96.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp, horizontal = 6.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Box(
                modifier = Modifier
                    .size(42.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(accentBg),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = title,
                    tint = accentColor,
                    modifier = Modifier.size(21.dp)
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = title,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = Ink,
                textAlign = TextAlign.Center,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                lineHeight = 14.sp
            )
        }
    }
}
