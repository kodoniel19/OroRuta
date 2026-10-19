package com.ororuta.app.data.local.dao

import androidx.room.*
import com.ororuta.app.data.local.entities.*
import kotlinx.coroutines.flow.Flow

@Dao
interface RouteDao {
    @Query("SELECT * FROM cached_routes ORDER BY code")
    fun getAll(): Flow<List<CachedRoute>>

    @Query("SELECT * FROM cached_routes ORDER BY code")
    suspend fun getAllSync(): List<CachedRoute>

    @Query("""
        SELECT * FROM cached_routes 
        WHERE id = :idOrCode 
           OR LOWER(code) = LOWER(:idOrCode) 
           OR UPPER(code) = UPPER(:idOrCode) 
        LIMIT 1
    """)
    suspend fun getById(idOrCode: String): CachedRoute?

    @Query("SELECT * FROM cached_routes WHERE isOfflineDownload = 1")
    fun getOfflineRoutes(): Flow<List<CachedRoute>>

    @Query("""
        SELECT * FROM cached_routes 
        WHERE code LIKE '%' || :q || '%' 
           OR name LIKE '%' || :q || '%' 
           OR origin LIKE '%' || :q || '%' 
           OR destination LIKE '%' || :q || '%'
           OR jsonData LIKE '%' || :q || '%'
        ORDER BY code
    """)
    suspend fun search(q: String): List<CachedRoute>

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

    @Query("DELETE FROM cached_places")
    suspend fun clearAll()
}

@Dao
interface AnnouncementDao {
    @Query("SELECT * FROM cached_announcements WHERE status != 'Expired' ORDER BY date DESC")
    fun getActive(): Flow<List<CachedAnnouncement>>

    @Query("SELECT * FROM cached_announcements ORDER BY date DESC")
    suspend fun getAllSync(): List<CachedAnnouncement>

    @Query("SELECT * FROM cached_announcements WHERE status = :status ORDER BY date DESC")
    suspend fun getByStatusSync(status: String): List<CachedAnnouncement>

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
    @Query("SELECT * FROM local_history ORDER BY createdAt DESC LIMIT 10")
    fun getAll(): Flow<List<LocalHistory>>

    @Query("SELECT * FROM local_history ORDER BY createdAt DESC LIMIT 10")
    suspend fun getAllSync(): List<LocalHistory>

    @Query("SELECT * FROM local_history WHERE LOWER(TRIM(`from`)) = LOWER(TRIM(:from)) AND LOWER(TRIM(`to`)) = LOWER(TRIM(:to)) ORDER BY createdAt DESC LIMIT 1")
    suspend fun findExact(from: String, to: String): LocalHistory?

    @Query("UPDATE local_history SET createdAt = :timestamp WHERE id = :id")
    suspend fun updateTimestamp(id: String, timestamp: Long)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(item: LocalHistory)

    @Query("DELETE FROM local_history WHERE id = :id")
    suspend fun delete(id: String)

    @Query("DELETE FROM local_history WHERE LOWER(TRIM(`from`)) = LOWER(TRIM(:from)) AND LOWER(TRIM(`to`)) = LOWER(TRIM(:to)) AND id != :keepId")
    suspend fun deleteDuplicates(from: String, to: String, keepId: String)

    @Query("DELETE FROM local_history")
    suspend fun clearAll()

    @Query("DELETE FROM local_history WHERE id NOT IN (SELECT id FROM local_history ORDER BY createdAt DESC LIMIT :limit)")
    suspend fun pruneOld(limit: Int = 10)
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
