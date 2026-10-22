package com.ororuta.app.data.repository

import android.content.Context
import android.location.Geocoder
import com.ororuta.app.data.local.dao.*
import com.ororuta.app.data.local.entities.*
import com.ororuta.app.data.remote.OroRutaApi
import com.ororuta.app.domain.models.*
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.net.URLEncoder
import java.util.Locale
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton
import com.ororuta.app.BuildConfig

@Singleton
class TripRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val api: OroRutaApi,
    private val routeDao: RouteDao,
    private val placeDao: PlaceDao,
    private val locationProvider: com.ororuta.app.data.location.CdoLocationProvider,
    private val json: Json
) {
    /**
     * Search for jeepney trip options.
     * Primary: backend /trips/search API (uses verified route geometry + loading points).
     * Fallback (when backend unreachable or offline): local Room/asset search.
     * Always enriches & ranks trip options using user's actual GPS location and verified stops.
     */
    suspend fun searchTrips(
        from: String,
        to: String,
        fromLat: Double? = null,
        fromLng: Double? = null,
        toLat: Double? = null,
        toLng: Double? = null,
        sort: String = "time"
    ): Resource<List<TripOption>> {
        val reqId = java.util.UUID.randomUUID().toString().take(8)
        android.util.Log.d("OroRutaSearch", "[$reqId] searchTrips requested: from='$from' ($fromLat, $fromLng) -> to='$to' ($toLat, $toLng), sort=$sort")

        var source = "BACKEND"
        val rawTrips = try {
            val results = api.searchTrips(from, to, fromLat, fromLng, toLat, toLng, sort)
            if (results.isNotEmpty()) {
                android.util.Log.d("OroRutaSearch", "[$reqId] Backend API returned ${results.size} trip candidates.")
                results
            } else {
                source = "LOCAL_FALLBACK"
                android.util.Log.d("OroRutaSearch", "[$reqId] Backend returned empty list. Calling buildLocalTrips fallback.")
                buildLocalTrips(to, toLat, toLng, fromLat, fromLng)
            }
        } catch (e: Exception) {
            source = "LOCAL_FALLBACK"
            android.util.Log.d("OroRutaSearch", "[$reqId] Backend API failed (${e.message}). Calling buildLocalTrips fallback.")
            buildLocalTrips(to, toLat, toLng, fromLat, fromLng)
        }

        val enriched = enrichAndRankTrips(reqId, source, rawTrips, fromLat, fromLng, toLat, toLng, to)
        enriched.forEach { cachedTripOptions[it.id] = it }
        android.util.Log.d("OroRutaSearch", "[$reqId] Final enriched & ranked candidates count: ${enriched.size}")
        return if (enriched.isNotEmpty()) {
            Resource.Success(enriched)
        } else {
            Resource.Error("No suitable jeepney routes found for this journey.")
        }
    }

    private suspend fun ensureRoutesLoaded(): List<Route> {
        val existing = routeDao.getAllSync()
        if (existing.size >= 18) {
            val decoded = existing.mapNotNull { cached ->
                try { json.decodeFromString<Route>(cached.jsonData) } catch (_: Exception) { null }
            }
            if (decoded.size >= 18) return decoded
        }
        return try {
            context.assets.open("bundled_routes.json").use { stream ->
                val text = stream.bufferedReader().use { it.readText() }
                val routes = json.decodeFromString<List<Route>>(text)
                if (routes.isNotEmpty()) {
                    routeDao.insertAll(routes.map { r ->
                        CachedRoute(
                            id = r.id, code = r.code, name = r.name, origin = r.origin, destination = r.destination,
                            jeepneyType = r.jeepneyType, status = r.status, color = r.color, lengthKm = r.lengthKm,
                            offlineSizeMb = r.offlineSizeMb, lastUpdatedAt = r.lastUpdatedAt,
                            jsonData = json.encodeToString(r)
                        )
                    })
                    routes
                } else emptyList()
            }
        } catch (_: Exception) {
            emptyList()
        }
    }

    private suspend fun resolveTargetCoordinates(
        destinationName: String,
        passedLat: Double?,
        passedLng: Double?
    ): Pair<Double, Double>? {
        if (passedLat != null && passedLng != null && passedLat != 0.0 && passedLng != 0.0) {
            return Pair(passedLat, passedLng)
        }
        val cleanName = destinationName.trim()
        if (cleanName.isBlank()) return null

        val landmark = PlaceRepository.findCuratedLandmark(cleanName)
        if (landmark != null) {
            return Pair(landmark.lat, landmark.lng)
        }

        try {
            val dbPlaces = placeDao.search(cleanName)
            val matched = dbPlaces.firstOrNull { it.lat != 0.0 && it.lng != 0.0 }
            if (matched != null) {
                return Pair(matched.lat, matched.lng)
            }
        } catch (_: Exception) {}

        return null
    }

    private suspend fun enrichAndRankTrips(
        reqId: String,
        source: String,
        trips: List<TripOption>,
        fromLat: Double?,
        fromLng: Double?,
        toLat: Double?,
        toLng: Double?,
        destinationName: String
    ): List<TripOption> {
        val cachedRoutes = ensureRoutesLoaded()

        // 1. Resolve user starting location (fLat, fLng)
        var fLat = fromLat
        var fLng = fromLng
        if (fLat == null || fLng == null || fLat == 0.0 || fLng == 0.0) {
            val deviceLoc = locationProvider.getDeviceLocationOrNull()
            if (deviceLoc != null) {
                fLat = deviceLoc.first
                fLng = deviceLoc.second
            } else {
                fLat = com.ororuta.app.data.location.CdoLocationProvider.CDO_DEFAULT_LAT
                fLng = com.ororuta.app.data.location.CdoLocationProvider.CDO_DEFAULT_LNG
            }
        }

        // 2. Resolve target destination coordinates (tLat, tLng)
        val targetCoords = resolveTargetCoordinates(destinationName, toLat, toLng)
        val tLat = targetCoords?.first
        val tLng = targetCoords?.second

        android.util.Log.d("OroRutaSearch", "[$reqId] enrichAndRankTrips [$source]: User=($fLat, $fLng) -> Target '$destinationName' (${tLat ?: "unresolved"}, ${tLng ?: "unresolved"})")

        fun haversine(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Double {
            val r = 6371000.0
            val dLat = Math.toRadians(lat2 - lat1)
            val dLng = Math.toRadians(lng2 - lng1)
            val a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                    Math.sin(dLng / 2) * Math.sin(dLng / 2)
            return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        }

        val candidateTrips = mutableListOf<TripOption>()
        candidateTrips.addAll(trips)

        // Ensure ALL cached routes in Room DB are evaluated by checking route ID (not route code!)
        val existingRouteIds = candidateTrips.mapNotNull { it.segments.firstOrNull()?.routeId }.toSet()
        cachedRoutes.forEach { r ->
            if (r.id !in existingRouteIds) {
                candidateTrips.add(
                    TripOption(
                        id = "eval_${r.id}",
                        originPlaceId = r.id,
                        destinationPlaceId = r.id,
                        minutes = 15,
                        walkMeters = 100,
                        transfers = 0,
                        direction = "Inbound",
                        status = r.status,
                        boardingName = r.origin,
                        dropoffName = r.destination,
                        segments = listOf(
                            TripSegment(
                                tripOptionId = "eval_${r.id}",
                                seq = 1,
                                routeId = r.id,
                                code = r.code,
                                routeName = r.name,
                                color = r.color,
                                jeepneyType = r.jeepneyType,
                                routeStatus = r.status,
                                km = 2.5,
                                minutes = 15,
                                fare = 13.0,
                                discountFare = 10.40
                            )
                        )
                    )
                )
            }
        }

        val cleanTokens = destinationName.trim().lowercase()
            .replace(Regex("[-–—\\(\\)]"), " ")
            .split("\\s+".toRegex())
            .filter { it.length >= 3 && it !in setOf("main", "campus", "university", "school", "center", "mall", "market", "terminal", "hospital", "area", "park", "plaza", "cdo", "city") }

        val enrichedScoredTrips = mutableListOf<Pair<Double, TripOption>>()

        for (trip in candidateTrips) {
            val seg = trip.segments.firstOrNull() ?: continue
            val route = cachedRoutes.find { it.id == seg.routeId || it.code.equals(seg.code, ignoreCase = true) } ?: continue

            val allStops = mutableListOf<Triple<String, Double, Double>>()
            route.terminals.filter { it.lat != 0.0 && it.lng != 0.0 }.forEach { allStops.add(Triple(it.name, it.lat, it.lng)) }
            route.stops.filter { it.lat != 0.0 && it.lng != 0.0 }.forEach { allStops.add(Triple(it.name, it.lat, it.lng)) }
            route.transfers.filter { it.lat != 0.0 && it.lng != 0.0 }.forEach { allStops.add(Triple(it.name, it.lat, it.lng)) }

            // Extract geometry points
            route.geometries.forEach { g ->
                try {
                    val coords = org.json.JSONObject(g.geometry ?: "").getJSONArray("coordinates")
                    for (i in 0 until coords.length()) {
                        val pt = coords.getJSONArray(i)
                        allStops.add(Triple(route.name, pt.getDouble(1), pt.getDouble(0)))
                    }
                } catch (_: Exception) {}
            }

            val distinctStops = allStops.distinctBy { Pair(it.first.trim().lowercase(), Pair((it.second * 10000).toLong(), (it.third * 10000).toLong())) }
            if (distinctStops.isEmpty()) continue

            // 1) Find best drop-off stop/point for destination (tLat, tLng)
            val dropTargetLat = tLat ?: 8.484386
            val dropTargetLng = tLng ?: 124.654930

            val textMatchedStop = if (cleanTokens.isNotEmpty()) {
                distinctStops.filter { s ->
                    cleanTokens.any { t -> s.first.lowercase().contains(t) } &&
                    haversine(dropTargetLat, dropTargetLng, s.second, s.third) <= 800.0
                }.minByOrNull { haversine(dropTargetLat, dropTargetLng, it.second, it.third) }
            } else null

            val bestDrop = textMatchedStop ?: distinctStops.minByOrNull { haversine(dropTargetLat, dropTargetLng, it.second, it.third) }
                ?: Triple(route.destination, dropTargetLat, dropTargetLng)

            val walkFromDropDist = haversine(dropTargetLat, dropTargetLng, bestDrop.second, bestDrop.third).toInt()
            if (walkFromDropDist > 1200) {
                android.util.Log.d("OroRutaSearch", "[$reqId] FILTERED OUT ${route.code} (${route.id}): walkFromDropDist $walkFromDropDist > 1200m to '$destinationName'")
                continue
            }

            // 2) Find best boarding stop on route for user location (fLat, fLng)
            val eligibleBoardingStops = distinctStops.filter {
                haversine(it.second, it.third, bestDrop.second, bestDrop.third) > 150.0 &&
                !it.first.equals(bestDrop.first, ignoreCase = true)
            }

            val bestBoarding = (eligibleBoardingStops.takeIf { it.isNotEmpty() } ?: distinctStops)
                .minByOrNull { haversine(fLat, fLng, it.second, it.third) }
                ?: Triple(route.origin, fLat, fLng)

            val walkToBoardDist = haversine(fLat, fLng, bestBoarding.second, bestBoarding.third).toInt()
            val isIdenticalStop = bestBoarding.first.equals(bestDrop.first, ignoreCase = true) ||
                    haversine(bestBoarding.second, bestBoarding.third, bestDrop.second, bestDrop.third) < 150.0

            if (isIdenticalStop || walkToBoardDist > 3000) {
                android.util.Log.d("OroRutaSearch", "[$reqId] FILTERED OUT ${route.code} (${route.id}): identical stop or walkToBoardDist $walkToBoardDist > 3000m")
                continue
            }

            val rideDistKm = haversine(bestBoarding.second, bestBoarding.third, bestDrop.second, bestDrop.third) / 1000.0
            val effectiveKm = if (rideDistKm > 0.5) rideDistKm else 2.5
            val rideMins = Math.max(5, Math.round(effectiveKm / 20.0 * 60).toInt())
            val totalMeters = walkToBoardDist + (effectiveKm * 1000).toInt() + walkFromDropDist
            val estMins = Math.max(8, Math.round(walkToBoardDist / 80.0).toInt() + rideMins + Math.round(walkFromDropDist / 80.0).toInt())

            val fareCalc = com.ororuta.app.domain.fare.TraditionalJeepneyFareService.calculateFareForDistance(
                distanceKm = effectiveKm,
                category = com.ororuta.app.domain.fare.PassengerCategory.REGULAR,
                jeepneyType = route.jeepneyType
            )

            // Multi-criteria ranking penalty score:
            // Priority 1: Destination accessibility (walkFromDropDist * 3.5)
            // Priority 2: Boarding accessibility (walkToBoardDist * 1.5)
            // Priority 3: Total journey walk (totalMeters * 1.0)
            // Priority 4: Travel time (estMins * 15.0)
            // Priority 5: Fare (fare * 2.0)
            val score = (walkFromDropDist * 3.5) + (walkToBoardDist * 1.5) + (totalMeters * 1.0) + (estMins * 15.0) + (fareCalc.regularFare * 2.0)

            fun resolveStopLabel(rawName: String, lat: Double, lng: Double): String {
                if (!rawName.contains("/")) return rawName.trim()
                val parts = rawName.split("/").map { it.trim() }
                val bestPart = parts.minByOrNull { part ->
                    when {
                        part.contains("Carmen", ignoreCase = true) && haversine(fLat, fLng, 8.4795, 124.6368) < 2000.0 -> 0.0
                        part.contains("Patag", ignoreCase = true) && haversine(fLat, fLng, 8.4878, 124.6255) < 2000.0 -> 0.0
                        else -> 100.0
                    }
                }
                return bestPart ?: parts.first()
            }

            val cleanBoarding = resolveStopLabel(bestBoarding.first, bestBoarding.second, bestBoarding.third)
            val cleanDropoff = resolveStopLabel(bestDrop.first, bestDrop.second, bestDrop.third)
            val routeCode = route.code.ifBlank { "R2" }

            val enriched = trip.copy(
                direction = trip.direction?.ifBlank { "Inbound" } ?: "Inbound",
                boardingName = cleanBoarding,
                boardingLat = bestBoarding.second,
                boardingLng = bestBoarding.third,
                dropoffName = cleanDropoff,
                dropoffLat = bestDrop.second,
                dropoffLng = bestDrop.third,
                walkMeters = walkToBoardDist + walkFromDropDist,
                totalKm = effectiveKm,
                minutes = estMins,
                regularFare = fareCalc.regularFare,
                discountFare = fareCalc.discountedFare,
                segments = listOf(
                    TripSegment(
                        tripOptionId = trip.id,
                        seq = 1,
                        routeId = route.id,
                        code = routeCode,
                        routeName = route.name,
                        color = route.color,
                        jeepneyType = route.jeepneyType,
                        routeStatus = route.status,
                        km = effectiveKm,
                        minutes = estMins,
                        fare = fareCalc.regularFare,
                        discountFare = fareCalc.discountedFare
                    )
                )
            )

            android.util.Log.d("OroRutaSearch", "[$reqId] ENRICHED ACCEPTED [${route.code}] ${route.id}: Board='$cleanBoarding' (${walkToBoardDist}m), Drop='$cleanDropoff' (${walkFromDropDist}m), TotalWalk=${walkToBoardDist + walkFromDropDist}m, Ride=${effectiveKm}km, Mins=${estMins}, Score=${score}")

            enrichedScoredTrips.add(Pair(score, enriched))
        }

        // Evaluate 2-leg transfer options if direct trips are < 3
        if (enrichedScoredTrips.size < 3 && targetCoords != null) {
            val (destLat, destLng) = targetCoords
            val transferTrips = buildTransferTrips(cachedRoutes, fLat, fLng, destLat, destLng, destinationName, haversine = ::haversine)
            enrichedScoredTrips.addAll(transferTrips)
        }

        // Deduplicate candidates by routeId & boarding/dropoff names
        val distinctTrips = enrichedScoredTrips
            .distinctBy { Pair(it.second.segments.firstOrNull()?.routeId ?: it.second.id, Pair(it.second.boardingName, it.second.dropoffName)) }
            .sortedBy { it.first }

        if (distinctTrips.isEmpty()) return emptyList()

        val minTime = distinctTrips.minOf { it.second.minutes }
        val minWalk = distinctTrips.minOf { it.second.walkMeters }
        val minFare = distinctTrips.minOf { it.second.regularFare }

        val finalBadged = distinctTrips.take(5).mapIndexed { rank, pair ->
            val trip = pair.second
            val isFastest = (trip.minutes == minTime)
            val isLeastWalk = (trip.walkMeters == minWalk)
            val isCheapest = (trip.regularFare == minFare)
            val matchReason = when {
                rank == 0 -> "Best overall trip"
                isLeastWalk -> "Shortest walk to boarding stop"
                isFastest -> "Fastest overall journey"
                trip.transfers > 0 -> "1 Transfer required"
                else -> "Direct route"
            }
            trip.copy(
                isFastest = isFastest,
                isLeastWalk = isLeastWalk,
                isCheapest = isCheapest,
                matchReason = matchReason
            )
        }

        finalBadged.forEachIndexed { rank, t ->
            val primary = t.segments.firstOrNull()
            android.util.Log.d("OroRutaSearch", "[$reqId] RANK #${rank + 1}: [${primary?.code}] ${primary?.routeName} (${t.direction}) | Board: '${t.boardingName}' -> Drop: '${t.dropoffName}' | Walk: ${t.walkMeters}m, Mins: ${t.minutes}, Reason: '${t.matchReason}'")
        }

        return finalBadged
    }

    private fun extractRouteStops(r: Route): List<Triple<String, Double, Double>> {
        val list = mutableListOf<Triple<String, Double, Double>>()
        r.terminals.filter { it.lat != 0.0 && it.lng != 0.0 }.forEach { list.add(Triple(it.name, it.lat, it.lng)) }
        r.stops.filter { it.lat != 0.0 && it.lng != 0.0 }.forEach { list.add(Triple(it.name, it.lat, it.lng)) }
        r.transfers.filter { it.lat != 0.0 && it.lng != 0.0 }.forEach { list.add(Triple(it.name, it.lat, it.lng)) }
        return list
    }

    private fun buildTransferTrips(
        routes: List<Route>,
        userLat: Double,
        userLng: Double,
        destLat: Double,
        destLng: Double,
        destName: String,
        haversine: (Double, Double, Double, Double) -> Double
    ): List<Pair<Double, TripOption>> {
        val transferHubs = listOf(
            Triple("Carmen Public Market", 8.479498, 124.636820),
            Triple("Cogon Public Market", 8.477160, 124.651208),
            Triple("Agora Bus Terminal", 8.489716, 124.657532),
            Triple("Plaza Divisoria", 8.477992, 124.643762),
            Triple("Limketkai Center", 8.481880, 124.656007)
        )

        val transferOptions = mutableListOf<Pair<Double, TripOption>>()

        for (hub in transferHubs) {
            val (hubName, hubLat, hubLng) = hub

            val leg1Routes = routes.filter { r ->
                val stops = extractRouteStops(r)
                val nearUser = stops.any { haversine(userLat, userLng, it.second, it.third) <= 1500.0 }
                val nearHub = stops.any { haversine(hubLat, hubLng, it.second, it.third) <= 500.0 }
                nearUser && nearHub
            }

            val leg2Routes = routes.filter { r ->
                val stops = extractRouteStops(r)
                val nearHub = stops.any { haversine(hubLat, hubLng, it.second, it.third) <= 500.0 }
                val nearDest = stops.any { haversine(destLat, destLng, it.second, it.third) <= 1000.0 }
                nearHub && nearDest
            }

            for (r1 in leg1Routes) {
                for (r2 in leg2Routes) {
                    if (r1.id == r2.id) continue

                    val r1Stops = extractRouteStops(r1)
                    val r2Stops = extractRouteStops(r2)

                    val board1 = r1Stops.minByOrNull { haversine(userLat, userLng, it.second, it.third) } ?: continue
                    val drop1 = r1Stops.minByOrNull { haversine(hubLat, hubLng, it.second, it.third) } ?: continue

                    val board2 = r2Stops.minByOrNull { haversine(hubLat, hubLng, it.second, it.third) } ?: continue
                    val drop2 = r2Stops.minByOrNull { haversine(destLat, destLng, it.second, it.third) } ?: continue

                    val walk1 = haversine(userLat, userLng, board1.second, board1.third).toInt()
                    val walk2 = haversine(destLat, destLng, drop2.second, drop2.third).toInt()
                    if (walk1 > 2500 || walk2 > 1200) continue

                    val dist1 = Math.max(1.0, haversine(board1.second, board1.third, drop1.second, drop1.third) / 1000.0)
                    val dist2 = Math.max(1.0, haversine(board2.second, board2.third, drop2.second, drop2.third) / 1000.0)

                    val fare1 = com.ororuta.app.domain.fare.TraditionalJeepneyFareService.calculateFareForDistance(dist1, com.ororuta.app.domain.fare.PassengerCategory.REGULAR, r1.jeepneyType)
                    val fare2 = com.ororuta.app.domain.fare.TraditionalJeepneyFareService.calculateFareForDistance(dist2, com.ororuta.app.domain.fare.PassengerCategory.REGULAR, r2.jeepneyType)

                    val totalFare = fare1.regularFare + fare2.regularFare
                    val totalMins = Math.max(18, ((walk1 + walk2) / 80.0 + (dist1 + dist2) / 20.0 * 60 + 5).toInt())
                    val score = (walk2 * 3.5) + (walk1 * 1.5) + ((walk1 + walk2) * 1.0) + (totalMins * 15.0) + 500.0 + (totalFare * 2.0)

                    val option = TripOption(
                        id = "transfer_${r1.id}_${r2.id}",
                        originPlaceId = r1.id,
                        destinationPlaceId = r2.id,
                        minutes = totalMins,
                        walkMeters = walk1 + walk2,
                        transfers = 1,
                        direction = "Transfer via $hubName",
                        boardingName = board1.first,
                        boardingLat = board1.second,
                        boardingLng = board1.third,
                        dropoffName = drop2.first,
                        dropoffLat = drop2.second,
                        dropoffLng = drop2.third,
                        transferName = hubName,
                        transferLat = hubLat,
                        transferLng = hubLng,
                        segments = listOf(
                            TripSegment(
                                tripOptionId = "transfer_${r1.id}_${r2.id}",
                                seq = 1,
                                routeId = r1.id,
                                code = r1.code,
                                routeName = r1.name,
                                color = r1.color,
                                jeepneyType = r1.jeepneyType,
                                km = dist1,
                                minutes = (dist1 / 20.0 * 60).toInt(),
                                fare = fare1.regularFare,
                                discountFare = fare1.discountedFare
                            ),
                            TripSegment(
                                tripOptionId = "transfer_${r1.id}_${r2.id}",
                                seq = 2,
                                routeId = r2.id,
                                code = r2.code,
                                routeName = r2.name,
                                color = r2.color,
                                jeepneyType = r2.jeepneyType,
                                km = dist2,
                                minutes = (dist2 / 20.0 * 60).toInt(),
                                fare = fare2.regularFare,
                                discountFare = fare2.discountedFare
                            )
                        ),
                        totalKm = dist1 + dist2,
                        regularFare = totalFare,
                        discountFare = fare1.discountedFare + fare2.discountedFare,
                        matchReason = "1 Transfer required"
                    )
                    transferOptions.add(Pair(score, option))
                }
            }
        }
        return transferOptions
    }

    /**
     * Build basic TripOption stubs from locally cached routes that match [destination].
     */
    private suspend fun buildLocalTrips(
        destination: String,
        toLat: Double?,
        toLng: Double?,
        fromLat: Double?,
        fromLng: Double?
    ): List<TripOption> {
        return enrichAndRankTrips(
            reqId = "local_build",
            source = "LOCAL_FALLBACK",
            trips = emptyList(),
            fromLat = fromLat,
            fromLng = fromLng,
            toLat = toLat,
            toLng = toLng,
            destinationName = destination
        )
    }

    private val cachedTripOptions = java.util.concurrent.ConcurrentHashMap<String, TripOption>()

    fun cacheTripOption(option: TripOption) {
        cachedTripOptions[option.id] = option
    }

    suspend fun getTripOption(id: String): Resource<TripOption> {
        cachedTripOptions[id]?.let { return Resource.Success(it) }
        return try {
            val trip = api.getTrip(id)
            cachedTripOptions[trip.id] = trip
            Resource.Success(trip)
        } catch (e: IOException) {
            Resource.Error("You're offline. Cannot load trip details.", isOffline = true)
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Failed to load trip option")
        }
    }


    suspend fun recordCompleted(tripOptionId: String?) {
        try { api.recordCompleted(mapOf("tripOptionId" to (tripOptionId ?: ""))) } catch (_: Exception) {}
    }
}

@Singleton
class PlaceRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val api: OroRutaApi,
    private val dao: PlaceDao,
    private val okHttpClient: OkHttpClient,
    private val json: Json
) {
    companion object {
        val CURATED_CDO_LANDMARKS = listOf(
            Place("pl-limketkai", "Limketkai Center", "Lapasan", "mall", 124.65600665305024, 8.481879913395911, 8.481879913395911, 124.65600665305024),
            Place("pl-sm-downtown", "SM CDO Downtown Premier", "Lapasan", "mall", 124.65492954347054, 8.484385998039096, 8.484385998039096, 124.65492954347054),
            Place("pl-centrio", "Centrio Mall", "Poblacion", "mall", 124.65132166064039, 8.48569470716317, 8.48569470716317, 124.65132166064039),
            Place("pl-cogon", "Cogon Market", "Cogon", "market", 124.65120822163647, 8.477160465033135, 8.477160465033135, 124.65120822163647),
            Place("pl-carmen", "Carmen Public Market", "Carmen", "market", 124.63681954401368, 8.479497843594105, 8.479497843594105, 124.63681954401368),
            Place("pl-patag", "Camp Evangelista", "Patag", "military", 124.625586, 8.487848, 8.487848, 124.625586),
            Place("pl-cathedral", "St. Augustine Metropolitan Cathedral", "Poblacion", "landmark", 124.6433, 8.4777, 8.4777, 124.6433),
            Place("pl-miami-inn", "Miami Inn Carmen", "Carmen", "landmark", 124.637633, 8.477285, 8.477285, 124.637633),
            Place("pl-madonna-hospital", "Madonna and Child Hospital", "Carmen", "hospital", 124.6352344, 8.4772152, 8.4772152, 124.6352344)
        )

        private val LANDMARK_ALIASES = mapOf(
            "pl-limketkai" to listOf("limketkai", "limkdtkai", "ketkai", "limket", "limketkai mall", "limketkai center"),
            "pl-sm-downtown" to listOf("sm downtown", "sm cdo downtown", "sm premier", "sm downtown premier", "smdt", "sm cd downtown", "sm cdo", "sm premier cdo"),
            "pl-centrio" to listOf("centrio", "ayala centrio", "centrio mall", "ayala mall"),
            "pl-cogon" to listOf("cogon", "cogon market", "cogon public market", "palengke cogon"),
            "pl-carmen" to listOf("carmen", "carmen market", "carmen public market", "palengke carmen"),
            "pl-patag" to listOf("patag", "camp evangelista", "evangelista"),
            "pl-cathedral" to listOf("cathedral", "st augustine", "san agustin", "st. augustine cathedral", "san agustin church"),
            "pl-miami-inn" to listOf("miami inn", "miami inn carmen", "vamenta miami", "miami carmen"),
            "pl-madonna-hospital" to listOf("madonna", "madonna hospital", "madonna & child", "madonna and child", "madonna & child hospital", "madonna and child hospital")
        )

        fun findCuratedLandmark(q: String): Place? {
            val cleanQ = q.trim().lowercase()
            if (cleanQ.isBlank()) return null

            for ((id, aliases) in LANDMARK_ALIASES) {
                if (aliases.any { alias ->
                        alias.equals(cleanQ, ignoreCase = true) ||
                        cleanQ.contains(alias) ||
                        alias.contains(cleanQ) ||
                        (cleanQ.length >= 4 && alias.take(4) == cleanQ.take(4))
                    }) {
                    val place = CURATED_CDO_LANDMARKS.find { it.id == id }
                    if (place != null) return place
                }
            }

            val tokens = cleanQ.replace(Regex("[-–—\\(\\)]"), " ")
                .split("\\s+".toRegex())
                .filter { it.length >= 2 && it !in setOf("cdo", "city", "near", "at", "the", "in", "to", "for", "st", "st.") }

            if (tokens.isEmpty()) return null

            return CURATED_CDO_LANDMARKS.maxByOrNull { lm ->
                val text = "${lm.name.lowercase()} ${(lm.area ?: "").lowercase()}"
                val matchCount = tokens.count { t -> text.contains(t) }
                if (matchCount > 0) matchCount * 10 + (if (lm.name.lowercase().contains(cleanQ)) 5 else 0) else -1
            }?.takeIf { lm ->
                val text = "${lm.name.lowercase()} ${(lm.area ?: "").lowercase()}"
                tokens.any { t -> text.contains(t) }
            }
        }
    }

    /**
     * Search places across CDO using:
     * 1. Curated verified CDO landmarks with typo/alias tolerance
     * 2. Backend /places API results + Room offline cache
     * 3. Google Maps Places API Autocomplete (when enabled)
     * 4. OpenStreetMap Nominatim Geocoding API bounded to Cagayan de Oro
     * 5. Android Geocoder fallback
     */
    @Suppress("DEPRECATION")
    suspend fun search(q: String, filter: String = "all"): Resource<List<Place>> = withContext(Dispatchers.IO) {
        val cleanQ = q.trim().lowercase()

        // 1. Check curated key CDO landmarks (instant offline guarantee)
        val curatedMatches = mutableListOf<Place>()
        if (cleanQ.isNotBlank()) {
            for ((id, aliases) in LANDMARK_ALIASES) {
                if (aliases.any { it.contains(cleanQ) || cleanQ.contains(it) || (cleanQ.length >= 4 && it.take(4) == cleanQ.take(4)) }) {
                    CURATED_CDO_LANDMARKS.find { it.id == id }?.let { curatedMatches.add(it) }
                }
            }
        } else if (filter == "all" || filter == "landmarks") {
            curatedMatches.addAll(CURATED_CDO_LANDMARKS)
        }

        // 2. Query backend /places API (or SQLite cache if offline)
        val apiResults = try {
            val results = api.getPlaces(cleanQ, filter = filter)
            val seen = mutableSetOf<String>()
            val unique = results.filter { seen.add(it.name.trim().lowercase()) }
            dao.insertAll(unique.map { CachedPlace(it.id, it.name, it.area, it.kind, it.mapX, it.mapY, it.lat, it.lng) })
            unique
        } catch (e: IOException) {
            val cached = dao.search(cleanQ)
            val seen = mutableSetOf<String>()
            cached.filter { seen.add(it.name.trim().lowercase()) }
                .map { Place(it.id, it.name, it.area, it.kind, it.mapX, it.mapY, it.lat, it.lng) }
        } catch (e: Exception) {
            emptyList()
        }

        // 3. Online geocoding & place search (Nominatim & Places API) when typing 2+ characters
        val onlinePlaces = mutableListOf<Place>()
        if (cleanQ.length >= 2) {
            // A. OpenStreetMap Nominatim bounded to Cagayan de Oro
            try {
                val encodedQ = URLEncoder.encode(cleanQ, "UTF-8")
                val nomUrl = "https://nominatim.openstreetmap.org/search?q=$encodedQ&viewbox=124.40,8.65,124.85,8.30&countrycodes=ph&format=json&addressdetails=1&limit=8"
                val request = Request.Builder()
                    .url(nomUrl)
                    .header("User-Agent", "OroRuta/1.0 (transit@ororuta.ph)")
                    .build()
                val response = okHttpClient.newCall(request).execute()
                if (response.isSuccessful) {
                    val bodyStr = response.body?.string()
                    if (!bodyStr.isNullOrBlank()) {
                        val array = JSONArray(bodyStr)
                        for (i in 0 until array.length()) {
                            val obj = array.getJSONObject(i)
                            val lat = obj.optDouble("lat", 0.0)
                            val lon = obj.optDouble("lon", 0.0)
                            if (lat in 8.30..8.65 && lon in 124.45..124.85) {
                                val rawName = obj.optString("name").ifBlank {
                                    obj.optString("display_name").split(",").firstOrNull()?.trim() ?: cleanQ
                                }
                                val addrObj = obj.optJSONObject("address")
                                val area = addrObj?.optString("suburb")?.ifBlank { null }
                                    ?: addrObj?.optString("neighbourhood")?.ifBlank { null }
                                    ?: addrObj?.optString("quarter")?.ifBlank { null }
                                    ?: addrObj?.optString("city")?.ifBlank { null }
                                    ?: "Cagayan de Oro City"
                                val rawType = obj.optString("type", "")
                                val rawClass = obj.optString("class", "")
                                val kind = when {
                                    rawType.contains("hospital", true) || rawName.contains("Hospital", true) -> "hospital"
                                    rawType.contains("mall", true) || rawClass.contains("shop", true) || rawName.contains("Mall", true) || rawName.contains("SM", true) -> "mall"
                                    rawType.contains("school", true) || rawType.contains("university", true) || rawType.contains("college", true) || rawName.contains("School", true) || rawName.contains("University", true) -> "school"
                                    rawType.contains("market", true) || rawName.contains("Market", true) -> "market"
                                    rawType.contains("bus", true) || rawType.contains("terminal", true) || rawName.contains("Terminal", true) -> "terminal"
                                    rawType.contains("highway", true) || rawType.contains("residential", true) || rawClass.contains("highway", true) || rawName.contains("Street", true) || rawName.contains("Avenue", true) || rawName.contains("Road", true) -> "street"
                                    rawType.contains("church", true) || rawName.contains("Cathedral", true) || rawName.contains("Church", true) -> "church"
                                    else -> "landmark"
                                }
                                onlinePlaces.add(
                                    Place(
                                        id = "geo_${lat}_${lon}",
                                        name = rawName,
                                        area = area,
                                        kind = kind,
                                        mapX = lon,
                                        mapY = lat,
                                        lat = lat,
                                        lng = lon
                                    )
                                )
                            }
                        }
                    }
                }
            } catch (_: Exception) {}

            // B. Android System Geocoder fallback for street addresses
            try {
                val geocoder = Geocoder(context, Locale.getDefault())
                val addresses = geocoder.getFromLocationName("$cleanQ, Cagayan de Oro", 5, 8.35, 124.50, 8.60, 124.80)
                addresses?.filter { addr ->
                    addr.hasLatitude() && addr.hasLongitude() &&
                    addr.latitude in 8.30..8.65 && addr.longitude in 124.45..124.85
                }?.forEach { addr ->
                    val rawName = addr.featureName ?: addr.thoroughfare ?: addr.subLocality ?: addr.locality ?: return@forEach
                    val lower = rawName.trim().lowercase()
                    if ((lower == "cagayan de oro" || lower == "cagayan de oro city" || lower == "misamis oriental") &&
                        !cleanQ.contains("cagayan") && !cleanQ.contains("cdo") && !cleanQ.contains("oro")) {
                        return@forEach
                    }
                    val area = addr.subLocality ?: addr.locality ?: "Cagayan de Oro City"
                    onlinePlaces.add(
                        Place(
                            id = "geoc_${addr.latitude}_${addr.longitude}",
                            name = rawName,
                            area = area,
                            kind = "street",
                            mapX = addr.longitude,
                            mapY = addr.latitude,
                            lat = addr.latitude,
                            lng = addr.longitude
                        )
                    )
                }
            } catch (_: Exception) {}
        }

        // 4. Merge, deduplicate by normalized name and close proximity
        val combined = (curatedMatches + apiResults + onlinePlaces)
        val seenNames = mutableSetOf<String>()
        val seenCoords = mutableListOf<Pair<Double, Double>>()
        val uniquePlaces = mutableListOf<Place>()

        for (p in combined) {
            if (p.lat == 0.0 || p.lng == 0.0) continue
            val normName = p.name.trim().lowercase()
            val isDuplicateCoord = seenCoords.any { (lat, lng) ->
                Math.abs(lat - p.lat) < 0.0003 && Math.abs(lng - p.lng) < 0.0003
            }
            if (seenNames.add(normName) && !isDuplicateCoord) {
                seenCoords.add(Pair(p.lat, p.lng))
                uniquePlaces.add(p)
            }
        }

        // Cache any new geocoded places in Room for offline resilience
        if (uniquePlaces.isNotEmpty()) {
            try {
                dao.insertAll(uniquePlaces.map { CachedPlace(it.id, it.name, it.area, it.kind, it.mapX, it.mapY, it.lat, it.lng) })
            } catch (_: Exception) {}
        }

        if (uniquePlaces.isNotEmpty()) {
            Resource.Success(uniquePlaces)
        } else {
            Resource.Error("No matching places found. Try searching by landmark, hospital, mall, market, or street name.")
        }
    }
}

