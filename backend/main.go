package main

import (
	"log"
	"net/http"

	"github.com/dkmil/swarm-lite/api"
	"github.com/dkmil/swarm-lite/sim"
	"github.com/dkmil/swarm-lite/ws"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func main() {
	engine := sim.NewEngine(38.9, -77.0, 30)
	hub := ws.NewHub()
	handlers := &api.Handlers{Engine: engine}

	engine.OnTick(func(drones []sim.Drone) {
		hub.Broadcast(drones)
	})
	go engine.Run()

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:*", "http://127.0.0.1:*"},
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type"},
		AllowCredentials: true,
	}))

	r.Get("/ws", hub.HandleWS)
	r.Route("/api", func(r chi.Router) {
		r.Get("/drones", handlers.GetDrones)
		r.Post("/drones/{id}/command", handlers.CommandDrone)
		r.Post("/swarm/command", handlers.CommandSwarm)
	})

	log.Println("swarm-lite backend listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", r))
}
