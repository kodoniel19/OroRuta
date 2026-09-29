package com.ororuta.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ororuta.app.domain.models.Resource
import com.ororuta.app.ui.components.*
import com.ororuta.app.ui.theme.*
import com.ororuta.app.ui.viewmodels.ReportViewModel

@Composable
fun ReportScreen(
    viewModel: ReportViewModel,
    onBack: () -> Unit
) {
    Scaffold(
        topBar = {
            ScreenHeader(title = "Report an Issue", subtitle = "Help keep CDO routes accurate", onBack = onBack)
        },
        bottomBar = {
            val state = viewModel.submitState
            if (state !is Resource.Success) {
                Surface(color = Color.White, shadowElevation = 8.dp, modifier = Modifier.fillMaxWidth()) {
                    Box(modifier = Modifier.fillMaxWidth().navigationBarsPadding().padding(16.dp)) {
                        val isValid = viewModel.description.trim().length in 10..500
                        OroButton(
                            text = "Submit Report",
                            onClick = { viewModel.submit() },
                            enabled = isValid,
                            loading = state is Resource.Loading,
                            variant = ButtonVariant.Primary,
                            size = ButtonSize.Lg,
                            fullWidth = true
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        val submitState = viewModel.submitState

        if (submitState is Resource.Success) {
            // Success Screen
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .background(Canvas)
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Box(modifier = Modifier.size(72.dp).clip(CircleShape).background(Ok50), contentAlignment = Alignment.Center) {
                    Box(modifier = Modifier.size(50.dp).clip(CircleShape).background(Ok600), contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(32.dp))
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                Text("Thanks for your report!", fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, color = Ink)

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "Reference No: ${submitState.data.referenceNo}",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = Brand700
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "Our community team will verify the route changes before updating official schedules.",
                    fontSize = 13.sp,
                    color = InkSoft,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(24.dp))

                OroButton(
                    text = "Done",
                    onClick = {
                        viewModel.reset()
                        onBack()
                    },
                    variant = ButtonVariant.Primary,
                    size = ButtonSize.Md
                )
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding)
                    .background(Canvas)
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Info banner: verification notice
                Surface(
                    color = Brand50,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.Top,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Default.Info, contentDescription = null, tint = Brand600, modifier = Modifier.size(18.dp))
                        Text(
                            text = "Reports are user-submitted and may require verification before being treated as official information.",
                            fontSize = 12.sp,
                            color = Brand700,
                            lineHeight = 16.sp
                        )
                    }
                }

                // Issue Type Radio List
                Surface(
                    color = Color.White,
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("Issue Type", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Ink)

                        Spacer(modifier = Modifier.height(10.dp))

                        val reportTypes = listOf(
                            "Incorrect route information",
                            "Incorrect loading point",
                            "Incorrect terminal",
                            "Route change",
                            "Other"
                        )

                        reportTypes.forEach { type ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { viewModel.reportType = type }
                                    .padding(vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                RadioButton(
                                    selected = viewModel.reportType == type,
                                    onClick = { viewModel.reportType = type },
                                    colors = RadioButtonDefaults.colors(selectedColor = Brand600)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(type, fontSize = 14.sp, color = Ink)
                            }
                        }
                    }
                }

                // Description textarea
                Surface(
                    color = Color.White,
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("Description", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Ink)
                        Text("Provide details about the issue (10–500 characters)", fontSize = 12.sp, color = InkMuted)

                        Spacer(modifier = Modifier.height(10.dp))

                        OutlinedTextField(
                            value = viewModel.description,
                            onValueChange = { if (it.length <= 500) viewModel.description = it },
                            placeholder = { Text("e.g. Jeepney terminal moved 50 meters towards JR Borja...", fontSize = 13.sp) },
                            minLines = 4,
                            maxLines = 6,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        )

                        Spacer(modifier = Modifier.height(6.dp))

                        Text(
                            text = "${viewModel.description.length} / 500 characters",
                            fontSize = 11.sp,
                            color = if (viewModel.description.length in 10..500) InkMuted else Bad600,
                            modifier = Modifier.align(Alignment.End)
                        )
                    }
                }

                // Optional location toggle
                Surface(
                    color = Color.White,
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Attach Location", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Ink)
                            Switch(
                                checked = viewModel.useLocation,
                                onCheckedChange = { viewModel.useLocation = it },
                                colors = SwitchDefaults.colors(checkedTrackColor = Brand600)
                            )
                        }

                        if (viewModel.useLocation) {
                            Spacer(modifier = Modifier.height(10.dp))
                            OutlinedTextField(
                                value = viewModel.locationText,
                                onValueChange = { viewModel.locationText = it },
                                placeholder = { Text("Landmark or location name…", fontSize = 13.sp) },
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(32.dp))
            }
        }
    }
}
