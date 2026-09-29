package com.ororuta.app.data.local

import android.content.Context
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

val Context.dataStore by preferencesDataStore(name = "ororuta_prefs")

@Singleton
class AppDataStore @Inject constructor(@ApplicationContext private val context: Context) {

    companion object {
        val KEY_DEVICE_ID = stringPreferencesKey("device_id")
        val KEY_LANGUAGE = stringPreferencesKey("language")
        val KEY_GPS_ENABLED = booleanPreferencesKey("gps_enabled")
        val KEY_GPS_ASKED = booleanPreferencesKey("gps_asked")
        val KEY_MANUAL_START = stringPreferencesKey("manual_start")
        val KEY_LAST_SYNC = longPreferencesKey("last_sync")
        val KEY_OFFLINE_SIZE_MB = floatPreferencesKey("offline_size_mb")
    }

    val deviceId: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[KEY_DEVICE_ID] ?: run {
            val id = UUID.randomUUID().toString()
            context.dataStore.edit { it[KEY_DEVICE_ID] = id }
            id
        }
    }

    suspend fun getOrCreateDeviceId(): String {
        var id: String? = null
        context.dataStore.edit { prefs ->
            id = prefs[KEY_DEVICE_ID] ?: UUID.randomUUID().toString().also { prefs[KEY_DEVICE_ID] = it }
        }
        return id!!
    }

    val language: Flow<String> = context.dataStore.data.map { it[KEY_LANGUAGE] ?: "en" }
    val gpsEnabled: Flow<Boolean?> = context.dataStore.data.map {
        if (it[KEY_GPS_ASKED] == true) it[KEY_GPS_ENABLED] else null
    }
    val manualStart: Flow<String?> = context.dataStore.data.map { it[KEY_MANUAL_START] }
    val lastSync: Flow<Long> = context.dataStore.data.map { it[KEY_LAST_SYNC] ?: 0L }

    suspend fun setLanguage(lang: String) = context.dataStore.edit { it[KEY_LANGUAGE] = lang }
    suspend fun setGps(enabled: Boolean) = context.dataStore.edit {
        it[KEY_GPS_ENABLED] = enabled; it[KEY_GPS_ASKED] = true
    }
    suspend fun setManualStart(place: String?) = context.dataStore.edit {
        if (place == null) it.remove(KEY_MANUAL_START) else it[KEY_MANUAL_START] = place
    }
    suspend fun setLastSync(time: Long) = context.dataStore.edit { it[KEY_LAST_SYNC] = time }
}
