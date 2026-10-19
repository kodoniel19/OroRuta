package com.ororuta.app.ui.screens

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
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
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ororuta.app.ui.components.*
import com.ororuta.app.ui.theme.*
import com.ororuta.app.ui.viewmodels.HomeUiState
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    uiState: HomeUiState,
    onNavigateAnnouncements: () -> Unit,
    onNavigateAnnouncementDetail: (String) -> Unit,
    onNavigateSaved: () -> Unit,
    onNavigateFare: () -> Unit,
    onNavigateResults: (from: String, to: String) -> Unit
) {
    // Gentle entrance animations for homepage content
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
        // 1. BRAND HERO HEADER WITH GRADIENT & WELCOMING CDO BRANDING
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(bottomStart = 24.dp, bottomEnd = 24.dp))
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Brand900, Brand700)
                    )
                )
                .statusBarsPadding()
                .padding(start = 20.dp, end = 20.dp, top = 16.dp, bottom = 22.dp)
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
                        OroRutaLogo(size = 38.dp, tone = LogoTone.Light)
                        Column {
                            Text(
                                text = buildAnnotatedString {
                                    withStyle(style = SpanStyle(color = Color.White)) {
                                        append("Oro")
                                    }
                                    withStyle(style = SpanStyle(color = Oro400)) {
                                        append("Ruta")
                                    }
                                },
                                fontSize = 22.sp,
                                fontWeight = FontWeight.ExtraBold,
                                letterSpacing = (-0.5).sp
                            )
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(6.dp)
                                        .clip(CircleShape)
                                        .background(Oro400)
                                )
                                Text(
                                    text = "Cagayan de Oro City",
                                    color = Oro100.copy(alpha = 0.92f),
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                    }

                    // Bell button with press feedback and glowing notification dot
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
                                .background(Color.White.copy(alpha = 0.12f))
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

                // Welcoming CDO Transit Info Banner
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(Color.White.copy(alpha = 0.09f))
                        .border(1.dp, Color.White.copy(alpha = 0.14f), RoundedCornerShape(16.dp))
                        .padding(horizontal = 14.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(34.dp)
                            .clip(CircleShape)
                            .background(Oro400.copy(alpha = 0.22f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.DirectionsBus,
                            contentDescription = null,
                            tint = Oro400,
                            modifier = Modifier.size(19.dp)
                        )
                    }
                    Column {
                        Text(
                            text = "City Jeepney Transit Guide",
                            color = Color.White,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "100% Offline routes, stops & official LTFRB fares",
                            color = Color.White.copy(alpha = 0.78f),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Normal
                        )
                    }
                }
            }
        }

        // Animated Body Container
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .offset(y = contentOffsetY.value.dp)
                .alpha(contentAlpha.value)
        ) {
            Spacer(modifier = Modifier.height(20.dp))

            // 2. QUICK ACTIONS: Elevated, tactile 3-column row
            Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                Text(
                    text = "Quick Actions",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = Ink
                )

                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    QuickActionTile(
                        title = "Saved Routes",
                        icon = Icons.Default.Bookmark,
                        onClick = onNavigateSaved,
                        accentColor = Brand600,
                        accentBg = Brand50,
                        modifier = Modifier.weight(1f)
                    )
                    QuickActionTile(
                        title = "Route Updates",
                        icon = Icons.Default.Campaign,
                        onClick = onNavigateAnnouncements,
                        accentColor = Oro600,
                        accentBg = Oro100,
                        modifier = Modifier.weight(1f)
                    )
                    QuickActionTile(
                        title = "Fare Guide",
                        icon = Icons.Default.Payments,
                        onClick = onNavigateFare,
                        accentColor = Ok600,
                        accentBg = Ok50,
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            // 3. RECENT SEARCHES (from history)
            if (uiState.recentSearches.isNotEmpty()) {
                Spacer(modifier = Modifier.height(24.dp))

                Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                    Text(
                        text = "Recent Searches",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = Ink
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    Surface(
                        color = Color.White,
                        shape = RoundedCornerShape(16.dp),
                        shadowElevation = 2.dp,
                        border = androidx.compose.foundation.BorderStroke(1.dp, Line),
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
                                        .padding(horizontal = 16.dp, vertical = 14.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(38.dp)
                                            .clip(RoundedCornerShape(10.dp))
                                            .background(Brand50),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.History,
                                            contentDescription = null,
                                            tint = Brand600,
                                            modifier = Modifier.size(20.dp)
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
                                            imageVector = Icons.Default.ArrowForward,
                                            contentDescription = null,
                                            tint = Brand600,
                                            modifier = Modifier.size(15.dp)
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

            // 4. TRANSPORTATION UPDATES CAROUSEL
            if (uiState.announcements.isNotEmpty()) {
                Spacer(modifier = Modifier.height(24.dp))

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
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = Ink
                        )
                        TextButton(
                            onClick = onNavigateAnnouncements,
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text("See all", color = Brand600, fontWeight = FontWeight.Bold, fontSize = 13.sp)
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
            }

            Spacer(modifier = Modifier.height(36.dp))
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
        border = androidx.compose.foundation.BorderStroke(1.dp, Line),
        modifier = modifier.scale(scale)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 14.dp, horizontal = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Box(
                modifier = Modifier
                    .size(46.dp)
                    .clip(RoundedCornerShape(13.dp))
                    .background(accentBg),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = title,
                    tint = accentColor,
                    modifier = Modifier.size(23.dp)
                )
            }
            Spacer(modifier = Modifier.height(10.dp))
            Text(
                text = title,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = Ink,
                textAlign = TextAlign.Center,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                lineHeight = 15.sp
            )
        }
    }
}
