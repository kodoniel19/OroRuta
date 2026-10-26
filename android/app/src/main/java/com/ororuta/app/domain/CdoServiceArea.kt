package com.ororuta.app.domain

/**
 * OroRuta CDO Jeepney Service Area utilities.
 *
 * Determines whether a destination falls within the operational coverage
 * of OroRuta's verified traditional jeepney routes in Cagayan de Oro City.
 *
 * The CDO jeepney route network operates approximately within:
 *  - Longitude: 124.580 (Iponan bridge / Opol boundary) to 124.780 (Bugo / Tagoloan boundary)
 *  - Latitude:  8.380 (Lumbia / Indahag uplands) to 8.550 (coastal Macabalan / Bugo)
 *
 * Destinations outside these bounds, or matching known outside-CDO municipalities,
 * are classified as outside the service area.
 */
object CdoServiceArea {

    // Municipalities and areas adjacent to CDO that have no OroRuta jeepney coverage
    private val OUTSIDE_KEYWORDS = listOf(
        "opol", "el salvador", "alubijid", "laguindingan", "gitagum",
        "initao", "tagoloan", "villanueva", "jasaan", "claveria",
        "manolo fortich", "libona", "talakag", "bukidnon", "iligan",
        "malaybalay", "valencia", "balingasag", "naawan", "lugait",
        "manticao", "sugbongcogon", "salay", "binuangan", "kinoguitan"
    )

    /**
     * Returns true if the destination is outside the supported OroRuta
     * CDO jeepney service area, based on geographic bounds and/or
     * municipality name matching.
     */
    fun isOutsideServiceArea(destinationName: String?, lat: Double?, lng: Double?): Boolean {
        // 1. Check tighter geographic bounds matching actual jeepney route coverage
        if (lat != null && lng != null && lat != 0.0 && lng != 0.0) {
            val inServiceArea = lat in 8.38..8.55 && lng in 124.58..124.78
            if (!inServiceArea) return true
        }

        // 2. Check for known municipalities outside CDO
        val nameClean = destinationName?.trim()?.lowercase() ?: return false
        return OUTSIDE_KEYWORDS.any { keyword -> nameClean.contains(keyword) }
    }
}
