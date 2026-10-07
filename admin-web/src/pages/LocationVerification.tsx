import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import {
  MapPin, CheckCircle2, AlertTriangle, AlertCircle, RefreshCw,
  Search, Crosshair, ArrowRight, ShieldCheck, Sparkles, Plus,
  Trash2, Globe, Database, Compass, Check
} from 'lucide-react';
import {
  MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents
} from 'react-leaflet';
import L, { divIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api, VerificationLocation, GeocodingCandidate } from '../services/api';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/SearchInput';

// Cagayan de Oro City Center Coordinates
const CDO_CENTER: [number, number] = [8.4822, 124.6472];

// Pin marker icon
const verifiedIcon = divIcon({
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  html: `<div style="background-color:#10B981;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,0.3);border:2px solid #fff;"><div style="transform:rotate(45deg);color:white;font-weight:bold;font-size:14px;">✓</div></div>`
});

const unverifiedIcon = divIcon({
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  html: `<div style="background-color:#F59E0B;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,0.3);border:2px solid #fff;"><div style="transform:rotate(45deg);color:white;font-weight:bold;font-size:14px;">?</div></div>`
});

const candidateIcon = divIcon({
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  html: `<div style="background-color:#3B82F6;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.25);border:2px solid #fff;"><div style="transform:rotate(45deg);color:white;font-size:10px;font-weight:bold;">OSM</div></div>`
});

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
    },
  });
  return null;
}

function MapViewController({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom || Math.max(map.getZoom(), 15), { duration: 0.8 });
  }, [center[0], center[1], zoom, map]);
  return null;
}

