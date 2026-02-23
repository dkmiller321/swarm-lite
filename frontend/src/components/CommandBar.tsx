import { useStore } from '../store';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

function scatterDrones(drones: Map<string, unknown>) {
  const ids = Array.from(drones.keys());
  for (const id of ids) {
    const latOffset = (Math.random() - 0.5) * 0.06;
    const lngOffset = (Math.random() - 0.5) * 0.06;
    fetch(`${API_URL}/api/drones/${id}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'goto',
        waypoint: { lat: 38.9 + latOffset, lng: -77.0 + lngOffset },
      }),
    }).catch(console.error);
  }
}

function recallAll() {
  fetch(`${API_URL}/api/swarm/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'recall' }),
  }).catch(console.error);
}

export default function CommandBar() {
  const connected = useStore((s) => s.connected);
  const drones = useStore((s) => s.drones);

  return (
    <div
      className="h-12 flex items-center justify-between px-4 border-t"
      style={{
        background: 'var(--color-surface-raised)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={recallAll}
          className="px-4 py-1.5 rounded text-xs uppercase tracking-widest font-bold transition-colors cursor-pointer"
          style={{
            background: '#F59E0B22',
            color: '#F59E0B',
            border: '1px solid #F59E0B44',
          }}
        >
          Recall All
        </button>
        <button
          onClick={() => scatterDrones(drones)}
          className="px-4 py-1.5 rounded text-xs uppercase tracking-widest font-bold transition-colors cursor-pointer"
          style={{
            background: '#10B98122',
            color: '#10B981',
            border: '1px solid #10B98144',
          }}
        >
          Scatter
        </button>
      </div>
      <div className="flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: connected ? '#10B981' : '#EF4444' }}
        />
        <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
    </div>
  );
}
