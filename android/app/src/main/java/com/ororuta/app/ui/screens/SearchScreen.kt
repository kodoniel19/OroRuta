package com.ororuta.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ororuta.app.domain.models.Place
import com.ororuta.app.ui.components.ButtonSize
import com.ororuta.app.ui.components.ButtonVariant
import com.ororuta.app.ui.components.OroButton
import com.ororuta.app.ui.theme.*
import com.ororuta.app.ui.viewmodels.SearchViewModel

@Composable
fun SearchScreen(
    viewModel: SearchViewModel,
    prefillFrom: String,
    prefillTo: String,
    onBack: () -> Unit,
    onSearchSubmit: (from: String, to: String, fromLat: Double?, fromLng: Double?, toLat: Double?, toLng: Double?) -> Unit,
    onViewPlaceOnMap: ((Place) -> Unit)? = null
) {
    LaunchedEffect(prefillFrom, prefillTo) {
        if (prefillFrom.isNotBlank()) {
            viewModel.fromText = prefillFrom
        } else if (viewModel.fromText.isBlank()) {
            viewModel.fromText = "Current Location"
        }
        if (prefillTo.isNotBlank()) viewModel.toText = prefillTo
    }

    var focusedField by remember { mutableStateOf(if (viewModel.fromText.isBlank()) "from" else "to") }

    Scaffold(
        topBar = {
            Surface(
                color = Color.White,
                shadowElevation = 1.dp
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .statusBarsPadding()
                        .padding(horizontal = 16.dp, vertical = 12.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        IconButton(onClick = onBack, modifier = Modifier.size(40.dp)) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Ink)
                        }
                        Text(
                            text = "Search Route",
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = Ink
                            )
                        )
                        TextButton(onClick = {
                            viewModel.fromText = ""
                            viewModel.toText = ""
                        }) {
                            Text("Clear", color = Brand600, fontWeight = FontWeight.SemiBold)
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // From and To Fields card
                    Surface(
                        color = Canvas,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                // From field
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Box(
                                        modifier = Modifier
                                            .size(8.dp)
                                            .clip(CircleShape)
                                            .background(Brand600)
                                    )
                                    Spacer(modifier = Modifier.width(10.dp))
                                    TextField(
                                        value = viewModel.fromText,
                                        onValueChange = { newValue: String ->
                                            viewModel.onFromChange(newValue)
                                            focusedField = "from"
                                        },
                                        placeholder = { Text("Starting point", fontSize = 14.sp) },
                                        colors = TextFieldDefaults.colors(
                                            focusedContainerColor = Color.Transparent,
                                            unfocusedContainerColor = Color.Transparent,
                                            focusedIndicatorColor = Color.Transparent,
                                            unfocusedIndicatorColor = Color.Transparent
                                        ),
                                        modifier = Modifier.weight(1f),
                                        singleLine = true
                                    )
                                    if (viewModel.fromText.isNotBlank()) {
                                        IconButton(onClick = { viewModel.fromText = "" }, modifier = Modifier.size(24.dp)) {
                                            Icon(Icons.Default.Clear, contentDescription = "Clear", tint = InkMuted, modifier = Modifier.size(16.dp))
                                        }
                                    }
                                }

                                HorizontalDivider(color = Line, modifier = Modifier.padding(vertical = 4.dp))

                                // To field
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Box(
                                        modifier = Modifier
                                            .size(8.dp)
                                            .clip(CircleShape)
                                            .background(Bad600)
                                    )
                                    Spacer(modifier = Modifier.width(10.dp))
                                    TextField(
                                        value = viewModel.toText,
                                        onValueChange = { newValue: String ->
                                            viewModel.onToChange(newValue)
                                            focusedField = "to"
                                        },
                                        placeholder = { Text("Where are you going?", fontSize = 14.sp) },
                                        colors = TextFieldDefaults.colors(
                                            focusedContainerColor = Color.Transparent,
                                            unfocusedContainerColor = Color.Transparent,
                                            focusedIndicatorColor = Color.Transparent,
                                            unfocusedIndicatorColor = Color.Transparent
                                        ),
                                        modifier = Modifier.weight(1f),
                                        singleLine = true
                                    )
                                    if (viewModel.toText.isNotBlank()) {
                                        IconButton(onClick = { viewModel.toText = "" }, modifier = Modifier.size(24.dp)) {
                                            Icon(Icons.Default.Clear, contentDescription = "Clear", tint = InkMuted, modifier = Modifier.size(16.dp))
                                        }
                                    }
                                }
                            }

                            // Swap button
                            IconButton(onClick = { viewModel.swap() }) {
                                Icon(Icons.Default.SwapVert, contentDescription = "Swap", tint = Brand600)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // Filter chips: All places | Landmarks | Terminals
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterChip(
                            selected = viewModel.activeFilter == "all",
                            onClick = { viewModel.setFilter("all") },
                            label = { Text("All places", fontSize = 12.sp) }
                        )
                        FilterChip(
                            selected = viewModel.activeFilter == "landmarks",
                            onClick = { viewModel.setFilter("landmarks") },
                            label = { Text("Landmarks", fontSize = 12.sp) }
                        )
                        FilterChip(
                            selected = viewModel.activeFilter == "terminals",
                            onClick = { viewModel.setFilter("terminals") },
                            label = { Text("Terminals", fontSize = 12.sp) }
                        )
                    }
                }
            }
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
                    val effectiveFrom = if (viewModel.fromText.isNotBlank()) viewModel.fromText else "Current Location"
                    val canSearch = viewModel.toText.isNotBlank()
                    OroButton(
                        text = "Search Route",
                        onClick = {
                            viewModel.fromText = effectiveFrom
                            viewModel.saveHistory(effectiveFrom, viewModel.toText)
                            onSearchSubmit(
                                effectiveFrom,
                                viewModel.toText,
                                viewModel.fromPlace?.lat,
                                viewModel.fromPlace?.lng,
                                viewModel.toPlace?.lat,
                                viewModel.toPlace?.lng
                            )
                        },
                        enabled = canSearch,
                        variant = ButtonVariant.Primary,
                        size = ButtonSize.Lg,
                        fullWidth = true
                    )
                }
            }
        }
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(Color.White)
        ) {
            // "Use current location" shortcut - always accessible
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable {
                            viewModel.useCurrentLocation { locName ->
                                if (focusedField == "to") {
                                    viewModel.toText = locName
                                    if (viewModel.fromText.isBlank()) viewModel.fromText = "Carmen Market"
                                    onSearchSubmit(viewModel.fromText, viewModel.toText, null, null, null, null)
                                } else {
                                    viewModel.fromText = locName
                                    focusedField = "to"
                                    if (viewModel.toText.isNotBlank()) {
                                        onSearchSubmit(viewModel.fromText, viewModel.toText, null, null, null, null)
                                    }
                                }
                            }
                        }
                        .padding(16.dp),
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
                        if (viewModel.isLocating) {
                            CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp, color = Brand600)
                        } else {
                            Icon(Icons.Default.MyLocation, contentDescription = null, tint = Brand600, modifier = Modifier.size(20.dp))
                        }
                    }
                    Column {
                        Text("Use Current Location", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Brand700)
                        Text(if (viewModel.fromText.isNotBlank()) viewModel.fromText else "Cagayan de Oro City GPS", fontSize = 12.sp, color = InkMuted)
                    }
                }
                HorizontalDivider(color = Line)
            }

            // Suggested matching places
            if (viewModel.suggestedPlaces.isNotEmpty()) {
                item {
                    Text(
                        text = "Matching Places",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = InkMuted,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)
                    )
                }

                items(viewModel.suggestedPlaces, key = { it.id }) { place ->
                    PlaceSearchRow(
                        place = place,
                        onClick = {
                            if (focusedField == "from") {
                                viewModel.selectPlace(place, "from")
                                focusedField = "to"
                                if (viewModel.toText.isNotBlank()) {
                                    viewModel.saveHistory(viewModel.fromText, viewModel.toText)
                                    onSearchSubmit(
                                        viewModel.fromText, viewModel.toText,
                                        viewModel.fromPlace?.lat, viewModel.fromPlace?.lng,
                                        viewModel.toPlace?.lat, viewModel.toPlace?.lng
                                    )
                                }
                            } else {
                                viewModel.selectPlace(place, "to")
                                val from = if (viewModel.fromText.isNotBlank()) viewModel.fromText else "Current Location"
                                viewModel.fromText = from
                                viewModel.saveHistory(from, place.name)
                                onSearchSubmit(
                                    from, place.name,
                                    viewModel.fromPlace?.lat, viewModel.fromPlace?.lng,
                                    place.lat.takeIf { it != 0.0 }, place.lng.takeIf { it != 0.0 }
                                )
                            }
                        },
                        onViewOnMap = if (onViewPlaceOnMap != null) { { onViewPlaceOnMap(place) } } else null
                    )
                    HorizontalDivider(color = Line)
                }
            }

            // Recent destinations
            if (viewModel.recentHistory.isNotEmpty()) {
                item {
                    Text(
                        text = "Recent Searches",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = InkMuted,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)
                    )
                }

                items(viewModel.recentHistory, key = { it.id }) { hist ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                viewModel.fromText = hist.from
                                viewModel.toText = hist.to
                                // History items don't carry coordinates; backend will resolve by name
                                onSearchSubmit(hist.from, hist.to, null, null, null, null)
                            }
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Icon(Icons.Default.History, contentDescription = null, tint = InkMuted, modifier = Modifier.size(18.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(text = hist.to, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = Ink)
                            Text(text = "From ${hist.from}", fontSize = 12.sp, color = InkMuted)
                        }
                    }
                    HorizontalDivider(color = Line)
                }
            }
        }
    }
}

@Composable
fun PlaceSearchRow(
    place: Place,
    onClick: () -> Unit,
    onViewOnMap: (() -> Unit)? = null
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        val (icon, tint) = when (place.kind) {
            "terminal" -> Pair(Icons.Default.DirectionsBus, Brand600)
            "landmark" -> Pair(Icons.Default.Place, Oro700)
            else -> Pair(Icons.Default.LocationOn, InkSoft)
        }

        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(CircleShape)
                .background(Canvas),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(20.dp))
        }

        Column(modifier = Modifier.weight(1f)) {
            Text(place.name, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = Ink)
            if (!place.area.isNullOrBlank()) {
                Text(place.area, fontSize = 12.sp, color = InkMuted)
            }
        }

        if (onViewOnMap != null && place.lat != 0.0 && place.lng != 0.0) {
            IconButton(
                onClick = onViewOnMap,
                modifier = Modifier.size(32.dp)
            ) {
                Icon(Icons.Default.Map, contentDescription = "View on Map", tint = Brand600, modifier = Modifier.size(18.dp))
            }
        }

        Icon(Icons.Default.NorthWest, contentDescription = null, tint = InkMuted, modifier = Modifier.size(16.dp))
    }
}
