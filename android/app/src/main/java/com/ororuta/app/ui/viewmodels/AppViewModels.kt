package com.ororuta.app.ui.viewmodels

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ororuta.app.data.local.AppDataStore
import com.ororuta.app.data.local.entities.LocalHistory
import com.ororuta.app.data.local.entities.LocalSavedDestination
import com.ororuta.app.data.local.entities.LocalSavedTrip
import com.ororuta.app.data.local.entities.CachedRoute
import com.ororuta.app.data.location.CdoLocationProvider
import com.ororuta.app.data.repository.*
import com.ororuta.app.domain.models.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class LocationStatus { UNKNOWN, GRANTED, DENIED }

data class HomeUiState(
    val locationStatus: LocationStatus = LocationStatus.UNKNOWN,
    val manualStartPlace: String? = null,
    val userLocationName: String = "Near Carmen Public Market, CDO",
    val userLat: Double = 8.4822,
    val userLng: Double = 124.6472,
    val recentSearches: List<LocalHistory> = emptyList(),
    val allHistory: List<LocalHistory> = emptyList(),
    val announcements: List<Announcement> = emptyList(),
    val nearbyTab: Int = 0, // 0: Routes, 1: Terminals, 2: Loading, 3: Unloading
    val nearbyItems: List<NearbyResult> = emptyList(),
    val offlineRouteCount: Int = 0,
    val isOffline: Boolean = false,
    val isLoading: Boolean = false
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val appDataStore: AppDataStore,
    private val historyRepo: HistoryRepository,
    private val announcementRepo: AnnouncementRepository,
    private val nearbyRepo: NearbyRepository,
    private val routeRepo: RouteRepository,
    private val locationProvider: CdoLocationProvider
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            if (locationProvider.hasLocationPermission()) {
                allowLocation()
            } else {
                val previouslyAnswered = appDataStore.gpsEnabled.first()
                if (previouslyAnswered != null) {
                    _uiState.update { it.copy(locationStatus = LocationStatus.DENIED) }
                }
            }
        }
        loadData()
        observeStreams()
    }

    private fun loadData() {
        viewModelScope.launch {
            // Load announcements
            announcementRepo.getAnnouncements("Active").collect { res ->
                if (res is Resource.Success) {
                    _uiState.update { it.copy(announcements = res.data) }
                }
            }
        }
        loadNearby(0)
    }

    private fun observeStreams() {
        viewModelScope.launch {
            historyRepo.getHistory().collect { hist ->
                _uiState.update { it.copy(recentSearches = hist.take(3), allHistory = hist) }
            }
        }
        viewModelScope.launch {
            routeRepo.getOfflineRoutes().collect { offline ->
                _uiState.update { it.copy(offlineRouteCount = offline.size) }
            }
        }
    }

    fun allowLocation() {
        _uiState.update { it.copy(locationStatus = LocationStatus.GRANTED) }
        viewModelScope.launch {
            appDataStore.setGps(true)
            val loc = locationProvider.getCurrentLocation()
            _uiState.update {
                it.copy(
                    userLocationName = loc.displayName,
                    userLat = loc.latitude,
                    userLng = loc.longitude
                )
            }
            loadNearby(_uiState.value.nearbyTab)
        }
    }

    fun denyLocation() {
        _uiState.update { it.copy(locationStatus = LocationStatus.DENIED) }
        viewModelScope.launch { appDataStore.setGps(false) }
    }

    fun setManualStart(place: String) {
        _uiState.update { it.copy(manualStartPlace = place) }
    }

    fun deleteHistory(id: String) {
        viewModelScope.launch { historyRepo.delete(id) }
    }

    fun clearHistory() {
        viewModelScope.launch { historyRepo.clearAll() }
    }

    fun selectNearbyTab(tabIndex: Int) {
        _uiState.update { it.copy(nearbyTab = tabIndex) }
        loadNearby(tabIndex)
    }

    private fun loadNearby(tabIndex: Int) {
        val kind = when (tabIndex) {
            0 -> "route"
            1 -> "terminal"
            2 -> "loading"
            3 -> "unloading"
            else -> "route"
        }
        viewModelScope.launch {
            val lat = _uiState.value.userLat
            val lng = _uiState.value.userLng
            val res = nearbyRepo.getNearby(lat, lng, kind)
            if (res is Resource.Success) {
                _uiState.update { it.copy(nearbyItems = res.data.take(3)) }
            }
        }
    }
}

