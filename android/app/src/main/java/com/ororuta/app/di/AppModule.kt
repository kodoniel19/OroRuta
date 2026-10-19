package com.ororuta.app.di

import android.content.Context
import androidx.room.Room
import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import com.ororuta.app.BuildConfig
import com.ororuta.app.data.local.AppDataStore
import com.ororuta.app.data.local.OroRutaDatabase
import com.ororuta.app.data.local.dao.*
import com.ororuta.app.data.remote.DeviceIdInterceptor
import com.ororuta.app.data.remote.OroRutaApi
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides @Singleton
    fun provideJson() = Json { ignoreUnknownKeys = true; isLenient = true; coerceInputValues = true }

    @Provides @Singleton
    fun provideAppDataStore(@ApplicationContext ctx: Context) = AppDataStore(ctx)

    @Provides @Singleton
    fun provideDeviceIdInterceptor(dataStore: AppDataStore): DeviceIdInterceptor =
        DeviceIdInterceptor { runBlocking { dataStore.getOrCreateDeviceId() } }

    @Provides @Singleton
    fun provideOkHttp(deviceIdInterceptor: DeviceIdInterceptor): OkHttpClient =
        OkHttpClient.Builder()
            .addInterceptor(deviceIdInterceptor)
            .addInterceptor(HttpLoggingInterceptor().apply {
                level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BODY
                        else HttpLoggingInterceptor.Level.NONE
            })
            .connectTimeout(5, TimeUnit.SECONDS)
            .readTimeout(10, TimeUnit.SECONDS)
            .build()

    @Provides @Singleton
    fun provideRetrofit(okHttp: OkHttpClient, json: Json): Retrofit =
        Retrofit.Builder()
            .baseUrl(BuildConfig.BASE_URL)
            .client(okHttp)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()

    @Provides @Singleton
    fun provideApi(retrofit: Retrofit): OroRutaApi = retrofit.create(OroRutaApi::class.java)

    @Provides @Singleton
    fun provideDatabase(@ApplicationContext ctx: Context): OroRutaDatabase =
        Room.databaseBuilder(ctx, OroRutaDatabase::class.java, "ororuta.db")
            .fallbackToDestructiveMigration()
            .build()

    @Provides fun provideRouteDao(db: OroRutaDatabase): RouteDao = db.routeDao()
    @Provides fun providePlaceDao(db: OroRutaDatabase): PlaceDao = db.placeDao()
    @Provides fun provideAnnouncementDao(db: OroRutaDatabase): AnnouncementDao = db.announcementDao()
    @Provides fun providePendingReportDao(db: OroRutaDatabase): PendingReportDao = db.pendingReportDao()
    @Provides fun provideHistoryDao(db: OroRutaDatabase): HistoryDao = db.historyDao()
    @Provides fun provideSavedTripsDao(db: OroRutaDatabase): SavedTripsDao = db.savedTripsDao()
    @Provides fun provideSavedDestinationsDao(db: OroRutaDatabase): SavedDestinationsDao = db.savedDestinationsDao()
}
