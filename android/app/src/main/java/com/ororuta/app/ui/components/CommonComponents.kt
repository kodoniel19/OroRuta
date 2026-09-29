package com.ororuta.app.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ororuta.app.R
import com.ororuta.app.domain.models.*
import com.ororuta.app.ui.theme.*

enum class LogoTone { Brand, Light }
enum class ButtonVariant { Primary, Secondary, Ghost, Danger, Oro }
enum class ButtonSize { Sm, Md, Lg }
enum class BadgeSize { Sm, Md, Lg }
enum class EmptyTone { Brand, Warn, Neutral }
enum class StopKind { Terminal, Loading, Unloading, Transfer }

// 1. OroRutaLogo
@Composable
fun OroRutaLogo(
    size: Dp = 40.dp,
    tone: LogoTone = LogoTone.Brand,
    modifier: Modifier = Modifier
) {
    val bg = if (tone == LogoTone.Brand) Brand700 else Color.White
    val goldDot = Oro500
    val mainDot = if (tone == LogoTone.Brand) Color.White else Brand700

    Box(
        modifier = modifier
            .size(size)
            .clip(RoundedCornerShape(size * (11f / 40f)))
            .background(bg),
        contentAlignment = Alignment.Center
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(size * 0.12f),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(size * 0.28f)
                    .clip(CircleShape)
                    .background(goldDot)
            )
            Box(
                modifier = Modifier
                    .size(size * 0.28f)
                    .clip(CircleShape)
                    .background(mainDot)
            )
        }
    }
}

// 2. RouteBadge
@Composable
fun RouteBadge(
    code: String,
    colorHex: String? = null,
    size: BadgeSize = BadgeSize.Md,
    modifier: Modifier = Modifier
) {
    val parsedColor = remember(colorHex) {
        try {
            Color(android.graphics.Color.parseColor(colorHex ?: "#1471B0"))
        } catch (_: Exception) {
            Brand500
        }
    }

    val (height, fontSize, radius, hPad) = when (size) {
        BadgeSize.Sm -> listOf(20.dp, 11.sp, 6.dp, 6.dp)
        BadgeSize.Md -> listOf(26.dp, 13.sp, 8.dp, 8.dp)
        BadgeSize.Lg -> listOf(34.dp, 16.sp, 10.dp, 12.dp)
    }

    Box(
        modifier = modifier
            .height(height as Dp)
            .clip(RoundedCornerShape(radius as Dp))
            .background(parsedColor)
            .padding(horizontal = hPad as Dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = code,
            color = Color.White,
            fontWeight = FontWeight.ExtraBold,
            fontSize = fontSize as androidx.compose.ui.unit.TextUnit,
            maxLines = 1
        )
    }
}

// 3. StatusPill
@Composable
fun StatusPill(status: String, modifier: Modifier = Modifier) {
    val (bgColor, textColor) = when (status) {
        "Active" -> Pair(Ok50, Ok600)
        "Rerouted" -> Pair(Warn50, Warn600)
        "Updated" -> Pair(Brand50, Brand600)
        "Temporary" -> Pair(Oro100, Oro700)
        else -> Pair(Line, InkMuted)
    }

    Row(
        modifier = modifier
            .clip(CircleShape)
            .background(bgColor)
            .padding(horizontal = 8.dp, vertical = 3.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Box(
            modifier = Modifier
                .size(6.dp)
                .clip(CircleShape)
                .background(textColor)
        )
        Text(
            text = status,
            color = textColor,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold
        )
    }
}

// 4. OroButton
@Composable
fun OroButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: ButtonVariant = ButtonVariant.Primary,
    size: ButtonSize = ButtonSize.Md,
    icon: ImageVector? = null,
    enabled: Boolean = true,
    fullWidth: Boolean = false,
    loading: Boolean = false
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(targetValue = if (isPressed && enabled) 0.98f else 1f, label = "btnScale")

    val height = when (size) {
        ButtonSize.Sm -> 40.dp
        ButtonSize.Md -> 48.dp
        ButtonSize.Lg -> 56.dp
    }

    val (bg, contentColor, borderStroke) = when (variant) {
        ButtonVariant.Primary -> Triple(Brand600, Color.White, null)
        ButtonVariant.Secondary -> Triple(Brand50, Brand700, null)
        ButtonVariant.Ghost -> Triple(Color.Transparent, InkSoft, Line)
        ButtonVariant.Danger -> Triple(Bad600, Color.White, null)
        ButtonVariant.Oro -> Triple(Oro500, Ink, null)
    }

    val finalBg = if (enabled) bg else Line
    val finalContent = if (enabled) contentColor else InkMuted

    Surface(
        onClick = onClick,
        enabled = enabled && !loading,
        shape = RoundedCornerShape(12.dp),
        color = finalBg,
        contentColor = finalContent,
        border = if (borderStroke != null && enabled) androidx.compose.foundation.BorderStroke(1.dp, borderStroke) else null,
        modifier = modifier
            .scale(scale)
            .height(height)
            .then(if (fullWidth) Modifier.fillMaxWidth() else Modifier),
        interactionSource = interactionSource
    ) {
        Box(
            modifier = Modifier.padding(horizontal = 16.dp),
            contentAlignment = Alignment.Center
        ) {
            if (loading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    color = finalContent,
                    strokeWidth = 2.dp
                )
            } else {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    if (icon != null) {
                        Icon(
                            imageVector = icon,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp),
                            tint = finalContent
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                    }
                    Text(
                        text = text,
                        style = MaterialTheme.typography.labelLarge.copy(
                            fontWeight = FontWeight.Bold,
                            color = finalContent
                        ),
                        maxLines = 1
                    )
                }
            }
        }
    }
}

