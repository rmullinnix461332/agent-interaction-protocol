package handlers

import (
	"net/http"

	"github.com/example/aip-engine/config"
	"github.com/example/aip-engine/handlers/admin"
	"github.com/example/aip-engine/handlers/types"
	"github.com/example/aip-engine/internal/logbuffer"
	"github.com/example/aip-engine/internal/service"
	"github.com/example/aip-engine/internal/store"
	"github.com/example/aip-engine/internal/validation"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/sirupsen/logrus"
)

// Router creates the HTTP router
func Router(cfg *config.Config, fs *store.FileStore, runSvc *service.RunService, logBuf *logbuffer.Buffer, logger logrus.FieldLogger, engineInfo types.EngineInfo) http.Handler {
	r := chi.NewRouter()

	// Global middleware
	r.Use(middleware.RequestID)
	r.Use(LoggerMiddleware(logger))
	r.Use(RecoveryMiddleware(logger))
	r.Use(CORSMiddleware())
	r.Use(middleware.AllowContentType("application/json"))

	// Create validator
	validator := validation.NewValidator()

	// Admin API routes
	r.Route("/api/v1/admin", func(r chi.Router) {
		// Health & Info
		r.Get("/health", admin.HealthHandler(engineInfo))
		r.Get("/info", admin.InfoHandler(engineInfo))
		r.Get("/capabilities", admin.CapabilitiesHandler())

		// Flows
		r.Get("/flows", admin.ListFlowsHandler(fs))
		r.Post("/flows", admin.ConnectFlowHandler(fs, validator))
		r.Get("/flows/{flowId}", admin.GetFlowHandler(fs))
		r.Delete("/flows/{flowId}", admin.DeleteFlowHandler(fs))

		// Runs
		r.Get("/runs", admin.ListRunsHandler(fs))
		r.Get("/runs/{runId}", admin.GetRunHandler(fs))
		r.Post("/runs/{flowId}/start", admin.StartRunHandler(runSvc))
		r.Post("/runs/{runId}/stop", admin.StopRunHandler(runSvc))
		r.Post("/runs/{runId}/resume", admin.ResumeRunHandler(runSvc))

		// Run artifacts
		r.Get("/runs/{runId}/artifacts", admin.GetRunArtifactsHandler(runSvc))
		r.Get("/runs/{runId}/artifacts/*", admin.GetRunArtifactHandler(runSvc))

		// Participants
		r.Get("/participants", admin.ListParticipantsHandler(fs))
		r.Get("/participants/{id}", admin.GetParticipantHandler(fs))

		// Diagnostics
		r.Get("/diagnostics", admin.DiagnosticsHandler(fs, engineInfo))
		r.Get("/runs/{runId}/events", admin.GetRunEventsHandler(fs))
		r.Get("/logs", admin.GetLogsHandler(logBuf))
	})

	return r
}