@Singleton
class AnnouncementRepository @Inject constructor(
    private val api: OroRutaApi,
    private val dao: AnnouncementDao,
    private val json: Json
) {
    fun getAnnouncements(status: String? = null): Flow<Resource<List<Announcement>>> = flow {
        emit(Resource.Loading)
        val queryStatus = status?.takeIf { it.isNotBlank() } ?: ""
        try {
            val remote = api.getAnnouncements(queryStatus)
            dao.insertAll(remote.map {
                CachedAnnouncement(
                    id = it.id,
                    title = it.title,
                    date = it.date,
                    category = it.category,
                    status = it.status,
                    jsonData = json.encodeToString(it)
                )
            })
            emit(Resource.Success(remote))
        } catch (e: IOException) {
            val cached = if (queryStatus.isNotBlank()) dao.getByStatusSync(queryStatus) else dao.getAllSync()
            if (cached.isNotEmpty()) {
                val list = cached.mapNotNull { safeDecode(it) }
                emit(Resource.Success(list, isOffline = true))
            } else {
                emit(Resource.Error("You are offline. Connect to the internet to load transportation updates.", isOffline = true))
            }
        } catch (e: Exception) {
            val cached = if (queryStatus.isNotBlank()) dao.getByStatusSync(queryStatus) else dao.getAllSync()
            if (cached.isNotEmpty()) {
                val list = cached.mapNotNull { safeDecode(it) }
                emit(Resource.Success(list, isOffline = true))
            } else {
                emit(Resource.Error(e.message ?: "Could not load updates"))
            }
        }
    }

    suspend fun getAnnouncement(id: String): Resource<Announcement> = try {
        Resource.Success(api.getAnnouncement(id))
    } catch (e: Exception) { Resource.Error(e.message ?: "Error") }

    private fun safeDecode(cached: CachedAnnouncement): Announcement? {
        return try {
            if (cached.jsonData.isNotBlank()) {
                json.decodeFromString<Announcement>(cached.jsonData)
            } else {
                Announcement(id = cached.id, title = cached.title, date = cached.date, category = cached.category, status = cached.status)
            }
        } catch (_: Exception) {
            Announcement(id = cached.id, title = cached.title, date = cached.date, category = cached.category, status = cached.status)
        }
    }
}

