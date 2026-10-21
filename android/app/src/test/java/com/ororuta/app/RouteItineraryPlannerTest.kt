package com.ororuta.app

import com.ororuta.app.domain.routing.*
import org.junit.Assert.*
import org.junit.Test

class RouteItineraryPlannerTest {
    private fun coord(lng: Double) = TransitCoordinate(8.48, lng)
    private fun stop(id: String, lng: Double, type: String = "loading") =
        VerifiedTransitStop(id, id, type, coord(lng))
    private fun path(vararg lngs: Double) = lngs.map(::coord)
    private fun route(
        id: String,
        points: List<TransitCoordinate>,
        boards: List<VerifiedTransitStop>,
        alights: List<VerifiedTransitStop>,
        direction: String = "Inbound"
    ) = DirectionalRouteData(id, id, id, direction, points, boards, alights, 13.0)

    @Test
    fun closerVerifiedBoardingStopWinsWhenBothStopsServeDestination() {
        val path = path(124.630, 124.633, 124.636, 124.639, 124.642, 124.645)
        val close = stop("close", 124.633)
        val far = stop("far", 124.636)
        val alight = stop("downtown-terminal", 124.645, "terminal")
        val trips = RouteItineraryPlanner.rankDirect(
            coord(124.633), coord(124.645),
            listOf(route("R-near", path, listOf(far, close), listOf(alight)))
        )
        assertTrue(trips.isNotEmpty())
        assertEquals("close", trips.first().boardingStop.id)
    }

    @Test
    fun routeNearOriginDoesNotQualifyWithoutVerifiedAlightingStopNearDestination() {
        val path = path(124.630, 124.633, 124.636, 124.639, 124.642)
        val result = RouteItineraryPlanner.rankDirect(
            coord(124.630), coord(124.653),
            listOf(route("near-only", path, listOf(stop("near-origin", 124.630)), listOf(stop("far-end", 124.642, "terminal"))))
        )
        assertTrue(result.isEmpty())
    }

    @Test
    fun wrongDirectionBoardingAfterDestinationIsRejected() {
        val points = path(124.630, 124.633, 124.636, 124.639, 124.642, 124.645)
        val result = RouteItineraryPlanner.rankDirect(
            coord(124.642), coord(124.633),
            listOf(route("wrong-way", points, listOf(stop("board", 124.642)), listOf(stop("destination", 124.633, "terminal"))))
        )
        assertTrue(result.isEmpty())
    }

    @Test
    fun invalidOrMissingGeometryAndStopsReturnNoFabricatedTrip() {
        assertTrue(RouteItineraryPlanner.rankDirect(coord(124.63), coord(124.64), emptyList()).isEmpty())
        val invalid = VerifiedTransitStop("invalid", "Invalid", "terminal", TransitCoordinate(Double.NaN, 124.63))
        val route = route("bad", path(124.630, 124.633, 124.636, 124.639), listOf(invalid), listOf(invalid))
        assertTrue(RouteItineraryPlanner.rankDirect(coord(124.63), coord(124.639), listOf(route)).isEmpty())
        assertTrue(RouteItineraryPlanner.rankDirect(TransitCoordinate(0.0, 0.0), coord(124.639), emptyList()).isEmpty())
    }

    @Test
    fun itineraryRankingAdaptsToDifferentOriginAndDestinationPairs() {
        val pts = path(124.630, 124.633, 124.636, 124.639, 124.642, 124.645)
        val route = route(
            "shared-corridor", pts,
            listOf(stop("west", 124.630), stop("center", 124.636)),
            listOf(stop("center-alight", 124.636, "terminal"), stop("east", 124.645, "terminal"))
        )
        val westToEast = RouteItineraryPlanner.rankDirect(coord(124.630), coord(124.645), listOf(route)).first()
        val centerToEast = RouteItineraryPlanner.rankDirect(coord(124.636), coord(124.645), listOf(route)).first()
        assertEquals("west", westToEast.boardingStop.id)
        assertEquals("center", centerToEast.boardingStop.id)
        assertEquals("east", centerToEast.alightingStop.id)
    }
}
