package com.ororuta.app

import com.google.android.gms.maps.model.LatLng
import com.ororuta.app.domain.fare.PassengerCategory
import com.ororuta.app.domain.fare.TraditionalJeepneyFareService
import org.junit.Assert.*
import org.junit.Test

class TraditionalJeepneyFareTest {

    @Test
    fun testBaseFareBelow4Km() {
        val result = TraditionalJeepneyFareService.calculateFareForDistance(2.5, PassengerCategory.REGULAR)
        assertTrue(result.isAvailable)
        assertEquals(13.00, result.regularFare, 0.001)
        assertEquals(10.40, result.discountedFare, 0.001)
        assertEquals(13.00, result.selectedCategoryFare, 0.001)
    }

    @Test
    fun testBaseFareExactly4Km() {
        val regularRes = TraditionalJeepneyFareService.calculateFareForDistance(4.0, PassengerCategory.REGULAR)
        assertEquals(13.00, regularRes.regularFare, 0.001)
        assertEquals(10.40, regularRes.discountedFare, 0.001)

        val studentRes = TraditionalJeepneyFareService.calculateFareForDistance(4.0, PassengerCategory.STUDENT)
        assertEquals(10.40, studentRes.selectedCategoryFare, 0.001)

        val seniorRes = TraditionalJeepneyFareService.calculateFareForDistance(4.0, PassengerCategory.SENIOR)
        assertEquals(10.40, seniorRes.selectedCategoryFare, 0.001)

        val pwdRes = TraditionalJeepneyFareService.calculateFareForDistance(4.0, PassengerCategory.PWD)
        assertEquals(10.40, pwdRes.selectedCategoryFare, 0.001)
    }

    @Test
    fun testFareAbove4Km_5Km() {
        // 5 km = 4 km base + 1 km succeeding
        // Regular: 13.00 + 1.80 = 14.80 -> nearest 0.25 is 14.75
        // Discounted: 10.40 + 1.44 = 11.84 -> nearest 0.25 is 11.75
        val res = TraditionalJeepneyFareService.calculateFareForDistance(5.0, PassengerCategory.REGULAR)
        assertEquals(14.75, res.regularFare, 0.001)
        assertEquals(11.75, res.discountedFare, 0.001)
    }

    @Test
    fun testFareAbove4Km_6Km() {
        // 6 km = 4 km base + 2 km succeeding
        // Regular: 13.00 + 3.60 = 16.60 -> nearest 0.25 is 16.50
        // Discounted: 10.40 + 2.88 = 13.28 -> nearest 0.25 is 13.25
        val res = TraditionalJeepneyFareService.calculateFareForDistance(6.0, PassengerCategory.REGULAR)
        assertEquals(16.50, res.regularFare, 0.001)
        assertEquals(13.25, res.discountedFare, 0.001)
    }

    @Test
    fun testFareAbove4Km_7Km() {
        // 7 km = 4 km base + 3 km succeeding
        // Regular: 13.00 + 5.40 = 18.40 -> nearest 0.25 is 18.50
        // Discounted: 10.40 + 4.32 = 14.72 -> nearest 0.25 is 14.75
        val res = TraditionalJeepneyFareService.calculateFareForDistance(7.0, PassengerCategory.REGULAR)
        assertEquals(18.50, res.regularFare, 0.001)
        assertEquals(14.75, res.discountedFare, 0.001)
    }

    @Test
    fun testFareAbove4Km_8Km() {
        // 8 km = 4 km base + 4 km succeeding
        // Regular: 13.00 + 7.20 = 20.20 -> nearest 0.25 is 20.25
        // Discounted: 10.40 + 5.76 = 16.16 -> nearest 0.25 is 16.25
        val res = TraditionalJeepneyFareService.calculateFareForDistance(8.0, PassengerCategory.REGULAR)
        assertEquals(20.25, res.regularFare, 0.001)
        assertEquals(16.25, res.discountedFare, 0.001)
    }

    @Test
    fun testRoundingToQuarter() {
        assertEquals(14.75, TraditionalJeepneyFareService.roundToNearestQuarter(14.80), 0.001)
        assertEquals(16.50, TraditionalJeepneyFareService.roundToNearestQuarter(16.60), 0.001)
        assertEquals(18.50, TraditionalJeepneyFareService.roundToNearestQuarter(18.40), 0.001)
        assertEquals(20.25, TraditionalJeepneyFareService.roundToNearestQuarter(20.20), 0.001)
        assertEquals(13.00, TraditionalJeepneyFareService.roundToNearestQuarter(13.00), 0.001)
        assertEquals(13.25, TraditionalJeepneyFareService.roundToNearestQuarter(13.24), 0.001)
    }

    @Test
    fun testNonTraditionalJeepneyModeExcluded() {
        val modernRes = TraditionalJeepneyFareService.calculateFareForDistance(5.0, PassengerCategory.REGULAR, "Modern")
        assertFalse(modernRes.isAvailable)
        assertEquals("Fare unavailable (Traditional jeepneys only)", modernRes.unavailableReason)

        val busRes = TraditionalJeepneyFareService.calculateFareForDistance(5.0, PassengerCategory.REGULAR, "Bus")
        assertFalse(busRes.isAvailable)
    }

    @Test
    fun testInvalidOrZeroDistance() {
        val res = TraditionalJeepneyFareService.calculateFareForDistance(0.0, PassengerCategory.REGULAR)
        assertFalse(res.isAvailable)
        assertEquals("Fare unavailable (Unverified distance)", res.unavailableReason)
    }

    @Test
    fun testOnboardDistanceCalculation() {
        // Simple 3-point polyline along CM Recto: approx ~1 km
        val p1 = LatLng(8.4822, 124.6472)
        val p2 = LatLng(8.4840, 124.6520)
        val p3 = LatLng(8.4860, 124.6580)
        val points = listOf(p1, p2, p3)

        val dist = TraditionalJeepneyFareService.calculateOnboardDistanceKm(
            points,
            boardingLat = 8.4822,
            boardingLng = 124.6472,
            dropoffLat = 8.4860,
            dropoffLng = 124.6580
        )
        assertNotNull(dist)
        assertTrue(dist!! > 0.5)
    }
}
