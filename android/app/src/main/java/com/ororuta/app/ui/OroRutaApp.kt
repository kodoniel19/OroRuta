package com.ororuta.app.ui

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.ororuta.app.ui.screens.*
import com.ororuta.app.ui.theme.*
import com.ororuta.app.ui.viewmodels.*

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

@Composable
fun OroRutaApp() {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination

    // Check if current screen is one of the 5 bottom nav tabs
    val isBottomBarVisible = remember(currentDestination) {
        val currentRoute = currentDestination?.route ?: ""
        currentRoute == "home" ||
                currentRoute == "routes" ||
                currentRoute == "map" ||
                currentRoute == "saved" ||
                currentRoute == "more"
    }

    Scaffold(
        bottomBar = {
            if (isBottomBarVisible) {
                Surface(
                    color = Color.White,
                    shadowElevation = 8.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .navigationBarsPadding()
                            .padding(vertical = 6.dp),
                        horizontalArrangement = Arrangement.SpaceAround,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        bottomTabs.forEach { tab ->
                            val isSelected = currentDestination?.route == tab.route

                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                modifier = Modifier
                                    .clip(RoundedCornerShape(12.dp))
                                    .clickable {
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
                                    .padding(horizontal = 12.dp, vertical = 4.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(48.dp, 28.dp)
                                        .clip(RoundedCornerShape(14.dp))
                                        .background(if (isSelected) Brand50 else Color.Transparent),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = tab.icon,
                                        contentDescription = tab.title,
                                        tint = if (isSelected) Brand600 else InkMuted,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = tab.title,
                                    fontSize = 11.sp,
                                    fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                                    color = if (isSelected) Brand600 else InkMuted
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
            startDestination = "splash",
            modifier = Modifier.padding(bottom = innerPadding.calculateBottomPadding()),
            enterTransition = { fadeIn() + slideInHorizontally { 50 } },
            exitTransition = { fadeOut() + slideOutHorizontally { -50 } },
            popEnterTransition = { fadeIn() + slideInHorizontally { -50 } },
            popExitTransition = { fadeOut() + slideOutHorizontally { 50 } }
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
                    onAllowLocation = { homeVm.allowLocation() },
                    onDenyLocation = { homeVm.denyLocation() },
                    onSelectNearbyTab = { homeVm.selectNearbyTab(it) },
                    onNavigateSearch = { from, to -> navController.navigate("search?from=$from&to=$to") },
                    onNavigateResults = { from, to -> navController.navigate("results?from=$from&to=$to&sort=time") },
                    onNavigateAnnouncements = { navController.navigate("announcements") },
                    onNavigateAnnouncementDetail = { id -> navController.navigate("announcement_detail/$id") },
                    onNavigateNearby = { navController.navigate("nearby") },
                    onNavigateNearbyDetail = { id, kind -> navController.navigate("nearby_detail/$id/$kind") },
                    onNavigateMap = { navController.navigate("map") },
                    onNavigateRoutes = { navController.navigate("routes") },
                    onNavigateSaved = { navController.navigate("saved") },
                    onNavigateOffline = { navController.navigate("offline_routes") },
                    onNavigateFare = { navController.navigate("fare") },
                    onNavigateReport = { navController.navigate("report") },
                    onNavigateSetStart = { navController.navigate("set_start_location") }
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
            composable("map") {
                MapScreen(
                    isPushed = false,
                    onSearchClick = { navController.navigate("search") },
                    onNavigateRouteInfo = { routeId -> navController.navigate("route_info/$routeId") },
                    onStartNavigation = { optId -> navController.navigate("navigation/$optId") }
                )
            }

            // 4. Saved tab
            composable("saved") {
                val savedVm = hiltViewModel<SavedViewModel>()
                SavedScreen(
                    viewModel = savedVm,
                    onNavigateResults = { from, to -> navController.navigate("results?from=$from&to=$to") },
                    onNavigateSearchPrefilled = { to -> navController.navigate("search?to=$to") },
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
                    onNavigateOffline = { navController.navigate("offline_routes") },
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

            // Pushed Screens
            composable(
                "search?from={from}&to={to}",
                arguments = listOf(
                    navArgument("from") { defaultValue = "" },
                    navArgument("to") { defaultValue = "" }
                )
            ) { backStack ->
                val searchVm = hiltViewModel<SearchViewModel>()
                val prefillFrom = backStack.arguments?.getString("from") ?: ""
                val prefillTo = backStack.arguments?.getString("to") ?: ""
                SearchScreen(
                    viewModel = searchVm,
                    prefillFrom = prefillFrom,
                    prefillTo = prefillTo,
                    onBack = { navController.popBackStack() },
                    onSearchSubmit = { from, to ->
                        navController.navigate("results?from=$from&to=$to&sort=time")
                    }
                )
            }

            composable(
                "results?from={from}&to={to}&sort={sort}",
                arguments = listOf(
                    navArgument("from") { defaultValue = "" },
                    navArgument("to") { defaultValue = "" },
                    navArgument("sort") { defaultValue = "time" }
                )
            ) { backStack ->
                val resultsVm = hiltViewModel<ResultsViewModel>()
                val from = backStack.arguments?.getString("from") ?: ""
                val to = backStack.arguments?.getString("to") ?: ""
                ResultsScreen(
                    viewModel = resultsVm,
                    from = from,
                    to = to,
                    onBack = { navController.popBackStack() },
                    onEditSearch = { navController.navigate("search?from=$from&to=$to") },
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
                "route_info/{routeId}",
                arguments = listOf(navArgument("routeId") { type = NavType.StringType })
            ) { backStack ->
                val routeInfoVm = hiltViewModel<RouteInfoViewModel>()
                val routeId = backStack.arguments?.getString("routeId") ?: ""
                RouteInfoScreen(
                    viewModel = routeInfoVm,
                    routeId = routeId,
                    onBack = { navController.popBackStack() },
                    onViewOnMap = { navController.navigate("map") },
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
                    historyList = uiState.recentSearches,
                    onBack = { navController.popBackStack() },
                    onRepeatSearch = { f, t -> navController.navigate("results?from=$f&to=$t") },
                    onDeleteItem = {},
                    onClearAll = {}
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
                    onNavigateRouteInfo = { rId -> navController.navigate("route_info/$rId") },
                    onStartNavigation = { optId -> navController.navigate("navigation/$optId") }
                )
            }
        }
    }
}
