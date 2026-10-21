package com.ororuta.app.domain.models

import kotlinx.serialization.KSerializer
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.descriptors.PrimitiveKind
import kotlinx.serialization.descriptors.PrimitiveSerialDescriptor
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.JsonDecoder
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive

@Serializable
data class Place(
    val id: String,
    val name: String,
    val area: String? = null,
    val kind: String = "landmark",
    @SerialName("map_x") val mapX: Double = 0.0,
    @SerialName("map_y") val mapY: Double = 0.0,
    val lat: Double = 0.0,
    val lng: Double = 0.0
)

@Serializable
data class RouteDirection(
    val id: String,
    @SerialName("route_id") val routeId: String,
    val direction: String,
    @SerialName("distance_km") val distanceKm: Double = 0.0,
    @SerialName("street_sequence") val streetSequence: String = ""
)

object FlexibleJsonStringSerializer : KSerializer<String?> {
    override val descriptor: SerialDescriptor = PrimitiveSerialDescriptor("FlexibleJsonString", PrimitiveKind.STRING)

    override fun serialize(encoder: Encoder, value: String?) {
        if (value == null) {
            encoder.encodeNull()
        } else {
            encoder.encodeString(value)
        }
    }

    override fun deserialize(decoder: Decoder): String? {
        val jsonDecoder = decoder as? JsonDecoder ?: return try { decoder.decodeString() } catch (_: Exception) { null }
        val element = jsonDecoder.decodeJsonElement()
        return when (element) {
            is JsonNull -> null
            is JsonPrimitive -> element.content
            else -> element.toString()
        }
    }
}

@Serializable
data class RouteGeometry(
    val id: String,
    @SerialName("route_id") val routeId: String,
    val direction: String,
    @Serializable(with = FlexibleJsonStringSerializer::class)
    val geometry: String? = null
)

@Serializable
data class Route(
    val id: String,
    val code: String,
    val name: String,
    val origin: String,
    val destination: String,
    @SerialName("jeepney_type") val jeepneyType: String = "Traditional",
    val direction: String? = null,
    val description: String? = null,
    @SerialName("length_km") val lengthKm: Double = 0.0,
    @SerialName("inbound_distance_km") val inboundDistanceKm: Double = 0.0,
    @SerialName("outbound_distance_km") val outboundDistanceKm: Double = 0.0,
    val status: String = "Active",
    @SerialName("verification_status") val verificationStatus: String = "DRAFT",
    val color: String = "#1471B0",
    @SerialName("offline_size_mb") val offlineSizeMb: Double = 0.5,
    @SerialName("last_updated_at") val lastUpdatedAt: String? = null,
    @SerialName("terminal_count") val terminalCount: Int = 0,
    @SerialName("stop_count") val stopCount: Int = 0,
    val terminals: List<Terminal> = emptyList(),
    val stops: List<LoadingPoint> = emptyList(),
    val transfers: List<TransferPoint> = emptyList(),
    val roads: List<Road> = emptyList(),
    val landmarks: List<Landmark> = emptyList(),
    val path: List<PathPoint> = emptyList(),
    val directions: List<RouteDirection> = emptyList(),
    val geometries: List<RouteGeometry> = emptyList(),
    val announcements: List<Announcement> = emptyList(),
    val fare: Double = 13.0,
    val travelTime: Int = 30
)

@Serializable
data class Terminal(
    val id: String,
    val name: String,
    val note: String? = null,
    @SerialName("map_x") val mapX: Double = 0.0,
    @SerialName("map_y") val mapY: Double = 0.0,
    val lat: Double = 0.0,
    val lng: Double = 0.0
)

@Serializable
data class LoadingPoint(
    val id: String,
    @SerialName("route_id") val routeId: String,
    val name: String,
    val note: String? = null,
    @SerialName("point_type") val pointType: String = "loading",
    @SerialName("map_x") val mapX: Double = 0.0,
    @SerialName("map_y") val mapY: Double = 0.0,
    val lat: Double = 0.0,
    val lng: Double = 0.0
)

