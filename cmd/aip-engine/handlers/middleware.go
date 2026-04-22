package handlers

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5/middleware"
	"github.com/sirupsen/logrus"
)

// LoggerMiddleware logs HTTP requests
func LoggerMiddleware(logger logrus.FieldLogger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()

			ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)

			defer func() {
				logger.WithFields(logrus.Fields{
					"method":      r.Method,
					"path":        r.URL.Path,
					"status":      ww.Status(),
					"duration_ms": time.Since(start).Milliseconds(),
					"remote":      r.RemoteAddr,
				}).Info("HTTP request")
			}()

			next.ServeHTTP(ww, r)
		})
	}
}

// RecoveryMiddleware recovers from panics
func RecoveryMiddleware(logger logrus.FieldLogger) func(http.Handler) http.Handler {
	return middleware.Recoverer
}

// CORSMiddleware adds CORS headers
func CORSMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
