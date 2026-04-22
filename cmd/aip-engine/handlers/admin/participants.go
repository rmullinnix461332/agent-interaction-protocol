package admin

import (
	"net/http"

	"github.com/example/aip-engine/internal/store"
	"github.com/go-chi/chi/v5"
)

// ListParticipantsHandler lists all participant bindings
func ListParticipantsHandler(fs *store.FileStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		bindings, err := fs.ParticipantStore().List()
		if err != nil {
			respondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list participants")
			return
		}

		respondJSON(w, http.StatusOK, map[string]any{
			"participants": bindings,
		})
	}
}

// GetParticipantHandler returns a specific participant binding
func GetParticipantHandler(fs *store.FileStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		participantID := chi.URLParam(r, "id")
		if participantID == "" {
			respondError(w, http.StatusBadRequest, "INVALID_REQUEST", "id is required")
			return
		}

		binding, err := fs.ParticipantStore().Get(participantID)
		if err != nil {
			respondError(w, http.StatusNotFound, "PARTICIPANT_NOT_FOUND", "Participant not found: "+participantID)
			return
		}

		respondJSON(w, http.StatusOK, binding)
	}
}