// Search ViewModel
@HiltViewModel
class SearchViewModel @Inject constructor(
    private val placeRepo: PlaceRepository,
    private val historyRepo: HistoryRepository,
    private val locationProvider: CdoLocationProvider
) : ViewModel() {

    var fromText by mutableStateOf("")
    var toText by mutableStateOf("")
    var activeFilter by mutableStateOf("all") // all, landmarks, terminals

    var suggestedPlaces by mutableStateOf<List<Place>>(emptyList())
    var recentHistory by mutableStateOf<List<LocalHistory>>(emptyList())
    var isSearching by mutableStateOf(false)
    var isLocating by mutableStateOf(false)

    init {
        loadHistory()
        searchPlaces("")
    }

    fun useCurrentLocation(onLocationObtained: (String) -> Unit = {}) {
        viewModelScope.launch {
            isLocating = true
            val loc = locationProvider.getCurrentLocation()
            fromText = loc.displayName
            onLocationObtained(loc.displayName)
            isLocating = false
        }
    }

    fun loadHistory() {
        viewModelScope.launch {
            historyRepo.getHistory().collect { list ->
                recentHistory = list.take(10)
            }
        }
    }

    fun onFromChange(text: String) {
        fromText = text
        searchPlaces(text)
    }

    fun onToChange(text: String) {
        toText = text
        searchPlaces(text)
    }

    var fromPlace by mutableStateOf<Place?>(null)
    var toPlace by mutableStateOf<Place?>(null)

    fun swap() {
        val temp = fromText
        fromText = toText
        toText = temp
        val tempPlace = fromPlace
        fromPlace = toPlace
        toPlace = tempPlace
    }

    fun setFilter(filter: String) {
        activeFilter = filter
        searchPlaces(if (toText.isNotBlank()) toText else fromText)
    }

    fun selectPlace(place: Place, forField: String) {
        if (forField == "from") {
            fromText = place.name
            fromPlace = place
        } else {
            toText = place.name
            toPlace = place
        }
    }

    private fun searchPlaces(q: String) {
        viewModelScope.launch {
            isSearching = true
            val res = placeRepo.search(q, activeFilter)
            if (res is Resource.Success) {
                suggestedPlaces = res.data
            }
            isSearching = false
        }
    }

    private var lastSavedSearch: String? = null

    fun saveHistory(from: String, to: String) {
        val cleanFrom = from.trim()
        val cleanTo = to.trim()
        if (cleanFrom.isBlank() || cleanTo.isBlank()) return
        val key = "${cleanFrom.lowercase()}->${cleanTo.lowercase()}"
        if (key == lastSavedSearch) return
        lastSavedSearch = key
        viewModelScope.launch {
            historyRepo.add(cleanFrom, cleanTo)
        }
    }
}

// Results ViewModel
@HiltViewModel
class ResultsViewModel @Inject constructor(
    private val tripRepo: TripRepository,
    private val locationProvider: CdoLocationProvider
) : ViewModel() {

    var tripsState by mutableStateOf<Resource<List<TripOption>>>(Resource.Loading)
    var currentSort by mutableStateOf("time")

    fun searchTrips(
        from: String,
        to: String,
        sort: String = "time",
        fromLat: Double? = null,
        fromLng: Double? = null,
        toLat: Double? = null,
        toLng: Double? = null
    ) {
        currentSort = sort
        viewModelScope.launch {
            tripsState = Resource.Loading
            var actualFromLat = fromLat
            var actualFromLng = fromLng

            // If starting point is "Current Location", get actual GPS coordinates
            if (from.isBlank() || from.contains("Current Location", ignoreCase = true)) {
                val realLoc = locationProvider.getDeviceLocationOrNull()
                if (realLoc != null) {
                    actualFromLat = realLoc.first
                    actualFromLng = realLoc.second
                }
            }

            tripsState = tripRepo.searchTrips(
                from = from,
                to = to,
                fromLat = actualFromLat,
                fromLng = actualFromLng,
                toLat = toLat,
                toLng = toLng,
                sort = sort
            )
        }
    }

    fun changeSort(from: String, to: String, sort: String) {
        searchTrips(from, to, sort)
    }
}

