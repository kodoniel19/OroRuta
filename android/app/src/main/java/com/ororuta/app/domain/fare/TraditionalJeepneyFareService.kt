package com.ororuta.app.domain.fare

import com.google.android.gms.maps.model.LatLng
import kotlin.math.*

/**
 * Passenger categories with respective LTFRB concessionary discounts.
 */
enum class PassengerCategory(
    val code: String,
    val displayName: String,
    val isDiscounted: Boolean,
    val description: String
) {
    REGULAR("Regular", "Regular", false, "Standard LTFRB fare"),
    STUDENT("Student", "Student", true, "20% discount · Valid ID"),
    SENIOR("Senior", "Senior citizen", true, "20% discount · Valid ID"),
    PWD("PWD", "PWD", true, "20% discount · Valid ID");

    companion object {
        fun fromString(value: String): PassengerCategory {
            return when (value.trim().lowercase()) {
                "student" -> STUDENT
                "senior", "senior citizen", "elderly" -> SENIOR
                "pwd", "disabled", "person with disability" -> PWD
                else -> REGULAR
            }
        }
    }
}

/**
 * Configurable fare matrix parameters based on LTFRB PUJ General Fare Guide (Oct 8, 2023).
 * Keeps rates configurable so official CDO local fare orders can be updated transparently.
 */
data class TraditionalFareConfig(
    val baseDistanceKm: Double = 4.0,
    val regularBaseFare: Double = 13.00,
    val regularPerKmRate: Double = 1.80,
    val discountRate: Double = 0.20,
    val discountedBaseFare: Double = 10.40, // 13.00 * (1 - 0.20)
    val discountedPerKmRate: Double = 1.44, // 1.80 * (1 - 0.20)
    val disclaimer: String = "Provisional estimate based on LTFRB PUJ General Fare Guide (Oct 8, 2023). Subject to local CDO fare orders."
)

/**
 * Fare calculation outcome.
 */
data class TraditionalFareResult(
    val distanceKm: Double,
    val regularFare: Double,
    val discountedFare: Double,
    val selectedCategoryFare: Double,
    val category: PassengerCategory,
    val isAvailable: Boolean = true,
    val unavailableReason: String? = null,
    val disclaimer: String = TraditionalJeepneyFareService.config.disclaimer
)

/**
 * Single source of truth for Traditional Jeepney fare calculations in OroRuta.
 * Exclusively handles Traditional Jeepneys (PUJ).
 */
object TraditionalJeepneyFareService {

    var config: TraditionalFareConfig = TraditionalFareConfig()

    /**
     * Rounds an amount to the nearest 25 centavos (₱0.25).
     * Examples: 14.80 -> 14.75, 16.60 -> 16.50, 18.40 -> 18.50, 20.20 -> 20.25.
     */
    fun roundToNearestQuarter(amount: Double): Double {
        return Math.round(amount * 4.0) / 4.0
    }

    /**
     * Checks if a route/mode is eligible for Traditional Jeepney fare rates.
     * Buses, modern jeepneys, taxis, and non-traditional modes are excluded.
     */
    fun isTraditionalJeepney(jeepneyType: String?): Boolean {
        if (jeepneyType.isNullOrBlank()) return true // default CDO jeepneys in database
        val t = jeepneyType.trim().lowercase()
        return t == "traditional" || t == "puj" || t == "traditional jeepney"
    }

