package logbuffer

import "time"

// Entry represents a captured log entry
type Entry struct {
	Timestamp time.Time      `json:"timestamp"`
	Level     string         `json:"level"`
	Message   string         `json:"message"`
	RunID     string         `json:"runId,omitempty"`
	StepID    string         `json:"stepId,omitempty"`
	Fields    map[string]any `json:"fields,omitempty"`
}

// Query filters log entries
type Query struct {
	RunID  string
	Level  string
	Offset int
	Limit  int
}

// Result is a paginated log query result
type Result struct {
	Entries []Entry `json:"entries"`
	Offset  int     `json:"offset"`
	Limit   int     `json:"limit"`
	Total   int     `json:"total"`
	HasMore bool    `json:"hasMore"`
}