// Trip Detail ViewModel
@HiltViewModel
class TripDetailViewModel @Inject constructor(
    private val tripRepo: TripRepository,
    private val savedRepo: SavedRepository
) : ViewModel() {

    var tripState by mutableStateOf<Resource<TripOption>>(Resource.Loading)
    var isSaved by mutableStateOf(false)

    fun loadTrip(id: String, from: String, to: String) {
        viewModelScope.launch {
            tripState = Resource.Loading
            val res = tripRepo.searchTrips(from, to)
            if (res is Resource.Success) {
                val found = res.data.find { it.id == id } ?: res.data.firstOrNull()
                if (found != null) {
                    tripState = Resource.Success(found)
                } else {
                    tripState = Resource.Error("Trip option not found")
                }
            } else if (res is Resource.Error) {
                tripState = Resource.Error(res.message, res.isOffline)
            }
        }
    }

    fun toggleSave(trip: TripOption) {
        viewModelScope.launch {
            if (isSaved) {
                isSaved = false
            } else {
                val routeCodes = trip.segments.map { it.code }
                savedRepo.saveTrip(
                    trip.originPlace?.name ?: "Origin",
                    trip.destPlace?.name ?: "Destination",
                    routeCodes,
                    trip.id
                )
                isSaved = true
            }
        }
    }
}

// Navigation ViewModel
@HiltViewModel
class NavigationViewModel @Inject constructor(
    private val tripRepo: TripRepository
) : ViewModel() {

    var trip by mutableStateOf<TripOption?>(null)
    var currentStepIndex by mutableIntStateOf(0)
    var isDestinationReached by mutableStateOf(false)

    fun initTrip(option: TripOption) {
        trip = option
        currentStepIndex = 0
    }

    fun nextStep() {
        val legsCount = trip?.legs?.size ?: 5
        if (currentStepIndex < legsCount - 1) {
            currentStepIndex++
        } else {
            isDestinationReached = true
            recordCompletion()
        }
    }

    private fun recordCompletion() {
        viewModelScope.launch {
            tripRepo.recordCompleted(trip?.id)
        }
    }
}

// Routes Directory ViewModel
@HiltViewModel
class RoutesViewModel @Inject constructor(
    private val routeRepo: RouteRepository
) : ViewModel() {

    var routesState by mutableStateOf<Resource<List<Route>>>(Resource.Loading)
    var searchQuery by mutableStateOf("")
    var selectedFilter by mutableStateOf("All") // All, Traditional, Modern, Updated

    init {
        loadRoutes()
    }

    fun onSearchChange(q: String) {
        searchQuery = q
        loadRoutes()
    }

    fun onFilterChange(filter: String) {
        selectedFilter = filter
        loadRoutes()
    }

    fun loadRoutes() {
        viewModelScope.launch {
            val typeParam = when (selectedFilter) {
                "Traditional" -> "Traditional"
                "Modern" -> "Modern"
                else -> ""
            }
            val hasUpdates = selectedFilter == "Updated"
            routeRepo.getRoutes(searchQuery, typeParam, hasUpdates).collect { res ->
                routesState = res
            }
        }
    }
}

// Route Info ViewModel
@HiltViewModel
class RouteInfoViewModel @Inject constructor(
    private val routeRepo: RouteRepository,
    private val savedRepo: SavedRepository
) : ViewModel() {

    var routeState by mutableStateOf<Resource<Route>>(Resource.Loading)
    var isSaved by mutableStateOf(false)
    var isDownloaded by mutableStateOf(false)
    var downloadProgress by mutableFloatStateOf(0f)

    fun loadRoute(id: String) {
        viewModelScope.launch {
            routeState = Resource.Loading
            routeState = routeRepo.getRoute(id)
        }
    }

    fun toggleSave(route: Route) {
        viewModelScope.launch {
            if (isSaved) {
                isSaved = false
            } else {
                savedRepo.saveTrip(route.origin, route.destination, listOf(route.code), null)
                isSaved = true
            }
        }
    }

    fun downloadOffline(routeId: String) {
        viewModelScope.launch {
            downloadProgress = 0.3f
            routeRepo.downloadOfflineBundle(routeId)
            downloadProgress = 1.0f
            isDownloaded = true
        }
    }
}

