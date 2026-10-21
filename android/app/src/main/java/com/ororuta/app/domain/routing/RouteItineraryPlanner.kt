package com.ororuta.app.domain.routing

import kotlin.math.*

/** Coordinates and stops here are copied only from route geometry and route-linked stop records. */
data class TransitCoordinate(val lat: Double, val lng: Double)

data class VerifiedTransitStop(
    val id: String,
    val name: String,
    val type: String,
    val coordinate: TransitCoordinate
)

data class DirectionalRouteData(
    val routeId: String,
    val routeCode: String,
    val routeName: String,
    val direction: String,
    val geometry: List<TransitCoordinate>,
    val boardingStops: List<VerifiedTransitStop>,
    val alightingStops: List<VerifiedTransitStop>,
    val fare: Double? = null
)

data class DirectItinerary(
    val routeId: String,
    val routeCode: String,
    val routeName: String,
    val direction: String,
    val boardingStop: VerifiedTransitStop,
    val alightingStop: VerifiedTransitStop,
    val walkToBoardMeters: Int,
    val walkFromAlightMeters: Int,
    val rideMeters: Int,
    val estimatedMinutes: Int,
    val regularFare: Double?,
    val rideGeometry: List<TransitCoordinate>
) {
    val totalWalkingMeters: Int get() = walkToBoardMeters + walkFromAlightMeters
}

/**
 * Ranks complete, direct journeys. A geometry vertex establishes vehicle order only; both
 * passenger endpoints must be route-associated, named stops. Walking distances are straight
 * line estimates (with a modest street factor), never represented as a pedestrian path.
 */
object RouteItineraryPlanner {
    fun rankDirect(
        origin: TransitCoordinate,
        destination: TransitCoordinate,
        routes: List<DirectionalRouteData>,
        maxWalkMeters: Int = 1_000,
        maxStopSnapMeters: Int = 250
    ): List<DirectItinerary> {
        if (!origin.isValid() || !destination.isValid()) return emptyList()
        val options = mutableListOf<Pair<DirectItinerary, Double>>()

        routes.forEach { route ->
            val path = route.geometry
            if (path.size < 2 || path.any { !it.isValid() }) return@forEach
            val boards = route.boardingStops.mapNotNull { stop ->
                stop.positionOn(path, maxStopSnapMeters)?.let { stop to it }
            }
            val alights = route.alightingStops.mapNotNull { stop ->
                stop.positionOn(path, maxStopSnapMeters)?.let { stop to it }
            }

            boards.forEach { (board, boardIndex) ->
                val walkTo = walkingEstimate(origin, board.coordinate)
                if (walkTo > maxWalkMeters) return@forEach
                alights.forEach { (alight, alightIndex) ->
                    if (alightIndex <= boardIndex) return@forEach
                    val walkFrom = walkingEstimate(alight.coordinate, destination)
                    if (walkFrom > maxWalkMeters) return@forEach
                    val segment = path.subList(boardIndex, alightIndex + 1)
                    val ride = polylineMeters(segment).roundToInt()
                    if (ride < 400) return@forEach
                    val walkMinutes = ceil((walkTo + walkFrom) / 83.0).toInt()
                    val rideMinutes = ceil(ride / 1000.0 / 18.0 * 60.0).toInt()
                    val minutes = walkMinutes + rideMinutes + 3
                    val option = DirectItinerary(
                        route.routeId, route.routeCode, route.routeName, route.direction,
                        board, alight, walkTo, walkFrom, ride, minutes, route.fare, segment
                    )
                    // The shared ranking includes all walking plus ride and boarding time.
                    // Fare is a stable tie-break, not a reason to hide a longer walk.
                    val score = minutes * 1_000.0 + (route.fare ?: Double.MAX_VALUE / 1_000_000)
                    options += option to score
                }
            }
        }
        return options.sortedWith(compareBy<Pair<DirectItinerary, Double>> { it.second }
            .thenBy { it.first.totalWalkingMeters }
            .thenBy { it.first.estimatedMinutes })
            .map { it.first }
    }

    fun distanceMeters(a: TransitCoordinate, b: TransitCoordinate): Double {
        val lat1 = Math.toRadians(a.lat)
        val lat2 = Math.toRadians(b.lat)
        val dLat = lat2 - lat1
        val dLng = Math.toRadians(b.lng - a.lng)
        val h = sin(dLat / 2).pow(2) + cos(lat1) * cos(lat2) * sin(dLng / 2).pow(2)
        return 2 * 6_371_000.0 * asin(sqrt(h.coerceIn(0.0, 1.0)))
    }

    private fun walkingEstimate(a: TransitCoordinate, b: TransitCoordinate): Int =
        (distanceMeters(a, b) * 1.35).roundToInt()

    private fun polylineMeters(points: List<TransitCoordinate>): Double =
        points.zipWithNext().sumOf { (a, b) -> distanceMeters(a, b) }

    private fun VerifiedTransitStop.positionOn(path: List<TransitCoordinate>, maxSnap: Int): Int? {
        if (!coordinate.isValid()) return null
        val nearest = path.indices.minByOrNull { RouteItineraryPlanner.distanceMeters(coordinate, path[it]) } ?: return null
        return nearest.takeIf { RouteItineraryPlanner.distanceMeters(coordinate, path[it]) <= maxSnap }
    }

    private fun TransitCoordinate.isValid(): Boolean =
        lat.isFinite() && lng.isFinite() && lat in -90.0..90.0 && lng in -180.0..180.0 && (lat != 0.0 || lng != 0.0)
}