@Singleton
class HistoryRepository @Inject constructor(
    private val api: OroRutaApi, private val dao: HistoryDao
) {
    fun getHistory(): Flow<List<LocalHistory>> = dao.getAll().map { list ->
        // Deduplicate in-memory by normalized (from, to) to guarantee zero UI duplicates
        val seen = mutableSetOf<String>()
        val result = mutableListOf<LocalHistory>()
        for (item in list) {
            val key = "${item.from.trim().lowercase()}->${item.to.trim().lowercase()}"
            if (seen.add(key)) {
                result.add(item)
            }
        }
        result.take(10)
    }

    suspend fun add(from: String, to: String) {
        val cleanFrom = from.trim()
        val cleanTo = to.trim()
        if (cleanFrom.isBlank() || cleanTo.isBlank()) return

        try { api.addHistory(mapOf("from" to cleanFrom, "to" to cleanTo)) } catch (_: Exception) {}

        val existing = dao.findExact(cleanFrom, cleanTo)
        if (existing != null) {
            val now = System.currentTimeMillis()
            dao.updateTimestamp(existing.id, now)
            dao.deleteDuplicates(cleanFrom, cleanTo, existing.id)
        } else {
            val deterministicId = UUID.nameUUIDFromBytes("${cleanFrom.lowercase()}->${cleanTo.lowercase()}".toByteArray()).toString()
            dao.insert(LocalHistory(deterministicId, cleanFrom, cleanTo, System.currentTimeMillis()))
        }
        dao.pruneOld(10)
    }

    suspend fun delete(id: String) {
        try { api.deleteHistory(id) } catch (_: Exception) {}
        dao.delete(id)
    }

    suspend fun clearAll() {
        try { api.clearHistory() } catch (_: Exception) {}
        dao.clearAll()
    }
}

