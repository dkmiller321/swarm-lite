# swarm-lite

Real-time UAV swarm Command & Control dashboard — a full-stack portfolio project demonstrating Go backend services, React frontend engineering, WebSocket streaming, and operational UI design.

30 simulated drones fly over Washington DC. Select them, task them to waypoints, scatter the fleet, and recall them to base — all rendered in real-time on a dark, military-themed Mapbox map.

## What It Does

**swarm-lite** simulates a drone fleet and provides a browser-based C2 (Command & Control) dashboard for monitoring and directing them. The backend runs a physics-based simulation engine that ticks every 500ms, computing drone positions, headings, battery drain, and state transitions. Every tick, the full fleet state is broadcast over WebSocket to all connected clients. The frontend renders the fleet on an interactive map and sends commands back via REST.

### Key Features

- **Real-time telemetry** — WebSocket pushes drone state at 2Hz (position, heading, speed, altitude, battery, status)
- **Interactive map** — Mapbox GL JS dark satellite map with directional arrow markers color-coded by status
- **Click-to-waypoint** — Select a drone, click the map, drone flies there using haversine great-circle navigation
- **Fleet commands** — Scatter all drones to random positions or recall them all to base with one click
- **Drone state machine** — Six states: `idle`, `tasked`, `enroute`, `loitering`, `returning`, `offline`
- **Battery simulation** — Drains at different rates per state; auto-RTB (return to base) below 15%; pulsing red ring below 20%
- **Live fleet dashboard** — Sidebar with aggregate status counts and per-drone telemetry detail panel

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

## How It Works (Technical Deep Dive)

### Backend — Go Simulation Engine

The backend is a single Go binary with zero external dependencies beyond two lightweight routers/websocket libraries. All state lives in memory — no database.

**Simulation Loop** (`sim/engine.go`):
- A `time.Ticker` fires every 500ms, iterating all 30 drones and calling `Tick()` on each
- The engine holds a `sync.RWMutex` to safely allow concurrent reads (REST GET) while the tick loop writes
- After each tick, a snapshot of all drone states is passed to the WebSocket hub for broadcast

**Drone State Machine** (`sim/drone.go`):
- Each drone has a position (lat/lng), heading, speed, altitude, battery level, home position, and optional waypoint
- States: `idle` → `enroute` (when given waypoint) → `loitering` (on arrival) or `returning` (on recall) → `idle` (on home arrival)
- Movement uses **haversine formula** for great-circle distance calculation and **forward azimuth** for bearing computation, then advances the position along that bearing at cruise speed (15 m/s)
- Arrival detection triggers at 50m from waypoint
- Battery drains per tick: 0.05% enroute/returning, 0.02% loitering, 0.01% idle
- Below 15% battery: forced auto-return regardless of current task
- At 0% battery: transition to `offline`, all movement stops

**WebSocket Hub** (`ws/hub.go`):
- Uses gorilla/websocket with a hub pattern — maintains a map of connected clients
- On each tick, serializes the drone array to JSON and writes to every connected client
- A read pump goroutine per client detects disconnections and cleans up
- Full mutex protection ensures no concurrent writes to the same connection

**REST API** (`api/handlers.go`):
- Built on chi router with CORS middleware for local development
- `GET /api/drones` — returns current state of all 30 drones as JSON array
- `POST /api/drones/{id}/command` — accepts `{ "action": "goto"|"recall", "waypoint?": { "lat", "lng" } }`
- `POST /api/swarm/command` — same body format, applies to entire fleet

### Frontend — React + TypeScript

**State Management** (`store.ts`):
- Zustand store holds a `Map<string, Drone>` for O(1) lookup, selected drone ID, and connection status
- `setDrones()` replaces the entire map on each WebSocket message (simple, no diffing needed at 30 drones)

**WebSocket Hook** (`hooks/useWebSocket.ts`):
- Connects on mount, parses incoming telemetry messages, calls `setDrones()`
- Auto-reconnects with 2-second delay on disconnect
- URL configurable via `VITE_WS_URL` env var

**Map View** (`components/MapView.tsx`):
- react-map-gl wrapper around Mapbox GL JS with `dark-v11` style
- Each drone renders as an SVG triangle marker rotated to its heading
- Marker colors: gray (idle), green (enroute/tasked), blue (loitering), yellow (returning), red (offline)
- Low battery (<20%) adds a CSS pulsing red ring animation
- Click marker to select; click empty map to send selected drone to that waypoint via REST POST

**Sidebar** (`components/Sidebar.tsx`):
- Top: fleet summary grid showing counts by status
- Bottom: selected drone detail card with status badge, battery progress bar, telemetry readings (altitude, speed, heading, coordinates), and a Recall button

**Command Bar** (`components/CommandBar.tsx`):
- **Recall All** — single POST to `/api/swarm/command` with `action: "recall"`
- **Scatter** — generates random lat/lng offsets for each drone and sends individual goto commands
- Connection status indicator (green/red dot)

### Infrastructure

**Docker**:
- Backend: multi-stage build (Go compile on `golang:1.22-alpine` → copy binary to `alpine:3.19`)
- Frontend: multi-stage build (Node 22 `npm run build` → copy dist to `nginx:alpine`)
- nginx config proxies `/api/*` and `/ws` to the backend service with WebSocket upgrade headers

