package admin

import (
	"net/http"
	"runtime"
	"strconv"
	"time"

	"github.com/example/aip-engine/handlers/types"
	"github.com/example/aip-engine/internal/logbuffer"
	"github.com/example/aip-engine/internal/models"
	"github.com/example/aip-engine/internal/store"
	"github.com/go-chi/chi/v5"
)

// DiagnosticsHandler returns engine diagnostics
func DiagnosticsHandler(fs *store.FileStore, engineInfo types.EngineInfo) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		flows, _ := fs.FlowStore().List()
		runs, _ := fs.RunStore().List(store.RunFilter{})

		var activeRuns, awaitingRuns, failedRuns, completedRuns int
		var recentErrors []types.DiagnosticError

		for _, run := range runs {
			switch run.Status {
			case models.RunStatusRunning:
				activeRuns++
			case models.RunStatusAwaiting:
				awaitingRuns++
			case models.RunStatusFailed:
				failedRuns++
				if run.Error != "" {
					recentErrors = append(recentErrors, types.DiagnosticError{
						RunID:      run.ID,
						FlowID:     run.FlowID,
						Error:      run.Error,
						OccurredAt: run.CompletedAt,
					})
				}
			case models.RunStatusCompleted:
				completedRuns++
			}
		}

		// Cap recent errors at 10
		if len(recentErrors) > 10 {
			recentErrors = recentErrors[len(recentErrors)-10:]
		}

		var memStats runtime.MemStats
		runtime.ReadMemStats(&memStats)

		resp := types.DiagnosticsResponse{
			Engine: types.EngineDiagnostics{
				Status:     "healthy",
				Uptime:     time.Since(engineInfo.StartedAt).String(),
				Goroutines: runtime.NumGoroutine(),
				MemAllocMB: float64(memStats.Alloc) / 1024 / 1024,
			},
			Flows:         len(flows),
			Runs:          len(runs),
			ActiveRuns:    activeRuns,
			AwaitingRuns:  awaitingRuns,
			FailedRuns:    failedRuns,
			CompletedRuns: completedRuns,
			RecentErrors:  recentErrors,
		}

		respondJSON(w, http.StatusOK, resp)
	}
}

// GetRunEventsHandler returns events for a run
func GetRunEventsHandler(fs *store.FileStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		runID := chi.URLParam(r, "runId")
		if runID == "" {
			respondError(w, http.StatusBadRequest, "INVALID_REQUEST", "runId is required")
			return
		}

		events, err := fs.EventStore().List(runID)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get events")
			return
		}

		respondJSON(w, http.StatusOK, map[string]any{
			"runId":  runID,
			"events": events,
		})
	}
}

// GetLogsHandler returns engine logs from the in-memory buffer
func GetLogsHandler(buf *logbuffer.Buffer) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		q := logbuffer.Query{
			RunID: r.URL.Query().Get("runId"),
			Level: r.URL.Query().Get("level"),
		}

		if v := r.URL.Query().Get("offset"); v != "" {
			q.Offset, _ = strconv.Atoi(v)
		}
		if v := r.URL.Query().Get("limit"); v != "" {
			q.Limit, _ = strconv.Atoi(v)
		}
		if q.Limit <= 0 {
			q.Limit = 100
		}

		result := buf.Query(q)

		// Convert to response type
		logs := make([]types.LogEntry, len(result.Entries))
		for i, e := range result.Entries {
			logs[i] = types.LogEntry{
				Timestamp: e.Timestamp,
				Level:     e.Level,
				RunID:     e.RunID,
				StepID:    e.StepID,
				Message:   e.Message,
				Fields:    e.Fields,
			}
		}

		respondJSON(w, http.StatusOK, types.LogsResponse{
			Logs:    logs,
			Offset:  result.Offset,
			Limit:   result.Limit,
			Total:   result.Total,
			HasMore: result.HasMore,
		})
	}
}
