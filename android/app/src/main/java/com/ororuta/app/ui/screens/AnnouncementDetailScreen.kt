package com.ororuta.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ororuta.app.domain.models.Announcement
import com.ororuta.app.ui.components.*
import com.ororuta.app.ui.theme.*

@Composable
fun AnnouncementDetailScreen(
    announcementId: String,
    onBack: () -> Unit,
    onViewAffectedRoute: (String) -> Unit
) {
    Scaffold(
        topBar = {
            ScreenHeader(title = "Advisory Details", onBack = onBack)
        },
        bottomBar = {
            Surface(
                color = Color.White,
                shadowElevation = 8.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .navigationBarsPadding()
                        .padding(16.dp)
                ) {
                    OroButton(
                        text = "View affected route",
                        onClick = { onViewAffectedRoute("r1") },
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
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Surface(
                color = Color.White,
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        StatusPill(status = "Active")
                        Text("Effective Sept 2026", fontSize = 12.sp, color = InkMuted)
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        text = "Temporary Rerouting due to CM Recto Drainage Improvement",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Ink
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    Text(
                        text = "Due to ongoing DPWH drainage project along CM Recto Avenue near Limketkai, all eastbound traditional and modern jeepneys will temporarily use Osmeña Extension.",
                        fontSize = 14.sp,
                        color = InkSoft,
                        lineHeight = 20.sp
                    )
                }
            }

            // Bullet Details
            Surface(
                color = Color.White,
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Text("Important Details", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Ink)

                    Spacer(modifier = Modifier.height(10.dp))

                    DetailBullet("Expected completion: 3 weeks from start date")
                    DetailBullet("Temporary loading bay set up along Osmeña St.")
                    DetailBullet("Westbound routes remain on normal schedule")
                }
            }

            // Affected Routes
            Surface(
                color = Color.White,
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Text("Affected Jeepney Routes", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Ink)

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        RouteBadge(code = "R1", colorHex = "#1471B0", size = BadgeSize.Md)
                        RouteBadge(code = "R2", colorHex = "#B45F00", size = BadgeSize.Md)
                    }
                }
            }
        }
    }
}

@Composable
fun DetailBullet(text: String) {
    Row(
        modifier = Modifier.padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.Top
    ) {
        Box(
            modifier = Modifier
                .padding(top = 6.dp)
                .size(6.dp)
                .background(Brand600, CircleShape)
        )
        Text(text, fontSize = 13.sp, color = InkSoft, lineHeight = 18.sp)
    }
}
