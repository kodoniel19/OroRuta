package com.ororuta.app.data.remote

import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject

class DeviceIdInterceptor @Inject constructor(
    private val deviceIdProvider: () -> String
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val deviceId = deviceIdProvider()
        val request = chain.request().newBuilder()
            .addHeader("X-Device-Id", deviceId)
            .build()
        return chain.proceed(request)
    }
}
