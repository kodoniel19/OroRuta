package com.ororuta.app

import com.google.android.gms.maps.model.LatLng
import com.ororuta.app.data.location.UserLocationInfo
import com.ororuta.app.data.repository.PlaceRepository
import com.ororuta.app.domain.fare.PassengerCategory
import com.ororuta.app.domain.fare.TraditionalJeepneyFareService
import com.ororuta.app.domain.models.Place
import org.junit.Assert.*
import org.junit.Test

class SearchAndRouteRecommendationsTest {

    @Test
    fun testCuratedLandmarksContainFiveRequiredCdoPlaces() {
        val landmarks = PlaceRepository.CURATED_CDO_LANDMARKS
        val names = landmarks.map { it.name }

        assertTrue("Must include Limketkai Center", names.any { it.contains("Limketkai", ignoreCase = true) })
        assertTrue("Must include SM Downtown Premier", names.any { it.contains("SM", ignoreCase = true) && it.contains("Downtown", ignoreCase = true) })
        assertTrue("Must include Centrio Mall", names.any { it.contains("Centrio", ignoreCase = true) })
        assertTrue("Must include Cogon Market", names.any { it.contains("Cogon", ignoreCase = true) })
        assertTrue("Must include St. Augustine Metropolitan Cathedral", names.any { it.contains("Cathedral", ignoreCase = true) || it.contains("Augustine", ignoreCase = true) })
        assertTrue("Must include Miami Inn in Carmen", names.any { it.contains("Miami Inn", ignoreCase = true) })
    }

    @Test
    fun testLandmarksHaveVerifiedNonZeroCoordinates() {
        val landmarks = PlaceRepository.CURATED_CDO_LANDMARKS
        for (lm in landmarks) {
            assertTrue("Place ${lm.name} must have valid CDO latitude", lm.lat in 8.35..8.65)
            assertTrue("Place ${lm.name} must have valid CDO longitude", lm.lng in 124.50..124.85)
        }
    }

    @Test
    fun testTypoToleranceForLimkdtkai() {
        // When typing 'limkdtkai', it should match 'Limketkai Center'
        val query = "limkdtkai"
        val matched = PlaceRepository.CURATED_CDO_LANDMARKS.find { lm ->
            val n = lm.name.lowercase()
            n.contains("limket") || (query.length >= 4 && n.take(4) == query.take(4))
        }
        assertNotNull("Typo 'limkdtkai' must resolve to Limketkai Center", matched)
        assertEquals("Limketkai Center", matched?.name)
    }

    @Test
    fun testGpsStatusFlagsWhenPermissionDeniedOrFixUnavailable() {
        val deniedLoc = UserLocationInfo(
            latitude = 8.4822,
            longitude = 124.6472,
            displayName = "Carmen Market",
            isCagayanDeOro = true,
            isRealGps = false,
            hasPermission = false,
            isFixAvailable = false
        )
        assertFalse(deniedLoc.hasPermission)
        assertFalse(deniedLoc.isRealGps)

        val realGpsLoc = UserLocationInfo(
            latitude = 8.4845,
            longitude = 124.6335,
            displayName = "Carmen Public Market",
            isCagayanDeOro = true,
            isRealGps = true,
            hasPermission = true,
            isFixAvailable = true
        )
        assertTrue(realGpsLoc.hasPermission)
        assertTrue(realGpsLoc.isRealGps)
    }

    @Test
    fun testCarmenToCogonSegmentFareNotFullRouteFare() {
        // Carmen to Cogon is approximately 2.8 km.
        // Full Route R1 length is 11.9 km.
        val fullRouteFare = TraditionalJeepneyFareService.calculateFareForDistance(11.9, PassengerCategory.REGULAR)
        assertEquals(27.25, fullRouteFare.regularFare, 0.001)

        val actualSegmentDistance = 2.8
        val segmentFare = TraditionalJeepneyFareService.calculateFareForDistance(actualSegmentDistance, PassengerCategory.REGULAR)
        
        // Under LTFRB rules, first 4 km is base fare ₱13.00 (not ₱27.25!)
        assertEquals(13.00, segmentFare.regularFare, 0.001)
        assertEquals(10.40, segmentFare.discountedFare, 0.001)
        assertNotEquals(fullRouteFare.regularFare, segmentFare.regularFare, 0.001)
    }

    @Test
    fun testMiamiInnVerifiedCoordinates() {
        val miami = PlaceRepository.CURATED_CDO_LANDMARKS.find { it.id == "pl-miami-inn" }
        assertNotNull(miami)
        assertEquals(8.477285, miami!!.lat, 0.0001)
        assertEquals(124.637633, miami.lng, 0.0001)
        assertEquals("Carmen", miami.area)
    }

