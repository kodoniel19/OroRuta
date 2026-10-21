package com.ororuta.app.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.ororuta.app.data.local.dao.*
import com.ororuta.app.data.local.entities.*

@Database(
    entities = [
        CachedRoute::class,
        CachedAnnouncement::class,
        CachedPlace::class,
        PendingReport::class,
        LocalHistory::class,
        LocalSavedTrip::class,
        LocalSavedDestination::class,
        RecentSearchEntity::class
    ],
    version = 2,
    exportSchema = false
)
abstract class OroRutaDatabase : RoomDatabase() {
    abstract fun routeDao(): RouteDao
    abstract fun placeDao(): PlaceDao
    abstract fun announcementDao(): AnnouncementDao
    abstract fun pendingReportDao(): PendingReportDao
    abstract fun historyDao(): HistoryDao
    abstract fun savedTripsDao(): SavedTripsDao
    abstract fun savedDestinationsDao(): SavedDestinationsDao
    abstract fun recentSearchDao(): RecentSearchDao
}

