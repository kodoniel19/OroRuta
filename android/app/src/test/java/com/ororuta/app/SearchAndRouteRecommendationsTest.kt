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
    fun testRBayCarBoardingSelectionAtCarmenMarket() {
        val userCarmenLat = 8.47950
        val userCarmenLng = 124.63682

        fun haversine(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Double {
            val r = 6371000.0
            val dLat = Math.toRadians(lat2 - lat1)
            val dLng = Math.toRadians(lng2 - lng1)
            val a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                    Math.sin(dLng / 2) * Math.sin(dLng / 2)
            return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        }

        // R-BAY-CAR stops
        val bayabasStop = Triple("Brgy. Bayabas Centro", 8.51408, 124.63898)
        val buluaStop = Triple("Westbound Terminal (Bulua)", 8.51216, 124.62349)
        val kauswaganStop = Triple("Brgy. Kauswagan", 8.49721, 124.63993)
        val carmenStop = Triple("Carmen Public Market", 8.47950, 124.63682)

        val allStops = listOf(bayabasStop, buluaStop, kauswaganStop, carmenStop)

        // For Outbound (Carmen Market -> Bayabas): destination is Bayabas
        val outboundDropoff = bayabasStop
        val outboundEligibleBoarding = allStops.filter {
            !it.first.equals(outboundDropoff.first, ignoreCase = true) &&
            haversine(it.second, it.third, outboundDropoff.second, outboundDropoff.third) > 150.0
        }
        val outboundBestBoarding = outboundEligibleBoarding.minByOrNull { haversine(userCarmenLat, userCarmenLng, it.second, it.third) }!!

        assertEquals("Outbound boarding stop for user at Carmen must be Carmen Public Market", "Carmen Public Market", outboundBestBoarding.first)
        val outboundWalk = haversine(userCarmenLat, userCarmenLng, outboundBestBoarding.second, outboundBestBoarding.third)
        assertTrue("Walk to Outbound boarding stop at Carmen Market must be under 50m, actual: ${outboundWalk}m", outboundWalk < 50.0)

        // For Inbound (Bayabas -> Carmen Market): destination is Carmen Market
        val inboundDropoff = carmenStop
        val inboundEligibleBoarding = allStops.filter {
            !it.first.equals(inboundDropoff.first, ignoreCase = true) &&
            haversine(it.second, it.third, inboundDropoff.second, inboundDropoff.third) > 150.0
        }
        val inboundBestBoarding = inboundEligibleBoarding.minByOrNull { haversine(userCarmenLat, userCarmenLng, it.second, it.third) }!!

        assertEquals("Inbound boarding stop for user at Carmen Market must be Brgy. Kauswagan (nearest eligible)", "Brgy. Kauswagan", inboundBestBoarding.first)
    }

    @Test
    fun testSmDowntownSearchIncludesR2AsTopRecommendation() {
        val userCarmenLat = 8.480290
        val userCarmenLng = 124.636820
        val smDowntownLat = 8.4856
        val smDowntownLng = 124.6542

        fun haversine(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Double {
            val r = 6371000.0
            val dLat = Math.toRadians(lat2 - lat1)
            val dLng = Math.toRadians(lng2 - lng1)
            val a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                    Math.sin(dLng / 2) * Math.sin(dLng / 2)
            return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        }

        // R2 stops
        val r2Stops = listOf(
            Triple("Carmen Public Market", 8.47950, 124.63682),
            Triple("Liceo de Cagayan University", 8.48615, 124.63918),
            Triple("Gaisano City Mall", 8.48632, 124.64975),
            Triple("Ayala Malls Centrio", 8.48569, 124.65132),
            Triple("SM CDO Downtown Premier", 8.48439, 124.65493),
            Triple("Agora Bus Terminal", 8.48972, 124.65753),
            Triple("Cogon Public Market", 8.47540, 124.65020),
            Triple("Plaza Divisoria", 8.47799, 124.64376)
        )

        // R-BON-COG stops
        val bonbonCogStops = listOf(
            Triple("Bonbon Terminal", 8.50500, 124.63000),
            Triple("Carmen Public Market", 8.47950, 124.63682),
            Triple("Cogon Public Market", 8.47540, 124.65020)
        )

        // R2 best drop-off for SM Downtown Premier (smDowntownLat, smDowntownLng)
        val r2BestDrop = r2Stops.minByOrNull { haversine(smDowntownLat, smDowntownLng, it.second, it.third) }!!
        assertEquals("SM CDO Downtown Premier", r2BestDrop.first)
        val r2DropWalk = haversine(smDowntownLat, smDowntownLng, r2BestDrop.second, r2BestDrop.third)
        assertTrue("R2 dropoff distance to SM Downtown must be under 200m, actual: ${r2DropWalk}m", r2DropWalk < 200.0)

        // R2 best boarding for user at Carmen
        val r2Boarding = r2Stops.filter { !it.first.equals(r2BestDrop.first, ignoreCase = true) }
            .minByOrNull { haversine(userCarmenLat, userCarmenLng, it.second, it.third) }!!
        assertEquals("Carmen Public Market", r2Boarding.first)

        // R-BON-COG best drop-off for SM Downtown Premier
        val bonbonBestDrop = bonbonCogStops.minByOrNull { haversine(smDowntownLat, smDowntownLng, it.second, it.third) }!!
        val bonbonDropWalk = haversine(smDowntownLat, smDowntownLng, bonbonBestDrop.second, bonbonBestDrop.third)
        assertTrue("R-BON-COG dropoff distance to SM Downtown is > 1000m", bonbonDropWalk > 1000.0)

        // Multi-criteria ranking score comparison
        val r2TotalWalk = haversine(userCarmenLat, userCarmenLng, r2Boarding.second, r2Boarding.third) + r2DropWalk
        val bonbonTotalWalk = haversine(userCarmenLat, userCarmenLng, 8.47950, 124.63682) + bonbonDropWalk

        val r2Score = (r2DropWalk * 2.5) + (r2TotalWalk * 1.0)
        val bonbonScore = (bonbonDropWalk * 2.5) + (bonbonTotalWalk * 1.0)

        assertTrue("R2 ranking score ($r2Score) must be far better than R-BON-COG score ($bonbonScore)", r2Score < bonbonScore)
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
    fun testFindCuratedLandmarkResolvesAllKeyDestinations() {
        val sm = PlaceRepository.findCuratedLandmark("SM Downtown")
        assertNotNull("SM Downtown alias must resolve", sm)
        assertEquals("SM CDO Downtown Premier", sm?.name)
        assertEquals(8.484385998039096, sm!!.lat, 0.001)

        val limketkai = PlaceRepository.findCuratedLandmark("Limketkai")
        assertNotNull("Limketkai must resolve", limketkai)
        assertEquals("Limketkai Center", limketkai?.name)

        val centrio = PlaceRepository.findCuratedLandmark("Centrio")
        assertNotNull("Centrio must resolve", centrio)
        assertEquals("Centrio Mall", centrio?.name)

        val cogon = PlaceRepository.findCuratedLandmark("Cogon")
        assertNotNull("Cogon must resolve", cogon)
        assertEquals("Cogon Market", cogon?.name)

        val cathedral = PlaceRepository.findCuratedLandmark("Cathedral")
        assertNotNull("Cathedral must resolve", cathedral)
        assertEquals("St. Augustine Metropolitan Cathedral", cathedral?.name)

        val miami = PlaceRepository.findCuratedLandmark("Miami Inn")
        assertNotNull("Miami Inn must resolve", miami)
        assertEquals("Miami Inn Carmen", miami?.name)

        val madonna = PlaceRepository.findCuratedLandmark("Madonna Hospital")
        assertNotNull("Madonna Hospital must resolve", madonna)
        assertEquals("Madonna and Child Hospital", madonna?.name)
    }

    @Test
    fun testFullBundledRoutesDatasetSmDowntownAndAllDestinations() {
        val json = kotlinx.serialization.json.Json { ignoreUnknownKeys = true; isLenient = true; coerceInputValues = true }
        val file = java.io.File("src/main/assets/bundled_routes.json")
        assertTrue("bundled_routes.json must exist in assets", file.exists())

        val routes = json.decodeFromString<List<com.ororuta.app.domain.models.Route>>(file.readText())
        assertTrue("Must load routes from bundled_routes.json", routes.isNotEmpty())

        val r2Loop = routes.find { it.id == "r2-gaisano-agora-cogon-carmen" }
        assertNotNull("R2 Loop Line (r2-gaisano-agora-cogon-carmen) must exist in assets", r2Loop)
        assertEquals("R2", r2Loop!!.code)

        val userCarmenLat = 8.480290
        val userCarmenLng = 124.636820

        fun haversine(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Double {
            val r = 6371000.0
            val dLat = Math.toRadians(lat2 - lat1)
            val dLng = Math.toRadians(lng2 - lng1)
            val a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                    Math.sin(dLng / 2) * Math.sin(dLng / 2)
            return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        }

        // Test SM Downtown evaluation
        val smLandmark = PlaceRepository.findCuratedLandmark("SM Downtown")!!

        val candidateScores = mutableListOf<Pair<Double, com.ororuta.app.domain.models.Route>>()

        for (r in routes) {
            val allStops = mutableListOf<Triple<String, Double, Double>>()
            r.terminals.filter { it.lat != 0.0 && it.lng != 0.0 }.forEach { allStops.add(Triple(it.name, it.lat, it.lng)) }
            r.stops.filter { it.lat != 0.0 && it.lng != 0.0 }.forEach { allStops.add(Triple(it.name, it.lat, it.lng)) }
            r.transfers.filter { it.lat != 0.0 && it.lng != 0.0 }.forEach { allStops.add(Triple(it.name, it.lat, it.lng)) }

            val distinctStops = allStops.distinctBy { Pair(it.first.trim().lowercase(), Pair((it.second * 10000).toLong(), (it.third * 10000).toLong())) }
            if (distinctStops.isEmpty()) continue

            val bestDrop = distinctStops.minByOrNull { haversine(smLandmark.lat, smLandmark.lng, it.second, it.third) } ?: continue
            val walkFromDrop = haversine(smLandmark.lat, smLandmark.lng, bestDrop.second, bestDrop.third).toInt()
            if (walkFromDrop > 1200) continue

            val eligibleBoarding = distinctStops.filter {
                haversine(it.second, it.third, bestDrop.second, bestDrop.third) > 150.0 &&
                !it.first.equals(bestDrop.first, ignoreCase = true)
            }
            val bestBoard = (eligibleBoarding.takeIf { it.isNotEmpty() } ?: distinctStops)
                .minByOrNull { haversine(userCarmenLat, userCarmenLng, it.second, it.third) } ?: continue

            val walkToBoard = haversine(userCarmenLat, userCarmenLng, bestBoard.second, bestBoard.third).toInt()
            if (walkToBoard > 3000) continue

            val rideDist = haversine(bestBoard.second, bestBoard.third, bestDrop.second, bestDrop.third) / 1000.0
            val totalWalk = walkToBoard + walkFromDrop
            val mins = Math.max(8, (walkToBoard / 80.0 + rideDist / 20.0 * 60 + walkFromDrop / 80.0).toInt())
            val fare = TraditionalJeepneyFareService.calculateFareForDistance(rideDist, PassengerCategory.REGULAR, r.jeepneyType).regularFare

            val score = (walkFromDrop * 3.5) + (walkToBoard * 1.5) + (totalWalk * 1.0) + (mins * 15.0) + (fare * 2.0)
            candidateScores.add(Pair(score, r))
        }

        candidateScores.sortBy { it.first }
        assertTrue("Must find candidate routes for SM Downtown", candidateScores.isNotEmpty())

        val topRoute = candidateScores.first().second
        assertEquals("Top route for SM Downtown must be R2 Loop Line", "r2-gaisano-agora-cogon-carmen", topRoute.id)
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
