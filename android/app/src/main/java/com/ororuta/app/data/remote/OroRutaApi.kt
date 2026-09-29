package com.ororuta.app.data.remote

import com.ororuta.app.domain.models.*
import retrofit2.http.*

interface OroRutaApi {

    @POST("devices/register")
    suspend fun registerDevice(): Map<String, String>

    @GET("devices/me/preferences")
    suspend fun getPreferences(): DevicePreferences

    @PUT("devices/me/preferences")
    suspend fun updatePreferences(@Body prefs: Map<String, Any>): Map<String, Boolean>

    @GET("places")
    suspend fun getPlaces(
        @Query("q") q: String = "",
        @Query("kind") kind: String = "",
        @Query("filter") filter: String = "all"
    ): List<Place>

    @GET("routes")
    suspend fun getRoutes(
        @Query("q") q: String = "",
        @Query("type") type: String = "",
        @Query("hasUpdates") hasUpdates: String = ""
    ): List<Route>

    @GET("routes/{id}")
    suspend fun getRoute(@Path("id") id: String): Route

    @GET("routes/{id}/offline-bundle")
    suspend fun getOfflineBundle(@Path("id") id: String): Map<String, Any>

    @GET("trips/search")
    suspend fun searchTrips(
        @Query("from") from: String,
        @Query("to") to: String,
        @Query("fromLat") fromLat: Double? = null,
        @Query("fromLng") fromLng: Double? = null,
        @Query("sort") sort: String = "time"
    ): List<TripOption>

    @GET("trips/{id}")
    suspend fun getTrip(@Path("id") id: String): TripOption

    @POST("trips/completed")
    suspend fun recordCompleted(@Body body: Map<String, String>): Map<String, Boolean>

    @GET("fares/rules")
    suspend fun getFareRules(): List<FareRule>

    @GET("fares/estimate")
    suspend fun estimateFare(
        @Query("routeId") routeId: String? = null,
        @Query("optionId") optionId: String? = null,
        @Query("category") category: String = "Regular"
    ): FareEstimate

    @GET("nearby")
    suspend fun getNearby(
        @Query("lat") lat: Double? = null,
        @Query("lng") lng: Double? = null,
        @Query("kind") kind: String = "route",
        @Query("radius") radius: Int = 2000
    ): NearbyResponse

    @GET("announcements")
    suspend fun getAnnouncements(@Query("status") status: String = ""): List<Announcement>

    @GET("announcements/{id}")
    suspend fun getAnnouncement(@Path("id") id: String): Announcement

    @GET("history")
    suspend fun getHistory(): List<SearchHistory>

    @POST("history")
    suspend fun addHistory(@Body body: Map<String, String>): Map<String, String>

    @DELETE("history/{id}")
    suspend fun deleteHistory(@Path("id") id: String): Map<String, Boolean>

    @DELETE("history")
    suspend fun clearHistory(): Map<String, Boolean>

    @GET("saved-trips")
    suspend fun getSavedTrips(): List<SavedTrip>

    @POST("saved-trips")
    suspend fun saveTrip(@Body body: Map<String, Any>): Map<String, String>

    @DELETE("saved-trips/{id}")
    suspend fun deleteSavedTrip(@Path("id") id: String): Map<String, Boolean>

    @GET("saved-destinations")
    suspend fun getSavedDestinations(): List<SavedDestination>

    @POST("saved-destinations")
    suspend fun saveDestination(@Body body: Map<String, String>): Map<String, String>

    @DELETE("saved-destinations/{id}")
    suspend fun deleteDestination(@Path("id") id: String): Map<String, Boolean>

    @POST("reports")
    suspend fun submitReport(@Body report: ReportSubmission): ReportResponse

    @GET("reports/mine")
    suspend fun getMyReports(): List<Map<String, Any>>

    @GET("content/{slug}")
    suspend fun getContent(@Path("slug") slug: String): ContentPage

    @GET("help/topics")
    suspend fun getHelpTopics(): List<HelpTopic>

    @GET("help/faqs")
    suspend fun getFaqs(): List<Faq>

    @GET("map/base")
    suspend fun getMapBase(): List<Map<String, Any>>

    @GET("offline/map-pack")
    suspend fun getMapPack(): Map<String, Any>
}

data class NearbyResponse(
    val results: List<NearbyResult>,
    val userLat: Double,
    val userLng: Double,
    val notice: String
)
