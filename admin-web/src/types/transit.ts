export type LatLng = [number, number];

/** A single geographic point of a drawn route line, in travel order. */
export interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

export type RecordStatus = 'Active' | 'Inactive';
export type Direction = 'Northbound' | 'Southbound' | 'Eastbound' | 'Westbound' | 'Loop' | 'Inbound' | 'Outbound';
export type VerificationStatus = 'DRAFT' | 'PENDING_VERIFICATION' | 'VERIFIED' | 'PUBLISHED' | 'DATA_REVIEW_REQUIRED' | 'ERROR';

export interface RouteGeometry {
  direction: Direction;
  geometryStatus: string;
  generatedAt: string;
}

export interface JeepneyRoute {
  id: string;
  code?: string;
  name: string;
  origin: string;
  destination: string;
  direction?: Direction;
  majorRoads: string[];
  description: string;
  inboundDistanceKm?: number;
  outboundDistanceKm?: number;
  verificationStatus?: VerificationStatus;
  fare: number;
  travelTime: number;
  status: RecordStatus;
  lastUpdated: string;
  color: string;
  /** Map geometry used for rendering ([lat, lng] tuples). */
  path: LatLng[];
  /** Same geometry as an ordered list of coordinates, stored with routes drawn in the admin. */
  coordinates?: RouteCoordinate[];
}

export type LocationKind = 'terminal' | 'loading' | 'unloading' | 'transfer';
export type LocationStatus = 'Active' | 'Inactive' | 'Under Review';

export interface TransitLocation {
  id: string;
  kind: LocationKind;
  name: string;
  address: string;
  barangay: string;
  lat: number;
  lng: number;
  routeIds: string[];
  status: LocationStatus;
  notes: string;
  lastUpdated: string;
}

export type PassengerCategory = 'Regular' | 'Student' | 'Senior Citizen' | 'PWD';
export type VehicleType = 'Traditional Jeepney' | 'Modern Jeepney';
export type FareStatus = 'Current' | 'Scheduled' | 'Archived';

export interface FareRule {
  id: string;
  vehicle: VehicleType;
  category: PassengerCategory;
  baseFare: number;
  perKm: number;
  effectiveDate: string;
  lastUpdated: string;
  status: FareStatus;
}

export type AnnouncementType =
  | 'Rerouting'
  | 'Road Closure'
  | 'Terminal Change'
  | 'Loading/Unloading Change'
  | 'General Update';
export type AnnouncementStatus = 'Draft' | 'Published' | 'Inactive';

export interface Announcement {
  id: string;
  title: string;
  type: AnnouncementType;
  body: string;
  affectedRoutes: string[];
  status: AnnouncementStatus;
  startDate: string;
  endDate: string;
  updatedAt: string;
  author: string;
}

export type ReportCategory =
  | 'Wrong Route Info'
  | 'Fare Concern'
  | 'Missing Stop'
  | 'Road Closure'
  | 'App Feedback';
export type ReportStatus = 'Pending' | 'Verified' | 'Resolved' | 'Rejected';

export interface ReportNote {
  author: string;
  text: string;
  at: string;
}

export interface UserReport {
  id: string;
  category: ReportCategory;
  message: string;
  routeId: string | null;
  location: string;
  submittedAt: string;
  status: ReportStatus;
  deviceRef: string;
  notes: ReportNote[];
}

export type ActivityAction =
  | 'Created'
  | 'Edited'
  | 'Rerouted'
  | 'Fare updated'
  | 'Activated'
  | 'Deactivated'
  | 'Deleted';

export interface RouteActivity {
  id: string;
  routeId: string;
  action: ActivityAction;
  detail: string;
  by: string;
  at: string;
}

