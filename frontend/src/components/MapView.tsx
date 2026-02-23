import { useCallback, useMemo } from 'react';
import Map, { Marker } from 'react-map-gl/mapbox';
import { useStore } from '../store';
import { STATUS_COLORS } from '../types';
import type { Drone, CommandRequest } from '../types';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

function sendCommand(droneId: string, cmd: CommandRequest) {
  fetch(`${API_URL}/api/drones/${droneId}/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  }).catch(console.error);
}

function DroneMarker({ drone, selected, onSelect }: {
  drone: Drone;
  selected: boolean;
  onSelect: () => void;
}) {
  const color = STATUS_COLORS[drone.status];
  const lowBattery = drone.battery < 20;
  const rotation = drone.heading;

  return (
    <Marker
      longitude={drone.lng}
      latitude={drone.lat}
      anchor="center"
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        onSelect();
      }}
    >
      <div className="relative cursor-pointer" style={{ transform: `rotate(${rotation}deg)` }}>
        {/* Low battery pulse ring */}
        {lowBattery && (
          <div
            className="pulse-ring absolute inset-0 rounded-full"
            style={{
              border: `2px solid ${STATUS_COLORS.offline}`,
              width: 24,
              height: 24,
              marginLeft: -4,
              marginTop: -4,
            }}
          />
        )}
        {/* Selection ring */}
        {selected && (
          <div
            className="absolute rounded-full"
            style={{
              border: '2px solid #fff',
              width: 26,
              height: 26,
              marginLeft: -5,
              marginTop: -5,
            }}
          />
        )}
        {/* Drone triangle */}
        <svg width="16" height="16" viewBox="0 0 16 16">
          <polygon
            points="8,1 14,14 8,11 2,14"
            fill={color}
            stroke={selected ? '#fff' : 'rgba(0,0,0,0.5)'}
            strokeWidth="1"
          />
        </svg>
      </div>
    </Marker>
  );
}

export default function MapView() {
  const drones = useStore((s) => s.drones);
  const selectedDroneId = useStore((s) => s.selectedDroneId);
  const selectDrone = useStore((s) => s.selectDrone);

  const droneArray = useMemo(() => Array.from(drones.values()), [drones]);

  const handleMapClick = useCallback(
    (e: mapboxgl.MapLayerMouseEvent) => {
      if (selectedDroneId) {
        sendCommand(selectedDroneId, {
          action: 'goto',
          waypoint: { lat: e.lngLat.lat, lng: e.lngLat.lng },
        });
      }
    },
    [selectedDroneId],
  );

  return (
    <Map
      mapboxAccessToken={MAPBOX_TOKEN}
      initialViewState={{
        longitude: -77.0,
        latitude: 38.9,
        zoom: 12,
      }}
      style={{ width: '100%', height: '100%' }}
      mapStyle="mapbox://styles/mapbox/dark-v11"
      onClick={handleMapClick}
    >
      {droneArray.map((d) => (
        <DroneMarker
          key={d.id}
          drone={d}
          selected={d.id === selectedDroneId}
          onSelect={() => selectDrone(d.id === selectedDroneId ? null : d.id)}
        />
      ))}
    </Map>
  );
}
