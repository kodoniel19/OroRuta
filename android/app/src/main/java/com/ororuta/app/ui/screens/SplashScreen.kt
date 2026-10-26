package com.ororuta.app.ui.screens

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ororuta.app.ui.components.LogoTone
import com.ororuta.app.ui.components.OroRutaLogo
import com.ororuta.app.ui.theme.Brand600
import com.ororuta.app.ui.theme.Brand700
import com.ororuta.app.ui.theme.Brand900
import com.ororuta.app.ui.theme.Oro400
import com.ororuta.app.ui.theme.Oro500
import kotlinx.coroutines.launch

@Composable
fun SplashScreen(
    onNavigateHome: () -> Unit
) {
    val progress = remember { Animatable(0f) }
    val logoAlpha = remember { Animatable(0f) }
    val logoScale = remember { Animatable(0.82f) }
    val contentAlpha = remember { Animatable(0f) }
    val contentOffsetY = remember { Animatable(18f) }

    LaunchedEffect(Unit) {
        // Entrance animation: smooth reveal of logo and branding
        launch {
            logoAlpha.animateTo(
                targetValue = 1f,
                animationSpec = tween(durationMillis = 500, easing = FastOutSlowInEasing)
            )
        }
        launch {
            logoScale.animateTo(
                targetValue = 1f,
                animationSpec = tween(durationMillis = 600, easing = FastOutSlowInEasing)
            )
        }
        launch {
            contentAlpha.animateTo(
                targetValue = 1f,
                animationSpec = tween(durationMillis = 500, delayMillis = 150, easing = FastOutSlowInEasing)
            )
        }
        launch {
            contentOffsetY.animateTo(
                targetValue = 0f,
                animationSpec = tween(durationMillis = 500, delayMillis = 150, easing = FastOutSlowInEasing)
            )
        }

        // Keep original 1800ms loading behavior
        progress.animateTo(
            targetValue = 1f,
            animationSpec = tween(durationMillis = 1800, easing = LinearEasing)
        )
        onNavigateHome()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(Brand900, Brand700, Brand600)
                )
            )
            .clickable { onNavigateHome() }
    ) {
        // Subtle background transit curve pattern representing CDO jeepney routes
        Canvas(modifier = Modifier.fillMaxSize()) {
            val w = size.width
            val h = size.height

            val routePath1 = Path().apply {
                moveTo(0f, h * 0.28f)
                cubicTo(w * 0.4f, h * 0.20f, w * 0.6f, h * 0.38f, w, h * 0.32f)
            }
            drawPath(
                path = routePath1,
                color = Color.White.copy(alpha = 0.05f),
                style = Stroke(width = 3.dp.toPx())
            )

            val routePath2 = Path().apply {
                moveTo(0f, h * 0.72f)
                cubicTo(w * 0.35f, h * 0.65f, w * 0.7f, h * 0.82f, w, h * 0.75f)
            }
            drawPath(
                path = routePath2,
                color = Oro400.copy(alpha = 0.07f),
                style = Stroke(width = 2.dp.toPx())
            )

        }

        // Center Content
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Official OroRuta Logo with smooth scale/fade
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .scale(logoScale.value)
                    .alpha(logoAlpha.value)
            ) {
                OroRutaLogo(size = 104.dp, tone = LogoTone.Light)
            }

            Spacer(modifier = Modifier.height(28.dp))

            // Text content container with subtle slide-up and fade-in
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .offset(y = contentOffsetY.value.dp)
                    .alpha(contentAlpha.value)
            ) {
                Text(
                    text = buildAnnotatedString {
                        withStyle(style = SpanStyle(color = Color.White)) {
                            append("Oro")
                        }
                        withStyle(style = SpanStyle(color = Oro400)) {
                            append("Ruta")
                        }
                    },
                    fontSize = 42.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = (-0.5).sp
                )

                Spacer(modifier = Modifier.height(10.dp))

                // Cagayan de Oro transit badge
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color.White.copy(alpha = 0.12f))
                        .padding(horizontal = 12.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = "CAGAYAN DE ORO TRANSIT GUIDE",
                        color = Oro400,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.8.sp
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = "Your Guide to Jeepney Routes in Cagayan de Oro",
                    color = Color.White.copy(alpha = 0.88f),
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Medium,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(horizontal = 16.dp)
                )

                Spacer(modifier = Modifier.height(44.dp))

                // Sleek progress bar
                LinearProgressIndicator(
                    progress = { progress.value },
                    modifier = Modifier
                        .width(110.dp)
                        .height(5.dp)
                        .clip(RoundedCornerShape(3.dp)),
                    color = Oro400,
                    trackColor = Color.White.copy(alpha = 0.18f),
                )
            }
        }
    }
}
