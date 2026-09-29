package com.ororuta.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf

data class OroRutaColors(
    val canvas: androidx.compose.ui.graphics.Color = Canvas,
    val line: androidx.compose.ui.graphics.Color = Line,
    val ink: androidx.compose.ui.graphics.Color = Ink,
    val inkSoft: androidx.compose.ui.graphics.Color = InkSoft,
    val inkMuted: androidx.compose.ui.graphics.Color = InkMuted,
    val brand50: androidx.compose.ui.graphics.Color = Brand50,
    val brand100: androidx.compose.ui.graphics.Color = Brand100,
    val brand500: androidx.compose.ui.graphics.Color = Brand500,
    val brand600: androidx.compose.ui.graphics.Color = Brand600,
    val brand700: androidx.compose.ui.graphics.Color = Brand700,
    val brand900: androidx.compose.ui.graphics.Color = Brand900,
    val oro100: androidx.compose.ui.graphics.Color = Oro100,
    val oro400: androidx.compose.ui.graphics.Color = Oro400,
    val oro500: androidx.compose.ui.graphics.Color = Oro500,
    val oro700: androidx.compose.ui.graphics.Color = Oro700,
    val ok50: androidx.compose.ui.graphics.Color = Ok50,
    val ok600: androidx.compose.ui.graphics.Color = Ok600,
    val warn50: androidx.compose.ui.graphics.Color = Warn50,
    val warn600: androidx.compose.ui.graphics.Color = Warn600,
    val bad50: androidx.compose.ui.graphics.Color = Bad50,
    val bad100: androidx.compose.ui.graphics.Color = Bad100,
    val bad600: androidx.compose.ui.graphics.Color = Bad600,
)

val LocalOroRutaColors = staticCompositionLocalOf { OroRutaColors() }

private val LightColorScheme = lightColorScheme(
    primary = Brand600,
    onPrimary = OnPrimary,
    primaryContainer = Brand50,
    onPrimaryContainer = Brand700,
    secondary = Oro500,
    onSecondary = OnSecondary,
    secondaryContainer = Oro100,
    onSecondaryContainer = Oro700,
    tertiary = Ok600,
    onTertiary = OnPrimary,
    tertiaryContainer = Ok50,
    error = Bad600,
    onError = OnError,
    errorContainer = Bad50,
    background = Canvas,
    onBackground = Ink,
    surface = SurfaceCard,
    onSurface = Ink,
    onSurfaceVariant = InkMuted,
    outline = Line,
)

@Composable
fun OroRutaTheme(content: @Composable () -> Unit) {
    CompositionLocalProvider(LocalOroRutaColors provides OroRutaColors()) {
        MaterialTheme(
            colorScheme = LightColorScheme,
            typography = OroRutaTypography,
            content = content
        )
    }
}

val MaterialTheme.oroColors: OroRutaColors
    @Composable get() = LocalOroRutaColors.current