@Serializable
data class TransferPoint(
    val id: String,
    @SerialName("route_id") val routeId: String,
    val name: String,
    val note: String? = null,
    @SerialName("map_x") val mapX: Double = 0.0,
    @SerialName("map_y") val mapY: Double = 0.0,
    val lat: Double = 0.0,
    val lng: Double = 0.0
)

@Serializable
data class Road(val id: String, val name: String)

@Serializable
data class Landmark(
    val id: String, val name: String,
    @SerialName("map_x") val mapX: Double = 0.0,
    @SerialName("map_y") val mapY: Double = 0.0,
    val lat: Double = 0.0, val lng: Double = 0.0
)

@Serializable
data class PathPoint(
    @SerialName("route_id") val routeId: String,
    val seq: Int,
    @SerialName("map_x") val mapX: Double,
    @SerialName("map_y") val mapY: Double,
    val lat: Double,
    val lng: Double
)

@Serializable
data class TripOption(
    val id: String,
    @SerialName("origin_place_id") val originPlaceId: String,
    @SerialName("destination_place_id") val destinationPlaceId: String,
    val minutes: Int,
    @SerialName("walk_meters") val walkMeters: Int,
    val transfers: Int,
    val direction: String? = null,
    val status: String = "Active",
    @SerialName("boarding_name") val boardingName: String? = null,
    @SerialName("boarding_lat") val boardingLat: Double? = null,
    @SerialName("boarding_lng") val boardingLng: Double? = null,
    @SerialName("dropoff_name") val dropoffName: String? = null,
    @SerialName("dropoff_lat") val dropoffLat: Double? = null,
    @SerialName("dropoff_lng") val dropoffLng: Double? = null,
    @SerialName("transfer_name") val transferName: String? = null,
    val segments: List<TripSegment> = emptyList(),
    val legs: List<TripLeg> = emptyList(),
    @SerialName("totalKm") val totalKm: Double = 0.0,
    @SerialName("regularFare") val regularFare: Double = 0.0,
    @SerialName("discountFare") val discountFare: Double = 0.0,
    @SerialName("originPlace") val originPlace: Place? = null,
    @SerialName("destPlace") val destPlace: Place? = null,
    @SerialName("geometry_coordinates") val geometryCoordinates: List<List<Double>> = emptyList(),
    @SerialName("walk_to_board_coordinates") val walkToBoardCoordinates: List<List<Double>> = emptyList(),
    @SerialName("jeepney_coordinates") val jeepneyCoordinates: List<List<Double>> = emptyList(),
    @SerialName("walk_from_drop_coordinates") val walkFromDropCoordinates: List<List<Double>> = emptyList()
)

@Serializable
data class TripSegment(
    @SerialName("trip_option_id") val tripOptionId: String = "",
    val seq: Int = 0,
    @SerialName("route_id") val routeId: String = "",
    val code: String = "",
    @SerialName("route_name") val routeName: String = "",
    val color: String = "#1471B0",
    @SerialName("jeepney_type") val jeepneyType: String = "Traditional",
    @SerialName("route_status") val routeStatus: String = "Active",
    val km: Double = 0.0,
    val direction: String? = null,
    @SerialName("boarding_name") val boardingName: String? = null,
    @SerialName("boarding_lat") val boardingLat: Double? = null,
    @SerialName("boarding_lng") val boardingLng: Double? = null,
    @SerialName("dropoff_name") val dropoffName: String? = null,
    @SerialName("dropoff_lat") val dropoffLat: Double? = null,
    @SerialName("dropoff_lng") val dropoffLng: Double? = null,
    @SerialName("geometry_coordinates") val geometryCoordinates: List<List<Double>> = emptyList()
)

@Serializable
data class TripLeg(
    @SerialName("trip_option_id") val tripOptionId: String = "",
    val seq: Int = 0,
    val kind: String = "walk", // walk|board|stay|alight|transfer
    val title: String = "",
    val detail: String? = null,
    val minutes: Int = 0,
    @SerialName("distance_m") val distanceM: Int = 0,
    @SerialName("route_id") val routeId: String? = null,
    @SerialName("route_code") val routeCode: String? = null,
    @SerialName("route_color") val routeColor: String? = null,
    @SerialName("point_x") val pointX: Double? = null,
    @SerialName("point_y") val pointY: Double? = null,
    @SerialName("start_lat") val startLat: Double? = null,
    @SerialName("start_lng") val startLng: Double? = null,
    @SerialName("end_lat") val endLat: Double? = null,
    @SerialName("end_lng") val endLng: Double? = null,
    @SerialName("point_lat") val pointLat: Double? = null,
    @SerialName("point_lng") val pointLng: Double? = null,
    val direction: String? = null,
    @SerialName("geometry_coordinates") val geometryCoordinates: List<List<Double>> = emptyList()
)