**CI** (`.github/workflows/ci.yml`):
- 5 parallel jobs on push to main: `go vet`, `go build`, TypeScript type-check, Vite production build, Docker image builds

## Prerequisites

- **Mapbox token** (free) — sign up at [mapbox.com](https://account.mapbox.com/access-tokens/) and copy your default public token (`pk.…`)

**For Docker deployment:**
- [Docker](https://docs.docker.com/get-docker/) with Docker Compose

**For local development:**
- [Go 1.22+](https://go.dev/dl/)
- [Node.js 22+](https://nodejs.org/) with npm

## Running with Docker (Recommended)

The fastest way to get running — one command, no local toolchain needed.

```bash
# 1. Clone the repo
git clone https://github.com/dkmiller321/swarm-lite.git
cd swarm-lite

# 2. Create a .env file with your Mapbox token
echo "VITE_MAPBOX_TOKEN=pk.your_token_here" > .env

# 3. Build and launch both services
docker compose up --build

# 4. Open in your browser
open http://localhost:3000
```

The frontend (nginx) serves on **:3000** and proxies `/api` and `/ws` requests to the Go backend on **:8080**. Both containers start together via `docker compose`.

To stop: `Ctrl+C` or `docker compose down`.

## Running Locally (Development)

Run the backend and frontend separately for hot-reload during development.

### 1. Start the Backend

```bash
cd backend
go mod tidy       # download dependencies (first time only)
go run .          # starts the server on :8080
```

You should see:
```
swarm-lite backend listening on :8080
```

Leave this terminal running.

### 2. Start the Frontend

Open a second terminal:

```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env` and paste your Mapbox token:
```
VITE_MAPBOX_TOKEN=pk.your_actual_token_here
VITE_API_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:8080/ws
```

Then install and start:
```bash
npm install       # install dependencies (first time only)
npm run dev       # starts Vite dev server on :5173
```

### 3. Open the Dashboard

Go to **http://localhost:5173** in your browser. You should see 30 drone markers on a dark map of the Washington DC area, with the sidebar showing fleet status and a green "Connected" indicator in the bottom bar.

## Demo Flow

1. Open the dashboard — 30 drones clustered around Washington DC
2. Click a drone marker to select it — see live telemetry in the sidebar
3. Click anywhere on the map — the selected drone flies to that waypoint
4. Hit **Scatter** — all 30 drones spread to random positions across the area
5. Hit **Recall All** — watch the entire swarm return to base
6. Watch battery levels drain — drones auto-RTB below 15%, pulsing red ring below 20%

## Tech Stack

| Layer     | Tech                                   |
|-----------|----------------------------------------|
| Backend   | Go 1.22, chi router, gorilla/websocket |
| Frontend  | React 19, TypeScript, Vite 7           |
| Map       | Mapbox GL JS via react-map-gl          |
| State     | Zustand                                |
| Styling   | Tailwind CSS v4                        |
| Infra     | Docker, nginx, GitHub Actions          |

## Project Structure

```
swarm-lite/
├── backend/
│   ├── main.go              # entry point, routing, server setup
│   ├── sim/
│   │   ├── engine.go        # tick loop, fleet management, thread-safe access
│   │   └── drone.go         # state machine, haversine movement, battery model
│   ├── ws/
│   │   └── hub.go           # websocket hub, client lifecycle, JSON broadcast
│   ├── api/
│   │   └── handlers.go      # REST endpoints for drone/swarm commands
│   ├── go.mod
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.tsx           # layout shell, hooks wiring
│   │   ├── main.tsx          # React entry point
│   │   ├── store.ts          # zustand state (drones map, selection, connection)
│   │   ├── types.ts          # shared types, status color map
│   │   ├── index.css         # tailwind imports, theme tokens, animations
│   │   ├── hooks/
│   │   │   └── useWebSocket.ts   # auto-reconnecting WS client
│   │   └── components/
│   │       ├── MapView.tsx   # mapbox map, drone markers, click-to-waypoint
│   │       ├── Sidebar.tsx   # fleet summary, drone detail, recall button
│   │       └── CommandBar.tsx    # scatter, recall all, connection indicator
│   ├── nginx.conf            # reverse proxy config for production
│   ├── .env.example
│   └── Dockerfile
├── docker-compose.yml
├── .github/workflows/ci.yml
└── README.md
```

## API Reference

| Method | Endpoint                    | Body                                                          | Response           |
|--------|-----------------------------|---------------------------------------------------------------|--------------------|
| GET    | `/api/drones`               | —                                                             | `Drone[]`          |
| POST   | `/api/drones/{id}/command`  | `{ "action": "goto"\|"recall", "waypoint?": { lat, lng } }`  | `{ "status": "ok" }` |
| POST   | `/api/swarm/command`        | `{ "action": "goto"\|"recall", "waypoint?": { lat, lng } }`  | `{ "status": "ok" }` |
| WS     | `/ws`                       | —                                                             | `{ "type": "telemetry", "timestamp": unix_ms, "drones": Drone[] }` pushed every 500ms |

## Future Ideas

- Multi-user sync (shared cursors, collaborative C2)
- Mission planning (waypoint sequences, patrol routes)
- Replay mode (record + playback telemetry sessions)
- Geofencing (no-fly zones with visual boundaries)
- Drone grouping (select multiple, issue group commands)
- 3D view with deck.gl