@Singleton
class SavedRepository @Inject constructor(
    private val api: OroRutaApi,
    private val tripsDao: SavedTripsDao
) {
    fun getSavedTrips(): Flow<List<LocalSavedTrip>> = tripsDao.getAll()

    suspend fun saveTrip(fromLabel: String, toLabel: String, routeIds: List<String>, tripOptionId: String?): Resource<String> {
        return try {
            val resp = api.saveTrip(mapOf("fromLabel" to fromLabel, "toLabel" to toLabel,
                "routeIds" to routeIds, "tripOptionId" to (tripOptionId ?: "")))
            val id = resp["id"] ?: UUID.randomUUID().toString()
            tripsDao.insert(LocalSavedTrip(id, fromLabel, toLabel, routeIds.joinToString(","), tripOptionId))
            Resource.Success(id)
        } catch (e: Exception) {
            val id = UUID.randomUUID().toString()
            tripsDao.insert(LocalSavedTrip(id, fromLabel, toLabel, routeIds.joinToString(","), tripOptionId))
            Resource.Success(id)
        }
    }

    suspend fun deleteTrip(id: String) {
        try { api.deleteSavedTrip(id) } catch (_: Exception) {}
        tripsDao.delete(id)
    }
}

@Singleton
class ReportRepository @Inject constructor(
    private val api: OroRutaApi, private val dao: PendingReportDao
) {
    suspend fun submit(type: String, description: String, locationText: String?, lat: Double?, lng: Double?): Resource<ReportResponse> {
        return try {
            val resp = api.submitReport(ReportSubmission(type, description, locationText, lat, lng))
            Resource.Success(resp)
        } catch (e: IOException) {
            // Queue for later
            dao.insert(PendingReport(UUID.randomUUID().toString(), type, description, locationText, lat, lng))
            Resource.Error("Report queued — will be sent when you are back online.", isOffline = true)
        } catch (e: Exception) {
            Resource.Error(e.message ?: "Submission failed")
        }
    }
}