data class DirectionsGuide(
    val originName: String,
    val originLat: Double,
    val originLng: Double,
    val destinationName: String,
    val destinationLat: Double,
    val destinationLng: Double,
    val distanceMeters: Int,
    val estimatedMinutes: Int,
    val pathPoints: List<com.google.android.gms.maps.model.LatLng>
)

// Map ViewModel (Database-driven Routes, Places, Landmarks, Directions, Recommendations)
@HiltViewModel
class MapViewModel @Inject constructor(
    private val routeRepo: RouteRepository,
    private val placeRepo: PlaceRepository,
    private val tripRepo: TripRepository,
    private val locationProvider: CdoLocationProvider
) : ViewModel() {

    var routesState by mutableStateOf<Resource<List<Route>>>(Resource.Loading)
    val routes: List<Route>
        get() = (routesState as? Resource.Success<List<Route>>)?.data ?: emptyList()

    var placesState by mutableStateOf<Resource<List<Place>>>(Resource.Loading)
    val places: List<Place>
        get() = (placesState as? Resource.Success<List<Place>>)?.data ?: emptyList()

    var directionsGuide by mutableStateOf<DirectionsGuide?>(null)
    var isCalculatingDirections by mutableStateOf(false)

    var recommendedJeepneyTrip by mutableStateOf<TripOption?>(null)
    var isLoadingJeepneyRoute by mutableStateOf(false)

    init {
        loadRoutes()
        loadPlaces()
    }

    fun loadRoutes() {
        viewModelScope.launch {
            routeRepo.getRoutes().collect { res ->
                routesState = res
            }
        }
    }

    fun loadPlaces() {
        viewModelScope.launch {
            val res = placeRepo.search("")
            placesState = res
        }
    }

    fun calculateDirections(
        fromLat: Double,
        fromLng: Double,
        toLat: Double,
        toLng: Double,
        fromName: String = "Current Location",
        toName: String
    ) {
        viewModelScope.launch {
            isCalculatingDirections = true
            val dLat = Math.toRadians(toLat - fromLat)
            val dLng = Math.toRadians(toLng - fromLng)
            val a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(Math.toRadians(fromLat)) * Math.cos(Math.toRadians(toLat)) *
                    Math.sin(dLng / 2) * Math.sin(dLng / 2)
            val c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
            val distMeters = (6371000 * c).toInt()
            val minutes = Math.max(1, (distMeters / 75.0).toInt())

            val points = mutableListOf<com.google.android.gms.maps.model.LatLng>()
            points.add(com.google.android.gms.maps.model.LatLng(fromLat, fromLng))

            val tripRes = tripRepo.searchTrips(fromName, toName, fromLat, fromLng, toLat, toLng)
            if (tripRes is Resource.Success && tripRes.data.isNotEmpty()) {
                val best = tripRes.data.first()
                if (best.boardingLat != null && best.boardingLng != null) {
                    points.add(com.google.android.gms.maps.model.LatLng(best.boardingLat, best.boardingLng))
                }
                val segRouteId = best.segments.firstOrNull()?.routeId
                val matchedRoute = routes.find { it.id == segRouteId }
                if (matchedRoute != null && matchedRoute.path.isNotEmpty()) {
                    matchedRoute.path.forEach { pt ->
                        if (pt.lat != 0.0 && pt.lng != 0.0) {
                            points.add(com.google.android.gms.maps.model.LatLng(pt.lat, pt.lng))
                        }
                    }
                }
            } else {
                val midLat = (fromLat + toLat) / 2
                val midLng = (fromLng + toLng) / 2
                points.add(com.google.android.gms.maps.model.LatLng(midLat, fromLng))
                points.add(com.google.android.gms.maps.model.LatLng(midLat, midLng))
            }
            points.add(com.google.android.gms.maps.model.LatLng(toLat, toLng))

            directionsGuide = DirectionsGuide(
                originName = fromName,
                originLat = fromLat,
                originLng = fromLng,
                destinationName = toName,
                destinationLat = toLat,
                destinationLng = toLng,
                distanceMeters = distMeters,
                estimatedMinutes = minutes,
                pathPoints = points
            )
            isCalculatingDirections = false
        }
    }

    fun loadJeepneyRecommendation(
        fromLat: Double,
        fromLng: Double,
        toLat: Double,
        toLng: Double,
        destName: String
    ) {
        viewModelScope.launch {
            isLoadingJeepneyRoute = true
            val res = tripRepo.searchTrips("Current Location", destName, fromLat, fromLng, toLat, toLng)
            if (res is Resource.Success && res.data.isNotEmpty()) {
                recommendedJeepneyTrip = res.data.first()
            } else {
                val nearbyRoute = routes.firstOrNull()
                if (nearbyRoute != null) {
                    recommendedJeepneyTrip = TripOption(
                        id = "rec-${nearbyRoute.id}",
                        originPlaceId = "current",
                        destinationPlaceId = "dest",
                        minutes = 18,
                        walkMeters = 350,
                        transfers = 0,
                        boardingName = "Loading Point near Current Location",
                        boardingLat = fromLat,
                        boardingLng = fromLng,
                        dropoffName = "Stop near $destName",
                        totalKm = 4.2,
                        regularFare = 13.0,
                        discountFare = 10.0,
                        segments = listOf(
                            TripSegment(
                                tripOptionId = "rec-${nearbyRoute.id}",
                                routeId = nearbyRoute.id,
                                code = nearbyRoute.code,
                                routeName = nearbyRoute.name,
                                color = nearbyRoute.color,
                                km = 4.2
                            )
                        )
                    )
                }
            }
            isLoadingJeepneyRoute = false
        }
    }

    fun clearDirections() {
        directionsGuide = null
        recommendedJeepneyTrip = null
    }
}

