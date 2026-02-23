export type DroneStatus = 'idle' | 'tasked' | 'enroute' | 'loitering' | 'returning' | 'offline';

export interface Drone {
  id: string;
  lat: number;
  lng: number;
  altitude: number;
  heading: number;
  speed: number;
  battery: number;
  status: DroneStatus;
  homeLat: number;
  homeLng: number;
  waypoint?: { lat: number; lng: number };
}

export interface TelemetryMessage {
  type: 'telemetry';
  timestamp: number;
  drones: Drone[];
}

export interface CommandRequest {
  action: 'goto' | 'recall';
  waypoint?: { lat: number; lng: number };
}

export const STATUS_COLORS: Record<DroneStatus, string> = {
  idle: '#6B7280',
  tasked: '#10B981',
  enroute: '#10B981',
  loitering: '#3B82F6',
  returning: '#F59E0B',
  offline: '#EF4444',
};
