package types

import "time"

// EngineInfo holds engine identity information
type EngineInfo struct {
	Name      string
	Version   string
	Type      string
	StartedAt time.Time
}

// HealthResponse is the response for health checks
type HealthResponse struct {
	Status  string `json:"status"`
	Uptime  string `json:"uptime"`
	Version string `json:"version"`
}

// InfoResponse is the response for engine info
type InfoResponse struct {
	Name      string    `json:"name"`
	Version   string    `json:"version"`
	Type      string    `json:"type"`
	Uptime    string    `json:"uptime"`
	StartedAt time.Time `json:"startedAt"`
}

// CapabilitiesResponse is the response for engine capabilities
type CapabilitiesResponse struct {
	Await           bool     `json:"await"`
	Subflows        bool     `json:"subflows"`
	Iteration       bool     `json:"iteration"`
	Operators       []string `json:"operators"`
	MockScenarios   bool     `json:"mockScenarios"`
	ArtifactPreview bool     `json:"artifactPreview"`
}

// FlowListResponse is the response for listing flows
type FlowListResponse struct {
	Flows []FlowSummary `json:"flows"`
}

// FlowSummary is a summary of a connected flow
type FlowSummary struct {
	ID          string     `json:"id"`
	Name        string     `json:"name"`
	Title       string     `json:"title,omitempty"`
	Version     string     `json:"version,omitempty"`
	Status      string     `json:"status"`
	InstalledAt time.Time  `json:"installedAt"`
	LastRunAt   *time.Time `json:"lastRunAt,omitempty"`
	RunCount    int        `json:"runCount"`
}

// RunListResponse is the response for listing runs
type RunListResponse struct {
	Runs []RunSummary `json:"runs"`
}

// RunSummary is a summary of a run
type RunSummary struct {
	ID          string     `json:"id"`
	FlowID      string     `json:"flowId"`
	FlowName    string     `json:"flowName"`
	Status      string     `json:"status"`
	StartedAt   time.Time  `json:"startedAt"`
	CompletedAt *time.Time `json:"completedAt,omitempty"`
	Duration    string     `json:"duration,omitempty"`
}

// StartRunRequest is the request to start a run
type StartRunRequest struct {
	Input map[string]any `json:"input,omitempty"`
}

// StartRunResponse is the response for starting a run
type StartRunResponse struct {
	RunID     string    `json:"runId"`
	FlowID    string    `json:"flowId"`
	Status    string    `json:"status"`
	StartedAt time.Time `json:"startedAt"`
}

// ConnectFlowRequest is the request to connect a flow
type ConnectFlowRequest struct {
	Flow map[string]any `json:"flow"`
}

// ErrorResponse is a standard error response
type ErrorResponse struct {
	Error ErrorDetail `json:"error"`
}

// ErrorDetail contains error details
type ErrorDetail struct {
	Code    string         `json:"code"`
	Message string         `json:"message"`
	Details map[string]any `json:"details,omitempty"`
}

// LogsResponse is the response for logs endpoint
type LogsResponse struct {
	Logs    []LogEntry `json:"logs"`
	Offset  int        `json:"offset"`
	Limit   int        `json:"limit"`
	Total   int        `json:"total"`
	HasMore bool       `json:"hasMore"`
}

// LogEntry is a single log entry
type LogEntry struct {
	Timestamp time.Time      `json:"timestamp"`
	Level     string         `json:"level"`
	RunID     string         `json:"runId,omitempty"`
	StepID    string         `json:"stepId,omitempty"`
	Message   string         `json:"message"`
	Fields    map[string]any `json:"fields,omitempty"`
}

// DiagnosticsResponse is the response for diagnostics
type DiagnosticsResponse struct {
	Engine        EngineDiagnostics `json:"engine"`
	Flows         int               `json:"flows"`
	Runs          int               `json:"runs"`
	ActiveRuns    int               `json:"activeRuns"`
	AwaitingRuns  int               `json:"awaitingRuns"`
	FailedRuns    int               `json:"failedRuns"`
	CompletedRuns int               `json:"completedRuns"`
	RecentErrors  []DiagnosticError `json:"recentErrors,omitempty"`
}

// EngineDiagnostics contains engine health info
type EngineDiagnostics struct {
	Status     string  `json:"status"`
	Uptime     string  `json:"uptime"`
	Goroutines int     `json:"goroutines"`
	MemAllocMB float64 `json:"memAllocMB"`
}

// DiagnosticError represents a recent run error
type DiagnosticError struct {
	RunID      string     `json:"runId"`
	FlowID     string     `json:"flowId"`
	Error      string     `json:"error"`
	OccurredAt *time.Time `json:"occurredAt,omitempty"`
}