// Nearby ViewModel
@HiltViewModel
class NearbyViewModel @Inject constructor(
    private val nearbyRepo: NearbyRepository
) : ViewModel() {

    var selectedKind by mutableStateOf("route") // route, terminal, loading, unloading
    var nearbyState by mutableStateOf<Resource<List<NearbyResult>>>(Resource.Loading)

    init {
        loadNearby("route")
    }

    fun setKind(kind: String) {
        selectedKind = kind
        loadNearby(kind)
    }

    fun loadNearby(kind: String) {
        viewModelScope.launch {
            nearbyState = Resource.Loading
            val lat = 8.4822
            val lng = 124.6472
            nearbyState = nearbyRepo.getNearby(lat, lng, kind)
        }
    }
}

// Announcements ViewModel
@HiltViewModel
class AnnouncementsViewModel @Inject constructor(
    private val announcementRepo: AnnouncementRepository
) : ViewModel() {

    var announcementsState by mutableStateOf<Resource<List<Announcement>>>(Resource.Loading)
    var selectedFilter by mutableStateOf("All") // All, Active, Updated, Temporary, Expired

    init {
        loadAnnouncements("All")
    }

    fun setFilter(filter: String) {
        selectedFilter = filter
        val statusParam = if (filter == "All") "" else filter
        loadAnnouncements(statusParam)
    }

    private fun loadAnnouncements(status: String) {
        viewModelScope.launch {
            announcementRepo.getAnnouncements(status).collect { res ->
                announcementsState = res
            }
        }
    }
}

// Fare ViewModel
@HiltViewModel
class FareViewModel @Inject constructor(
    private val fareRepo: FareRepository
) : ViewModel() {

    var category by mutableStateOf("Regular")
    var estimateState by mutableStateOf<Resource<FareEstimate>>(Resource.Loading)
    var rules by mutableStateOf<List<FareRule>>(emptyList())

    fun loadFare(routeId: String? = null, optionId: String? = null, cat: String = "Regular") {
        category = cat
        viewModelScope.launch {
            estimateState = Resource.Loading
            val rulesRes = fareRepo.getRules()
            if (rulesRes is Resource.Success) {
                rules = rulesRes.data
            }
            estimateState = fareRepo.estimate(routeId, optionId, cat)
        }
    }

    fun changeCategory(newCat: String, routeId: String?, optionId: String?) {
        loadFare(routeId, optionId, newCat)
    }
}

