package com.ororuta.app.ui.theme

import androidx.compose.ui.graphics.Color

// OroRuta Official Premium Design System Colors
// Primary Blue: #1976D2 | Dark Navy: #172B4D | Background: #F5F7FB
val Canvas = Color(0xFFF5F7FB)
val Line = Color(0xFFE2E8F0)
val Ink = Color(0xFF172B4D) // Dark navy for headings and primary text
val InkSoft = Color(0xFF344563)
val InkMuted = Color(0xFF6B778C) // Accessible secondary text

// Official Primary Blue Brand Colors (#1976D2)
val Brand50 = Color(0xFFEFF6FF)
val Brand100 = Color(0xFFDBEAFE)
val Brand500 = Color(0xFF2563EB)
val Brand600 = Color(0xFF1976D2) // Main Brand Primary Blue
val Brand700 = Color(0xFF1565C0)
val Brand900 = Color(0xFF172B4D) // Dark Navy Brand Hero

// Official Highlight Yellow Accents (#E6B400)
val Oro50 = Color(0xFFFFFDF5)
val Oro100 = Color(0xFFFCF4D6)
val Oro400 = Color(0xFFE6B400) // Highlight Yellow #E6B400
val Oro500 = Color(0xFFE6B400)
val Oro600 = Color(0xFFC79B00)
val Oro700 = Color(0xFFA88300)

// Semantic feedback colors: Green for Boarding & Success, Red/Coral for Unloading & Warning
val Ok50 = Color(0xFFECFDF5)
val Ok600 = Color(0xFF10B981) // Green for boarding & success
val Ok700 = Color(0xFF047857)

val Warn50 = Color(0xFFFFFBEB)
val Warn600 = Color(0xFFF59E0B)

val Bad50 = Color(0xFFFEF2F2)
val Bad100 = Color(0xFFFEE2E2)
val Bad600 = Color(0xFFEF4444) // Coral / red for alighting & alert
val Bad700 = Color(0xFFDC2626)

// Surface / background aliases for M3
val SurfaceBackground = Canvas
val SurfaceCard = Color.White
val OnSurface = Ink
val OnSurfaceVariant = InkMuted
val Primary = Brand600
val PrimaryContainer = Brand50
val OnPrimary = Color.White
val OnPrimaryContainer = Brand700
val Secondary = Oro400
val OnSecondary = Ink
val Error = Bad600
val OnError = Color.White
val ErrorContainer = Bad50
