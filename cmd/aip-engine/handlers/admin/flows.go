package admin

import (
	"encoding/json"
	"net/http"

	"github.com/example/aip-engine/handlers/types"
	"github.com/example/aip-engine/internal/models"
	"github.com/example/aip-engine/internal/store"
	"github.com/example/aip-engine/internal/validation"
	"github.com/go-chi/chi/v5"
)

// ListFlowsHandler lists all connected flows
func ListFlowsHandler(fs *store.FileStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		flows, err := fs.FlowStore().List()
		if err != nil {
			respondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list flows")
			return
		}

		summaries := make([]types.FlowSummary, len(flows))
		for i, f := range flows {
			summaries[i] = types.FlowSummary{
				ID:          f.Metadata.Name,
				Name:        f.Metadata.Name,
				Title:       f.Metadata.Title,
				Version:     f.Metadata.Version,
				Status:      f.Status,
				InstalledAt: f.InstalledAt,
				LastRunAt:   f.LastRunAt,
				RunCount:    f.RunCount,
			}
		}

		respondJSON(w, http.StatusOK, types.FlowListResponse{Flows: summaries})
	}
}

// GetFlowHandler returns a specific flow
func GetFlowHandler(fs *store.FileStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		flowID := chi.URLParam(r, "flowId")
		if flowID == "" {
			respondError(w, http.StatusBadRequest, "INVALID_REQUEST", "flowId is required")
			return
		}

		flow, err := fs.FlowStore().Get(flowID)
		if err != nil {
			respondError(w, http.StatusNotFound, "FLOW_NOT_FOUND", "Flow not found: "+flowID)
			return
		}

		respondJSON(w, http.StatusOK, flow)
	}
}

// ConnectFlowHandler connects (installs) a flow
func ConnectFlowHandler(fs *store.FileStore, validator *validation.Validator) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req types.ConnectFlowRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			respondError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid JSON body")
			return
		}

		// Parse flow from map
		flowData, err := json.Marshal(req.Flow)
		if err != nil {
			respondError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid flow data")
			return
		}

		var flow models.Flow
		if err := json.Unmarshal(flowData, &flow); err != nil {
			respondError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid flow structure")
			return
		}

		// Validate flow
		result := validator.Validate(&flow)
		if !result.Valid {
			respondJSON(w, http.StatusBadRequest, map[string]any{
				"error": map[string]any{
					"code":    "VALIDATION_ERROR",
					"message": "Flow validation failed",
					"details": map[string]any{
						"errors": result.Errors,
					},
				},
			})
			return
		}

		// Check if flow already exists
		existing, _ := fs.FlowStore().Get(flow.Metadata.Name)
		if existing != nil {
			respondError(w, http.StatusConflict, "FLOW_EXISTS", "Flow already exists: "+flow.Metadata.Name)
			return
		}

		// Save flow
		connected := models.NewConnectedFlow(flow)
		if err := fs.FlowStore().Save(connected); err != nil {
			respondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to save flow")
			return
		}

		// Save participant bindings from provider binding
		if flow.ProviderBinding != nil {
			for _, binding := range flow.ProviderBinding.ParticipantBindings {
				fs.ParticipantStore().Save(&binding)
			}
		}

		// Also register flow-level participants that have no explicit binding
		for _, p := range flow.Participants {
			_, err := fs.ParticipantStore().Get(p.ID)
			if err != nil {
				// No binding exists, create a default one
				fs.ParticipantStore().Save(&models.ParticipantBinding{
					ParticipantRef: p.ID,
					ProviderTarget: "echo",
					Config: map[string]any{
						"kind":  string(p.Kind),
						"title": p.Title,
						"flow":  flow.Metadata.Name,
					},
				})
			}
		}

		respondJSON(w, http.StatusCreated, types.FlowSummary{
			ID:          connected.Metadata.Name,
			Name:        connected.Metadata.Name,
			Title:       connected.Metadata.Title,
			Version:     connected.Metadata.Version,
			Status:      connected.Status,
			InstalledAt: connected.InstalledAt,
			RunCount:    connected.RunCount,
		})
	}
}

// DeleteFlowHandler disconnects a flow
func DeleteFlowHandler(fs *store.FileStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		flowID := chi.URLParam(r, "flowId")
		if flowID == "" {
			respondError(w, http.StatusBadRequest, "INVALID_REQUEST", "flowId is required")
			return
		}

		// Check if flow exists
		flow, err := fs.FlowStore().Get(flowID)
		if err != nil {
			respondError(w, http.StatusNotFound, "FLOW_NOT_FOUND", "Flow not found: "+flowID)
			return
		}

		// Remove participant bindings from this flow
		for _, p := range flow.Participants {
			fs.ParticipantStore().Delete(p.ID)
		}

		// Delete flow
		if err := fs.FlowStore().Delete(flowID); err != nil {
			respondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to delete flow")
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}
