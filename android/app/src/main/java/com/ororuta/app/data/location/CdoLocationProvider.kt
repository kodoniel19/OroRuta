package com.ororuta.app.data.location

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Geocoder
import android.os.Build
import androidx.core.content.ContextCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import android.os.Looper
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import java.util.Locale
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

data class UserLocationInfo(
    val latitude: Double,
    val longitude: Double,
    val displayName: String,
    val isCagayanDeOro: Boolean,
    val isRealGps: Boolean = false,
    val hasPermission: Boolean = true,
    val isFixAvailable: Boolean = true
)

@Singleton
class CdoLocationProvider @Inject constructor(
    @ApplicationContext private val context: Context
) {
    companion object {
        const val CDO_DEFAULT_LAT = 8.4822
        const val CDO_DEFAULT_LNG = 124.6472
        const val CDO_DEFAULT_LABEL = "Carmen Market"

        // Known landmark reference points in Cagayan de Oro matching database places
        val CDO_LANDMARKS = listOf(
            "Carmen Market" to Pair(8.4804, 124.6369),
            "Divisoria" to Pair(8.4772, 124.6465),
            "Limketkai Center" to Pair(8.4842, 124.6568),
            "Centrio Mall" to Pair(8.4871, 124.6508),
            "Agora Terminal" to Pair(8.4907, 124.6610),
            "Bulua Terminal" to Pair(8.5132, 124.6190),
            "Cogon Market" to Pair(8.4754, 124.6502),
            "Gusa" to Pair(8.4925, 124.6780),
            "Liceo de Cagayan University" to Pair(8.4961, 124.6483),
            "Xavier University" to Pair(8.4832, 124.6503),
            "Provincial Capitol" to Pair(8.4777, 124.6452),
            "SM CDO Uptown" to Pair(8.5198, 124.6612),
            "NMMC" to Pair(8.4875, 124.6588),
            "Camp Evangelista" to Pair(8.5020, 124.6320)
        )
    }

    private val fusedClient: FusedLocationProviderClient by lazy {
        LocationServices.getFusedLocationProviderClient(context)
    }

    fun hasLocationPermission(): Boolean {
        val fine = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        val coarse = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        return fine || coarse
    }

    fun isWithinCdo(lat: Double, lng: Double): Boolean {
        // CDO bounds approximately 8.35 - 8.56 N, 124.50 - 124.78 E
        return lat in 8.35..8.56 && lng in 124.50..124.78
    }

    /**
     * Returns the device's real GPS coordinate, or null if permission is missing
     * or a fix is unavailable. Does not remapped to CDO defaults.
     */
    @SuppressLint("MissingPermission")
    suspend fun getDeviceLocationOrNull(): Pair<Double, Double>? = withContext(Dispatchers.IO) {
        if (!hasLocationPermission()) return@withContext null
        try {
            val location = readDeviceLocation() ?: return@withContext null
            if (location.latitude == 0.0 && location.longitude == 0.0) return@withContext null
            Pair(location.latitude, location.longitude)
        } catch (_: Exception) {
            null
        }
    }

    /**
     * Emits continuous device location updates when location permission is granted.
     */
    @SuppressLint("MissingPermission")
    fun getLocationUpdates(intervalMs: Long = 4000L): Flow<android.location.Location> = callbackFlow {
        if (!hasLocationPermission()) {
            close()
            return@callbackFlow
        }
        val request = LocationRequest.Builder(
            Priority.PRIORITY_HIGH_ACCURACY,
            intervalMs
        ).setMinUpdateDistanceMeters(5f).build()

        val callback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let { trySend(it) }
            }
        }

        try {
            fusedClient.requestLocationUpdates(request, callback, Looper.getMainLooper())
        } catch (e: Exception) {
            close(e)
        }

        awaitClose {
            try {
                fusedClient.removeLocationUpdates(callback)
            } catch (_: Exception) {}
        }
    }


    @SuppressLint("MissingPermission")
    private suspend fun readDeviceLocation(): android.location.Location? {
        val cts = CancellationTokenSource()
        val fresh = try {
            kotlinx.coroutines.withTimeoutOrNull(8000L) {
                fusedClient.getCurrentLocation(
                    Priority.PRIORITY_HIGH_ACCURACY,
                    cts.token
                ).await()
            }
        } catch (_: Exception) {
            null
        }

        if (isValidLocation(fresh)) return fresh

        // Fallbacks: FLP last location and system LocationManager
        val candidates = mutableListOf<android.location.Location>()
        try { fusedClient.lastLocation.await()?.let { candidates.add(it) } } catch (_: Exception) {}
        try {
            val lm = context.getSystemService(Context.LOCATION_SERVICE) as? android.location.LocationManager
            lm?.getLastKnownLocation(android.location.LocationManager.GPS_PROVIDER)?.let { candidates.add(it) }
            lm?.getLastKnownLocation(android.location.LocationManager.NETWORK_PROVIDER)?.let { candidates.add(it) }
            lm?.getLastKnownLocation(android.location.LocationManager.PASSIVE_PROVIDER)?.let { candidates.add(it) }
        } catch (_: Exception) {}

        return candidates.filter { isValidLocation(it) }.maxByOrNull { it.time }
    }

    private fun isValidLocation(loc: android.location.Location?): Boolean {
        if (loc == null) return false
        val lat = loc.latitude
        val lng = loc.longitude
        if (lat == 0.0 && lng == 0.0) return false
        if (lat !in -90.0..90.0 || lng !in -180.0..180.0) return false
        if (lat.isNaN() || lng.isNaN()) return false
        return true
    }

    @SuppressLint("MissingPermission")
    suspend fun getCurrentLocation(): UserLocationInfo = withContext(Dispatchers.IO) {
        if (!hasLocationPermission()) {
            return@withContext UserLocationInfo(
                latitude = CDO_DEFAULT_LAT,
                longitude = CDO_DEFAULT_LNG,
                displayName = CDO_DEFAULT_LABEL,
                isCagayanDeOro = true,
                isRealGps = false,
                hasPermission = false,
                isFixAvailable = false
            )
        }

        try {
            val location = try {
                readDeviceLocation()
            } catch (e: Exception) {
                null
            }

            if (location != null && isValidLocation(location)) {
                val lat = location.latitude
                val lng = location.longitude
                val inCdo = isWithinCdo(lat, lng)

                val name = reverseGeocode(lat, lng)

                UserLocationInfo(
                    latitude = lat,
                    longitude = lng,
                    displayName = name,
                    isCagayanDeOro = inCdo,
                    isRealGps = true,
                    hasPermission = true,
                    isFixAvailable = true
                )
            } else {
                UserLocationInfo(
                    latitude = CDO_DEFAULT_LAT,
                    longitude = CDO_DEFAULT_LNG,
                    displayName = CDO_DEFAULT_LABEL,
                    isCagayanDeOro = true,
                    isRealGps = false,
                    hasPermission = true,
                    isFixAvailable = false
                )
            }
        } catch (e: Exception) {
            UserLocationInfo(
                latitude = CDO_DEFAULT_LAT,
                longitude = CDO_DEFAULT_LNG,
                displayName = CDO_DEFAULT_LABEL,
                isCagayanDeOro = true,
                isRealGps = false,
                hasPermission = true,
                isFixAvailable = false
            )
        }
    }

    private fun reverseGeocode(lat: Double, lng: Double): String {
        return try {
            val geocoder = Geocoder(context, Locale.getDefault())
            @Suppress("DEPRECATION")
            val addresses = geocoder.getFromLocation(lat, lng, 1)
            if (!addresses.isNullOrEmpty()) {
                val addr = addresses[0]
                val street = addr.thoroughfare ?: addr.subLocality
                val city = addr.locality ?: addr.subAdminArea ?: addr.adminArea
                when {
                    street != null && city != null -> "$street, $city"
                    street != null -> street
                    city != null -> city
                    else -> if (isWithinCdo(lat, lng)) findClosestCdoLandmark(lat, lng) else "Current GPS Location"
                }
            } else {
                if (isWithinCdo(lat, lng)) findClosestCdoLandmark(lat, lng) else "Current GPS Location"
            }
        } catch (e: Exception) {
            if (isWithinCdo(lat, lng)) findClosestCdoLandmark(lat, lng) else "Current GPS Location"
        }
    }

    fun findClosestCdoLandmark(lat: Double, lng: Double): String {
        var closestName = CDO_DEFAULT_LABEL
        var minDistance = Double.MAX_VALUE

        for ((name, coords) in CDO_LANDMARKS) {
            val dist = distanceKm(lat, lng, coords.first, coords.second)
            if (dist < minDistance) {
                minDistance = dist
                closestName = name
            }
        }
        return closestName
    }

    private fun distanceKm(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val r = 6371.0 // Radius of earth in km
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        val a = sin(dLat / 2) * sin(dLat / 2) +
                cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) *
                sin(dLon / 2) * sin(dLon / 2)
        val c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return r * c
    }
}
