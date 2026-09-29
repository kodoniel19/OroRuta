package com.ororuta.app.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "cached_routes")
data class CachedRoute(
    @PrimaryKey val id: String,
    val code: String,
    val name: String,
    val origin: String,
    val destination: String,
    val jeepneyType: String,
    val status: String,
    val color: String,
    val lengthKm: Double,
    val offlineSizeMb: Double,
    val lastUpdatedAt: String?,
    val jsonData: String, // full JSON blob
    val isOfflineDownload: Boolean = false,
    val cachedAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "cached_announcements")
data class CachedAnnouncement(
    @PrimaryKey val id: String,
    val title: String,
    val date: String,
    val category: String,
    val status: String,
    val jsonData: String,
    val cachedAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "cached_places")
data class CachedPlace(
    @PrimaryKey val id: String,
    val name: String,
    val area: String?,
    val kind: String,
    val mapX: Double,
    val mapY: Double,
    val lat: Double,
    val lng: Double,
    val cachedAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "pending_reports")
data class PendingReport(
    @PrimaryKey val localId: String,
    val type: String,
    val description: String,
    val locationText: String?,
    val lat: Double?,
    val lng: Double?,
    val createdAt: Long = System.currentTimeMillis(),
    val synced: Boolean = false
)

@Entity(tableName = "local_history")
data class LocalHistory(
    @PrimaryKey val id: String,
    val from: String,
    val to: String,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "local_saved_trips")
data class LocalSavedTrip(
    @PrimaryKey val id: String,
    val fromLabel: String,
    val toLabel: String,
    val routeIds: String,
    val tripOptionId: String?,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "local_saved_destinations")
data class LocalSavedDestination(
    @PrimaryKey val id: String,
    val label: String,
    val placeName: String,
    val icon: String,
    val createdAt: Long = System.currentTimeMillis()
)
