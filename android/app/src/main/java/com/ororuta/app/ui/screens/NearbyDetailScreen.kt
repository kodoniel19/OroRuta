package com.ororuta.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ororuta.app.ui.components.*
import com.ororuta.app.ui.theme.*

@Composable
fun NearbyDetailScreen(
    itemId: String,
    kind: String,
    onBack: () -> Unit,
    onViewOnMap: () -> Unit,
    onPlanTrip: () -> Unit,
    onSelectRoute: (String) -> Unit
) {
    Scaffold(
        topBar = {
            ScreenHeader(
                title = "Location Details",
                onBack = onBack
            )
        },
        bottomBar = {
            Surface(
                color = Color.White,
                shadowElevation = 8.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .navigationBarsPadding()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OroButton(
                        text = "View on map",
                        onClick = onViewOnMap,
                        variant = ButtonVariant.Secondary,
                        size = ButtonSize.Md,
                        modifier = Modifier.weight(1f)
                    )
                    OroButton(
                        text = "Plan a trip",
                        onClick = onPlanTrip,
                        variant = ButtonVariant.Primary,
                        size = ButtonSize.Md,
                        modifier = Modifier.weight(1f)
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
            // Map preview with walking line from user
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(210.dp)
            ) {
                CdoCanvasMap(showControls = false, modifier = Modifier.fillMaxSize())
            }

            Surface(color = Color.White, modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = kind.uppercase(),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = Brand600
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    Text(
                        text = "Carmen Market Loading Area",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Ink
                    )

                    Text(
                        text = "Along Max Suniel St · pedestrian crossing lane",
                        fontSize = 13.sp,
                        color = InkSoft
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        text = "210m away · about 3 min walk",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Ok600
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Routes Served
            Surface(
                color = Color.White,
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Routes served at this stop",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = Ink
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    val sampleServedRoutes = listOf(
                        Pair("R1", "Bulua - Agora via CM Recto"),
                        Pair("R2", "Carmen - Lapasan via Divisoria"),
                        Pair("C1", "Bonbon - Poblacion via Carmen")
                    )

                    sampleServedRoutes.forEach { r ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onSelectRoute(r.first) }
                                .padding(vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                RouteBadge(code = r.first, size = BadgeSize.Sm)
                                Text(r.second, fontSize = 13.sp, color = Ink, fontWeight = FontWeight.Medium)
                            }
                            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = InkMuted, modifier = Modifier.size(18.dp))
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}
