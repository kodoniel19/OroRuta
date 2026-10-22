package com.ororuta.app.ui

import androidx.compose.animation.*
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.ororuta.app.ui.screens.*
import com.ororuta.app.ui.theme.*
import com.ororuta.app.ui.viewmodels.*
import java.net.URLDecoder
import java.net.URLEncoder

sealed class BottomTab(val route: String, val title: String, val icon: ImageVector) {
    object Home : BottomTab("home", "Home", Icons.Default.Home)
    object Routes : BottomTab("routes", "Routes", Icons.Default.AltRoute)
    object Map : BottomTab("map", "Map", Icons.Default.Map)
    object Saved : BottomTab("saved", "Saved", Icons.Default.Bookmark)
    object More : BottomTab("more", "More", Icons.Default.MoreHoriz)
}

val bottomTabs = listOf(
    BottomTab.Home,
    BottomTab.Routes,
    BottomTab.Map,
    BottomTab.Saved,
    BottomTab.More
)

private fun navigateToResults(
    navController: NavHostController,
    from: String,
    to: String,
    fromLat: Double? = null,
    fromLng: Double? = null,
    toLat: Double? = null,
    toLng: Double? = null,
    sort: String = "time"
) {
    val cleanFrom = from.ifBlank { "Current Location" }
    val cleanTo = to.ifBlank { "Destination" }
    val encodedFrom = try { URLEncoder.encode(cleanFrom, "UTF-8") } catch (_: Exception) { cleanFrom }
    val encodedTo = try { URLEncoder.encode(cleanTo, "UTF-8") } catch (_: Exception) { cleanTo }
    val fLatStr = fromLat?.toString() ?: ""
    val fLngStr = fromLng?.toString() ?: ""
    val tLatStr = toLat?.toString() ?: ""
    val tLngStr = toLng?.toString() ?: ""

    val targetRoute = "results?from=$encodedFrom&to=$encodedTo&sort=$sort&fromLat=$fLatStr&fromLng=$fLngStr&toLat=$tLatStr&toLng=$tLngStr"
    try {
        navController.navigate(targetRoute)
    } catch (_: Exception) {}
}