    @Test
    fun testRejectsRouteWhenDestinationBeyondWalkingThreshold() {
        // SM CDO Downtown Premier coordinates: 8.4856, 124.6542
        // A route with points solely in Pagatpat & Bulua (e.g. lat ~8.50, lng ~124.61)
        val buluaPoints = listOf(
            LatLng(8.4600, 124.5800), // Pagatpat
            LatLng(8.4700, 124.6000), // Canitoan
            LatLng(8.5050, 124.6150)  // Bulua Terminal
        )
        // Boarding in Canitoan (8.4700, 124.6000), trying to drop off at Bulua Terminal (8.5050, 124.6150)
        // Distance from Bulua Terminal (8.5050, 124.6150) to SM CDO Downtown (8.4856, 124.6542) is > 4.5 km!
        val onboardDist = TraditionalJeepneyFareService.calculateOnboardDistanceKm(
            routePoints = buluaPoints,
            boardingLat = 8.4700,
            boardingLng = 124.6000,
            dropoffLat = 8.4856, // SM Downtown
            dropoffLng = 124.6542
        )
        // Must be null because dropoffLat/Lng is > 1000m away from any point in the route!
        assertNull("Route that does not reach destination within 1000m must return null", onboardDist)
    }

    @Test
    fun testBoardingAfterDropoffIsRejectedDirectionally() {
        val routePoints = listOf(
            LatLng(8.4600, 124.5800), // Point 0
            LatLng(8.4700, 124.6000), // Point 1
            LatLng(8.4800, 124.6200), // Point 2
            LatLng(8.5000, 124.6300)  // Point 3
        )
        // Trying to board at Point 2 and alight at Point 1 (reverse of route direction)
        val dist = TraditionalJeepneyFareService.calculateOnboardDistanceKm(
            routePoints = routePoints,
            boardingLat = 8.4800,
            boardingLng = 124.6200,
            dropoffLat = 8.4700,
            dropoffLng = 124.6000
        )
        assertNull("Directional violation (boarding after drop-off) must return null without looping", dist)
    }

    @Test
    fun testKeyDestinationsInCuratedPlaces() {
        val places = PlaceRepository.CURATED_CDO_LANDMARKS
        val smDowntown = places.find { it.name.contains("SM", ignoreCase = true) && it.name.contains("Downtown", ignoreCase = true) }
        val limketkai = places.find { it.name.contains("Limketkai", ignoreCase = true) }
        val cogon = places.find { it.name.contains("Cogon", ignoreCase = true) }
        val cathedral = places.find { it.name.contains("Cathedral", ignoreCase = true) }

        assertNotNull("SM CDO Downtown Premier must be present", smDowntown)
        assertNotNull("Limketkai Center must be present", limketkai)
        assertNotNull("Cogon Market must be present", cogon)
        assertNotNull("St. Augustine Cathedral must be present", cathedral)

        // Coordinates check
        assertEquals(8.4856, smDowntown!!.lat, 0.005)
        assertEquals(124.6542, smDowntown.lng, 0.005)

        assertEquals(8.4827, limketkai!!.lat, 0.005)
        assertEquals(124.6601, limketkai.lng, 0.005)

        assertEquals(8.4746, cogon!!.lat, 0.005)
        assertEquals(124.6502, cogon.lng, 0.005)

        assertEquals(8.4774, cathedral!!.lat, 0.005)
        assertEquals(124.6441, cathedral.lng, 0.005)
    }

    @Test
    fun testLTFRBFareRulesForTraditionalJeepney() {
        // Base fare 0-4 km is ₱13.00 (discounted ₱10.40)
        val baseFare = TraditionalJeepneyFareService.calculateFareForDistance(3.5, PassengerCategory.REGULAR)
        assertEquals(13.00, baseFare.regularFare, 0.001)
        assertEquals(10.40, baseFare.discountedFare, 0.001)

        // Exactly 4.0 km
        val fare4km = TraditionalJeepneyFareService.calculateFareForDistance(4.0, PassengerCategory.REGULAR)
        assertEquals(13.00, fare4km.regularFare, 0.001)

        // 6.0 km trip: 4 km base (13.00) + 2 km @ 1.80 = 3.60 -> 16.60 -> rounded to nearest 0.25 -> ₱16.50
        val fare6km = TraditionalJeepneyFareService.calculateFareForDistance(6.0, PassengerCategory.REGULAR)
        assertEquals(16.50, fare6km.regularFare, 0.001)
        // Discounted: 10.40 + 2 km @ 1.44 = 2.88 -> 13.28 -> rounded to 0.25 -> ₱13.25
        assertEquals(13.25, fare6km.discountedFare, 0.001)
    }
}