export function LocationVerification() {
  const [locations, setLocations] = useState<VerificationLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Location Verification Edit State
  const [selectedPin, setSelectedPin] = useState<[number, number] | null>(null);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Cagayan de Oro');
  const [barangay, setBarangay] = useState('');
  const [candidates, setCandidates] = useState<GeocodingCandidate[]>([]);
  const [isSearchingGeocode, setIsSearchingGeocode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [extracting, setExtracting] = useState(false);

  // Load locations on mount
  const fetchLocations = async () => {
    try {
      setLoading(true);
      const data = await api.verification.listLocations();
      setLocations(data);
      if (data.length > 0 && !selectedId) {
        selectLocation(data[0]);
      }
    } catch (err: any) {
      toast.error('Failed to load locations: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const selectLocation = (loc: VerificationLocation) => {
    setSelectedId(loc.id);
    if (loc.latitude && loc.longitude) {
      setSelectedPin([Number(loc.latitude), Number(loc.longitude)]);
    } else {
      setSelectedPin(null);
    }
    setAddress(loc.address || '');
    setCity(loc.city || 'Cagayan de Oro');
    setBarangay(loc.barangay || '');
    setCandidates([]);
  };

  const selectedLoc = useMemo(
    () => locations.find((l) => l.id === selectedId) || null,
    [locations, selectedId]
  );

  // Filtered list
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      const matchesSearch =
        !searchQuery ||
        loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (loc.originalName && loc.originalName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        filterStatus === 'ALL' || loc.verificationStatus === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [locations, searchQuery, filterStatus]);

  // Status stats
  const stats = useMemo(() => {
    const verified = locations.filter((l) => l.verificationStatus === 'VERIFIED').length;
    const needsVerification = locations.filter(
      (l) => l.verificationStatus === 'NEEDS_COORDINATE_VERIFICATION'
    ).length;
    const reviewRequired = locations.filter(
      (l) => l.verificationStatus === 'DATA_REVIEW_REQUIRED'
    ).length;
    return { total: locations.length, verified, needsVerification, reviewRequired };
  }, [locations]);

  // Request OSM Geocoding Suggestions
  const handleSearchCandidates = async () => {
    if (!selectedLoc) return;
    try {
      setIsSearchingGeocode(true);
      const res = await api.verification.geocodeLocation(selectedLoc.name);
      setCandidates(res.candidates);
      if (res.candidates.length === 0) {
        toast.info('No verified Cagayan de Oro coordinates found via Nominatim. Please place the pin manually on the map.');
      } else {
        toast.success(`Found ${res.candidates.length} candidate location(s)`);
      }
    } catch (err: any) {
      toast.error('Geocoding search failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSearchingGeocode(false);
    }
  };

  // Apply candidate coordinate
  const applyCandidate = (c: GeocodingCandidate) => {
    setSelectedPin([c.latitude, c.longitude]);
    if (c.city) setCity(c.city);
    if (c.barangay) setBarangay(c.barangay);
    if (c.displayName) setAddress(c.displayName);
    toast.success('Candidate coordinates applied to map pin');
  };

  // Click on map to place exact coordinate
  const handleMapClick = (lat: number, lng: number) => {
    setSelectedPin([lat, lng]);
    toast.info(`Pin placed at: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
  };

  // Save and Verify Location
  const handleVerifySave = async () => {
    if (!selectedLoc) return;
    if (!selectedPin) {
      toast.error('Please click on the map to set an exact coordinate before verifying!');
      return;
    }

    try {
      setSaving(true);
      await api.verification.verifyLocation(selectedLoc.id, {
        latitude: selectedPin[0],
        longitude: selectedPin[1],
        address,
        city,
        barangay,
        confidence: 1.0,
      });

      toast.success(`Location "${selectedLoc.name}" verified and saved!`);
      // Update local state
      setLocations((prev) =>
        prev.map((l) =>
          l.id === selectedLoc.id
            ? {
                ...l,
                latitude: selectedPin[0],
                longitude: selectedPin[1],
                address,
                city,
                barangay,
                verificationStatus: 'VERIFIED',
              }
            : l
        )
      );
    } catch (err: any) {
      toast.error('Failed to verify location: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  // Run Bulk Validation across database
  const handleBulkValidate = async () => {
    try {
      setValidating(true);
      const res = await api.verification.bulkValidate();
      toast.info(`Validation Complete: ${res.total} checked, ${res.flagged} flagged for review.`);
      fetchLocations();
    } catch (err: any) {
      toast.error('Bulk validation failed: ' + (err.message || 'Unknown error'));
    } finally {
      setValidating(false);
    }
  };

  // Extract all locations from route street sequences
  const handleExtractFromRoutes = async () => {
    try {
      setExtracting(true);
      const res = await api.verification.extractFromRoutes();
      toast.success(`Extracted ${res.newLocationsAdded} new stop(s) from route street sequences!`);
      fetchLocations();
    } catch (err: any) {
      toast.error('Route extraction failed: ' + (err.message || 'Unknown error'));
    } finally {
      setExtracting(false);
    }
  };

  // Delete location
  const handleDeleteLocation = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await api.verification.deleteLocation(id);
      toast.success(`Location "${name}" removed`);
      setLocations((prev) => prev.filter((l) => l.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (err: any) {
      toast.error('Failed to delete: ' + (err.message || 'Unknown error'));
    }
  };

  const mapCenter: [number, number] = selectedPin || CDO_CENTER;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-slate-50 overflow-hidden font-sans">
      {/* Top action header */}
      <div className="border-b border-slate-200 bg-white px-6 py-3.5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Location Verification & Precision Geocoding
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Strict Cagayan de Oro spatial coordinate audit. Zero guesses, zero river placements, 100% verified ground truth.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleBulkValidate}
              disabled={validating}
              className="text-xs flex items-center gap-1.5 border-slate-300 hover:bg-slate-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${validating ? 'animate-spin' : ''}`} />
              Bulk Audit Database
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleExtractFromRoutes}
              disabled={extracting}
              className="text-xs flex items-center gap-1.5 border-slate-300 hover:bg-slate-50 text-blue-700"
            >
              <Database className={`h-3.5 w-3.5 ${extracting ? 'animate-spin' : ''}`} />
              Extract Stops from 68 Routes
            </Button>
          </div>
        </div>

        {/* Stats Pill Strip */}
        <div className="mt-3 flex items-center gap-4 text-xs">
          <span className="font-semibold text-slate-700">Total Locations: {stats.total}</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
            <CheckCircle2 className="h-3 w-3" /> {stats.verified} Verified
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium border border-amber-200">
            <AlertCircle className="h-3 w-3" /> {stats.needsVerification} Needs Coordinates
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-medium border border-rose-200">
            <AlertTriangle className="h-3 w-3" /> {stats.reviewRequired} Review Required
          </span>
        </div>
      </div>

      {/* Main split workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left column: Location List */}
        <div className="flex w-96 flex-col border-r border-slate-200 bg-white shadow-sm z-10">
          <div className="p-3 border-b border-slate-100 space-y-2">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search CDO locations..."
            />
            <div className="flex gap-1 overflow-x-auto pb-1 text-xs">
              {(['ALL', 'NEEDS_COORDINATE_VERIFICATION', 'DATA_REVIEW_REQUIRED', 'VERIFIED'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                    filterStatus === s
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {s === 'ALL' ? 'All' : s === 'NEEDS_COORDINATE_VERIFICATION' ? 'Needs Coord' : s === 'DATA_REVIEW_REQUIRED' ? 'Flagged' : 'Verified'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading locations...</div>
            ) : filteredLocations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No locations found.</div>
            ) : (
              filteredLocations.map((loc) => {
                const isSelected = loc.id === selectedId;
                const isVerified = loc.verificationStatus === 'VERIFIED';
                const hasCoords = loc.latitude != null && loc.longitude != null;

                return (
                  <button
                    key={loc.id}
                    onClick={() => selectLocation(loc)}
                    className={`w-full p-3 text-left transition-colors flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'bg-blue-50/80 border-l-4 border-l-blue-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <MapPin
                          className={`h-3.5 w-3.5 shrink-0 ${
                            isVerified ? 'text-emerald-500' : hasCoords ? 'text-amber-500' : 'text-slate-400'
                          }`}
                        />
                        <span className="font-semibold text-xs text-slate-800 truncate">
                          {loc.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {hasCoords
                          ? `${Number(loc.latitude).toFixed(4)}, ${Number(loc.longitude).toFixed(4)}`
                          : 'No coordinates assigned'}
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                        isVerified
                          ? 'bg-emerald-100 text-emerald-800'
                          : loc.verificationStatus === 'DATA_REVIEW_REQUIRED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isVerified ? 'VERIFIED' : loc.verificationStatus === 'DATA_REVIEW_REQUIRED' ? 'FLAGGED' : 'PENDING'}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right column: Interactive Map and Verification Panel */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* Map canvas */}
          <div className="flex-1 relative">
            <MapContainer
              center={CDO_CENTER}
              zoom={13}
              className="h-full w-full"
              zoomControl={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClickHandler onMapClick={handleMapClick} />
              {selectedPin && <MapViewController center={selectedPin} />}

              {/* Verified pin or current pin */}
              {selectedPin && (
                <Marker
                  position={selectedPin}
                  icon={selectedLoc?.verificationStatus === 'VERIFIED' ? verifiedIcon : unverifiedIcon}
                >
                  <Popup>
                    <div className="text-xs">
                      <strong>{selectedLoc?.name || 'Selected Location'}</strong>
                      <br />
                      Lat: {selectedPin[0]}, Lng: {selectedPin[1]}
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Show candidate pins */}
              {candidates.map((c, idx) => (
                <Marker
                  key={idx}
                  position={[c.latitude, c.longitude]}
                  icon={candidateIcon}
                  eventHandlers={{
                    click: () => applyCandidate(c),
                  }}
                >
                  <Popup>
                    <div className="text-xs">
                      <strong>Candidate #{idx + 1}</strong>
                      <p>{c.displayName}</p>
                      <button
                        onClick={() => applyCandidate(c)}
                        className="mt-1 bg-blue-600 text-white px-2 py-0.5 rounded text-[10px]"
                      >
                        Use this pin
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>

            {/* Instruction tooltip over map */}
            <div className="absolute top-4 left-4 z-[500] bg-white/95 backdrop-blur-md rounded-lg shadow-lg border border-slate-200 px-3.5 py-2 flex items-center gap-2 text-xs text-slate-700">
              <Crosshair className="h-4 w-4 text-blue-600 animate-pulse" />
              <span>Click anywhere on the map to accurately place or adjust this location's coordinate pin.</span>
            </div>
          </div>

          {/* Bottom inspection / verification bar */}
          {selectedLoc && (
            <div className="border-t border-slate-200 bg-white p-4 shadow-lg z-20">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                {/* Location identity */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Target Location</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        selectedLoc.verificationStatus === 'VERIFIED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {selectedLoc.verificationStatus}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900">{selectedLoc.name}</h2>
                  <p className="text-xs text-slate-500">
                    Source: {selectedLoc.source || 'Standard Route Network'}
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleSearchCandidates}
                    disabled={isSearchingGeocode}
                    className="mt-2 text-xs flex items-center gap-1.5 text-blue-700 border-blue-200 hover:bg-blue-50"
                  >
                    <Sparkles className={`h-3 w-3 ${isSearchingGeocode ? 'animate-spin' : ''}`} />
                    Search OSM Suggestions
                  </Button>
                </div>

                {/* Candidate Suggestions preview */}
                <div className="space-y-1">
                  <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                    OSM Suggestions ({candidates.length})
                  </span>
                  {candidates.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      Click "Search OSM Suggestions" or click directly on the map to pin.
                    </p>
                  ) : (
                    <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                      {candidates.map((c, i) => (
                        <div
                          key={i}
                          onClick={() => applyCandidate(c)}
                          className="p-1.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded cursor-pointer text-xs transition-colors flex items-center justify-between"
                        >
                          <div className="truncate mr-2">
                            <p className="font-semibold text-slate-800 truncate">{c.displayName}</p>
                            <span className="text-[10px] text-slate-500">Confidence: {(c.confidence * 100).toFixed(0)}%</span>
                          </div>
                          <Button size="sm" variant="ghost" className="text-blue-600 font-bold shrink-0">
                            Apply
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Coordinates & Barangay Inputs */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Latitude</label>
                      <input
                        type="text"
                        readOnly
                        value={selectedPin ? selectedPin[0] : ''}
                        placeholder="Click map"
                        className="w-full bg-slate-100 border border-slate-200 rounded px-2 py-1 text-xs font-mono text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Longitude</label>
                      <input
                        type="text"
                        readOnly
                        value={selectedPin ? selectedPin[1] : ''}
                        placeholder="Click map"
                        className="w-full bg-slate-100 border border-slate-200 rounded px-2 py-1 text-xs font-mono text-slate-800"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">Barangay / Area</label>
                    <input
                      type="text"
                      value={barangay}
                      onChange={(e) => setBarangay(e.target.value)}
                      placeholder="e.g. Carmen, Lapasan, Poblacion"
                      className="w-full border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-blue-500"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col justify-end gap-2 pt-2">
                  <Button
                    onClick={handleVerifySave}
                    disabled={!selectedPin || saving}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 py-2 shadow-sm"
                  >
                    <Check className="h-4 w-4" />
                    {saving ? 'Verifying...' : 'Verify & Lock Coordinate'}
                  </Button>

                  <Button
                    variant="dangerGhost"
                    size="sm"
                    onClick={() => handleDeleteLocation(selectedLoc.id, selectedLoc.name)}
                    className="w-full border-rose-200 text-rose-700 hover:bg-rose-50 text-xs flex items-center justify-center gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Location
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