@Composable
fun OroRutaApp(initialRoute: String? = null) {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination

    // Check if current screen is one of the 5 bottom nav tabs
    val isBottomBarVisible = remember(currentDestination) {
        val currentRoute = currentDestination?.route ?: ""
        currentRoute == "home" ||
                currentRoute == "routes" ||
                currentRoute.startsWith("map") ||
                currentRoute == "saved" ||
                currentRoute == "more"
    }

    Scaffold(
        bottomBar = {
            if (isBottomBarVisible) {
                Surface(
                    color = Color.White,
                    shadowElevation = 8.dp,
                    border = androidx.compose.foundation.BorderStroke(0.5.dp, Line),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .navigationBarsPadding()
                            .padding(vertical = 6.dp, horizontal = 4.dp),
                        horizontalArrangement = Arrangement.SpaceAround,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        bottomTabs.forEach { tab ->
                            val currentRouteStr = currentDestination?.route ?: ""
                            val isSelected = currentRouteStr == tab.route || (tab.route == "map" && currentRouteStr.startsWith("map"))

                            val tabInteraction = remember { MutableInteractionSource() }
                            val isTabPressed by tabInteraction.collectIsPressedAsState()
                            val tabScale by animateFloatAsState(
                                targetValue = if (isTabPressed) 0.90f else 1f,
                                animationSpec = spring(dampingRatio = 0.7f, stiffness = 800f),
                                label = "tabScale"
                            )
                            val animatedBgColor by animateColorAsState(
                                targetValue = if (isSelected) Brand50 else Color.Transparent,
                                animationSpec = tween(durationMillis = 200, easing = FastOutSlowInEasing),
                                label = "tabBgColor"
                            )
                            val animatedContentColor by animateColorAsState(
                                targetValue = if (isSelected) Brand600 else InkMuted,
                                animationSpec = tween(durationMillis = 200, easing = FastOutSlowInEasing),
                                label = "tabContentColor"
                            )

                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                modifier = Modifier
                                    .scale(tabScale)
                                    .clip(RoundedCornerShape(14.dp))
                                    .clickable(
                                        interactionSource = tabInteraction,
                                        indication = null
                                    ) {
                                        if (!isSelected) {
                                            navController.navigate(tab.route) {
                                                popUpTo(navController.graph.findStartDestination().id) {
                                                    saveState = true
                                                }
                                                launchSingleTop = true
                                                restoreState = true
                                            }
                                        }
                                    }
                                    .heightIn(min = 48.dp)
                                    .padding(horizontal = 8.dp, vertical = 4.dp),
                                verticalArrangement = Arrangement.Center
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(46.dp, 28.dp)
                                        .clip(RoundedCornerShape(14.dp))
                                        .background(animatedBgColor),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = tab.icon,
                                        contentDescription = tab.title,
                                        tint = animatedContentColor,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = tab.title,
                                    fontSize = 11.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                    color = animatedContentColor
                                )
                            }
                        }
                    }
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = initialRoute ?: "splash",
            modifier = Modifier.padding(bottom = innerPadding.calculateBottomPadding()),
            enterTransition = {
                fadeIn(animationSpec = tween(220, easing = FastOutSlowInEasing)) +
                slideInHorizontally(animationSpec = tween(260, easing = FastOutSlowInEasing)) { (it * 0.12f).toInt() }
            },
            exitTransition = {
                fadeOut(animationSpec = tween(180, easing = FastOutSlowInEasing)) +
                slideOutHorizontally(animationSpec = tween(240, easing = FastOutSlowInEasing)) { -(it * 0.12f).toInt() }
            },
            popEnterTransition = {
                fadeIn(animationSpec = tween(220, easing = FastOutSlowInEasing)) +
                slideInHorizontally(animationSpec = tween(260, easing = FastOutSlowInEasing)) { -(it * 0.12f).toInt() }
            },
            popExitTransition = {
                fadeOut(animationSpec = tween(180, easing = FastOutSlowInEasing)) +
                slideOutHorizontally(animationSpec = tween(240, easing = FastOutSlowInEasing)) { (it * 0.12f).toInt() }
            }
        ) {
            // Splash
            composable("splash") {
                SplashScreen(
                    onNavigateHome = {
                        navController.navigate("home") {
                            popUpTo("splash") { inclusive = true }
                        }
                    }
                )
            }

            // 1. Home tab
            composable("home") {
                val homeVm = hiltViewModel<HomeViewModel>()
                val uiState by homeVm.uiState.collectAsState()

                HomeScreen(
                    uiState = uiState,
                    onNavigateAnnouncements = { navController.navigate("announcements") },
                    onNavigateAnnouncementDetail = { id -> navController.navigate("announcement_detail/$id") },
                    onNavigateSaved = { navController.navigate("saved") },
                    onNavigateFare = { navController.navigate("fare") },
                    onNavigateResults = { from, to -> navController.navigate("results?from=$from&to=$to&sort=time") }
                )
            }

            // 2. Routes Directory tab
            composable("routes") {
                val routesVm = hiltViewModel<RoutesViewModel>()
                RoutesScreen(
                    viewModel = routesVm,
                    onSelectRoute = { routeId -> navController.navigate("route_info/$routeId") }
                )
            }

            // 3. Map tab
            composable(
                "map?placeId={placeId}&placeName={placeName}&lat={lat}&lng={lng}&kind={kind}&routeId={routeId}&direction={direction}",
                arguments = listOf(
                    navArgument("placeId") { defaultValue = "" },
                    navArgument("placeName") { defaultValue = "" },
                    navArgument("lat") { defaultValue = "0.0" },
                    navArgument("lng") { defaultValue = "0.0" },
                    navArgument("kind") { defaultValue = "landmark" },
                    navArgument("routeId") { defaultValue = "" },
                    navArgument("direction") { defaultValue = "Inbound" }
                )
            ) { backStack ->
                val placeId = backStack.arguments?.getString("placeId")?.ifBlank { null }
                val placeName = backStack.arguments?.getString("placeName")?.ifBlank { null }
                val lat = backStack.arguments?.getString("lat")?.toDoubleOrNull()
                val lng = backStack.arguments?.getString("lng")?.toDoubleOrNull()
                val kind = backStack.arguments?.getString("kind")?.ifBlank { null }
                val routeId = backStack.arguments?.getString("routeId")?.ifBlank { null }
                val direction = backStack.arguments?.getString("direction")?.ifBlank { null }
                MapScreen(
                    isPushed = false,
                    initialPlaceId = placeId,
                    initialPlaceName = placeName,
                    initialLat = lat,
                    initialLng = lng,
                    initialKind = kind,
                    initialRouteId = routeId,
                    initialDirection = direction,
                    onSearchClick = {},
                    onNavigateRouteInfo = { rIdOrPath ->
                        val target = if (rIdOrPath.startsWith("route_info/")) rIdOrPath else "route_info/$rIdOrPath"
                        navController.navigate(target)
                    },
                    onStartNavigation = { optId -> navController.navigate("navigation/$optId") },
                    onPlanTrip = { toName, toLat, toLng ->
                        val encoded = try { URLEncoder.encode(toName, "UTF-8") } catch (_: Exception) { toName }
                        navController.navigate("results?from=Current+Location&to=$encoded&toLat=$toLat&toLng=$toLng")
                    }
                )
            }

            // 4. Saved tab
            composable("saved") {
                val savedVm = hiltViewModel<SavedViewModel>()
                SavedScreen(
                    viewModel = savedVm,
                    onOpenRouteInfo = { routeId ->
                        val target = if (routeId.startsWith("route_info/")) routeId else "route_info/$routeId"
                        navController.navigate(target)
                    },
                    onNavigateResults = { from, to -> navigateToResults(navController, from, to) },
                    onNavigateRoutes = { navController.navigate("routes") },
                    onStartNav = { optId -> navController.navigate("navigation/$optId") }
                )
            }

            // 5. More tab
            composable("more") {
                val moreVm = hiltViewModel<MoreViewModel>()
                MoreScreen(
                    viewModel = moreVm,
                    onNavigateSaved = { navController.navigate("saved") },
                    onNavigateHistory = { navController.navigate("search_history") },
                    onNavigateNotifications = { navController.navigate("notifications") },
                    onNavigateLocationSettings = { navController.navigate("location_settings") },
                    onNavigateLanguage = { navController.navigate("language") },
                    onNavigateReport = { navController.navigate("report") },
                    onNavigateHelp = { navController.navigate("help") },
                    onNavigateAbout = { navController.navigate("about") },
                    onNavigatePrivacy = { navController.navigate("content/privacy") },
                    onNavigateTerms = { navController.navigate("content/terms") }
                )
            }

            composable(
                "results?from={from}&to={to}&sort={sort}&fromLat={fromLat}&fromLng={fromLng}&toLat={toLat}&toLng={toLng}",
                arguments = listOf(
                    navArgument("from") { defaultValue = "" },
                    navArgument("to") { defaultValue = "" },
                    navArgument("sort") { defaultValue = "time" },
                    navArgument("fromLat") { defaultValue = "" },
                    navArgument("fromLng") { defaultValue = "" },
                    navArgument("toLat") { defaultValue = "" },
                    navArgument("toLng") { defaultValue = "" }
                )
            ) { backStack ->
                val resultsVm = hiltViewModel<ResultsViewModel>()
                val from = backStack.arguments?.getString("from") ?: ""
                val to = backStack.arguments?.getString("to") ?: ""
                val sort = backStack.arguments?.getString("sort") ?: "time"
                val fromLat = backStack.arguments?.getString("fromLat")?.toDoubleOrNull()
                val fromLng = backStack.arguments?.getString("fromLng")?.toDoubleOrNull()
                val toLat = backStack.arguments?.getString("toLat")?.toDoubleOrNull()
                val toLng = backStack.arguments?.getString("toLng")?.toDoubleOrNull()
                ResultsScreen(
                    viewModel = resultsVm,
                    from = from,
                    to = to,
                    fromLat = fromLat,
                    fromLng = fromLng,
                    toLat = toLat,
                    toLng = toLng,
                    onBack = { navController.popBackStack() },
                    onEditSearch = { navController.navigate("map") },
                    onSelectTrip = { tripId, f, t -> navController.navigate("trip_detail/$tripId?from=$f&to=$t") },
                    onStartNavigation = { tripId -> navController.navigate("navigation/$tripId") },
                    onNavigateOffline = { navController.navigate("offline_routes") },
                    onNavigateRoutes = { navController.navigate("routes") },
                    onNavigateNearby = { navController.navigate("nearby") }
                )
            }

            composable(
                "trip_detail/{tripOptionId}?from={from}&to={to}",
                arguments = listOf(
                    navArgument("tripOptionId") { type = NavType.StringType },
                    navArgument("from") { defaultValue = "" },
                    navArgument("to") { defaultValue = "" }
                )
            ) { backStack ->
                val tripDetailVm = hiltViewModel<TripDetailViewModel>()
                val tripOptionId = backStack.arguments?.getString("tripOptionId") ?: ""
                val from = backStack.arguments?.getString("from") ?: ""
                val to = backStack.arguments?.getString("to") ?: ""
                TripDetailScreen(
                    viewModel = tripDetailVm,
                    tripOptionId = tripOptionId,
                    from = from,
                    to = to,
                    onBack = { navController.popBackStack() },
                    onOpenMapTrip = { optId -> navController.navigate("map_trip/$optId") },
                    onStartNavigation = { optId -> navController.navigate("navigation/$optId") },
                    onNavigateFare = { optId -> navController.navigate("fare?optionId=$optId") }
                )
            }

            composable(
                "navigation/{tripOptionId}",
                arguments = listOf(navArgument("tripOptionId") { type = NavType.StringType })
            ) { backStack ->
                val navVm = hiltViewModel<NavigationViewModel>()
                val tripOptionId = backStack.arguments?.getString("tripOptionId") ?: ""
                NavigationScreen(
                    viewModel = navVm,
                    tripOptionId = tripOptionId,
                    onExitToHome = {
                        navController.navigate("home") {
                            popUpTo("home") { inclusive = true }
                        }
                    },
                    onBackToDetails = { navController.popBackStack() },
                    onDestinationReached = {
                        navController.navigate("destination_reached") {
                            popUpTo("home")
                        }
                    }
                )
            }

            composable("destination_reached") {
                DestinationReachedScreen(
                    onBackHome = {
                        navController.navigate("home") {
                            popUpTo("home") { inclusive = true }
                        }
                    },
                    onReportIssue = { navController.navigate("report") }
                )
            }

            composable(
                "route_info/{routeId}?destination={destination}&destLat={destLat}&destLng={destLng}&direction={direction}&boardingName={boardingName}&boardingLat={boardingLat}&boardingLng={boardingLng}&dropoffName={dropoffName}&dropoffLat={dropoffLat}&dropoffLng={dropoffLng}&walkDistanceMeters={walkDistanceMeters}&onboardDistanceKm={onboardDistanceKm}",
                arguments = listOf(
                    navArgument("routeId") { type = NavType.StringType },
                    navArgument("destination") { type = NavType.StringType; nullable = true; defaultValue = null },
                    navArgument("destLat") { type = NavType.StringType; nullable = true; defaultValue = null },
                    navArgument("destLng") { type = NavType.StringType; nullable = true; defaultValue = null },
                    navArgument("direction") { type = NavType.StringType; nullable = true; defaultValue = null },
                    navArgument("boardingName") { type = NavType.StringType; nullable = true; defaultValue = null },
                    navArgument("boardingLat") { type = NavType.StringType; nullable = true; defaultValue = null },
                    navArgument("boardingLng") { type = NavType.StringType; nullable = true; defaultValue = null },
                    navArgument("dropoffName") { type = NavType.StringType; nullable = true; defaultValue = null },
                    navArgument("dropoffLat") { type = NavType.StringType; nullable = true; defaultValue = null },
                    navArgument("dropoffLng") { type = NavType.StringType; nullable = true; defaultValue = null },
                    navArgument("walkDistanceMeters") { type = NavType.StringType; nullable = true; defaultValue = null },
                    navArgument("onboardDistanceKm") { type = NavType.StringType; nullable = true; defaultValue = null }
                )
            ) { backStack ->
                val routeInfoVm = hiltViewModel<RouteInfoViewModel>()
                val routeId = backStack.arguments?.getString("routeId") ?: ""
                val rawDest = backStack.arguments?.getString("destination")
                val destination = rawDest?.let {
                    try { java.net.URLDecoder.decode(it, "UTF-8") } catch (_: Exception) { it }
                }
                val destLat = backStack.arguments?.getString("destLat")?.toDoubleOrNull()
                val destLng = backStack.arguments?.getString("destLng")?.toDoubleOrNull()
                val direction = backStack.arguments?.getString("direction")
                val rawBName = backStack.arguments?.getString("boardingName")
                val boardingName = rawBName?.let {
                    try { URLDecoder.decode(it, "UTF-8") } catch (_: Exception) { it }
                }
                val boardingLat = backStack.arguments?.getString("boardingLat")?.toDoubleOrNull()
                val boardingLng = backStack.arguments?.getString("boardingLng")?.toDoubleOrNull()
                val rawDName = backStack.arguments?.getString("dropoffName")
                val dropoffName = rawDName?.let {
                    try { URLDecoder.decode(it, "UTF-8") } catch (_: Exception) { it }
                }
                val dropoffLat = backStack.arguments?.getString("dropoffLat")?.toDoubleOrNull()
                val dropoffLng = backStack.arguments?.getString("dropoffLng")?.toDoubleOrNull()
                val walkDistanceMeters = backStack.arguments?.getString("walkDistanceMeters")?.toIntOrNull()
                val onboardDistanceKm = backStack.arguments?.getString("onboardDistanceKm")?.toDoubleOrNull()

                RouteInfoScreen(
                    viewModel = routeInfoVm,
                    routeId = routeId,
                    initialDestination = destination,
                    initialDestLat = destLat,
                    initialDestLng = destLng,
                    initialDirection = direction,
                    initialBoardingName = boardingName,
                    initialBoardingLat = boardingLat,
                    initialBoardingLng = boardingLng,
                    initialDropoffName = dropoffName,
                    initialDropoffLat = dropoffLat,
                    initialDropoffLng = dropoffLng,
                    initialWalkDistanceMeters = walkDistanceMeters,
                    initialOnboardDistanceKm = onboardDistanceKm,
                    onBack = { navController.popBackStack() },
                    onViewOnMap = { rId, dir ->
                        navController.navigate("map?routeId=$rId&direction=$dir")
                    },
                    onNavigateFare = { rId -> navController.navigate("fare?routeId=$rId") }
                )
            }

            composable(
                "nearby?kind={kind}",
                arguments = listOf(navArgument("kind") { defaultValue = "route" })
            ) {
                val nearbyVm = hiltViewModel<NearbyViewModel>()
                NearbyScreen(
                    viewModel = nearbyVm,
                    onBack = { navController.popBackStack() },
                    onOpenMap = { navController.navigate("map") },
                    onSelectNearby = { id, kind -> navController.navigate("nearby_detail/$id/$kind") }
                )
            }

            composable(
                "nearby_detail/{itemId}/{kind}",
                arguments = listOf(
                    navArgument("itemId") { type = NavType.StringType },
                    navArgument("kind") { type = NavType.StringType }
                )
            ) { backStack ->
                val itemId = backStack.arguments?.getString("itemId") ?: ""
                val kind = backStack.arguments?.getString("kind") ?: ""
                NearbyDetailScreen(
                    itemId = itemId,
                    kind = kind,
                    onBack = { navController.popBackStack() },
                    onViewOnMap = { navController.navigate("map") },
                    onPlanTrip = { navController.navigate("search") },
                    onSelectRoute = { routeId -> navController.navigate("route_info/$routeId") }
                )
            }

            composable("announcements") {
                val annVm = hiltViewModel<AnnouncementsViewModel>()
                AnnouncementsScreen(
                    viewModel = annVm,
                    onBack = { navController.popBackStack() },
                    onSelectAnnouncement = { id -> navController.navigate("announcement_detail/$id") }
                )
            }

            composable(
                "announcement_detail/{announcementId}",
                arguments = listOf(navArgument("announcementId") { type = NavType.StringType })
            ) { backStack ->
                val announcementId = backStack.arguments?.getString("announcementId") ?: ""
                AnnouncementDetailScreen(
                    announcementId = announcementId,
                    onBack = { navController.popBackStack() },
                    onViewAffectedRoute = { rId -> navController.navigate("route_info/$rId") }
                )
            }

            composable(
                "fare?routeId={routeId}&optionId={optionId}",
                arguments = listOf(
                    navArgument("routeId") { defaultValue = "" },
                    navArgument("optionId") { defaultValue = "" }
                )
            ) { backStack ->
                val fareVm = hiltViewModel<FareViewModel>()
                val routeId = backStack.arguments?.getString("routeId")?.ifBlank { null }
                val optionId = backStack.arguments?.getString("optionId")?.ifBlank { null }
                FareScreen(
                    viewModel = fareVm,
                    routeId = routeId,
                    optionId = optionId,
                    onBack = { navController.popBackStack() }
                )
            }

            composable("offline_routes") {
                val offlineVm = hiltViewModel<OfflineRoutesViewModel>()
                OfflineRoutesScreen(
                    viewModel = offlineVm,
                    onBack = { navController.popBackStack() },
                    onOpenRoute = { rId -> navController.navigate("route_info/$rId") }
                )
            }

            composable("search_history") {
                val homeVm = hiltViewModel<HomeViewModel>()
                val uiState by homeVm.uiState.collectAsState()
                SearchHistoryScreen(
                    historyList = if (uiState.allHistory.isNotEmpty()) uiState.allHistory else uiState.recentSearches,
                    onBack = { navController.popBackStack() },
                    onRepeatSearch = { f, t -> navController.navigate("results?from=$f&to=$t") },
                    onDeleteItem = { id -> homeVm.deleteHistory(id) },
                    onClearAll = { homeVm.clearHistory() }
                )
            }

            composable("report") {
                val reportVm = hiltViewModel<ReportViewModel>()
                ReportScreen(
                    viewModel = reportVm,
                    onBack = { navController.popBackStack() }
                )
            }

            composable("notifications") {
                val moreVm = hiltViewModel<MoreViewModel>()
                NotificationsScreen(viewModel = moreVm, onBack = { navController.popBackStack() })
            }

            composable("location_settings") {
                LocationSettingsScreen(
                    onBack = { navController.popBackStack() },
                    onSetManualStart = { navController.navigate("set_start_location") }
                )
            }

            composable("language") {
                val moreVm = hiltViewModel<MoreViewModel>()
                LanguageScreen(viewModel = moreVm, onBack = { navController.popBackStack() })
            }

            composable("help") {
                HelpScreen(
                    onBack = { navController.popBackStack() },
                    onNavigateReport = { navController.navigate("report") },
                    onNavigateAbout = { navController.navigate("about") }
                )
            }

            composable("about") {
                AboutScreen(onBack = { navController.popBackStack() })
            }

            composable(
                "content/{slug}",
                arguments = listOf(navArgument("slug") { type = NavType.StringType })
            ) { backStack ->
                val slug = backStack.arguments?.getString("slug") ?: "privacy"
                val title = if (slug == "privacy") "Privacy Policy" else "Terms & Disclaimer"
                ContentPageScreen(
                    title = title,
                    slug = slug,
                    onBack = { navController.popBackStack() }
                )
            }

            composable("set_start_location") {
                val homeVm = hiltViewModel<HomeViewModel>()
                SetStartLocationScreen(
                    onBack = { navController.popBackStack() },
                    onSelectLocation = { place ->
                        homeVm.setManualStart(place)
                        navController.popBackStack()
                    }
                )
            }

            composable(
                "map_trip/{tripOptionId}",
                arguments = listOf(navArgument("tripOptionId") { type = NavType.StringType })
            ) { backStack ->
                val tripOptionId = backStack.arguments?.getString("tripOptionId") ?: ""
                MapScreen(
                    isPushed = true,
                    focusedTripOptionId = tripOptionId,
                    onBack = { navController.popBackStack() },
                    onSearchClick = { navController.navigate("search") },
                    onNavigateRouteInfo = { rIdOrPath ->
                        val target = if (rIdOrPath.startsWith("route_info/")) rIdOrPath else "route_info/$rIdOrPath"
                        navController.navigate(target)
                    },
                    onStartNavigation = { optId -> navController.navigate("navigation/$optId") },
                    onPlanTrip = { toName, toLat, toLng ->
                        val encoded = try { URLEncoder.encode(toName, "UTF-8") } catch (_: Exception) { toName }
                        navController.navigate("results?from=Current+Location&to=$encoded&toLat=$toLat&toLng=$toLng")
                    }
                )
            }
        }
    }
}