    /**
     * Calculates the estimated fare for a given distance in kilometers.
     *
     * Rules:
     * - First 4 km: ₱13.00 regular, ₱10.40 discounted
     * - Above 4 km: add ₱1.80/km regular, ₱1.44/km discounted for distance beyond first 4 km
     * - Discount applied once, rounded to nearest ₱0.25
     */
    fun calculateFareForDistance(
        distanceKm: Double,
        category: PassengerCategory = PassengerCategory.REGULAR,
        jeepneyType: String? = "Traditional"
    ): TraditionalFareResult {
        if (!isTraditionalJeepney(jeepneyType)) {
            return TraditionalFareResult(
                distanceKm = distanceKm,
                regularFare = 0.0,
                discountedFare = 0.0,
                selectedCategoryFare = 0.0,
                category = category,
                isAvailable = false,
                unavailableReason = "Fare unavailable (Traditional jeepneys only)"
            )
        }

        if (distanceKm <= 0.0 || distanceKm.isNaN() || distanceKm.isInfinite()) {
            return TraditionalFareResult(
                distanceKm = 0.0,
                regularFare = 0.0,
                discountedFare = 0.0,
                selectedCategoryFare = 0.0,
                category = category,
                isAvailable = false,
                unavailableReason = "Fare unavailable (Unverified distance)"
            )
        }

        val regularFare: Double
        val discountedFare: Double

        if (distanceKm <= config.baseDistanceKm) {
            regularFare = config.regularBaseFare
            discountedFare = config.discountedBaseFare
        } else {
            val succeedingKm = distanceKm - config.baseDistanceKm
            val rawRegular = config.regularBaseFare + (succeedingKm * config.regularPerKmRate)
            regularFare = roundToNearestQuarter(rawRegular)

            val rawDiscounted = config.discountedBaseFare + (succeedingKm * config.discountedPerKmRate)
            discountedFare = roundToNearestQuarter(rawDiscounted)
        }

        val selectedFare = if (category.isDiscounted) discountedFare else regularFare

        return TraditionalFareResult(
            distanceKm = distanceKm,
            regularFare = regularFare,
            discountedFare = discountedFare,
            selectedCategoryFare = selectedFare,
            category = category,
            isAvailable = true,
            disclaimer = config.disclaimer
        )
    }

    /**
     * Calculates actual distance aboard the jeepney along verified route geometry coordinates
     * from boarding stop to drop-off stop.
     *
     * Returns null if stops cannot be verified against the corridor geometry.
     */
    fun calculateOnboardDistanceKm(
        routePoints: List<LatLng>,
        boardingLat: Double,
        boardingLng: Double,
        dropoffLat: Double,
        dropoffLng: Double
    ): Double? {
        if (routePoints.size < 2) return null
        if (boardingLat == 0.0 || boardingLng == 0.0 || dropoffLat == 0.0 || dropoffLng == 0.0) return null

        var bIdx = -1
        var minBDist = Double.MAX_VALUE
        for (i in routePoints.indices) {
            val d = haversineMeters(boardingLat, boardingLng, routePoints[i].latitude, routePoints[i].longitude)
            if (d < minBDist) {
                minBDist = d
                bIdx = i
            }
        }

        var dIdx = -1
        var minDDist = Double.MAX_VALUE
        for (i in routePoints.indices) {
            val d = haversineMeters(dropoffLat, dropoffLng, routePoints[i].latitude, routePoints[i].longitude)
            if (d < minDDist) {
                minDDist = d
                dIdx = i
            }
        }

        // Must be reasonably near the route corridor (< 1500m)
        if (minBDist > 1500 || minDDist > 1500 || bIdx == -1 || dIdx == -1) {
            return null
        }

        val polylineSegment = if (bIdx <= dIdx) {
            routePoints.subList(bIdx, dIdx + 1)
        } else {
            // Loop route wrapping around terminal
            routePoints.subList(bIdx, routePoints.size) + routePoints.subList(0, dIdx + 1)
        }

        if (polylineSegment.size < 2) return null

        var totalMeters = 0.0
        for (i in 0 until polylineSegment.size - 1) {
            totalMeters += haversineMeters(
                polylineSegment[i].latitude, polylineSegment[i].longitude,
                polylineSegment[i + 1].latitude, polylineSegment[i + 1].longitude
            )
        }

        val km = Math.round((totalMeters / 1000.0) * 10.0) / 10.0
        return if (km >= 0.2) km else null
    }

    private fun haversineMeters(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val r = 6371000.0
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        val a = sin(dLat / 2) * sin(dLat / 2) +
                cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) *
                sin(dLon / 2) * sin(dLon / 2)
        val c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return r * c
    }
}
