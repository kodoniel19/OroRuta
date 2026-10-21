package com.ororuta.app

import com.ororuta.app.domain.models.TripOption
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class TripItineraryParsingTest {
    @Test
    fun decodesAllRouteSegmentsAndOrderedTransferLegs() {
        val json = Json { ignoreUnknownKeys = true }
        val trip = json.decodeFromString<TripOption>("""
            {
              "id":"trip-a-b","origin_place_id":"origin","destination_place_id":"cogon",
              "minutes":42,"walk_meters":250,"transfers":1,"totalKm":8.4,"regularFare":25.0,
              "segments":[
                {"seq":1,"route_id":"route-a","code":"R1","route_name":"R1","direction":"Outbound",
                 "boarding_name":"Carmen Terminal","boarding_lat":8.4845,"boarding_lng":124.6335,
                 "dropoff_name":"Agora Terminal","dropoff_lat":8.4857,"dropoff_lng":124.6589,
                 "geometry_coordinates":[[124.6335,8.4845],[124.6589,8.4857]]},
                {"seq":2,"route_id":"route-b","code":"R2","route_name":"R2","direction":"Inbound",
                 "boarding_name":"Agora Terminal","boarding_lat":8.4857,"boarding_lng":124.6589,
                 "dropoff_name":"Cogon Terminal","dropoff_lat":8.4735,"dropoff_lng":124.6497,
                 "geometry_coordinates":[[124.6589,8.4857],[124.6497,8.4735]]}
              ],
              "legs":[
                {"seq":1,"kind":"walk","title":"Walk to Carmen","geometry_coordinates":[[124.632,8.484],[124.6335,8.4845]]},
                {"seq":2,"kind":"board","title":"Board R1","route_code":"R1","direction":"Outbound"},
                {"seq":3,"kind":"stay","title":"Ride R1","route_code":"R1","direction":"Outbound","geometry_coordinates":[[124.6335,8.4845],[124.6589,8.4857]]},
                {"seq":4,"kind":"alight","title":"Alight Agora","route_code":"R1"},
                {"seq":5,"kind":"transfer","title":"Transfer at Agora"},
                {"seq":6,"kind":"board","title":"Board R2","route_code":"R2","direction":"Inbound"},
                {"seq":7,"kind":"stay","title":"Ride R2","route_code":"R2","direction":"Inbound","geometry_coordinates":[[124.6589,8.4857],[124.6497,8.4735]]},
                {"seq":8,"kind":"alight","title":"Alight Cogon","route_code":"R2"},
                {"seq":9,"kind":"walk","title":"Walk to Cogon"}
              ]
            }
        """.trimIndent())

        assertEquals(1, trip.transfers)
        assertEquals(listOf("R1", "R2"), trip.segments.map { it.code })
        assertEquals(listOf("Outbound", "Inbound"), trip.segments.map { it.direction })
        assertEquals("Agora Terminal", trip.segments[0].dropoffName)
        assertEquals("Agora Terminal", trip.segments[1].boardingName)
        assertTrue(trip.segments.all { it.geometryCoordinates.size >= 2 })
        assertEquals("transfer", trip.legs[4].kind)
        assertEquals("R2", trip.legs[5].routeCode)
    }
}
