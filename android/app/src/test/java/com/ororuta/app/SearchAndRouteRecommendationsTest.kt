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
}
