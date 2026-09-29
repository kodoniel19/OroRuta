package com.ororuta.app.ui.navigation

import kotlinx.serialization.Serializable

// Bottom nav roots
@Serializable object HomeRoute
@Serializable object RoutesRoute
@Serializable object MapRoute
@Serializable object SavedRoute
@Serializable object MoreRoute

// Pushed screens
@Serializable data class SearchRoute(val prefillFrom: String = "", val prefillTo: String = "")
@Serializable data class ResultsRoute(val from: String, val to: String, val sort: String = "time")
@Serializable data class TripDetailRoute(val tripOptionId: String, val from: String, val to: String)
@Serializable data class RouteInfoRoute(val routeId: String)
@Serializable data class NavigationRoute(val tripOptionId: String)
@Serializable data class NearbyRoute(val kind: String = "route")
@Serializable data class NearbyDetailRoute(val itemId: String, val kind: String)
@Serializable data class AnnouncementsRoute(val filter: String = "")
@Serializable data class AnnouncementDetailRoute(val announcementId: String)
@Serializable data class FareRoute(val routeId: String? = null, val optionId: String? = null)
@Serializable object OfflineRoutesRoute
@Serializable object SearchHistoryRoute
@Serializable object ReportRoute
@Serializable object NotificationsRoute
@Serializable object LocationSettingsRoute
@Serializable object LanguageRoute
@Serializable data class ContentRoute(val slug: String)
@Serializable object HelpRoute
@Serializable object AboutRoute
@Serializable object DestinationReachedRoute
@Serializable data class MapTripRoute(val tripOptionId: String)
@Serializable data class SetStartLocationRoute(val returnTo: String = "home")
