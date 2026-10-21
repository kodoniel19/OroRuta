package com.ororuta.app

import com.google.android.gms.maps.model.LatLng
import com.ororuta.app.ui.viewmodels.RouteStopPoint
import com.ororuta.app.ui.viewmodels.nearestVerifiedBoardingStop
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class BoardingStopSelectionTest {
    @Test
    fun choosesNearestKnownBoardingStop() {
        val near = RouteStopPoint("near", "Near loading point", "loading", 8.4823, 124.6472)
        val far = RouteStopPoint("far", "Terminal", "terminal", 8.5000, 124.6600)

        assertEquals(near, nearestVerifiedBoardingStop(LatLng(8.4822, 124.6472), listOf(far, near)))
    }

    @Test
    fun doesNotInventStopWhenNoKnownBoardingLocationsExist() {
        assertNull(nearestVerifiedBoardingStop(LatLng(8.4822, 124.6472), emptyList()))
    }

    @Test
    fun ignoresInvalidStopCoordinates() {
        val invalid = RouteStopPoint("invalid", "Invalid", "loading", Double.NaN, 124.6472)
        assertNull(nearestVerifiedBoardingStop(LatLng(8.4822, 124.6472), listOf(invalid)))
    }
}
