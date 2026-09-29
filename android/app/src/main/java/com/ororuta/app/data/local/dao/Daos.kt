package com.ororuta.app.data.local.dao

import androidx.room.*
import com.ororuta.app.data.local.entities.*
import kotlinx.coroutines.flow.Flow

@Dao
interface RouteDao {
    @Query("SELECT * FROM cached_routes ORDER BY code")
    fun getAll(): Flow<List<CachedRoute>>

    @Query("SELECT * FROM cached_routes WHERE id = :id")
    suspend fun getById(id: String): CachedRoute?

    @Query("SELECT * FROM cached_routes WHERE isOfflineDownload = 1")
    fun getOfflineRoutes(): Flow<List<CachedRoute>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(routes: List<CachedRoute>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(route: CachedRoute)

    @Query("DELETE FROM cached_routes WHERE id = :id")
    suspend fun delete(id: String)

    @Query("UPDATE cached_routes SET isOfflineDownload = 0 WHERE id = :id")
    suspend fun removeOffline(id: String)
}

@Dao
interface PlaceDao {
    @Query("SELECT * FROM cached_places WHERE name LIKE '%' || :q || '%' ORDER BY name LIMIT 30")
    suspend fun search(q: String): List<CachedPlace>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(places: List<CachedPlace>)
}

@Dao
interface AnnouncementDao {
    @Query("SELECT * FROM cached_announcements WHERE status != 'Expired' ORDER BY date DESC")
    fun getActive(): Flow<List<CachedAnnouncement>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(items: List<CachedAnnouncement>)
}

@Dao
interface PendingReportDao {
    @Query("SELECT * FROM pending_reports WHERE synced = 0")
    suspend fun getPending(): List<PendingReport>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(report: PendingReport)

    @Query("UPDATE pending_reports SET synced = 1 WHERE localId = :id")
    suspend fun markSynced(id: String)
}

@Dao
interface HistoryDao {
    @Query("SELECT * FROM local_history ORDER BY createdAt DESC LIMIT 50")
    fun getAll(): Flow<List<LocalHistory>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(item: LocalHistory)

    @Query("DELETE FROM local_history WHERE id = :id")
    suspend fun delete(id: String)

    @Query("DELETE FROM local_history")
    suspend fun clearAll()
}

@Dao
interface SavedTripsDao {
    @Query("SELECT * FROM local_saved_trips ORDER BY createdAt DESC")
    fun getAll(): Flow<List<LocalSavedTrip>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(item: LocalSavedTrip)

    @Query("DELETE FROM local_saved_trips WHERE id = :id")
    suspend fun delete(id: String)
}

@Dao
interface SavedDestinationsDao {
    @Query("SELECT * FROM local_saved_destinations ORDER BY createdAt DESC")
    fun getAll(): Flow<List<LocalSavedDestination>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(item: LocalSavedDestination)

    @Query("DELETE FROM local_saved_destinations WHERE id = :id")
    suspend fun delete(id: String)
}
