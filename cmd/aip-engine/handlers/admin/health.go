package admin

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/example/aip-engine/handlers/types"
)

// HealthHandler returns engine health
func HealthHandler(engineInfo types.EngineInfo) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uptime := time.Since(engineInfo.StartedAt)
		resp := types.HealthResponse{
			Status:  "healthy",
			Uptime:  uptime.String(),
			Version: engineInfo.Version,
		}
		respondJSON(w, http.StatusOK, resp)
	}
}

// InfoHandler returns engine identity
func InfoHandler(engineInfo types.EngineInfo) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uptime := time.Since(engineInfo.StartedAt)
		resp := types.InfoResponse{
			Name:      engineInfo.Name,
			Version:   engineInfo.Version,
			Type:      engineInfo.Type,
			Uptime:    uptime.String(),
			StartedAt: engineInfo.StartedAt,
		}
		respondJSON(w, http.StatusOK, resp)
	}
}

// CapabilitiesHandler returns engine capabilities
func CapabilitiesHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		resp := types.CapabilitiesResponse{
			Await:           true,
			Subflows:        false, // MVP: not supported
			Iteration:       true,
			Operators:       []string{"summarize", "rank", "merge", "filter"},
			MockScenarios:   true,
			ArtifactPreview: true,
		}
		respondJSON(w, http.StatusOK, resp)
	}
}

// respondJSON writes a JSON response
func respondJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// respondError writes an error response
func respondError(w http.ResponseWriter, status int, code string, message string) {
	resp := types.ErrorResponse{
		Error: types.ErrorDetail{
			Code:    code,
			Message: message,
		},
	}
	respondJSON(w, status, resp)
}
