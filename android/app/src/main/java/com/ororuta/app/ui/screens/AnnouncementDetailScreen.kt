package com.ororuta.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ororuta.app.domain.models.Announcement
import com.ororuta.app.domain.models.Resource
import com.ororuta.app.ui.components.*
import com.ororuta.app.ui.theme.*
import com.ororuta.app.ui.viewmodels.AnnouncementDetailViewModel

@Composable
fun AnnouncementDetailScreen(
    announcementId: String,
    viewModel: AnnouncementDetailViewModel,
    onBack: () -> Unit,
    onViewAffectedRoute: (String) -> Unit
) {
    val state = viewModel.announcementState

    Scaffold(
        topBar = {
            ScreenHeader(title = "Advisory Details", onBack = onBack)
        },
        bottomBar = {
            if (state is Resource.Success) {
                val ann = state.data
                val primaryRoute = ann.routes.firstOrNull()
                if (primaryRoute != null) {
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
                                text = "View affected route (${primaryRoute.code})",
                                onClick = { onViewAffectedRoute(primaryRoute.id) },
                                variant = ButtonVariant.Primary,
                                size = ButtonSize.Lg,
                                fullWidth = true
                            )
                        }
                    }
                }
            }
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(Canvas)
        ) {
            when (state) {
                is Resource.Loading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Brand600)
                    }
                }

                is Resource.Error -> {
                    Box(modifier = Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
                        EmptyState(
                            icon = Icons.Default.ErrorOutline,
                            title = "Unable to load advisory",
                            message = state.message,
                            action = {
                                OroButton(
                                    text = "Retry",
                                    onClick = { viewModel.loadAnnouncement(announcementId) },
                                    variant = ButtonVariant.Secondary,
                                    size = ButtonSize.Sm
                                )
                            }
                        )
                    }
                }

                is Resource.Success -> {
                    val ann = state.data
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState())
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        // Main info card
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
                                    StatusPill(status = ann.status)
                                    val dateText = if (!ann.effective.isNullOrBlank()) {
                                        "Effective ${ann.effective}"
                                    } else {
                                        ann.date
                                    }
                                    Text(dateText, fontSize = 12.sp, color = InkMuted)
                                }

                                Spacer(modifier = Modifier.height(10.dp))

                                Text(
                                    text = ann.title,
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = Ink
                                )

                                if (ann.category.isNotBlank()) {
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = ann.category,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = Brand600
                                    )
                                }

                                if (!ann.description.isNullOrBlank()) {
                                    Spacer(modifier = Modifier.height(10.dp))
                                    Text(
                                        text = ann.description,
                                        fontSize = 14.sp,
                                        color = InkSoft,
                                        lineHeight = 20.sp
                                    )
                                }
                            }
                        }

                        // Bullet details card
                        if (ann.details.isNotEmpty()) {
                            Surface(
                                color = Color.White,
                                shape = RoundedCornerShape(16.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(18.dp)) {
                                    Text(
                                        text = "Important Details",
                                        fontSize = 15.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Ink
                                    )
                                    Spacer(modifier = Modifier.height(10.dp))
                                    ann.details.sortedBy { it.seq }.forEach { detail ->
                                        DetailBullet(detail.text)
                                    }
                                }
                            }
                        }

                        // Affected routes card
                        if (ann.routes.isNotEmpty()) {
                            Surface(
                                color = Color.White,
                                shape = RoundedCornerShape(16.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(18.dp)) {
                                    Text(
                                        text = "Affected Jeepney Routes",
                                        fontSize = 15.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Ink
                                    )
                                    Spacer(modifier = Modifier.height(12.dp))
                                    Row(
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        ann.routes.forEach { route ->
                                            RouteBadge(
                                                code = route.code,
                                                colorHex = route.color,
                                                size = BadgeSize.Md,
                                                modifier = Modifier.clickable {
                                                    onViewAffectedRoute(route.id)
                                                }
                                            )
                                        }
                                    }
                                }
                            }
                        }
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
        Text(text = text, fontSize = 13.sp, color = InkSoft, lineHeight = 18.sp)
    }
}
