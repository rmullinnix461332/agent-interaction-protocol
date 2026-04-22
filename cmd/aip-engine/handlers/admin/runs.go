package admin

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/example/aip-engine/handlers/types"
	"github.com/example/aip-engine/internal/models"
	"github.com/example/aip-engine/internal/service"
	"github.com/example/aip-engine/internal/store"
	"github.com/go-chi/chi/v5"
)

// ListRunsHandler lists all runs
func ListRunsHandler(fs *store.FileStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		filter := store.RunFilter{
			FlowID: r.URL.Query().Get("flowId"),
			Status: r.URL.Query().Get("status"),
		}

		runs, err := fs.RunStore().List(filter)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list runs")
			return
		}

		summaries := make([]types.RunSummary, len(runs))
		for i, run := range runs {
			var duration string
			if run.CompletedAt != nil {
				duration = run.CompletedAt.Sub(run.StartedAt).String()
			} else {
				duration = time.Since(run.StartedAt).String()
			}
			summaries[i] = types.RunSummary{
				ID:          run.ID,
				FlowID:      run.FlowID,
				FlowName:    run.FlowName,
				Status:      string(run.Status),
				StartedAt:   run.StartedAt,
				CompletedAt: run.CompletedAt,
				Duration:    duration,
			}
		}

		respondJSON(w, http.StatusOK, types.RunListResponse{Runs: summaries})
	}
}

// GetRunHandler returns a specific run
func GetRunHandler(fs *store.FileStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		runID := chi.URLParam(r, "runId")
		if runID == "" {
			respondError(w, http.StatusBadRequest, "INVALID_REQUEST", "runId is required")
			return
		}

		run, err := fs.RunStore().Get(runID)
		if err != nil {
			respondError(w, http.StatusNotFound, "RUN_NOT_FOUND", "Run not found: "+runID)
			return
		}

		respondJSON(w, http.StatusOK, run)
	}
}

// StartRunHandler starts a new run for a flow
func StartRunHandler(runSvc *service.RunService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		flowID := chi.URLParam(r, "flowId")
		if flowID == "" {
			respondError(w, http.StatusBadRequest, "INVALID_REQUEST", "flowId is required")
			return
		}

		var req types.StartRunRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			// Allow empty body (no input)
			req = types.StartRunRequest{}
		}

		run, err := runSvc.StartRun(r.Context(), flowID, req.Input)
		if err != nil {
			respondError(w, http.StatusBadRequest, "START_RUN_FAILED", err.Error())
			return
		}

		respondJSON(w, http.StatusCreated, types.StartRunResponse{
			RunID:     run.ID,
			FlowID:    run.FlowID,
			Status:    string(run.Status),
			StartedAt: run.StartedAt,
		})
	}
}

// StopRunHandler stops a running execution
func StopRunHandler(runSvc *service.RunService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		runID := chi.URLParam(r, "runId")
		if runID == "" {
			respondError(w, http.StatusBadRequest, "INVALID_REQUEST", "runId is required")
			return
		}

		if err := runSvc.StopRun(r.Context(), runID); err != nil {
			respondError(w, http.StatusBadRequest, "STOP_RUN_FAILED", err.Error())
			return
		}

		respondJSON(w, http.StatusOK, map[string]string{
			"runId":  runID,
			"status": "stopping",
		})
	}
}

// ResumeRunHandler resumes an awaiting run
func ResumeRunHandler(runSvc *service.RunService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		runID := chi.URLParam(r, "runId")
		if runID == "" {
			respondError(w, http.StatusBadRequest, "INVALID_REQUEST", "runId is required")
			return
		}

		var payload models.ResumePayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			respondError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid JSON body")
			return
		}

		if payload.Ref == "" {
			respondError(w, http.StatusBadRequest, "INVALID_REQUEST", "ref is required in resume payload")
			return
		}

		if err := runSvc.ResumeRun(r.Context(), runID, &payload); err != nil {
			respondError(w, http.StatusBadRequest, "RESUME_FAILED", err.Error())
			return
		}

		respondJSON(w, http.StatusOK, map[string]string{
			"runId":  runID,
			"status": "resumed",
		})
	}
}

// GetRunArtifactsHandler returns artifacts for a run
func GetRunArtifactsHandler(runSvc *service.RunService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		runID := chi.URLParam(r, "runId")
		if runID == "" {
			respondError(w, http.StatusBadRequest, "INVALID_REQUEST", "runId is required")
			return
		}

		artifacts, err := runSvc.GetRunArtifacts(runID)
		if err != nil {
			respondError(w, http.StatusNotFound, "RUN_NOT_FOUND", err.Error())
			return
		}

		respondJSON(w, http.StatusOK, map[string]any{
			"runId":     runID,
			"artifacts": artifacts,
		})
	}
}

// GetRunArtifactHandler returns a specific artifact for a run
func GetRunArtifactHandler(runSvc *service.RunService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		runID := chi.URLParam(r, "runId")
		ref := chi.URLParam(r, "*")
		if runID == "" || ref == "" {
			respondError(w, http.StatusBadRequest, "INVALID_REQUEST", "runId and artifact ref are required")
			return
		}

		artifact, err := runSvc.GetRunArtifact(runID, "aip://"+ref)
		if err != nil {
			respondError(w, http.StatusNotFound, "ARTIFACT_NOT_FOUND", err.Error())
			return
		}

		respondJSON(w, http.StatusOK, artifact)
	}
}
