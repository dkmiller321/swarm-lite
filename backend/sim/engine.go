package sim

import (
	"fmt"
	"sync"
	"time"
)

type Engine struct {
	mu     sync.RWMutex
	drones map[string]*Drone
	onTick func(drones []Drone)
}

func NewEngine(centerLat, centerLng float64, count int) *Engine {
	e := &Engine{
		drones: make(map[string]*Drone, count),
	}
	for i := 0; i < count; i++ {
		id := fmt.Sprintf("DRONE-%03d", i+1)
		e.drones[id] = NewDrone(id, centerLat, centerLng)
	}
	return e
}

func (e *Engine) OnTick(fn func(drones []Drone)) {
	e.onTick = fn
}

func (e *Engine) Run() {
	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()

	for range ticker.C {
		e.mu.Lock()
		for _, d := range e.drones {
			d.Tick()
		}
		snapshot := e.snapshot()
		e.mu.Unlock()

		if e.onTick != nil {
			e.onTick(snapshot)
		}
	}
}

func (e *Engine) snapshot() []Drone {
	drones := make([]Drone, 0, len(e.drones))
	for _, d := range e.drones {
		drones = append(drones, *d)
	}
	return drones
}

func (e *Engine) GetDrones() []Drone {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return e.snapshot()
}

func (e *Engine) CommandDrone(id string, action string, wp *Waypoint) bool {
	e.mu.Lock()
	defer e.mu.Unlock()

	d, ok := e.drones[id]
	if !ok {
		return false
	}
	switch action {
	case "goto":
		if wp != nil {
			d.GoTo(*wp)
		}
	case "recall":
		d.Recall()
	}
	return true
}

func (e *Engine) CommandAll(action string, wp *Waypoint) {
	e.mu.Lock()
	defer e.mu.Unlock()

	for _, d := range e.drones {
		switch action {
		case "goto":
			if wp != nil {
				d.GoTo(*wp)
			}
		case "recall":
			d.Recall()
		}
	}
}
