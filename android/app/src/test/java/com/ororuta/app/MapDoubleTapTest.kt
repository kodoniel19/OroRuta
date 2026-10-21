package com.ororuta.app

import com.ororuta.app.ui.screens.isCdoMapDoubleTap
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class MapDoubleTapTest {
    @Test
    fun recognizesNearbySingleFingerDoubleTap() {
        assertTrue(isCdoMapDoubleTap(180, 12f, 8f, 1))
    }

    @Test
    fun leavesSingleTapsDragsAndMultiTouchAlone() {
        assertFalse(isCdoMapDoubleTap(500, 0f, 0f, 1))
        assertFalse(isCdoMapDoubleTap(120, 100f, 0f, 1))
        assertFalse(isCdoMapDoubleTap(120, 0f, 0f, 2))
    }
}
