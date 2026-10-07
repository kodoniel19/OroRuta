const express = require("express");
const router = express.Router();
const { requireDeviceId, requireAdmin } = require("../middleware");

const devices = require("../controllers/devices");
const places = require("../controllers/places");
const routes = require("../controllers/routes");
const trips = require("../controllers/trips");
const fares = require("../controllers/fares");
const nearby = require("../controllers/nearby");
const announcements = require("../controllers/announcements");
const history = require("../controllers/history");
const saved = require("../controllers/saved");
const reports = require("../controllers/reports");
const content = require("../controllers/content");
const map = require("../controllers/map");
const admin = require("../controllers/admin");

// Health
router.get("/health", (req, res) => res.json({ status: "ok", service: "OroRuta API", version: "1.0.0" }));

// Devices
router.post("/devices/register", requireDeviceId, devices.register);
router.get("/devices/me/preferences", requireDeviceId, devices.getPreferences);
router.put("/devices/me/preferences", requireDeviceId, devices.updatePreferences);

// Places
router.get("/places", places.list);
router.get("/places/:id", places.get);

// Routes
router.get("/routes", routes.list);
router.get("/routes/:id", routes.getById);
router.get("/routes/:id/offline-bundle", routes.getOfflineBundle);

// Trips & Route Recommendations
router.get("/trips/search", trips.search);
router.get("/trips/:id", trips.getOption);
router.post("/route-recommendations", trips.routeRecommendations);
router.post("/trips/completed", requireDeviceId, trips.recordCompleted);

// Fares
router.get("/fares/rules", fares.getRules);
router.get("/fares/estimate", fares.estimate);

// Nearby
router.get("/nearby", nearby.nearby);

// Announcements
router.get("/announcements", announcements.list);
router.get("/announcements/:id", announcements.getById);

// History
router.get("/history", requireDeviceId, history.list);
router.post("/history", requireDeviceId, history.add);
router.delete("/history/:id", requireDeviceId, history.deleteOne);
router.delete("/history", requireDeviceId, history.clearAll);

// Saved trips
router.get("/saved-trips", requireDeviceId, saved.listTrips);
router.post("/saved-trips", requireDeviceId, saved.saveTrip);
router.delete("/saved-trips/:id", requireDeviceId, saved.deleteTrip);

// Saved destinations
router.get("/saved-destinations", requireDeviceId, saved.listDests);
router.post("/saved-destinations", requireDeviceId, saved.saveDest);
router.delete("/saved-destinations/:id", requireDeviceId, saved.deleteDest);

// Reports
router.post("/reports", requireDeviceId, reports.submit);
router.get("/reports/mine", requireDeviceId, reports.mine);

// Content
router.get("/content/:slug", content.getPage);
router.get("/help/topics", content.getHelpTopics);
router.get("/help/faqs", content.getFaqs);

// Map
router.get("/map/base", map.getBase);
router.get("/offline/map-pack", map.getMapPack);

// Admin (Auth)
router.post("/admin/auth/login", admin.login);

// Admin (Protected)
router.get("/admin/overview", requireAdmin, admin.getOverview);

// Admin Routes CRUD
router.get("/admin/routes", requireAdmin, admin.getRoutes);
router.post("/admin/routes", requireAdmin, admin.createRoute);
router.put("/admin/routes/:id", requireAdmin, admin.updateRoute);
router.delete("/admin/routes/:id", requireAdmin, admin.deleteRoute);
router.get("/admin/routes/:id/directions", requireAdmin, admin.getRouteDirections);
router.post("/admin/routes/:id/directions", requireAdmin, admin.saveRouteDirections);
router.post("/admin/routes/:id/generate-geometry", requireAdmin, admin.generateGeometry);
router.post("/admin/routes/:id/verify", requireAdmin, admin.verifyRoute);

// Admin Locations CRUD
router.get("/admin/locations", requireAdmin, admin.getLocations);
router.post("/admin/locations", requireAdmin, admin.createLocation);
router.put("/admin/locations/:id", requireAdmin, admin.updateLocation);
router.delete("/admin/locations/:id", requireAdmin, admin.deleteLocation);

// Admin Fares CRUD
router.get("/admin/fares", requireAdmin, admin.getFares);
router.post("/admin/fares", requireAdmin, admin.createFare);
router.put("/admin/fares/:id", requireAdmin, admin.updateFare);
router.delete("/admin/fares/:id", requireAdmin, admin.deleteFare);

// Admin Announcements CRUD
router.get("/admin/announcements", requireAdmin, admin.getAnnouncements);
router.post("/admin/announcements", requireAdmin, admin.createAnnouncement);
router.put("/admin/announcements/:id", requireAdmin, admin.updateAnnouncement);
router.delete("/admin/announcements/:id", requireAdmin, admin.deleteAnnouncement);

// Admin Reports CRUD
router.get("/admin/reports", requireAdmin, admin.getReports);
router.put("/admin/reports/:id", requireAdmin, admin.updateReport);
router.delete("/admin/reports/:id", requireAdmin, admin.deleteReport);

// Admin Activity Log
router.get("/admin/activity", requireAdmin, admin.getActivity);
router.post("/admin/activity", requireAdmin, admin.logActivity);

// Admin Location Verification System
router.get("/admin/verification/locations", requireAdmin, admin.getVerificationLocations);
router.post("/admin/verification/locations", requireAdmin, admin.createVerificationLocation);
router.post("/admin/verification/locations/geocode", requireAdmin, admin.geocodeLocation);
router.put("/admin/verification/locations/:id/verify", requireAdmin, admin.verifyLocation);
router.delete("/admin/verification/locations/:id", requireAdmin, admin.deleteVerificationLocation);
router.post("/admin/verification/locations/bulk-validate", requireAdmin, admin.bulkValidateLocations);
router.post("/admin/verification/locations/extract-from-routes", requireAdmin, admin.extractRouteLocations);

module.exports = router;