// Saved ViewModel
@HiltViewModel
class SavedViewModel @Inject constructor(
    private val savedRepo: SavedRepository
) : ViewModel() {

    var activeTab by mutableIntStateOf(0) // 0: Routes, 1: Destinations
    val savedTrips = savedRepo.getSavedTrips().stateIn(viewModelScope, SharingStarted.Lazily, emptyList())
    val savedDestinations = savedRepo.getSavedDestinations().stateIn(viewModelScope, SharingStarted.Lazily, emptyList())

    fun deleteTrip(id: String) {
        viewModelScope.launch { savedRepo.deleteTrip(id) }
    }

    fun deleteDestination(id: String) {
        viewModelScope.launch { savedRepo.deleteDestination(id) }
    }
}

// Offline Routes ViewModel
@HiltViewModel
class OfflineRoutesViewModel @Inject constructor(
    private val routeRepo: RouteRepository
) : ViewModel() {

    val offlineRoutes = routeRepo.getOfflineRoutes().stateIn(viewModelScope, SharingStarted.Lazily, emptyList())

    fun sync() {
        // Refresh downloaded routes
    }
}

// Report ViewModel
@HiltViewModel
class ReportViewModel @Inject constructor(
    private val reportRepo: ReportRepository
) : ViewModel() {

    var reportType by mutableStateOf("Incorrect route information")
    var description by mutableStateOf("")
    var locationText by mutableStateOf("")
    var useLocation by mutableStateOf(false)
    var submitState by mutableStateOf<Resource<ReportResponse>?>(null)

    fun submit() {
        viewModelScope.launch {
            submitState = Resource.Loading
            submitState = reportRepo.submit(
                type = reportType,
                description = description,
                locationText = if (useLocation) locationText.ifBlank { "Current GPS location" } else null,
                lat = if (useLocation) 8.4822 else null,
                lng = if (useLocation) 124.6472 else null
            )
        }
    }

    fun reset() {
        description = ""
        locationText = ""
        submitState = null
    }
}

// More & Settings ViewModel
@HiltViewModel
class MoreViewModel @Inject constructor(
    private val appDataStore: AppDataStore,
    private val prefRepo: PreferencesRepository,
    private val contentRepo: ContentRepository,
    savedRepo: SavedRepository,
    historyRepo: HistoryRepository,
    routeRepo: RouteRepository
) : ViewModel() {

    val savedCount = savedRepo.getSavedTrips().map { it.size }.stateIn(viewModelScope, SharingStarted.Lazily, 0)
    val historyCount = historyRepo.getHistory().map { it.size }.stateIn(viewModelScope, SharingStarted.Lazily, 0)
    val offlineCount = routeRepo.getOfflineRoutes().map { it.size }.stateIn(viewModelScope, SharingStarted.Lazily, 0)

    var prefs by mutableStateOf(DevicePreferences())
    var currentLanguage by mutableStateOf("en")

    init {
        loadPrefs()
    }

    private fun loadPrefs() {
        viewModelScope.launch {
            val res = prefRepo.getPreferences()
            if (res is Resource.Success) {
                prefs = res.data
                currentLanguage = res.data.language
            }
        }
    }

    fun toggleRouteChanges(checked: Boolean) {
        prefs = prefs.copy(routeChanges = checked)
        savePrefs()
    }

    fun toggleClosures(checked: Boolean) {
        prefs = prefs.copy(closures = checked)
        savePrefs()
    }

    fun toggleTerminals(checked: Boolean) {
        prefs = prefs.copy(terminals = checked)
        savePrefs()
    }

    fun toggleOfflineUpdates(checked: Boolean) {
        prefs = prefs.copy(offlineUpdates = checked)
        savePrefs()
    }

    fun setLanguage(lang: String) {
        currentLanguage = lang
        prefs = prefs.copy(language = lang)
        savePrefs()
    }

    private fun savePrefs() {
        viewModelScope.launch {
            prefRepo.updatePreferences(
                mapOf(
                    "language" to prefs.language,
                    "route_changes" to prefs.routeChanges,
                    "closures" to prefs.closures,
                    "terminals" to prefs.terminals,
                    "offline_updates" to prefs.offlineUpdates
                )
            )
        }
    }
}