@Singleton
class ContentRepository @Inject constructor(private val api: OroRutaApi) {
    suspend fun getPage(slug: String): Resource<ContentPage> = try {
        Resource.Success(api.getContent(slug))
    } catch (e: Exception) { Resource.Error(e.message ?: "Error") }

    suspend fun getHelpTopics(): Resource<List<HelpTopic>> = try {
        Resource.Success(api.getHelpTopics())
    } catch (e: Exception) { Resource.Error(e.message ?: "Error") }

    suspend fun getFaqs(): Resource<List<Faq>> = try {
        Resource.Success(api.getFaqs())
    } catch (e: Exception) { Resource.Error(e.message ?: "Error") }
}

@Singleton
class FareRepository @Inject constructor(private val api: OroRutaApi) {
    suspend fun getRules(): Resource<List<FareRule>> = try {
        Resource.Success(api.getFareRules())
    } catch (e: Exception) { Resource.Error(e.message ?: "Error") }

    suspend fun estimate(routeId: String? = null, optionId: String? = null, category: String = "Regular"): Resource<FareEstimate> = try {
        Resource.Success(api.estimateFare(routeId, optionId, category))
    } catch (e: Exception) { Resource.Error(e.message ?: "Error") }
}

@Singleton
class NearbyRepository @Inject constructor(private val api: OroRutaApi) {
    suspend fun getNearby(lat: Double?, lng: Double?, kind: String = "route"): Resource<List<NearbyResult>> = try {
        val resp = api.getNearby(lat, lng, kind)
        Resource.Success(resp.results)
    } catch (e: Exception) {
        Resource.Error(e.message ?: "Could not load nearby items")
    }
}

@Singleton
class PreferencesRepository @Inject constructor(private val api: OroRutaApi) {
    suspend fun getPreferences(): Resource<DevicePreferences> = try {
        Resource.Success(api.getPreferences())
    } catch (e: Exception) { Resource.Error(e.message ?: "Error") }

    suspend fun updatePreferences(prefs: Map<String, Any>): Resource<Boolean> = try {
        api.updatePreferences(prefs)
        Resource.Success(true)
    } catch (e: Exception) { Resource.Error(e.message ?: "Error") }
}

