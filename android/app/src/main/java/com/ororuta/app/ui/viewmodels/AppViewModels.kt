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
import com.ororuta.app.data.local.entities.LocalSavedTrip
import com.ororuta.app.data.local.entities.CachedRoute
import com.ororuta.app.data.location.CdoLocationProvider
import com.ororuta.app.data.local.dao.RecentSearchDao
import com.ororuta.app.data.local.entities.RecentSearchEntity
import com.ororuta.app.data.repository.*
import com.ororuta.app.domain.models.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
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
    var locationError by mutableStateOf<String?>(null)

    private var searchJob: kotlinx.coroutines.Job? = null

    init {
        loadHistory()
        searchPlaces("")
    }

    fun useCurrentLocation(
        onLocationObtained: (String) -> Unit = {},
        onError: (String) -> Unit = {}
    ) {
        viewModelScope.launch {
            isLocating = true
            locationError = null
            if (!locationProvider.hasLocationPermission()) {
                val msg = "Location permission is required to detect your GPS position. Please grant permission in Settings or select your starting point manually."
                locationError = msg
                onError(msg)
                isLocating = false
                return@launch
            }
            val loc = locationProvider.getCurrentLocation()
            if (loc.isRealGps || loc.isFixAvailable) {
                fromText = loc.displayName
                fromPlace = Place(
                    id = "current_gps_location",
                    name = loc.displayName,
                    area = "Cagayan de Oro City",
                    kind = "landmark",
                    mapX = loc.longitude,
                    mapY = loc.latitude,
                    lat = loc.latitude,
                    lng = loc.longitude
                )
                onLocationObtained(loc.displayName)
            } else {
                val msg = "GPS signal is unavailable. Please check that Location is turned ON in Settings, or select your starting point manually."
                locationError = msg
                onError(msg)
            }
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
        if (fromPlace?.name != text) fromPlace = null
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            if (text.isNotBlank()) kotlinx.coroutines.delay(250)
            searchPlaces(text)
        }
    }

    fun onToChange(text: String) {
        toText = text
        if (toPlace?.name != text) toPlace = null
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            if (text.isNotBlank()) kotlinx.coroutines.delay(250)
            searchPlaces(text)
        }
    }

    fun onFieldFocused(field: String) {
        searchJob?.cancel()
        val q = if (field == "to") toText else fromText
        searchPlaces(q)
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
        searchJob?.cancel()
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
            } else if (res is Resource.Error) {
                suggestedPlaces = emptyList()
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

    private var lastFromLat: Double? = null
    private var lastFromLng: Double? = null
    private var lastToLat: Double? = null
    private var lastToLng: Double? = null

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
        if (fromLat != null) lastFromLat = fromLat
        if (fromLng != null) lastFromLng = fromLng
        if (toLat != null) lastToLat = toLat
        if (toLng != null) lastToLng = toLng

        viewModelScope.launch {
            tripsState = Resource.Loading
            var actualFromLat = fromLat ?: lastFromLat
            var actualFromLng = fromLng ?: lastFromLng

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
                toLat = toLat ?: lastToLat,
                toLng = toLng ?: lastToLng,
                sort = sort
            )
        }
    }

    fun changeSort(from: String, to: String, sort: String) {
        searchTrips(from, to, sort, lastFromLat, lastFromLng, lastToLat, lastToLng)
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
    private val tripRepo: TripRepository,
    private val locationProvider: CdoLocationProvider
) : ViewModel() {

    var tripState by mutableStateOf<Resource<TripOption>>(Resource.Loading)
    var trip by mutableStateOf<TripOption?>(null)
    var currentStepIndex by mutableIntStateOf(0)
    var isDestinationReached by mutableStateOf(false)

    var userGpsLocation by mutableStateOf<Pair<Double, Double>?>(null)
    var locationError by mutableStateOf<String?>(null)
    var isPermissionDenied by mutableStateOf(false)
    var remainingDistanceKm by mutableStateOf(0.0)
    var remainingMinutes by mutableIntStateOf(0)

    fun loadTrip(id: String) {
        viewModelScope.launch {
            tripState = Resource.Loading
            val res = tripRepo.getTripOption(id)
            if (res is Resource.Success) {
                val t = res.data
                trip = t
                tripState = Resource.Success(t)
                currentStepIndex = 0
                remainingDistanceKm = t.totalKm
                remainingMinutes = t.minutes
            } else if (res is Resource.Error) {
                tripState = Resource.Error(res.message, res.isOffline)
            }
            updateGpsLocation()
        }
    }

    fun initTrip(option: TripOption) {
        trip = option
        tripState = Resource.Success(option)
        currentStepIndex = 0
        remainingDistanceKm = option.totalKm
        remainingMinutes = option.minutes
        updateGpsLocation()
    }

    fun updateGpsLocation() {
        viewModelScope.launch {
            if (!locationProvider.hasLocationPermission()) {
                isPermissionDenied = true
                locationError = "Location permission is required for accurate GPS navigation."
                return@launch
            }
            isPermissionDenied = false
            val loc = locationProvider.getDeviceLocationOrNull()
            if (loc != null) {
                userGpsLocation = loc
                locationError = null
            } else {
                locationError = "Waiting for GPS fix…"
            }
        }
    }

    fun nextStep() {
        val t = trip
        val legsCount = t?.legs?.size ?: 5
        if (currentStepIndex < legsCount - 1) {
            currentStepIndex++
            // Recalculate remaining distance and minutes from remaining legs
            if (t != null && t.legs.isNotEmpty()) {
                val remainingLegs = t.legs.drop(currentStepIndex)
                remainingMinutes = maxOf(1, remainingLegs.sumOf { it.minutes })
                val remainingM = remainingLegs.sumOf { it.distanceM }
                remainingDistanceKm = Math.round((remainingM / 1000.0) * 10.0) / 10.0
            }
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
    var selectedFilter by mutableStateOf("All") // All, Updated

    // Tracks the active load job so we can cancel it before starting a new one.
    // This prevents multiple concurrent collectors racing to update routesState.
    private var loadJob: kotlinx.coroutines.Job? = null

    init {
        loadRoutes()
    }

    fun onSearchChange(q: String) {
        searchQuery = q
        loadRoutes(debounceMs = 200L)
    }

    fun onFilterChange(filter: String) {
        selectedFilter = filter
        loadRoutes(debounceMs = 0L)
    }

    private fun isPopularRoute(r: Route): Boolean {
        return r.verificationStatus.equals("USER_SUPPLIED", ignoreCase = true) || r.isPopular
    }

    fun loadRoutes(debounceMs: Long = 0L) {
        // Cancel any in-flight request so we never have two collectors racing.
        loadJob?.cancel()
        loadJob = viewModelScope.launch {
            if (debounceMs > 0L) {
                delay(debounceMs)
            }
            val hasUpdates = selectedFilter == "Updated"
            // Collect: no type filter sent to server — we apply it client-side below
            // to avoid missing routes whose jeepneyType field is blank in the bundled JSON.
            routeRepo.getRoutes(searchQuery, "", hasUpdates).collect { res ->
                val filteredRes = when (res) {
                    is Resource.Success -> {
                        // Filter traditional-only client-side.
                        // A blank jeepneyType is treated as Traditional (legacy data).
                        val traditionalOnly = res.data.filter {
                            it.jeepneyType.isBlank() ||
                            it.jeepneyType.equals("Traditional", ignoreCase = true)
                        }
                        val finalFiltered = if (selectedFilter == "Popular") {
                            traditionalOnly.filter { isPopularRoute(it) }
                        } else {
                            traditionalOnly
                        }
                        Resource.Success(finalFiltered, res.isOffline)
                    }
                    else -> res
                }
                routesState = filteredRes
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

data class RouteStopPoint(
    val id: String,
    val name: String,
    val type: String, // "terminal", "loading", "unloading", "transfer"
    val lat: Double,
    val lng: Double,
    val note: String? = null
)

data class RouteGuidance(
    val route: Route,
    val direction: String, // "Inbound" or "Outbound"
    val userLocation: com.google.android.gms.maps.model.LatLng?,
    val nearestBoardingStop: RouteStopPoint?,
    val distanceToBoardingMeters: Int,
    val isUserNearStop: Boolean,
    val walkingPathToBoarding: List<com.google.android.gms.maps.model.LatLng>,
    val walkingTimeMinutes: Int,
    val dropoffStop: RouteStopPoint?,
    val guidanceMessage: String,
    val routePoints: List<com.google.android.gms.maps.model.LatLng>
)

data class MapDirectionsState(
    val originName: String,
    val originLat: Double,
    val originLng: Double,
    val destinationName: String,
    val destinationLat: Double,
    val destinationLng: Double,
    val itineraries: List<TripOption> = emptyList(),
    val selectedIndex: Int = 0,
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val noRouteFound: Boolean = false,
    val walkingOnlyPoints: List<com.google.android.gms.maps.model.LatLng>? = null,
    val walkingDistanceMeters: Int? = null,
    val walkingMinutes: Int? = null,
    val isGpsOrigin: Boolean = true,
    val walkToBoardPoints: List<com.google.android.gms.maps.model.LatLng> = emptyList(),
    val jeepneyPoints: List<com.google.android.gms.maps.model.LatLng> = emptyList(),
    val walkFromDropPoints: List<com.google.android.gms.maps.model.LatLng> = emptyList(),
    val transferWalkPoints: List<com.google.android.gms.maps.model.LatLng> = emptyList(),
    val transferPoint: com.google.android.gms.maps.model.LatLng? = null,
    val transferName: String? = null
) {
    val selectedTrip: TripOption?
        get() = itineraries.getOrNull(selectedIndex)
}

// Map ViewModel (Database-driven Routes, Places, Landmarks, Directions, Recommendations)
@HiltViewModel
class MapViewModel @Inject constructor(
    private val routeRepo: RouteRepository,
    private val placeRepo: PlaceRepository,
    private val tripRepo: TripRepository,
    val locationProvider: CdoLocationProvider,
    private val recentSearchDao: RecentSearchDao
) : ViewModel() {

    val recentSearches: StateFlow<List<RecentSearchEntity>> = recentSearchDao.getAll()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun saveRecentSearch(
        placeId: String?,
        name: String,
        address: String?,
        category: String,
        lat: Double,
        lng: Double
    ) {
        if (lat == 0.0 && lng == 0.0) return
        if (lat.isNaN() || lng.isNaN()) return
        if (name.isBlank()) return
        viewModelScope.launch {
            val key = if (!placeId.isNullOrBlank()) placeId else name.trim().lowercase()
            recentSearchDao.insert(
                RecentSearchEntity(
                    id = key,
                    placeId = placeId,
                    name = name.trim(),
                    address = address?.trim(),
                    category = category,
                    lat = lat,
                    lng = lng,
                    timestamp = System.currentTimeMillis()
                )
            )
            recentSearchDao.pruneOld()
        }
    }

    fun removeRecentSearch(id: String) {
        viewModelScope.launch {
            recentSearchDao.deleteById(id)
        }
    }

    fun clearAllRecentSearches() {
        viewModelScope.launch {
            recentSearchDao.clearAll()
        }
    }

    var mapDirectionsState by mutableStateOf<MapDirectionsState?>(null)
    private var mapDirectionsJob: kotlinx.coroutines.Job? = null

    var nearbySheetTripsState by mutableStateOf<Resource<List<TripOption>>?>(null)
    private var nearbySheetSearchJob: kotlinx.coroutines.Job? = null

    fun searchNearbyTrips(
        fromLat: Double,
        fromLng: Double,
        fromName: String = "My Location",
        toLat: Double,
        toLng: Double,
        toName: String
    ) {
        nearbySheetSearchJob?.cancel()
        nearbySheetTripsState = Resource.Loading
        nearbySheetSearchJob = viewModelScope.launch {
            val res = tripRepo.searchTrips(
                from = fromName,
                to = toName,
                fromLat = fromLat,
                fromLng = fromLng,
                toLat = toLat,
                toLng = toLng
            )
            nearbySheetTripsState = res
        }
    }

    fun showItineraryOnMap(
        trip: TripOption,
        originLat: Double,
        originLng: Double,
        originName: String,
        destLat: Double,
        destLng: Double,
        destName: String,
        isGpsOrigin: Boolean = true
    ) {
        viewModelScope.launch {
            tripRepo.cacheTripOption(trip)
            val (wBoard, jeep, wDrop) = resolveItineraryPoints(trip, originLat, originLng, destLat, destLng)
            val transferPts = if (trip.transferWalkCoordinates.size >= 2) {
                trip.transferWalkCoordinates.map { com.google.android.gms.maps.model.LatLng(it[1], it[0]) }
            } else emptyList()
            val transferPt = if (trip.transferLat != null && trip.transferLng != null) {
                com.google.android.gms.maps.model.LatLng(trip.transferLat, trip.transferLng)
            } else null

            mapDirectionsState = MapDirectionsState(
                originName = originName,
                originLat = originLat,
                originLng = originLng,
                destinationName = destName,
                destinationLat = destLat,
                destinationLng = destLng,
                itineraries = listOf(trip),
                selectedIndex = 0,
                isLoading = false,
                noRouteFound = false,
                errorMessage = null,
                walkToBoardPoints = wBoard,
                jeepneyPoints = jeep,
                walkFromDropPoints = wDrop,
                transferWalkPoints = transferPts,
                transferPoint = transferPt,
                transferName = trip.transferName,
                isGpsOrigin = isGpsOrigin
            )
        }
    }

    fun startMapDirections(
        fromLat: Double,
        fromLng: Double,
        fromName: String,
        toLat: Double,
        toLng: Double,
        toName: String,
        isGpsOrigin: Boolean = true
    ) {
        mapDirectionsJob?.cancel()
        mapDirectionsState = MapDirectionsState(
            originName = fromName,
            originLat = fromLat,
            originLng = fromLng,
            destinationName = toName,
            destinationLat = toLat,
            destinationLng = toLng,
            isLoading = true,
            isGpsOrigin = isGpsOrigin
        )

        mapDirectionsJob = viewModelScope.launch {
            val res = tripRepo.searchTrips(fromName, toName, fromLat, fromLng, toLat, toLng)
            val trips = if (res is Resource.Success) res.data else emptyList()

            // Filter valid trips strictly following OroRuta rules:
            // Boarding stop on selected route, alighting is a different valid stop making progress
            val validTrips = trips.filter { trip ->
                val hasValidBoard = trip.boardingLat != null && trip.boardingLng != null &&
                        (trip.boardingLat != 0.0 || trip.boardingLng != 0.0)
                val hasValidDrop = trip.dropoffLat != null && trip.dropoffLng != null &&
                        (trip.dropoffLat != 0.0 || trip.dropoffLng != 0.0)
                val differentStops = if (hasValidBoard && hasValidDrop) {
                    val dLat = Math.abs(trip.boardingLat!! - trip.dropoffLat!!)
                    val dLng = Math.abs(trip.boardingLng!! - trip.dropoffLng!!)
                    (dLat > 0.0001 || dLng > 0.0001) &&
                            !trip.boardingName.equals(trip.dropoffName, ignoreCase = true)
                } else false
                hasValidBoard && hasValidDrop && differentStops && trip.segments.isNotEmpty()
            }

            if (validTrips.isNotEmpty()) {
                validTrips.forEach { tripRepo.cacheTripOption(it) }
                val firstTrip = validTrips.first()
                val (wBoard, jeep, wDrop) = resolveItineraryPoints(firstTrip, fromLat, fromLng, toLat, toLng)
                val transferPts = if (firstTrip.transferWalkCoordinates.size >= 2) {
                    firstTrip.transferWalkCoordinates.map { com.google.android.gms.maps.model.LatLng(it[1], it[0]) }
                } else emptyList()
                val transferPt = if (firstTrip.transferLat != null && firstTrip.transferLng != null) {
                    com.google.android.gms.maps.model.LatLng(firstTrip.transferLat, firstTrip.transferLng)
                } else null

                mapDirectionsState = mapDirectionsState?.copy(
                    itineraries = validTrips,
                    selectedIndex = 0,
                    isLoading = false,
                    noRouteFound = false,
                    errorMessage = null,
                    walkToBoardPoints = wBoard,
                    jeepneyPoints = jeep,
                    walkFromDropPoints = wDrop,
                    transferWalkPoints = transferPts,
                    transferPoint = transferPt,
                    transferName = firstTrip.transferName
                )
            } else {
                // No verified jeepney route found. Check if road walking route is available and reasonable
                val osrmResult = withContext(Dispatchers.IO) {
                    fetchOsrmRoute(fromLng, fromLat, toLng, toLat)
                }
                if (osrmResult != null && osrmResult.second <= 3500) {
                    val mins = Math.max(1, (osrmResult.second / 83.0).toInt())
                    mapDirectionsState = mapDirectionsState?.copy(
                        isLoading = false,
                        noRouteFound = true,
                        walkingOnlyPoints = osrmResult.first,
                        walkingDistanceMeters = osrmResult.second,
                        walkingMinutes = mins,
                        errorMessage = null
                    )
                } else {
                    mapDirectionsState = mapDirectionsState?.copy(
                        isLoading = false,
                        noRouteFound = true,
                        walkingOnlyPoints = null,
                        errorMessage = "No suitable verified jeepney route found."
                    )
                }
            }
        }
    }

    fun selectDirectionsItinerary(index: Int) {
        val state = mapDirectionsState ?: return
        val trip = state.itineraries.getOrNull(index) ?: return
        viewModelScope.launch {
            val (wBoard, jeep, wDrop) = resolveItineraryPoints(trip, state.originLat, state.originLng, state.destinationLat, state.destinationLng)
            val transferPts = if (trip.transferWalkCoordinates.size >= 2) {
                trip.transferWalkCoordinates.map { com.google.android.gms.maps.model.LatLng(it[1], it[0]) }
            } else emptyList()
            val transferPt = if (trip.transferLat != null && trip.transferLng != null) {
                com.google.android.gms.maps.model.LatLng(trip.transferLat, trip.transferLng)
            } else null
            mapDirectionsState = state.copy(
                selectedIndex = index,
                walkToBoardPoints = wBoard,
                jeepneyPoints = jeep,
                walkFromDropPoints = wDrop,
                transferWalkPoints = transferPts,
                transferPoint = transferPt,
                transferName = trip.transferName
            )
        }
    }

    fun clearMapDirections() {
        mapDirectionsJob?.cancel()
        mapDirectionsState = null
    }

    private suspend fun resolveItineraryPoints(
        trip: TripOption,
        originLat: Double,
        originLng: Double,
        destLat: Double,
        destLng: Double
    ): Triple<List<com.google.android.gms.maps.model.LatLng>, List<com.google.android.gms.maps.model.LatLng>, List<com.google.android.gms.maps.model.LatLng>> {
        // 1. Walking to boarding stop (real road routing via OSRM)
        val walkToBoard = if (trip.walkToBoardCoordinates.size >= 2) {
            trip.walkToBoardCoordinates.map { com.google.android.gms.maps.model.LatLng(it[1], it[0]) }
        } else {
            val bLat = trip.boardingLat ?: originLat
            val bLng = trip.boardingLng ?: originLng
            withContext(Dispatchers.IO) {
                fetchOsrmRoute(originLng, originLat, bLng, bLat)?.first ?: emptyList()
            }
        }

        // 2. Jeepney ride polyline using verified route geometry
        val jeepney = if (trip.jeepneyCoordinates.size >= 2) {
            trip.jeepneyCoordinates.map { com.google.android.gms.maps.model.LatLng(it[1], it[0]) }
        } else {
            val seg = trip.segments.firstOrNull()
            val r = routes.find { it.id == seg?.routeId || it.code.equals(seg?.code, ignoreCase = true) }
            if (r != null) {
                val direction = trip.direction ?: "Inbound"
                val fullPts = com.ororuta.app.ui.screens.parseGeometries(r, direction)
                if (fullPts.size >= 2) {
                    val bLat = trip.boardingLat
                    val bLng = trip.boardingLng
                    val dLat = trip.dropoffLat
                    val dLng = trip.dropoffLng
                    if (bLat != null && bLng != null && dLat != null && dLng != null) {
                        val startIdx = fullPts.indices.minByOrNull {
                            val p = fullPts[it]
                            val d1 = p.latitude - bLat
                            val d2 = p.longitude - bLng
                            d1 * d1 + d2 * d2
                        } ?: 0
                        val endIdx = fullPts.indices.minByOrNull {
                            val p = fullPts[it]
                            val d1 = p.latitude - dLat
                            val d2 = p.longitude - dLng
                            d1 * d1 + d2 * d2
                        } ?: (fullPts.size - 1)
                        if (startIdx < endIdx) {
                            fullPts.subList(startIdx, endIdx + 1)
                        } else if (startIdx > endIdx) {
                            fullPts.subList(endIdx, startIdx + 1).reversed()
                        } else fullPts
                    } else fullPts
                } else fullPts
            } else emptyList()
        }

        // 3. Walking from dropoff stop to destination (real road routing via OSRM)
        val walkFromDrop = if (trip.walkFromDropCoordinates.size >= 2) {
            trip.walkFromDropCoordinates.map { com.google.android.gms.maps.model.LatLng(it[1], it[0]) }
        } else {
            val dLat = trip.dropoffLat ?: destLat
            val dLng = trip.dropoffLng ?: destLng
            withContext(Dispatchers.IO) {
                fetchOsrmRoute(dLng, dLat, destLng, destLat)?.first ?: emptyList()
            }
        }

        return Triple(walkToBoard, jeepney, walkFromDrop)
    }

    var routesState by mutableStateOf<Resource<List<Route>>>(Resource.Loading)
    val routes: List<Route>
        get() = (routesState as? Resource.Success<List<Route>>)?.data ?: emptyList()

    var placesState by mutableStateOf<Resource<List<Place>>>(Resource.Loading)
    val places: List<Place>
        get() = (placesState as? Resource.Success<List<Place>>)?.data ?: emptyList()

    suspend fun searchPlaces(query: String): List<Place> {
        if (query.isBlank()) return emptyList()
        return when (val res = placeRepo.search(query)) {
            is Resource.Success -> res.data
            else -> emptyList()
        }
    }

    var directionsGuide by mutableStateOf<DirectionsGuide?>(null)
    var isCalculatingDirections by mutableStateOf(false)

    var recommendedJeepneyTrip by mutableStateOf<TripOption?>(null)
    var isLoadingJeepneyRoute by mutableStateOf(false)

    var routeGuidance by mutableStateOf<RouteGuidance?>(null)
    var isCalculatingGuidance by mutableStateOf(false)

    init {
        loadRoutes()
        loadPlaces()
    }


    private var mapLoadJob: kotlinx.coroutines.Job? = null

    fun loadRoutes() {
        mapLoadJob?.cancel()
        mapLoadJob = viewModelScope.launch {
            routeRepo.getRoutes("", "", false).collect { res ->
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

    private var directionsJob: kotlinx.coroutines.Job? = null

    fun calculateDirections(
        fromLat: Double,
        fromLng: Double,
        toLat: Double,
        toLng: Double,
        fromName: String = "Current Location",
        toName: String
    ) {
        // Ignore duplicate taps while a request is already in-flight
        if (isCalculatingDirections) return
        directionsJob?.cancel()
        directionsJob = viewModelScope.launch {
            isCalculatingDirections = true
            try {
            // OSRM is an open-source routing engine that follows real roads/streets.
            val osrmResult = withContext(Dispatchers.IO) {
                fetchOsrmRoute(fromLng, fromLat, toLng, toLat)
            }

            val points: List<com.google.android.gms.maps.model.LatLng>
            val distMeters: Int
            val minutes: Int

            if (osrmResult != null) {
                // Use real road-following route from OSRM
                points = osrmResult.first
                distMeters = osrmResult.second
                // Walking speed ~5 km/h = 83 m/min; jeepney ~25 km/h = 417 m/min
                // For directions we show walking time since this is for pedestrian nav
                minutes = Math.max(1, (distMeters / 83.0).toInt())
            } else {
                // Fallback: haversine straight-line distance (with road correction factor 1.35)
                val dLat = Math.toRadians(toLat - fromLat)
                val dLng = Math.toRadians(toLng - fromLng)
                val a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                        Math.cos(Math.toRadians(fromLat)) * Math.cos(Math.toRadians(toLat)) *
                        Math.sin(dLng / 2) * Math.sin(dLng / 2)
                val c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
                val straightMeters = (6371000 * c).toInt()
                distMeters = (straightMeters * 1.35).toInt()
                minutes = Math.max(1, (distMeters / 83.0).toInt())
                // Use two intermediate points to avoid straight river-crossing lines
                val midLat = (fromLat + toLat) / 2
                val midLng = (fromLng + toLng) / 2
                points = listOf(
                    com.google.android.gms.maps.model.LatLng(fromLat, fromLng),
                    com.google.android.gms.maps.model.LatLng(midLat, fromLng),
                    com.google.android.gms.maps.model.LatLng(midLat, midLng),
                    com.google.android.gms.maps.model.LatLng(toLat, toLng)
                )
            }

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
            } finally {
                // Always reset loading state — even if the coroutine is cancelled or throws
                isCalculatingDirections = false
            }
        }
    }

    /**
     * Fetches a road-following route from the OSRM public routing engine.
     * Returns a Pair of (polyline points, distance in meters) or null on failure.
     * OSRM uses OpenStreetMap road network data and returns encoded polyline geometry.
     */
    private fun fetchOsrmRoute(
        fromLng: Double, fromLat: Double,
        toLng: Double, toLat: Double
    ): Pair<List<com.google.android.gms.maps.model.LatLng>, Int>? {
        return try {
            val url = "https://router.project-osrm.org/route/v1/foot/" +
                "$fromLng,$fromLat;$toLng,$toLat" +
                "?overview=full&geometries=geojson&steps=false"
            val client = OkHttpClient()
            val request = Request.Builder().url(url).build()
            val response = client.newCall(request).execute()
            if (!response.isSuccessful) return null
            val body = response.body?.string() ?: return null
            val json = JSONObject(body)
            if (json.getString("code") != "Ok") return null
            val route = json.getJSONArray("routes").getJSONObject(0)
            val distanceMeters = route.getDouble("distance").toInt()
            val coords = route.getJSONObject("geometry").getJSONArray("coordinates")
            val pts = mutableListOf<com.google.android.gms.maps.model.LatLng>()
            for (i in 0 until coords.length()) {
                val c = coords.getJSONArray(i)
                // GeoJSON: [longitude, latitude]
                pts.add(com.google.android.gms.maps.model.LatLng(c.getDouble(1), c.getDouble(0)))
            }
            if (pts.size < 2) null else Pair(pts, distanceMeters)
        } catch (_: Exception) {
            null
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
                recommendedJeepneyTrip = null
            }
            isLoadingJeepneyRoute = false
        }
    }

    fun clearDirections() {
        directionsGuide = null
        recommendedJeepneyTrip = null
        clearMapDirections()
    }


    fun clearRouteGuidance() {
        routeGuidance = null
    }

    fun selectRouteForGuidance(
        routeId: String,
        direction: String = "Inbound",
        userLoc: com.google.android.gms.maps.model.LatLng? = null
    ) {
        viewModelScope.launch {
            isCalculatingGuidance = true
            val route = routes.find { it.id == routeId || it.code.equals(routeId, ignoreCase = true) }
                ?: when (val r = routeRepo.getRoute(routeId)) {
                    is Resource.Success -> r.data
                    else -> null
                }
            if (route != null) {
                recalculateGuidance(route, direction, userLoc)
            }
            isCalculatingGuidance = false
        }
    }

    fun updateGuidanceLocation(userLoc: com.google.android.gms.maps.model.LatLng) {
        val current = routeGuidance ?: return
        viewModelScope.launch {
            recalculateGuidance(current.route, current.direction, userLoc)
        }
    }

    fun setGuidanceDirection(
        newDirection: String,
        userLoc: com.google.android.gms.maps.model.LatLng? = null
    ) {
        val current = routeGuidance ?: return
        viewModelScope.launch {
            isCalculatingGuidance = true
            recalculateGuidance(current.route, newDirection, userLoc ?: current.userLocation)
            isCalculatingGuidance = false
        }
    }

    private suspend fun recalculateGuidance(
        route: Route,
        direction: String,
        userLoc: com.google.android.gms.maps.model.LatLng?
    ) {
        val routePoints = com.ororuta.app.ui.screens.parseGeometries(route, direction)

        fun haversineMeters(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
            val r = 6371000.0
            val dLat = Math.toRadians(lat2 - lat1)
            val dLon = Math.toRadians(lon2 - lon1)
            val a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2)
            val c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
            return r * c
        }

        val isOutbound = direction.equals("Outbound", ignoreCase = true)
        val routeOriginTitle = if (isOutbound) route.destination else route.origin
        val routeDestTitle = if (isOutbound) route.origin else route.destination

        // 1. Gather verified drop-off points and determine dropoff stop at/near the route destination
        val dropoffCandidates = mutableListOf<RouteStopPoint>()
        if (routePoints.isNotEmpty()) {
            val endP = routePoints.last()
            dropoffCandidates.add(
                RouteStopPoint(
                    id = "dest_${route.id}_$direction",
                    name = "$routeDestTitle Terminal",
                    type = "terminal",
                    lat = endP.latitude,
                    lng = endP.longitude,
                    note = "Route Arrival Point"
                )
            )
        }
        route.terminals.filter { it.lat != 0.0 && it.lng != 0.0 && !it.name.contains("Miami", ignoreCase = true) }.forEach {
            dropoffCandidates.add(RouteStopPoint(it.id, it.name, "terminal", it.lat, it.lng, it.note))
        }
        route.stops.filter { it.lat != 0.0 && it.lng != 0.0 && it.pointType.equals("unloading", ignoreCase = true) && !it.name.contains("Miami", ignoreCase = true) }.forEach {
            dropoffCandidates.add(RouteStopPoint(it.id, it.name, "unloading", it.lat, it.lng, it.note))
        }

        if (routePoints.isNotEmpty()) {
            val endP = routePoints.last()
            dropoffCandidates.sortBy { haversineMeters(it.lat, it.lng, endP.latitude, endP.longitude) }
        }

        val dropoffStop = dropoffCandidates.firstOrNull() ?: RouteStopPoint(
            id = "dest_${route.id}_$direction",
            name = "$routeDestTitle Terminal",
            type = "terminal",
            lat = routePoints.lastOrNull()?.latitude ?: 8.4842,
            lng = routePoints.lastOrNull()?.longitude ?: 124.6568,
            note = "Route Arrival Point"
        )

        val dropoffIdx = if (routePoints.isNotEmpty()) {
            routePoints.indices.minByOrNull { haversineMeters(routePoints[it].latitude, routePoints[it].longitude, dropoffStop.lat, dropoffStop.lng) } ?: (routePoints.size - 1)
        } else 0

        // 2. Gather verified boarding points aligned with direction and occurring before dropoff
        val rawBoarding = mutableListOf<RouteStopPoint>()
        route.terminals.filter { it.lat != 0.0 && it.lng != 0.0 && !it.name.contains("Miami", ignoreCase = true) }.forEach {
            rawBoarding.add(RouteStopPoint(it.id, it.name, "terminal", it.lat, it.lng, it.note))
        }
        route.stops.filter { it.lat != 0.0 && it.lng != 0.0 && !it.pointType.equals("unloading", ignoreCase = true) && !it.name.contains("Miami", ignoreCase = true) }.forEach {
            rawBoarding.add(RouteStopPoint(it.id, it.name, "loading", it.lat, it.lng, it.note))
        }
        route.transfers.filter { it.lat != 0.0 && it.lng != 0.0 }.forEach {
            rawBoarding.add(RouteStopPoint(it.id, it.name, "transfer", it.lat, it.lng, it.note))
        }

        val boardingCandidates = mutableListOf<RouteStopPoint>()
        for (s in rawBoarding) {
            if (routePoints.isNotEmpty()) {
                val sIdx = routePoints.indices.minByOrNull { haversineMeters(routePoints[it].latitude, routePoints[it].longitude, s.lat, s.lng) } ?: 0
                val minD = haversineMeters(routePoints[sIdx].latitude, routePoints[sIdx].longitude, s.lat, s.lng)
                if (minD <= 100.0 && (dropoffIdx <= 0 || sIdx < dropoffIdx)) {
                    boardingCandidates.add(s)
                }
            } else {
                boardingCandidates.add(s)
            }
        }

        if (routePoints.isNotEmpty()) {
            val startP = routePoints.first()
            val hasStart = boardingCandidates.any { haversineMeters(it.lat, it.lng, startP.latitude, startP.longitude) < 80.0 }
            if (!hasStart) {
                boardingCandidates.add(
                    0,
                    RouteStopPoint(
                        id = "origin_${route.id}_$direction",
                        name = "$routeOriginTitle Departure Terminal",
                        type = "terminal",
                        lat = startP.latitude,
                        lng = startP.longitude,
                        note = "Route Departure Point"
                    )
                )
            }
            // Sort boarding candidates along route geometry from start to dropoff
            boardingCandidates.sortBy { s ->
                routePoints.indices.minByOrNull { haversineMeters(routePoints[it].latitude, routePoints[it].longitude, s.lat, s.lng) } ?: 0
            }
        }

        if (userLoc == null) {
            val nearestStop = boardingCandidates.firstOrNull()
            routeGuidance = RouteGuidance(
                route = route,
                direction = direction,
                userLocation = null,
                nearestBoardingStop = nearestStop,
                distanceToBoardingMeters = 0,
                isUserNearStop = false,
                walkingPathToBoarding = emptyList(),
                walkingTimeMinutes = 0,
                dropoffStop = dropoffStop,
                guidanceMessage = "Showing verified route for Route ${route.code} (${direction}). Turn on location to find your nearest boarding stop and walking directions.",
                routePoints = routePoints
            )
            return
        }

        val eligibleBoardingCandidates = if (dropoffStop != null) {
            val distToDrop = haversineMeters(userLoc.latitude, userLoc.longitude, dropoffStop.lat, dropoffStop.lng)
            if (distToDrop > 400.0) {
                boardingCandidates.filter {
                    haversineMeters(it.lat, it.lng, dropoffStop.lat, dropoffStop.lng) > 300.0 &&
                    !it.name.equals(dropoffStop.name, ignoreCase = true)
                }
            } else boardingCandidates
        } else boardingCandidates

        val userNearest = (eligibleBoardingCandidates.takeIf { it.isNotEmpty() } ?: boardingCandidates)
            .minByOrNull { haversineMeters(userLoc.latitude, userLoc.longitude, it.lat, it.lng) }

        val nearestStop = if (userNearest != null && haversineMeters(userLoc.latitude, userLoc.longitude, userNearest.lat, userNearest.lng) <= 1500.0) {
            userNearest
        } else {
            boardingCandidates.firstOrNull()
        }

        if (nearestStop == null) {
            routeGuidance = RouteGuidance(
                route = route,
                direction = direction,
                userLocation = userLoc,
                nearestBoardingStop = null,
                distanceToBoardingMeters = 0,
                isUserNearStop = false,
                walkingPathToBoarding = emptyList(),
                walkingTimeMinutes = 0,
                dropoffStop = dropoffStop,
                guidanceMessage = "Ride Traditional Jeepney Route ${route.code} (${direction}) heading towards $routeDestTitle.",
                routePoints = routePoints
            )
            return
        }

        val directDist = haversineMeters(userLoc.latitude, userLoc.longitude, nearestStop.lat, nearestStop.lng).toInt()
        val isNear = directDist <= 60

        if (isNear) {
            routeGuidance = RouteGuidance(
                route = route,
                direction = direction,
                userLocation = userLoc,
                nearestBoardingStop = nearestStop,
                distanceToBoardingMeters = directDist,
                isUserNearStop = true,
                walkingPathToBoarding = emptyList(),
                walkingTimeMinutes = 0,
                dropoffStop = dropoffStop,
                guidanceMessage = "You are at ${nearestStop.name}. Board Traditional Jeepney Route ${route.code} (${direction}) here heading towards $routeDestTitle.",
                routePoints = routePoints
            )
        } else {
            val osrm = withContext(Dispatchers.IO) {
                fetchOsrmRoute(userLoc.longitude, userLoc.latitude, nearestStop.lng, nearestStop.lat)
            }
            val walkPath: List<com.google.android.gms.maps.model.LatLng>
            val walkDist: Int
            val walkMins: Int
            if (osrm != null) {
                walkPath = osrm.first
                walkDist = osrm.second
                walkMins = Math.max(1, (walkDist / 83.0).toInt())
            } else {
                walkDist = (directDist * 1.35).toInt()
                walkMins = Math.max(1, (walkDist / 83.0).toInt())
                walkPath = listOf(userLoc, com.google.android.gms.maps.model.LatLng(nearestStop.lat, nearestStop.lng))
            }

            routeGuidance = RouteGuidance(
                route = route,
                direction = direction,
                userLocation = userLoc,
                nearestBoardingStop = nearestStop,
                distanceToBoardingMeters = walkDist,
                isUserNearStop = false,
                walkingPathToBoarding = walkPath,
                walkingTimeMinutes = walkMins,
                dropoffStop = dropoffStop,
                guidanceMessage = "Walk $walkDist m (~$walkMins min) to ${nearestStop.name} to board Traditional Jeepney Route ${route.code} (${direction}).",
                routePoints = routePoints
            )
        }
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

    private var allAnnouncements: List<Announcement> = emptyList()
    var announcementsState by mutableStateOf<Resource<List<Announcement>>>(Resource.Loading)
    var selectedFilter by mutableStateOf("All") // All, Active, Updated, Temporary, Expired
    var isRefreshing by mutableStateOf(false)

    init {
        loadAnnouncements()
    }

    fun setFilter(filter: String) {
        selectedFilter = filter
        applyFilter()
    }

    fun refresh() {
        loadAnnouncements(forceRefresh = true)
    }

    private fun applyFilter() {
        if (announcementsState is Resource.Loading && allAnnouncements.isEmpty()) return
        val filtered = if (selectedFilter.equals("All", ignoreCase = true)) {
            allAnnouncements
        } else {
            allAnnouncements.filter { it.status.equals(selectedFilter, ignoreCase = true) }
        }
        announcementsState = Resource.Success(filtered)
    }

    private fun loadAnnouncements(forceRefresh: Boolean = false) {
        viewModelScope.launch {
            if (forceRefresh) {
                isRefreshing = true
            } else if (allAnnouncements.isEmpty()) {
                announcementsState = Resource.Loading
            }

            announcementRepo.getAnnouncements(null).collect { res ->
                isRefreshing = false
                when (res) {
                    is Resource.Success -> {
                        allAnnouncements = res.data
                        applyFilter()
                    }
                    is Resource.Error -> {
                        if (allAnnouncements.isEmpty()) {
                            announcementsState = Resource.Error(res.message)
                        } else {
                            applyFilter()
                        }
                    }
                    is Resource.Loading -> {
                        if (allAnnouncements.isEmpty()) {
                            announcementsState = Resource.Loading
                        }
                    }
                }
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

    val savedTrips = savedRepo.getSavedTrips().stateIn(viewModelScope, SharingStarted.Lazily, emptyList())

    fun deleteTrip(id: String) {
        viewModelScope.launch { savedRepo.deleteTrip(id) }
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
