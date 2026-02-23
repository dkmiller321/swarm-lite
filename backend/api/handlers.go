package api

import (
	"encoding/json"
	"net/http"

	"github.com/dkmil/swarm-lite/sim"
	"github.com/go-chi/chi/v5"
)

type Handlers struct {
	Engine *sim.Engine
}

type CommandRequest struct {
	Action   string        `json:"action"`
	Waypoint *sim.Waypoint `json:"waypoint,omitempty"`
}

func (h *Handlers) GetDrones(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(h.Engine.GetDrones())
}

func (h *Handlers) CommandDrone(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var cmd CommandRequest
	if err := json.NewDecoder(r.Body).Decode(&cmd); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if !h.Engine.CommandDrone(id, cmd.Action, cmd.Waypoint) {
		http.Error(w, "drone not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func (h *Handlers) CommandSwarm(w http.ResponseWriter, r *http.Request) {
	var cmd CommandRequest
	if err := json.NewDecoder(r.Body).Decode(&cmd); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	h.Engine.CommandAll(cmd.Action, cmd.Waypoint)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