// 5. ScreenHeader
@Composable
fun ScreenHeader(
    title: String,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    onBack: (() -> Unit)? = null,
    rightAction: (@Composable () -> Unit)? = null
) {
    Surface(
        color = Color.White,
        modifier = modifier.fillMaxWidth(),
        shadowElevation = 1.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (onBack != null) {
                IconButton(
                    onClick = onBack,
                    modifier = Modifier.size(44.dp)
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Back",
                        tint = Ink
                    )
                }
            } else {
                Spacer(modifier = Modifier.width(4.dp))
            }

            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = 8.dp)
            ) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.ExtraBold,
                        color = Ink
                    ),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                if (subtitle != null) {
                    Text(
                        text = subtitle,
                        style = MaterialTheme.typography.bodySmall.copy(
                            color = InkMuted
                        ),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            if (rightAction != null) {
                rightAction()
            }
        }
    }
}

// 6. EmptyState
@Composable
fun EmptyState(
    icon: ImageVector,
    title: String,
    message: String,
    modifier: Modifier = Modifier,
    tone: EmptyTone = EmptyTone.Neutral,
    action: (@Composable () -> Unit)? = null
) {
    val (iconBg, iconTint) = when (tone) {
        EmptyTone.Brand -> Pair(Brand50, Brand600)
        EmptyTone.Warn -> Pair(Warn50, Warn600)
        EmptyTone.Neutral -> Pair(Canvas, InkMuted)
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            modifier = Modifier
                .size(64.dp)
                .clip(CircleShape)
                .background(iconBg),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(32.dp),
                tint = iconTint
            )
        }
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium.copy(
                fontWeight = FontWeight.Bold,
                color = Ink
            ),
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = message,
            style = MaterialTheme.typography.bodyMedium.copy(
                color = InkMuted
            ),
            textAlign = TextAlign.Center
        )
        if (action != null) {
            Spacer(modifier = Modifier.height(20.dp))
            action()
        }
    }
}

// 7. SegmentedControl
@Composable
fun SegmentedControl(
    options: List<String>,
    selectedIndex: Int,
    onSelect: (Int) -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0xFFE6EAF0))
            .padding(3.dp),
        horizontalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        options.forEachIndexed { index, title ->
            val isSelected = index == selectedIndex
            Surface(
                onClick = { onSelect(index) },
                shape = RoundedCornerShape(9.dp),
                color = if (isSelected) Color.White else Color.Transparent,
                shadowElevation = if (isSelected) 2.dp else 0.dp,
                modifier = Modifier
                    .weight(1f)
                    .height(34.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        text = title,
                        style = MaterialTheme.typography.labelMedium.copy(
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                            color = if (isSelected) Ink else InkMuted,
                            fontSize = 12.sp
                        ),
                        maxLines = 1
                    )
                }
            }
        }
    }
}

// 8. FareNotice
@Composable
fun FareNotice(modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(Oro100)
            .padding(12.dp),
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Icon(
            imageVector = Icons.Default.Info,
            contentDescription = null,
            tint = Oro700,
            modifier = Modifier.size(18.dp)
        )
        Text(
            text = "Fares are estimates and may change based on official fare updates.",
            color = Oro700,
            fontSize = 12.sp,
            lineHeight = 16.sp,
            fontWeight = FontWeight.Medium
        )
    }
}