@Serializable
data class Announcement(
    val id: String,
    val title: String,
    val date: String,
    val category: String,
    val description: String? = null,
    val effective: String? = null,
    val status: String = "Active",
    val routes: List<AnnouncementRoute> = emptyList(),
    val details: List<AnnouncementDetail> = emptyList()
)

@Serializable
data class AnnouncementRoute(val id: String, val code: String, val name: String, val color: String)

@Serializable
data class AnnouncementDetail(
    @SerialName("announcement_id") val announcementId: String,
    val seq: Int,
    val text: String
)

@Serializable
data class FareRule(
    val id: Int,
    val minimum: Double,
    @SerialName("minimum_km") val minimumKm: Double,
    @SerialName("per_km") val perKm: Double,
    @SerialName("discount_rate") val discountRate: Double,
    @SerialName("effective_from") val effectiveFrom: String,
    @SerialName("is_current") val isCurrent: Boolean
)

@Serializable
data class FareEstimate(
    val category: String,
    val totalKm: Double,
    val totalFare: Double,
    val regularFare: Double,
    val discountRate: Double,
    val rule: FareRuleShort,
    val breakdown: List<FareBreakdown>,
    val notice: String
)

@Serializable
data class FareRuleShort(val minimum: Double, val minimumKm: Double, val perKm: Double)

@Serializable
data class FareBreakdown(val routeCode: String, val routeName: String, val km: Double, val fare: Double, val regularFare: Double)

@Serializable
data class NearbyResult(
    val id: String,
    val name: String,
    @SerialName("distance_m") val distanceM: Int,
    val kind: String? = null,
    val code: String? = null,
    val color: String? = null,
    val status: String? = null,
    val lat: Double = 0.0,
    val lng: Double = 0.0
)

@Serializable
data class SavedTrip(
    val id: String,
    @SerialName("device_id") val deviceId: String,
    @SerialName("from_label") val fromLabel: String,
    @SerialName("to_label") val toLabel: String,
    @SerialName("route_ids") val routeIds: String,
    @SerialName("trip_option_id") val tripOptionId: String? = null,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class SavedDestination(
    val id: String,
    @SerialName("device_id") val deviceId: String,
    val label: String,
    @SerialName("place_name") val placeName: String,
    val icon: String = "pin",
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class SearchHistory(
    val id: String,
    @SerialName("device_id") val deviceId: String,
    @SerialName("current_location") val currentLocation: String,
    val destination: String,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class ContentPage(
    val slug: String,
    val title: String,
    val sections: List<ContentSection>
)

@Serializable
data class ContentSection(val heading: String, val body: String)

@Serializable
data class HelpTopic(val id: Int, val seq: Int, val title: String, val body: String)

@Serializable
data class Faq(val id: Int, val seq: Int, val q: String, val a: String)

@Serializable
data class DevicePreferences(
    val language: String = "en",
    @SerialName("precise_location") val preciseLocation: Boolean = false,
    @SerialName("manual_start_place_id") val manualStartPlaceId: String? = null,
    @SerialName("route_changes") val routeChanges: Boolean = true,
    val closures: Boolean = true,
    val terminals: Boolean = true,
    @SerialName("offline_updates") val offlineUpdates: Boolean = true
)

@Serializable
data class ReportSubmission(
    val type: String,
    val description: String,
    val locationText: String? = null,
    val lat: Double? = null,
    val lng: Double? = null
)

@Serializable
data class ReportResponse(val id: String, val referenceNo: String)

sealed class Resource<out T> {
    object Loading : Resource<Nothing>()
    data class Success<out T>(val data: T, val isOffline: Boolean = false) : Resource<T>()
    data class Error(val message: String, val isOffline: Boolean = false) : Resource<Nothing>()
}
