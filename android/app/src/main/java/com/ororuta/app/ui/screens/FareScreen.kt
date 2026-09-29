package com.ororuta.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ororuta.app.domain.models.Resource
import com.ororuta.app.ui.components.*
import com.ororuta.app.ui.theme.*
import com.ororuta.app.ui.viewmodels.FareViewModel

@Composable
fun FareScreen(
    viewModel: FareViewModel,
    routeId: String? = null,
    optionId: String? = null,
    onBack: () -> Unit
) {
    LaunchedEffect(routeId, optionId) {
        viewModel.loadFare(routeId, optionId, viewModel.category)
    }

    Scaffold(
        topBar = {
            ScreenHeader(title = "Estimated Fare Guide", subtitle = "Official LTFRB Jeepney Rates in CDO", onBack = onBack)
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
            // 1. BRAND700 HERO CARD
            Surface(
                color = Brand700,
                shape = RoundedCornerShape(20.dp),
                shadowElevation = 4.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(
                        text = "Estimated Total Fare (${viewModel.category})",
                        color = Color.White.copy(alpha = 0.85f),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    val total = when (val state = viewModel.estimateState) {
                        is Resource.Success -> String.format("%.2f", state.data.totalFare)
                        else -> if (viewModel.category == "Regular") "13.00" else "10.40"
                    }

                    Text(
                        text = "₱$total",
                        color = Color.White,
                        fontSize = 36.sp,
                        fontWeight = FontWeight.ExtraBold,
                        letterSpacing = (-0.5).sp
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    Text(
                        text = "1 ride · 3.2 km trip distance",
                        color = Oro400,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

            // 2. PASSENGER CATEGORY 2x2
            Column {
                Text("Select Passenger Category", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = Ink)
                Spacer(modifier = Modifier.height(10.dp))

                val categories = listOf(
                    Pair("Regular", "Standard LTFRB rate"),
                    Pair("Student", "20% discount · valid ID"),
                    Pair("Senior citizen", "20% discount · valid ID"),
                    Pair("PWD", "20% discount · valid ID")
                )

                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    for (row in 0..1) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            for (col in 0..1) {
                                val cat = categories[row * 2 + col]
                                val isSelected = viewModel.category == cat.first
                                Surface(
                                    onClick = { viewModel.changeCategory(cat.first, routeId, optionId) },
                                    shape = RoundedCornerShape(12.dp),
                                    color = if (isSelected) Brand50 else Color.White,
                                    border = if (isSelected) androidx.compose.foundation.BorderStroke(1.5.dp, Brand600) else null,
                                    shadowElevation = 1.dp,
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Column(modifier = Modifier.padding(12.dp)) {
                                        Text(
                                            text = cat.first,
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (isSelected) Brand700 else Ink
                                        )
                                        Spacer(modifier = Modifier.height(2.dp))
                                        Text(
                                            text = cat.second,
                                            fontSize = 11.sp,
                                            color = if (isSelected) Brand600 else InkMuted,
                                            lineHeight = 14.sp
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // 3. FARE BREAKDOWN PER RIDE
            Surface(
                color = Color.White,
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Fare Breakdown", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Ink)

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            RouteBadge(code = "R1", size = BadgeSize.Sm)
                            Column {
                                Text("Bulua - Agora Route", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Ink)
                                Text("3.2 km journey", fontSize = 11.sp, color = InkMuted)
                            }
                        }

                        Column(horizontalAlignment = Alignment.End) {
                            if (viewModel.category != "Regular") {
                                Text("₱13.00", fontSize = 12.sp, color = InkMuted, textDecoration = TextDecoration.LineThrough)
                                Text("₱10.40", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Ok600)
                            } else {
                                Text("₱13.00", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Ink)
                            }
                        }
                    }
                }
            }

            // 4. OFFICIAL FARE RULES
            Surface(
                color = Color.White,
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("CDO LTFRB Fare Rules", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Ink)

                    Spacer(modifier = Modifier.height(12.dp))

                    FareRuleRow("Minimum fare (first 4 km)", "₱13.00")
                    HorizontalDivider(color = Line, modifier = Modifier.padding(vertical = 8.dp))
                    FareRuleRow("Each succeeding kilometer", "₱1.80 / km")
                    HorizontalDivider(color = Line, modifier = Modifier.padding(vertical = 8.dp))
                    FareRuleRow("Discount (Student, Senior, PWD)", "20% off total")
                }
            }

            FareNotice()

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@Composable
fun FareRuleRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, fontSize = 13.sp, color = InkSoft)
        Text(value, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Ink)
    }
}
