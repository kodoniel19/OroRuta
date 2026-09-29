package com.ororuta.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ReportProblem
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

@Composable
fun DestinationReachedScreen(
    destination: String = "Limketkai Center",
    origin: String = "Carmen Public Market",
    onBackHome: () -> Unit,
    onReportIssue: () -> Unit
) {
    var isSaved by remember { mutableStateOf(false) }

    Scaffold(
        bottomBar = {
            Surface(
                color = Color.White,
                shadowElevation = 8.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier
                        .navigationBarsPadding()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OroButton(
                        text = "Back to Home",
                        onClick = onBackHome,
                        variant = ButtonVariant.Primary,
                        size = ButtonSize.Lg,
                        fullWidth = true
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
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(24.dp))

            // Large green check circle
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(CircleShape)
                    .background(Ok50),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .clip(CircleShape)
                        .background(Ok600),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Check,
                        contentDescription = "Success",
                        tint = Color.White,
                        modifier = Modifier.size(36.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            Text(
                text = "Destination Reached!",
                fontSize = 26.sp,
                fontWeight = FontWeight.ExtraBold,
                color = Ink,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(6.dp))

            Text(
                text = "You've arrived at $destination",
                fontSize = 15.sp,
                fontWeight = FontWeight.Medium,
                color = InkSoft,
                textAlign = TextAlign.Center
            )

            Text(
                text = "From $origin",
                fontSize = 13.sp,
                color = InkMuted
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Stat Tiles (Trip time, Est. fare, Walked)
            Surface(
                color = Color.White,
                shape = RoundedCornerShape(16.dp),
                shadowElevation = 1.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    StatCol(title = "Trip time", value = "18 min")
                    StatCol(title = "Est. fare", value = "₱13.00")
                    StatCol(title = "Walked", value = "240 m")
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Rode Badges
            Surface(
                color = Color.White,
                shape = RoundedCornerShape(16.dp),
                shadowElevation = 1.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "Rode jeepney",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Ink
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        RouteBadge(code = "R1", colorHex = "#1471B0", size = BadgeSize.Md)
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            FareNotice()

            Spacer(modifier = Modifier.height(20.dp))

            // Save this route button
            OroButton(
                text = if (isSaved) "Route Saved!" else "Save this route",
                onClick = { isSaved = !isSaved },
                variant = if (isSaved) ButtonVariant.Secondary else ButtonVariant.Ghost,
                size = ButtonSize.Md,
                fullWidth = true
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Report incorrect route information button
            TextButton(
                onClick = onReportIssue,
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(
                    imageVector = Icons.Default.ReportProblem,
                    contentDescription = null,
                    tint = InkMuted,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "Report incorrect route information",
                    color = InkMuted,
                    fontSize = 13.sp
                )
            }
        }
    }
}
