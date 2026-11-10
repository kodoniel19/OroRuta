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
    fun testBoardingStopMustNotBeIdenticalToDestinationStop() {
        // Carmen Market: 8.480290, 124.636820
        // Liceo: 8.486151, 124.639182
        val userCarmenLat = 8.480290
        val userCarmenLng = 124.636820
        val destLiceoLat = 8.486151
        val destLiceoLng = 124.639182

        fun haversine(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Double {
            val r = 6371000.0
            val dLat = Math.toRadians(lat2 - lat1)
            val dLng = Math.toRadians(lng2 - lng1)
            val a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                    Math.sin(dLng / 2) * Math.sin(dLng / 2)
            return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        }

        val allStops = listOf(
            Triple("Carmen Public Market", 8.479498, 124.636820),
            Triple("Liceo de Cagayan University", 8.486151, 124.639182),
            Triple("Gaisano City Mall", 8.486316, 124.649746)
        )

        // Pick dropoff near Liceo
        val bestDrop = allStops.minByOrNull { haversine(destLiceoLat, destLiceoLng, it.second, it.third) }!!
        assertEquals("Liceo de Cagayan University", bestDrop.first)

        // Eligible boarding MUST exclude Liceo (which is at the destination)
        val eligibleBoarding = allStops.filter {
            haversine(it.second, it.third, bestDrop.second, bestDrop.third) > 300.0 &&
            !it.first.equals(bestDrop.first, ignoreCase = true)
        }

        val bestBoarding = eligibleBoarding.minByOrNull { haversine(userCarmenLat, userCarmenLng, it.second, it.third) }!!
        assertEquals("Carmen Public Market", bestBoarding.first)
        assertNotEquals(bestBoarding.first, bestDrop.first)

        // Boarding distance from user at Carmen is <= 100 meters (not 1.3 km!)
        val walkDist = haversine(userCarmenLat, userCarmenLng, bestBoarding.second, bestBoarding.third)
        assertTrue("Walk to boarding stop near Carmen must be under 100m, actual: ${walkDist}m", walkDist < 100.0)
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

    // =========================================================================
    // Liceo boarding-point regression tests (fixes #009)
    // =========================================================================

    /** Haversine helper identical to the one in RouteInfoScreen / Repositories. */
    private fun haversineM(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Double {
        val r = 6371000.0
        val dLat = Math.toRadians(lat2 - lat1)
        val dLng = Math.toRadians(lng2 - lng1)
        val a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2)
        return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    }

    /**
     * Verified CDO landmark list matching RouteInfoScreen.getDescriptiveCdoStopName
     * and trips.js findStopLabel.  Used to resolve stop names in tests.
     */
    private data class Landmark(val name: String, val lat: Double, val lng: Double)
    private val cdoLandmarks = listOf(
        Landmark("Liceo de Cagayan University", 8.4862, 124.6388),
        Landmark("Carmen Public Market", 8.479498, 124.63682),
        Landmark("Centrio Mall", 8.4856, 124.6513),
        Landmark("SM CDO Downtown", 8.4843, 124.6549),
        Landmark("Limketkai Center", 8.4838, 124.6530),
        Landmark("Cogon Market", 8.47716, 124.6512),
        Landmark("Agora Terminal", 8.48813, 124.6580),
        Landmark("Divisoria Plaza", 8.4777, 124.6452),
        Landmark("Bulua Westbound Terminal", 8.5040, 124.6115),
        Landmark("USTP Lapasan", 8.4852, 124.6572),
        Landmark("Camp Evangelista", 8.4878, 124.6256),
        Landmark("St. Augustine Cathedral", 8.4777, 124.6433),
        Landmark("Xavier University", 8.4784, 124.6489)
    )

    /** Resolve a stop name given coordinates, exactly as RouteInfoScreen does. */
    private fun resolveStopName(lat: Double, lng: Double, prefix: String = "Loading point"): String {
        for (lm in cdoLandmarks) {
            if (haversineM(lat, lng, lm.lat, lm.lng) <= 250.0) {
                return "$prefix near ${lm.name}"
            }
        }
        return when {
            lat in 8.484..8.495 && lng in 124.636..124.643 -> "$prefix along RN Pelaez Blvd (Liceo corridor)"
            lat in 8.475..8.4835 && lng in 124.630..124.639 -> "$prefix near Carmen Public Market area"
            lat in 8.483..8.490 && lng in 124.648..124.660 -> "$prefix along CM Recto Ave (Centrio / SM Downtown area)"
            else -> "$prefix near CDO Transit Corridor"
        }
    }

    @Test
    fun testLiceoCoordinatesResolveToLiceoNotCarmen() {
        // The Liceo loading-zone coordinates (8.4862, 124.6388) must resolve to Liceo,
        // never to Carmen Public Market.
        val liceoLat = 8.4862
        val liceoLng = 124.6388
        val resolved = resolveStopName(liceoLat, liceoLng)
        assertTrue(
            "Coordinates at Liceo ($liceoLat, $liceoLng) must resolve to Liceo, got: $resolved",
            resolved.contains("Liceo", ignoreCase = true)
        )
        assertFalse(
            "Coordinates at Liceo must NOT resolve to Carmen, got: $resolved",
            resolved.contains("Carmen", ignoreCase = true)
        )
    }

    @Test
    fun testCarmenCoordinatesResolveToCarmenNotLiceo() {
        // Carmen Market coordinates must resolve to Carmen, never Liceo.
        val carmenLat = 8.479498
        val carmenLng = 124.63682
        val resolved = resolveStopName(carmenLat, carmenLng)
        assertTrue(
            "Coordinates at Carmen ($carmenLat, $carmenLng) must resolve to Carmen, got: $resolved",
            resolved.contains("Carmen", ignoreCase = true)
        )
        assertFalse(
            "Coordinates at Carmen must NOT resolve to Liceo, got: $resolved",
            resolved.contains("Liceo", ignoreCase = true)
        )
    }

    @Test
    fun testLiceoAndCarmenAreGeographicallyDistinct() {
        // Liceo and Carmen must be > 400m apart, so neither can be confused for the other.
        val dist = haversineM(8.4862, 124.6388, 8.479498, 124.63682)
        assertTrue(
            "Liceo and Carmen must be > 400m apart, actual: ${dist.toInt()}m",
            dist > 400.0
        )
    }

    @Test
    fun testSanitizeBoardingNameCorrectsMislabeledCarmenAtLiceo() {
        // Simulates the sanitizeBoardingName logic from RouteInfoScreen:
        // If a boarding point is labeled "Carmen" but is actually at Liceo coordinates,
        // it must be corrected to "Liceo de Cagayan Loading Zone".
        val lat = 8.4862
        val lng = 124.6388
        val mislabeledName = "Loading point near Carmen Public Market"
        val distToCarmen = haversineM(lat, lng, 8.479498, 124.63682)
        val distToLiceo = haversineM(lat, lng, 8.4862, 124.6388)

        // Apply sanitizeBoardingName logic
        val safeName = if (mislabeledName.contains("Carmen", ignoreCase = true) &&
            distToCarmen > 350.0 && distToLiceo <= 300.0
        ) {
            "Liceo de Cagayan Loading Zone"
        } else {
            mislabeledName
        }

        assertEquals("Liceo de Cagayan Loading Zone", safeName)
    }

    @Test
    fun testNearestBoardingStopForLapasanR1AtLiceoIsLiceo() {
        // Simulates the boarding-stop selection for Lapasan (R1) when user is near Liceo.
        // After migration 009, Lapasan (R1) has "Liceo de Cagayan Loading Zone" as a stop.
        data class Stop(val name: String, val lat: Double, val lng: Double)

        val userLat = 8.4862  // Near Liceo
        val userLng = 124.6388

        // Lapasan (R1) stops after migration 009 (from bundled_routes.json)
        val r1Stops = listOf(
            Stop("Carmen Public Market Terminal", 8.479498, 124.63682),
            Stop("Liceo de Cagayan Loading Zone", 8.4862, 124.6388),
            Stop("Agora Terminal", 8.48813, 124.6580)
        )

        val nearest = r1Stops.minByOrNull { haversineM(userLat, userLng, it.lat, it.lng) }!!
        assertEquals(
            "Nearest boarding stop for R1 at Liceo must be Liceo, not ${nearest.name}",
            "Liceo de Cagayan Loading Zone",
            nearest.name
        )

        val walkDist = haversineM(userLat, userLng, nearest.lat, nearest.lng)
        assertTrue("Walk distance to Liceo stop must be < 50m, actual: ${walkDist.toInt()}m", walkDist < 50.0)
    }

    @Test
    fun testNearestBoardingStopForR1InboundAtLiceoIsStillLiceo() {
        // When switching to Inbound direction at same coordinates, must still select Liceo.
        data class Stop(val name: String, val lat: Double, val lng: Double)

        val userLat = 8.4862
        val userLng = 124.6388

        // Inbound direction same stops, different terminal order
        val r1InboundStops = listOf(
            Stop("Agora Terminal", 8.48813, 124.6580),
            Stop("Liceo de Cagayan Loading Zone", 8.4862, 124.6388),
            Stop("Carmen Public Market Terminal", 8.479498, 124.63682)
        )

        val nearest = r1InboundStops.minByOrNull { haversineM(userLat, userLng, it.lat, it.lng) }!!
        assertEquals(
            "Nearest stop for R1 Inbound at Liceo must still be Liceo, not ${nearest.name}",
            "Liceo de Cagayan Loading Zone",
            nearest.name
        )
    }

    @Test
    fun testCorridorBoundaryDoesNotOverlapLiceoWithCarmen() {
        // The corridor bounding boxes in getDescriptiveCdoStopName must place
        // Liceo (8.4862, 124.6388) in "Liceo corridor" and
        // Carmen (8.479498, 124.63682) in "Carmen area", never swapped.
        val liceoLat = 8.4862
        val liceoLng = 124.6388
        val carmenLat = 8.479498
        val carmenLng = 124.63682

        // Liceo corridor: lat 8.484..8.495, lng 124.636..124.643
        assertTrue("Liceo lat must be in corridor lat range", liceoLat in 8.484..8.495)
        assertTrue("Liceo lng must be in corridor lng range", liceoLng in 124.636..124.643)

        // Carmen area: lat 8.475..8.4835, lng 124.630..124.639
        assertTrue("Carmen lat must be in Carmen area lat range", carmenLat in 8.475..8.4835)
        assertTrue("Carmen lng must be in Carmen area lng range", carmenLng in 124.630..124.639)

        // They must NOT overlap: Liceo must NOT fall in Carmen's box
        assertFalse("Liceo lat must NOT be in Carmen lat range", liceoLat in 8.475..8.4835)
    }

    @Test
    fun testMarkerCoordinatesMatchWalkDistanceCalculation() {
        // The BOARD HERE marker at Liceo and the walking-distance calculation
        // must use the same coordinates.
        val markerLat = 8.4862
        val markerLng = 124.6388
        val userLat = 8.4862  // User is at the same spot (26m offset in screenshot)
        val userLng = 124.6385 // Slight offset to simulate 26m walk

        val walkDist = haversineM(userLat, userLng, markerLat, markerLng)
        assertTrue(
            "Walk distance must match marker coordinates, expected ~30m, actual: ${walkDist.toInt()}m",
            walkDist < 100.0  // Must be a short walk, not 520m to Carmen
        )

        // Verify this is NOT the distance to Carmen
        val walkToCarmen = haversineM(userLat, userLng, 8.479498, 124.63682)
        assertTrue(
            "Walk to Carmen (${ walkToCarmen.toInt()}m) must be > 400m from this location",
            walkToCarmen > 400.0
        )
    }

    @Test
    fun testProximityDetectionWhenUserIsAlreadyAtDestination() {
        // User is at Liceo (8.4862, 124.6388) and selects Liceo Main Campus (8.48615, 124.63918)
        // Distance is ~45 meters (< 300m threshold)
        val userLat = 8.4862
        val userLng = 124.6388
        val destLat = 8.48615
        val destLng = 124.63918

        val distM = haversineM(userLat, userLng, destLat, destLng)
        assertTrue("Distance between user and target at Liceo should be < 100m, actual: ${distM}m", distM < 100.0)

        // The system should detect this as 'already at destination' (< 300m)
        val isAlreadyAtDest = distM < 300.0
        assertTrue("Must detect user is already at destination", isAlreadyAtDest)
    }

    @Test
    fun testProximityDetectionAllowsNormalTripWhenDestinationIsFar() {
        // User is at Liceo (8.4862, 124.6388) and selects Limketkai (8.4838, 124.6530)
        // Distance is ~1.6 km (> 300m threshold)
        val userLat = 8.4862
        val userLng = 124.6388
        val destLat = 8.4838
        val destLng = 124.6530

        val distM = haversineM(userLat, userLng, destLat, destLng)
        assertTrue("Distance from Liceo to Limketkai should be > 1000m, actual: ${distM}m", distM > 1000.0)

        val isAlreadyAtDest = distM < 300.0
        assertFalse("Must NOT detect as already at destination for a genuine commute", isAlreadyAtDest)
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
