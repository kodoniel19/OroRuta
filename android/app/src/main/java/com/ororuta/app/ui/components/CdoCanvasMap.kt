package com.ororuta.app.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMapOptions
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.*
import com.ororuta.app.ui.location.LocationPermissions
import com.ororuta.app.ui.theme.*
import kotlinx.coroutines.launch
import kotlin.math.abs

data class MapMarker(
    val id: String,
    val name: String,
    val x: Float = 0f,
    val y: Float = 0f,
    val kind: String, // terminal, loading, unloading, transfer, landmark, destination, origin
    val routeCode: String? = null,
    val routeColor: String? = null,
    val note: String? = null,
    val lat: Double? = null,
    val lng: Double? = null,
    val area: String? = null
)

data class MapRouteLine(
    val routeId: String,
    val code: String,
    val color: Color,
    val points: List<Offset> = emptyList(),
    val isSelected: Boolean = false,
    val isDimmed: Boolean = false
)

data class MapWalkLine(
    val from: Offset = Offset.Zero,
    val to: Offset = Offset.Zero
)

// Real Cagayan de Oro Stop Locations
private val DEFAULT_CDO_STOPS = listOf(
    Pair("Bulua Westbound Terminal", LatLng(8.5132, 124.6190)),
    Pair("Agora Eastbound Terminal", LatLng(8.4907, 124.6610)),
    Pair("Carmen Public Market", LatLng(8.4804, 124.6369)),
    Pair("Divisoria Plaza", LatLng(8.4772, 124.6465)),
    Pair("Centrio Mall / Velez-Recto", LatLng(8.4871, 124.6508)),
    Pair("Limketkai Center", LatLng(8.4842, 124.6568)),
    Pair("Gusa Highway Drop-off", LatLng(8.4925, 124.6780)),
    Pair("Cogon Public Market", LatLng(8.477160465033135, 124.65120822163647)),
    Pair("Puerto Highway Junction", LatLng(8.4960, 124.7410))
)

// Real CDO Jeepney Routes Polylines
private val CDO_ROUTE_R1 = listOf(
    LatLng(8.5132, 124.6190), // Bulua
    LatLng(8.4980, 124.6350), // Kauswagan
    LatLng(8.4804, 124.6369), // Carmen
    LatLng(8.4772, 124.6465), // Divisoria
    LatLng(8.4871, 124.6508), // Centrio
    LatLng(8.4842, 124.6568), // Limketkai
    LatLng(8.4907, 124.6610)  // Agora
)

private val CDO_ROUTE_C1 = listOf(
    LatLng(8.4804, 124.6369), // Carmen
    LatLng(8.4871, 124.6508), // Velez
    LatLng(8.4772, 124.6465), // Divisoria
    LatLng(8.477160465033135, 124.65120822163647)  // Cogon
)

private val CDO_ROUTE_B1 = listOf(
    LatLng(8.4907, 124.6610), // Agora
    LatLng(8.4925, 124.6780), // Gusa
    LatLng(8.4960, 124.7410)  // Puerto
)