// 9. OfflineBanner
@Composable
fun OfflineBanner(
    onClick: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(Ink)
            .clickable { onClick() }
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(
                imageVector = Icons.Default.CloudOff,
                contentDescription = null,
                tint = Oro400,
                modifier = Modifier.size(18.dp)
            )
            Text(
                text = "You're offline. Showing downloaded data.",
                color = Color.White,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium
            )
        }
        Text(
            text = "Offline routes ›",
            color = Oro400,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold
        )
    }
}

// 10. StopListItem
@Composable
fun StopListItem(
    kind: StopKind,
    name: String,
    note: String? = null,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        when (kind) {
            StopKind.Terminal -> {
                Box(
                    modifier = Modifier
                        .size(24.dp)
                        .clip(RoundedCornerShape(6.dp))
                        .background(Brand700),
                    contentAlignment = Alignment.Center
                ) {
                    Text("T", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
            StopKind.Loading -> {
                Box(
                    modifier = Modifier
                        .size(24.dp)
                        .clip(CircleShape)
                        .background(Ok600),
                    contentAlignment = Alignment.Center
                ) {
                    Text("L", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
            StopKind.Unloading -> {
                Box(
                    modifier = Modifier
                        .size(24.dp)
                        .clip(CircleShape)
                        .background(Bad600),
                    contentAlignment = Alignment.Center
                ) {
                    Text("U", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
            StopKind.Transfer -> {
                Box(
                    modifier = Modifier
                        .size(22.dp)
                        .rotate(45f)
                        .background(Oro500),
                    contentAlignment = Alignment.Center
                ) {
                    Text("X", color = Ink, fontSize = 10.sp, fontWeight = FontWeight.Bold, modifier = Modifier.rotate(-45f))
                }
            }
        }

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = name,
                style = MaterialTheme.typography.bodyMedium.copy(
                    fontWeight = FontWeight.SemiBold,
                    color = Ink
                )
            )
            if (!note.isNullOrBlank()) {
                Text(
                    text = note,
                    style = MaterialTheme.typography.bodySmall.copy(
                        color = InkMuted
                    )
                )
            }
        }
    }
}

// 11. TripCard
@Composable
fun TripCard(
    trip: TripOption,
    onViewRoute: () -> Unit,
    onStartNav: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .clickable { onViewRoute() },
        color = Color.White,
        shadowElevation = 2.dp
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Header: badges + direction + status
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    trip.segments.forEachIndexed { index, seg ->
                        RouteBadge(code = seg.code, colorHex = seg.color, size = BadgeSize.Md)
                        if (index < trip.segments.size - 1) {
                            Icon(
                                imageVector = Icons.Default.ChevronRight,
                                contentDescription = null,
                                tint = InkMuted,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                }
                StatusPill(status = trip.status)
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Time & Fare hero
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.Bottom,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.Bottom) {
                    Text(
                        text = "${trip.minutes}",
                        fontSize = 28.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Ink
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "min",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = InkSoft,
                        modifier = Modifier.padding(bottom = 3.dp)
                    )
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "₱${String.format("%.2f", trip.regularFare)}",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Brand700
                    )
                    Text(
                        text = "est. fare",
                        fontSize = 11.sp,
                        color = InkMuted
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Subtitle stats: Walk & Transfers
            Text(
                text = "${trip.walkMeters}m walk · " + if (trip.transfers == 0) "No transfers" else "${trip.transfers} transfer(s)",
                style = MaterialTheme.typography.bodySmall.copy(color = InkMuted)
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Mini timeline box
            Surface(
                color = Canvas,
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    if (trip.boardingName != null) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(Ok600))
                            Text("Board at ${trip.boardingName}", fontSize = 12.sp, color = InkSoft, maxLines = 1)
                        }
                    }
                    if (trip.transferName != null) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Box(modifier = Modifier.size(8.dp).rotate(45f).background(Oro500))
                            Text("Transfer at ${trip.transferName}", fontSize = 12.sp, color = InkSoft, maxLines = 1)
                        }
                    }
                    if (trip.dropoffName != null) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(Bad600))
                            Text("Get off at ${trip.dropoffName}", fontSize = 12.sp, color = InkSoft, maxLines = 1)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OroButton(
                    text = "View Route",
                    onClick = onViewRoute,
                    variant = ButtonVariant.Ghost,
                    size = ButtonSize.Sm,
                    modifier = Modifier.weight(1f)
                )
                OroButton(
                    text = "Start Navigation",
                    onClick = onStartNav,
                    variant = ButtonVariant.Primary,
                    size = ButtonSize.Sm,
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

// 12. NearbyRow
@Composable
fun NearbyRow(
    item: NearbyResult,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        onClick = onClick,
        color = Color.White,
        shape = RoundedCornerShape(12.dp),
        shadowElevation = 1.dp,
        modifier = modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.weight(1f)
            ) {
                if (item.code != null) {
                    RouteBadge(code = item.code, colorHex = item.color, size = BadgeSize.Sm)
                } else {
                    Box(
                        modifier = Modifier
                            .size(28.dp)
                            .clip(CircleShape)
                            .background(Brand50),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Place,
                            contentDescription = null,
                            tint = Brand600,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }

                Column {
                    Text(
                        text = item.name,
                        style = MaterialTheme.typography.bodyMedium.copy(
                            fontWeight = FontWeight.SemiBold,
                            color = Ink
                        ),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = "${item.distanceM}m away",
                        style = MaterialTheme.typography.bodySmall.copy(color = InkMuted)
                    )
                }
            }

            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = InkMuted,
                modifier = Modifier.size(20.dp)
            )
        }
    }
}

// 13. AnnouncementCard
@Composable
fun AnnouncementCard(
    announcement: Announcement,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    compact: Boolean = false
) {
    Surface(
        onClick = onClick,
        color = Color.White,
        shape = RoundedCornerShape(16.dp),
        shadowElevation = 2.dp,
        modifier = modifier.then(if (compact) Modifier.width(272.dp) else Modifier.fillMaxWidth())
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                StatusPill(status = announcement.status)
                Text(
                    text = announcement.date,
                    fontSize = 11.sp,
                    color = InkMuted
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = announcement.title,
                style = MaterialTheme.typography.titleSmall.copy(
                    fontWeight = FontWeight.Bold,
                    color = Ink
                ),
                maxLines = if (compact) 2 else 3,
                overflow = TextOverflow.Ellipsis
            )

            if (!announcement.description.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = announcement.description,
                    style = MaterialTheme.typography.bodySmall.copy(
                        color = InkSoft
                    ),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }

            if (announcement.routes.isNotEmpty()) {
                Spacer(modifier = Modifier.height(10.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text("Affects: ", fontSize = 11.sp, color = InkMuted)
                    announcement.routes.take(3).forEach { r ->
                        RouteBadge(code = r.code, colorHex = r.color, size = BadgeSize.Sm)
                    }
                }
            }
        }
    }
}

// 14. LocationPromptSheet
@Composable
fun LocationPromptSheet(
    onAllow: () -> Unit,
    onDismiss: () -> Unit
) {
    Surface(
        color = Color.White,
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier
                .padding(24.dp)
                .fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp, 4.dp)
                    .clip(CircleShape)
                    .background(Line)
            )

            Spacer(modifier = Modifier.height(18.dp))

            Text(
                text = "Allow OroRuta to access your location?",
                style = MaterialTheme.typography.titleLarge.copy(
                    fontWeight = FontWeight.ExtraBold,
                    color = Ink,
                    textAlign = TextAlign.Center
                )
            )

            Spacer(modifier = Modifier.height(16.dp))

            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                LocationFeatureRow(Icons.Default.MyLocation, "Determine your current starting point")
                LocationFeatureRow(Icons.Default.DirectionsBus, "Find nearby jeepney routes & terminals")
                LocationFeatureRow(Icons.Default.TransferWithinAStation, "Identify loading and unloading points")
                LocationFeatureRow(Icons.Default.Navigation, "Provide step-by-step navigation assistance")
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "Your location is only used on your device. OroRuta never tracks jeepneys or shares your personal location data.",
                style = MaterialTheme.typography.bodySmall.copy(
                    color = InkMuted,
                    textAlign = TextAlign.Center
                )
            )

            Spacer(modifier = Modifier.height(24.dp))

            OroButton(
                text = "Allow Location",
                onClick = onAllow,
                variant = ButtonVariant.Primary,
                size = ButtonSize.Lg,
                fullWidth = true
            )

            Spacer(modifier = Modifier.height(8.dp))

            OroButton(
                text = "Not Now",
                onClick = onDismiss,
                variant = ButtonVariant.Ghost,
                size = ButtonSize.Md,
                fullWidth = true
            )
        }
    }
}

@Composable
private fun LocationFeatureRow(icon: ImageVector, text: String) {
    Row(
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
            Icon(imageVector = icon, contentDescription = null, tint = Brand600, modifier = Modifier.size(20.dp))
        }
        Text(
            text = text,
            style = MaterialTheme.typography.bodyMedium.copy(color = InkSoft, fontWeight = FontWeight.Medium)
        )
    }
}
