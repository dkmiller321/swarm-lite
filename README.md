# swarm-lite

Real-time UAV swarm Command & Control dashboard. Full-stack Go + React with WebSocket telemetry streaming and a dark military-themed C2 interface.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser (:3000)                   │
│  ┌──────────┐  ┌───────────────┐  ┌──────────────┐  │
│  │ Sidebar  │  │   MapView     │  │  CommandBar  │  │
│  │ Fleet    │  │   Mapbox GL   │  │  Recall All  │  │
│  │ Summary  │  │   30 Drones   │  │  Scatter     │  │
│  │ Detail   │  │   Click→Goto  │  │  Status LED  │  │
│  └──────────┘  └──────┬────────┘  └──────┬───────┘  │
│                       │ WS telemetry      │ REST cmds│
└───────────────────────┼───────────────────┼──────────┘
                        │                   │
              ┌─────────▼───────────────────▼─────────┐
              │          nginx reverse proxy           │
              │     /ws → backend   /api → backend     │
              └─────────────────┬──────────────────────┘
                                │
              ┌─────────────────▼──────────────────────┐
              │         Go Backend (:8080)              │
              │  ┌────────────┐  ┌──────────────────┐  │
              │  │ Sim Engine │  │  WebSocket Hub   │  │
              │  │ 30 drones  │──│  Broadcast 2Hz   │  │
              │  │ 500ms tick │  └──────────────────┘  │
              │  └────────────┘  ┌──────────────────┐  │
              │                  │  REST API (chi)  │  │
              │                  │  /api/drones     │  │
              │                  │  /api/swarm      │  │
              │                  └──────────────────┘  │
              └────────────────────────────────────────┘
```

## Quick Start

```bash
# 1. Set your Mapbox token
echo "VITE_MAPBOX_TOKEN=pk.your_token_here" > .env

# 2. Launch
docker compose up --build

# 3. Open
open http://localhost:3000
```

Get a free Mapbox token at [mapbox.com](https://account.mapbox.com/access-tokens/).

## Local Development

**Backend** (requires Go 1.22+):

```bash
cd backend
go mod tidy
go run .
# Listening on :8080
```

**Frontend** (requires Node 22+):

```bash
cd frontend
cp .env.example .env
# Edit .env with your Mapbox token
npm install
npm run dev
# Listening on :5173
```

## Demo Flow

1. Open the dashboard — 30 drones clustered around Washington DC
2. Click a drone marker to select it — see telemetry in the sidebar
3. Click anywhere on the map — selected drone flies to that waypoint
4. Hit **Scatter** — all drones spread to random positions
5. Hit **Recall All** — watch the swarm return to base
6. Watch battery levels drain — drones auto-RTB below 15%

## Tech Stack

| Layer     | Tech                                |
|-----------|-------------------------------------|
| Backend   | Go 1.22, chi router, gorilla/websocket |
| Frontend  | React 19, TypeScript, Vite          |
| Map       | Mapbox GL JS via react-map-gl       |
| State     | Zustand                             |
| Styling   | Tailwind CSS v4                     |
| Infra     | Docker, nginx, GitHub Actions       |

## Project Structure

```
swarm-lite/
├── backend/
│   ├── main.go            # server setup, routing
│   ├── sim/
│   │   ├── engine.go      # tick loop, drone management
│   │   └── drone.go       # state machine, movement, battery
│   ├── ws/
│   │   └── hub.go         # websocket broadcast hub
│   ├── api/
│   │   └── handlers.go    # REST command endpoints
│   ├── go.mod
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── store.ts       # zustand store
│   │   ├── types.ts
│   │   ├── hooks/
│   │   │   └── useWebSocket.ts
│   │   └── components/
│   │       ├── MapView.tsx
│   │       ├── Sidebar.tsx
│   │       └── CommandBar.tsx
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## API

| Method | Endpoint                    | Body                                            |
|--------|-----------------------------|-------------------------------------------------|
| GET    | `/api/drones`               | —                                               |
| POST   | `/api/drones/{id}/command`  | `{ "action": "goto"\|"recall", "waypoint?": {} }` |
| POST   | `/api/swarm/command`        | `{ "action": "goto"\|"recall", "waypoint?": {} }` |
| WS     | `/ws`                       | Server pushes telemetry every 500ms             |

## Future Ideas

- Multi-user sync (shared cursors, collaborative C2)
- Mission planning (waypoint sequences, patrol routes)
- Replay mode (record + playback telemetry sessions)
- Geofencing (no-fly zones with visual boundaries)
- Drone grouping (select multiple, issue group commands)
