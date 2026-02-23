import { useMemo } from 'react';
import { useStore } from '../store';
import { STATUS_COLORS } from '../types';
import type { Drone, DroneStatus } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const STATUS_LABELS: { status: DroneStatus; label: string }[] = [
  { status: 'idle', label: 'IDLE' },
  { status: 'enroute', label: 'ENROUTE' },
  { status: 'loitering', label: 'LOITER' },
  { status: 'returning', label: 'RTB' },
  { status: 'offline', label: 'OFFLINE' },
];

function StatusBadge({ status }: { status: DroneStatus }) {
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider"
      style={{
        backgroundColor: STATUS_COLORS[status] + '22',
        color: STATUS_COLORS[status],
        border: `1px solid ${STATUS_COLORS[status]}44`,
      }}
    >
      {status}
    </span>
  );
}

function BatteryBar({ battery }: { battery: number }) {
  const color =
    battery > 50 ? '#10B981' : battery > 20 ? '#F59E0B' : '#EF4444';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full" style={{ background: '#2a2f3a' }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${battery}%`, background: color }}
        />
      </div>
      <span className="text-xs w-10 text-right" style={{ color }}>
        {battery.toFixed(0)}%
      </span>
    </div>
  );
}

function FleetSummary({ drones }: { drones: Map<string, Drone> }) {
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const d of drones.values()) {
      c[d.status] = (c[d.status] || 0) + 1;
    }
    return c;
  }, [drones]);

  return (
    <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
      <div className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-secondary)' }}>
        Fleet Status
      </div>
      <div className="grid grid-cols-3 gap-2">
        {STATUS_LABELS.map(({ status, label }) => (
          <div
            key={status}
            className="rounded px-2 py-1.5 text-center"
            style={{ background: 'var(--color-surface-overlay)' }}
          >
            <div className="text-lg font-bold" style={{ color: STATUS_COLORS[status] }}>
              {counts[status] || 0}
            </div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
              {label}
            </div>
          </div>
        ))}
        <div
          className="rounded px-2 py-1.5 text-center"
          style={{ background: 'var(--color-surface-overlay)' }}
        >
          <div className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {drones.size}
          </div>
          <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
            TOTAL
          </div>
        </div>
      </div>
    </div>
  );
}

function TelemetryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </span>
      <span className="text-sm font-mono">{value}</span>
    </div>
  );
}

function DroneDetail({ drone }: { drone: Drone }) {
  const handleRecall = () => {
    fetch(`${API_URL}/api/drones/${drone.id}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'recall' }),
    }).catch(console.error);
  };

  return (
    <div className="p-4 flex-1 overflow-auto">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-bold tracking-wider">{drone.id}</div>
        <StatusBadge status={drone.status} />
      </div>
      <div className="mb-3">
        <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-secondary)' }}>
          Battery
        </div>
        <BatteryBar battery={drone.battery} />
      </div>
      <div
        className="rounded p-3 space-y-0.5 mb-3"
        style={{ background: 'var(--color-surface-overlay)' }}
      >
        <TelemetryRow label="ALT" value={`${drone.altitude.toFixed(0)}m`} />
        <TelemetryRow label="SPD" value={`${drone.speed.toFixed(1)} m/s`} />
        <TelemetryRow label="HDG" value={`${drone.heading.toFixed(0)}°`} />
        <TelemetryRow label="LAT" value={drone.lat.toFixed(6)} />
        <TelemetryRow label="LNG" value={drone.lng.toFixed(6)} />
      </div>
      {drone.waypoint && (
        <div
          className="rounded p-3 space-y-0.5 mb-3"
          style={{ background: 'var(--color-surface-overlay)' }}
        >
          <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            Waypoint
          </div>
          <TelemetryRow label="LAT" value={drone.waypoint.lat.toFixed(6)} />
          <TelemetryRow label="LNG" value={drone.waypoint.lng.toFixed(6)} />
        </div>
      )}
      <button
        onClick={handleRecall}
        disabled={drone.status === 'offline' || drone.status === 'idle'}
        className="w-full py-2 rounded text-xs uppercase tracking-widest font-bold transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        style={{
          background: STATUS_COLORS.returning + '22',
          color: STATUS_COLORS.returning,
          border: `1px solid ${STATUS_COLORS.returning}44`,
        }}
      >
        Recall to Base
      </button>
    </div>
  );
}

export default function Sidebar() {
  const drones = useStore((s) => s.drones);
  const selectedDroneId = useStore((s) => s.selectedDroneId);
  const selectedDrone = selectedDroneId ? drones.get(selectedDroneId) : undefined;

  return (
    <div
      className="w-72 flex flex-col h-full border-r"
      style={{
        background: 'var(--color-surface-raised)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div
        className="px-4 py-3 border-b flex items-center gap-2"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--color-text-primary)' }}>
          SWARM-LITE
        </span>
        <span className="text-[10px] uppercase" style={{ color: 'var(--color-text-secondary)' }}>
          // C2
        </span>
      </div>
      <FleetSummary drones={drones} />
      {selectedDrone ? (
        <DroneDetail drone={selectedDrone} />
      ) : (
        <div className="p-4 flex-1 flex items-center justify-center">
          <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
            Select a drone
          </span>
        </div>
      )}
    </div>
  );
}
