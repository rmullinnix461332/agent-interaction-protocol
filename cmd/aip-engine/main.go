package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/example/aip-engine/config"
	"github.com/example/aip-engine/handlers"
	htypes "github.com/example/aip-engine/handlers/types"
	"github.com/example/aip-engine/internal/executor"
	"github.com/example/aip-engine/internal/logbuffer"
	"github.com/example/aip-engine/internal/service"
	"github.com/example/aip-engine/internal/store"
	"github.com/sirupsen/logrus"
)

const version = "0.1.0"

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to load config: %v\n", err)
		os.Exit(1)
	}

	// Setup logger
	logger := logrus.New()
	if level, err := logrus.ParseLevel(cfg.Logging.Level); err == nil {
		logger.SetLevel(level)
	}
	if cfg.Logging.Format == "json" {
		logger.SetFormatter(&logrus.JSONFormatter{})
	} else {
		logger.SetFormatter(&logrus.TextFormatter{})
	}

	// Setup log buffer for /logs API
	logBuf := logbuffer.New(10000)
	logger.AddHook(logBuf.Hook())

	// Initialize store
	fs, err := store.New(store.StoreConfig{
		DataDir:               cfg.Engine.DataDir,
		ArtifactSizeThreshold: cfg.Engine.ArtifactSizeThreshold,
	})
	if err != nil {
		logger.Fatalf("Failed to initialize store: %v", err)
	}

	// Save engine metadata
	if err := fs.SaveEngineMetadata(cfg.Engine.Name, cfg.Engine.Type, version); err != nil {
		logger.Warnf("Failed to save engine metadata: %v", err)
	}

	// Initialize executor and services
	exec := executor.NewLocalExecutor(fs, logger)
	runSvc := service.NewRunService(fs, exec, logger)
	retentionSvc := service.NewRetentionService(fs, cfg.Retention, logger)

	// Start retention cleanup in background
	retentionCtx, retentionCancel := context.WithCancel(context.Background())
	go retentionSvc.Start(retentionCtx)

	// Engine info
	engineInfo := htypes.EngineInfo{
		Name:      cfg.Engine.Name,
		Version:   version,
		Type:      cfg.Engine.Type,
		StartedAt: time.Now(),
	}

	// Create router
	router := handlers.Router(cfg, fs, runSvc, logBuf, logger, engineInfo)

	// Create server
	addr := fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port)
	srv := &http.Server{
		Addr:         addr,
		Handler:      router,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// Start server in goroutine
	go func() {
		logger.Infof("Starting aip-engine %s on %s", version, addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatalf("Server error: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")

	// Stop retention cleanup
	retentionCancel()

	// Cancel all active runs
	exec.StopAll()

	// Wait briefly for runs to finish
	deadline := time.After(5 * time.Second)
	for exec.ActiveRunCount() > 0 {
		select {
		case <-deadline:
			logger.Warnf("Shutdown: %d runs still active after timeout", exec.ActiveRunCount())
			goto shutdown
		case <-time.After(100 * time.Millisecond):
		}
	}

shutdown:
	// Graceful HTTP shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Errorf("Server shutdown error: %v", err)
	}

	logger.Info("Server stopped")
}
