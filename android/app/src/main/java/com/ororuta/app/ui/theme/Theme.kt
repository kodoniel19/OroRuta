package com.ororuta.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

data class OroRutaColors(
    val canvas: Color = Canvas,
    val line: Color = Line,
    val ink: Color = Ink,
    val inkSoft: Color = InkSoft,
    val inkMuted: Color = InkMuted,
    val brand50: Color = Brand50,
    val brand100: Color = Brand100,
    val brand500: Color = Brand500,
    val brand600: Color = Brand600,
    val brand700: Color = Brand700,
    val brand900: Color = Brand900,
    val oro100: Color = Oro100,
    val oro400: Color = Oro400,
    val oro500: Color = Oro500,
    val oro600: Color = Oro600,
    val oro700: Color = Oro700,
    val ok50: Color = Ok50,
    val ok600: Color = Ok600,
    val warn50: Color = Warn50,
    val warn600: Color = Warn600,
    val bad50: Color = Bad50,
    val bad100: Color = Bad100,
    val bad600: Color = Bad600,
)

val LocalOroRutaColors = staticCompositionLocalOf { OroRutaColors() }

private val LightColorScheme = lightColorScheme(
    primary = Brand600,
    onPrimary = Color.White,
    primaryContainer = Brand50,
    onPrimaryContainer = Brand700,
    secondary = Oro400,
    onSecondary = Ink,
    secondaryContainer = Oro100,
    onSecondaryContainer = Ink,
    tertiary = Ok600,
    onTertiary = Color.White,
    tertiaryContainer = Ok50,
    error = Bad600,
    onError = Color.White,
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
