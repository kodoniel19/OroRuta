package com.ororuta.app.ui.screens

import android.app.Activity
import android.view.WindowManager
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ororuta.app.domain.models.TripLeg
import com.ororuta.app.domain.models.TripOption
import com.ororuta.app.ui.components.*
import com.ororuta.app.ui.theme.*
import com.ororuta.app.ui.viewmodels.NavigationViewModel

@Composable
fun NavigationScreen(
    viewModel: NavigationViewModel,
    tripOptionId: String,
    onExitToHome: () -> Unit,
    onBackToDetails: () -> Unit,
    onDestinationReached: () -> Unit
) {
    val context = LocalContext.current

    // Keep screen on during navigation
    DisposableEffect(Unit) {
        val window = (context as? Activity)?.window
        window?.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        onDispose {
            window?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
    }

    var showExitDialog by remember { mutableStateOf(false) }

    val sampleLegs = remember {
        listOf(
            TripLeg("1", 1, "walk", "Walk to Carmen Market loading area", "About 3 min walk · 180m", 3, 180),
            TripLeg("2", 2, "board", "Board R1 Bulua - Agora jeepney", "Look for code R1 on route signboard", 2, 0, routeCode = "R1", routeColor = "#1471B0"),
            TripLeg("3", 3, "stay", "Ride for 5 stops towards Limketkai", "Stay on jeepney, prepare ₱13.00 fare", 10, 2200),
            TripLeg("4", 4, "alight", "Alight at Limketkai Mall gate", "Tell driver 'Lugar lang'", 1, 0),
            TripLeg("5", 5, "walk", "Walk to Limketkai Center main entrance", "About 1 min walk · 60m", 1, 60)
        )
    }

    val currentStep = sampleLegs.getOrElse(viewModel.currentStepIndex) { sampleLegs.last() }

    if (viewModel.isDestinationReached) {
        LaunchedEffect(Unit) {
            onDestinationReached()
        }
    }

    // Exit confirm dialog
    if (showExitDialog) {
        AlertDialog(
            onDismissRequest = { showExitDialog = false },
            title = { Text("Exit Navigation?", fontWeight = FontWeight.Bold) },
            text = { Text("Are you sure you want to stop active navigation?") },
            confirmButton = {
                TextButton(onClick = {
                    showExitDialog = false
                    onExitToHome()
                }) {
                    Text("Exit to Home", color = Bad600, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showExitDialog = false }) {
                    Text("Keep navigating", color = Brand600)
                }
            }
        )
    }

    Box(modifier = Modifier.fillMaxSize()) {
        // Full screen map
        CdoCanvasMap(
            userLocation = Offset(180f, 290f),
            showControls = true,
            modifier = Modifier.fillMaxSize()
        )

        // 1. TOP BRAND700 INSTRUCTION CARD
        Surface(
            color = Brand700,
            shape = RoundedCornerShape(bottomStart = 20.dp, bottomEnd = 20.dp),
            shadowElevation = 6.dp,
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Step ${viewModel.currentStepIndex + 1} of ${sampleLegs.size}",
                        color = Oro400,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.ExtraBold,
                        letterSpacing = 0.5.sp
                    )

                    IconButton(
                        onClick = { showExitDialog = true },
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(Icons.Default.Close, contentDescription = "Exit", tint = Color.White)
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    if (currentStep.routeCode != null) {
                        RouteBadge(code = currentStep.routeCode, colorHex = currentStep.routeColor, size = BadgeSize.Sm)
                    }
                    Text(
                        text = currentStep.title,
                        color = Color.White,
                        fontSize = 17.sp,
                        fontWeight = FontWeight.ExtraBold
                    )
                }

                if (!currentStep.detail.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = currentStep.detail,
                        color = Color.White.copy(alpha = 0.85f),
                        fontSize = 13.sp
                    )
                }
            }
        }

        // 2. BOTTOM NAVIGATION SHEET
        Surface(
            color = Color.White,
            shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
            shadowElevation = 12.dp,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .navigationBarsPadding()
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // Remaining stats & Exit link
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        val remainingMin = maxOf(1, 15 - viewModel.currentStepIndex * 3)
                        Text(
                            text = "$remainingMin min",
                            fontSize = 26.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Ink
                        )
                        Text(
                            text = "2.4 km left · to Limketkai Center",
                            fontSize = 13.sp,
                            color = InkMuted
                        )
                    }

                    TextButton(onClick = { showExitDialog = true }) {
                        Text("Exit", color = Bad600, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    }
                }

                // Horizontal Step Chips
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    sampleLegs.forEachIndexed { idx, leg ->
                        val (chipBg, chipTextColor) = when {
                            idx < viewModel.currentStepIndex -> Pair(Ok50, Ok600)
                            idx == viewModel.currentStepIndex -> Pair(Brand600, Color.White)
                            else -> Pair(Canvas, InkMuted)
                        }

                        Surface(
                            shape = CircleShape,
                            color = chipBg,
                            modifier = Modifier.height(28.dp)
                        ) {
                            Box(
                                contentAlignment = Alignment.Center,
                                modifier = Modifier.padding(horizontal = 12.dp)
                            ) {
                                Text(
                                    text = "Step ${idx + 1}",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = chipTextColor
                                )
                            }
                        }
                    }
                }

                // Contextual primary CTA
                val ctaText = when (viewModel.currentStepIndex) {
                    0 -> "I'm at the loading point"
                    1 -> "I'm on the jeepney"
                    2 -> "Approaching drop-off"
                    3 -> "I got off"
                    else -> "I've arrived"
                }

                OroButton(
                    text = ctaText,
                    onClick = { viewModel.nextStep() },
                    variant = ButtonVariant.Primary,
                    size = ButtonSize.Lg,
                    fullWidth = true
                )

                // Footnote
                Text(
                    text = "Uses your phone's location only. Jeepneys are not tracked.",
                    fontSize = 11.sp,
                    color = InkMuted,
                    modifier = Modifier.align(Alignment.CenterHorizontally)
                )
            }
        }
    }
}