@Composable
fun CdoCanvasMap(
    modifier: Modifier = Modifier,
    isOffline: Boolean = false,
    routes: List<MapRouteLine> = emptyList(),
    walkLines: List<MapWalkLine> = emptyList(),
    markers: List<MapMarker> = emptyList(),
    activeWalkToBoard: List<LatLng> = emptyList(),
    activeJeepneyRoute: List<LatLng> = emptyList(),
    activeWalkFromDrop: List<LatLng> = emptyList(),
    activeTripMarkers: List<MapMarker> = emptyList(),
    userLocation: Offset? = null,
    selectedMarker: MapMarker? = null,
    onMarkerClick: ((MapMarker) -> Unit)? = null,
    onMapClick: (() -> Unit)? = null,
    showControls: Boolean = true,
    showLayersSheet: Boolean = false,
    onLayersClick: (() -> Unit)? = null,
    onLocateUser: (() -> Unit)? = null,
    targetFocus: Offset? = null,
    targetZoom: Float? = null
) {
    val coroutineScope = rememberCoroutineScope()
    val context = LocalContext.current
    val hasLocationPermission = LocationPermissions.hasAccess(context)
    val cdoCenter = remember { LatLng(8.4822, 124.6472) }
    val cdoCameraBounds = remember {
        com.google.android.gms.maps.model.LatLngBounds(
            LatLng(8.3000, 124.4800),
            LatLng(8.6000, 124.8000)
        )
    }
    val initialCamera = remember { CameraPosition.fromLatLngZoom(cdoCenter, targetZoom ?: 13.8f) }

    val cameraPositionState = rememberCameraPositionState {
        position = initialCamera
    }
    var mapReady by remember { mutableStateOf(false) }

    val hasActiveTrip = activeJeepneyRoute.isNotEmpty() || activeWalkToBoard.isNotEmpty() || activeWalkFromDrop.isNotEmpty() || activeTripMarkers.isNotEmpty()

    // Bounding box for active navigation route
    LaunchedEffect(activeJeepneyRoute, activeWalkToBoard, activeWalkFromDrop, activeTripMarkers, mapReady) {
        if (!mapReady || !hasActiveTrip) return@LaunchedEffect
        val allPoints = mutableListOf<LatLng>()
        allPoints.addAll(activeWalkToBoard)
        allPoints.addAll(activeJeepneyRoute)
        allPoints.addAll(activeWalkFromDrop)
        activeTripMarkers.forEach { m ->
            if (m.lat != null && m.lng != null) allPoints.add(LatLng(m.lat, m.lng))
        }
        if (allPoints.isNotEmpty()) {
            val builder = com.google.android.gms.maps.model.LatLngBounds.builder()
            allPoints.forEach { builder.include(it) }
            try {
                cameraPositionState.animate(
                    CameraUpdateFactory.newLatLngBounds(builder.build(), 120),
                    600
                )
            } catch (_: Exception) {}
        }
    }

    LaunchedEffect(cameraPositionState.isMoving, mapReady) {
        if (!mapReady || cameraPositionState.isMoving || hasActiveTrip) return@LaunchedEffect
        val t = cameraPositionState.position.target
        if (!cdoCameraBounds.contains(t)) {
            cameraPositionState.animate(
                CameraUpdateFactory.newLatLngZoom(cdoCenter, targetZoom ?: 13.8f),
                500
            )
        }
    }

    Box(modifier = modifier.fillMaxSize()) {
        GoogleMap(
            modifier = Modifier.fillMaxSize(),
            cameraPositionState = cameraPositionState,
            properties = MapProperties(
                isMyLocationEnabled = hasLocationPermission,
                minZoomPreference = 11.0f,
                maxZoomPreference = 20.0f,
                latLngBoundsForCameraTarget = cdoCameraBounds
            ),
            uiSettings = MapUiSettings(
                myLocationButtonEnabled = false,
                zoomControlsEnabled = false,
                compassEnabled = true,
                mapToolbarEnabled = false,
                tiltGesturesEnabled = false,
                zoomGesturesEnabled = true,
                scrollGesturesEnabled = true,
                rotationGesturesEnabled = true
            ),
            onMapLoaded = { mapReady = true },
            onMapClick = {
                onMapClick?.invoke()
            },
            onPOIClick = { }
        ) {
            if (hasActiveTrip) {
                // 1. Walk from origin to boarding point (snapped to real pedestrian roads)
                if (activeWalkToBoard.isNotEmpty()) {
                    Polyline(
                        points = activeWalkToBoard,
                        color = Color(0xFF1E8A4C), // Forest green walk line
                        width = 8f
                    )
                }

                // 2. Real Jeepney road-following polyline (snapped to actual roads and bridges)
                if (activeJeepneyRoute.isNotEmpty()) {
                    Polyline(
                        points = activeJeepneyRoute,
                        color = Color(0xFF1471B0), // OroRuta primary blue
                        width = 12f
                    )
                }

                // 3. Walk from dropoff point to destination
                if (activeWalkFromDrop.isNotEmpty()) {
                    Polyline(
                        points = activeWalkFromDrop,
                        color = Color(0xFF1E8A4C), // Forest green walk line
                        width = 8f
                    )
                }

                // 4. Navigation Markers
                activeTripMarkers.forEach { m ->
                    if (m.lat != null && m.lng != null) {
                        Marker(
                            state = rememberMarkerState(key = m.id, position = LatLng(m.lat, m.lng)),
                            title = m.name,
                            snippet = m.note ?: m.kind,
                            onClick = {
                                onMarkerClick?.invoke(m)
                                true
                            }
                        )
                    }
                }
            } else {
                // Default city overview markers
                if (markers.isNotEmpty()) {
                    markers.forEach { m ->
                        val pos = if (m.lat != null && m.lng != null) {
                            LatLng(m.lat, m.lng)
                        } else {
                            DEFAULT_CDO_STOPS.find { it.first.contains(m.name, ignoreCase = true) || m.name.contains(it.first, ignoreCase = true) }?.second
                                ?: LatLng(8.4822 + (m.y - 400) * 0.0001, 124.6472 + (m.x - 200) * 0.0001)
                        }
                        Marker(
                            state = rememberMarkerState(key = m.id, position = pos),
                            title = m.name,
                            snippet = m.note ?: "Kind: ${m.kind}",
                            onClick = {
                                onMarkerClick?.invoke(m)
                                true
                            }
                        )
                    }
                } else {
                    DEFAULT_CDO_STOPS.forEach { (name, pos) ->
                        Marker(
                            state = rememberMarkerState(key = name, position = pos),
                            title = name,
                            snippet = "Jeepney Stop, CDO",
                            onClick = {
                                onMarkerClick?.invoke(MapMarker(id = name, name = name, kind = "stop", lat = pos.latitude, lng = pos.longitude))
                                true
                            }
                        )
                    }
                }
            }

            // MapEffect: neutralize double-tap-to-point zoom behavior.
            // Detects when a gesture zooms AND shifts the center significantly,
            // then snaps the center back to the pre-gesture position at the new zoom.
            MapEffect(Unit) { googleMap ->
                var preGestureTarget: LatLng? = null
                var preGestureZoom: Float? = null
                var gestureActive = false

                googleMap.setOnCameraMoveStartedListener { reason ->
                    if (reason == com.google.android.gms.maps.GoogleMap.OnCameraMoveStartedListener.REASON_GESTURE) {
                        preGestureTarget = googleMap.cameraPosition.target
                        preGestureZoom = googleMap.cameraPosition.zoom
                        gestureActive = true
                    }
                }

                googleMap.setOnCameraIdleListener {
                    if (!gestureActive) return@setOnCameraIdleListener
                    gestureActive = false

                    val savedTarget = preGestureTarget ?: return@setOnCameraIdleListener
                    val savedZoom = preGestureZoom ?: return@setOnCameraIdleListener
                    val currentTarget = googleMap.cameraPosition.target
                    val currentZoom = googleMap.cameraPosition.zoom

                    val zoomDelta = kotlin.math.abs(currentZoom - savedZoom)
                    val latDelta = kotlin.math.abs(currentTarget.latitude - savedTarget.latitude)
                    val lngDelta = kotlin.math.abs(currentTarget.longitude - savedTarget.longitude)

                    if (zoomDelta > 0.3f && (latDelta > 0.002 || lngDelta > 0.002)) {
                        googleMap.animateCamera(
                            com.google.android.gms.maps.CameraUpdateFactory.newLatLngZoom(
                                savedTarget, currentZoom
                            ),
                            250,
                            null
                        )
                    }

                    preGestureTarget = null
                    preGestureZoom = null
                }
            }
        }

        // Recenter to Cagayan de Oro button if controls are enabled
        if (showControls) {
            Surface(
                color = Color.White,
                shape = CircleShape,
                shadowElevation = 6.dp,
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(end = 16.dp, bottom = 90.dp)
                    .size(46.dp)
                    .clickable {
                        coroutineScope.launch {
                            cameraPositionState.animate(
                                CameraUpdateFactory.newLatLngZoom(cdoCenter, 14.5f),
                                800
                            )
                        }
                        onLocateUser?.invoke()
                    }
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = Icons.Default.MyLocation,
                        contentDescription = "Recenter on Cagayan de Oro",
                        tint = Brand600,
                        modifier = Modifier.size(24.dp)
                    )
                }
            }
        }
    }
}
