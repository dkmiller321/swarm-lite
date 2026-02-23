package sim

import (
	"math"
	"math/rand"
)

type DroneStatus string

const (
	StatusIdle      DroneStatus = "idle"
	StatusTasked    DroneStatus = "tasked"
	StatusEnroute   DroneStatus = "enroute"
	StatusLoitering DroneStatus = "loitering"
	StatusReturning DroneStatus = "returning"
	StatusOffline   DroneStatus = "offline"
)

type Waypoint struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

type Drone struct {
	ID       string      `json:"id"`
	Lat      float64     `json:"lat"`
	Lng      float64     `json:"lng"`
	Altitude float64     `json:"altitude"`
	Heading  float64     `json:"heading"`
	Speed    float64     `json:"speed"`
	Battery  float64     `json:"battery"`
	Status   DroneStatus `json:"status"`
	HomeLat  float64     `json:"homeLat"`
	HomeLng  float64     `json:"homeLng"`
	Waypoint *Waypoint   `json:"waypoint,omitempty"`
}

const (
	cruiseSpeed  = 15.0    // m/s
	arrivalDist  = 50.0    // meters
	earthRadius  = 6371000 // meters
	tickDuration = 0.5     // seconds per tick
)

const (
	drainEnroute   = 0.05
	drainLoitering = 0.02
	drainIdle      = 0.01
	lowBattery     = 15.0
)

func NewDrone(id string, homeLat, homeLng float64) *Drone {
	return &Drone{
		ID:       id,
		Lat:      homeLat + (rand.Float64()-0.5)*0.01,
		Lng:      homeLng + (rand.Float64()-0.5)*0.01,
		Altitude: 100 + rand.Float64()*50,
		Heading:  rand.Float64() * 360,
		Speed:    0,
		Battery:  80 + rand.Float64()*20,
		Status:   StatusIdle,
		HomeLat:  homeLat,
		HomeLng:  homeLng,
	}
}

func (d *Drone) Tick() {
	if d.Status == StatusOffline {
		return
	}

	// Battery drain
	switch d.Status {
	case StatusEnroute, StatusTasked, StatusReturning:
		d.Battery -= drainEnroute
	case StatusLoitering:
		d.Battery -= drainLoitering
	case StatusIdle:
		d.Battery -= drainIdle
	}
	if d.Battery < 0 {
		d.Battery = 0
	}

	// Dead battery → offline
	if d.Battery <= 0 {
		d.Status = StatusOffline
		d.Speed = 0
		d.Waypoint = nil
		return
	}

	// Auto-return on low battery
	if d.Battery < lowBattery && d.Status != StatusReturning && d.Status != StatusIdle {
		d.Waypoint = &Waypoint{Lat: d.HomeLat, Lng: d.HomeLng}
		d.Status = StatusReturning
	}

	// Movement toward waypoint
	if d.Waypoint != nil && (d.Status == StatusEnroute || d.Status == StatusTasked || d.Status == StatusReturning) {
		dist := haversine(d.Lat, d.Lng, d.Waypoint.Lat, d.Waypoint.Lng)
		if dist < arrivalDist {
			d.Lat = d.Waypoint.Lat
			d.Lng = d.Waypoint.Lng
			d.Speed = 0
			if d.Status == StatusReturning {
				d.Status = StatusIdle
				d.Waypoint = nil
			} else {
				d.Status = StatusLoitering
			}
		} else {
			d.Speed = cruiseSpeed
			d.Heading = bearing(d.Lat, d.Lng, d.Waypoint.Lat, d.Waypoint.Lng)
			moveMeters := cruiseSpeed * tickDuration
			d.Lat, d.Lng = moveToward(d.Lat, d.Lng, d.Waypoint.Lat, d.Waypoint.Lng, moveMeters)
		}
	} else {
		d.Speed = 0
	}
}

func (d *Drone) GoTo(wp Waypoint) {
	if d.Status == StatusOffline {
		return
	}
	d.Waypoint = &wp
	d.Status = StatusEnroute
}

func (d *Drone) Recall() {
	if d.Status == StatusOffline {
		return
	}
	d.Waypoint = &Waypoint{Lat: d.HomeLat, Lng: d.HomeLng}
	d.Status = StatusReturning
}

func haversine(lat1, lng1, lat2, lng2 float64) float64 {
	dLat := toRad(lat2 - lat1)
	dLng := toRad(lng2 - lng1)
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(toRad(lat1))*math.Cos(toRad(lat2))*
			math.Sin(dLng/2)*math.Sin(dLng/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return earthRadius * c
}

func bearing(lat1, lng1, lat2, lng2 float64) float64 {
	dLng := toRad(lng2 - lng1)
	y := math.Sin(dLng) * math.Cos(toRad(lat2))
	x := math.Cos(toRad(lat1))*math.Sin(toRad(lat2)) -
		math.Sin(toRad(lat1))*math.Cos(toRad(lat2))*math.Cos(dLng)
	b := math.Atan2(y, x)
	return math.Mod(toDeg(b)+360, 360)
}

func moveToward(lat1, lng1, lat2, lng2, dist float64) (float64, float64) {
	b := toRad(bearing(lat1, lng1, lat2, lng2))
	lat1R := toRad(lat1)
	lng1R := toRad(lng1)
	angDist := dist / earthRadius

	newLat := math.Asin(math.Sin(lat1R)*math.Cos(angDist) +
		math.Cos(lat1R)*math.Sin(angDist)*math.Cos(b))
	newLng := lng1R + math.Atan2(
		math.Sin(b)*math.Sin(angDist)*math.Cos(lat1R),
		math.Cos(angDist)-math.Sin(lat1R)*math.Sin(newLat))

	return toDeg(newLat), toDeg(newLng)
}

func toRad(deg float64) float64 { return deg * math.Pi / 180 }
func toDeg(rad float64) float64 { return rad * 180 / math.Pi }
