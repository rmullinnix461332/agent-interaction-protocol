package logbuffer

import (
	"sync"

	"github.com/sirupsen/logrus"
)

// Buffer is a ring buffer that captures logrus entries for the /logs API
type Buffer struct {
	mu      sync.RWMutex
	entries []Entry
	maxSize int
}

// New creates a new log buffer
func New(maxSize int) *Buffer {
	if maxSize <= 0 {
		maxSize = 10000
	}
	return &Buffer{
		entries: make([]Entry, 0, maxSize),
		maxSize: maxSize,
	}
}

// Add appends a log entry to the buffer
func (b *Buffer) Add(entry Entry) {
	b.mu.Lock()
	defer b.mu.Unlock()

	if len(b.entries) >= b.maxSize {
		// Drop oldest 10% to avoid constant shifting
		drop := b.maxSize / 10
		if drop < 1 {
			drop = 1
		}
		b.entries = b.entries[drop:]
	}

	b.entries = append(b.entries, entry)
}

// Query returns filtered, paginated log entries
func (b *Buffer) Query(q Query) Result {
	b.mu.RLock()
	defer b.mu.RUnlock()

	if q.Limit <= 0 {
		q.Limit = 100
	}
	if q.Limit > 1000 {
		q.Limit = 1000
	}

	// Filter
	var filtered []Entry
	for i := len(b.entries) - 1; i >= 0; i-- {
		e := b.entries[i]
		if q.RunID != "" && e.RunID != q.RunID {
			continue
		}
		if q.Level != "" && e.Level != q.Level {
			continue
		}
		filtered = append(filtered, e)
	}

	total := len(filtered)

	// Paginate
	start := q.Offset
	if start > total {
		start = total
	}
	end := start + q.Limit
	if end > total {
		end = total
	}

	page := filtered[start:end]

	return Result{
		Entries: page,
		Offset:  q.Offset,
		Limit:   q.Limit,
		Total:   total,
		HasMore: end < total,
	}
}

// Hook returns a logrus hook that captures entries into this buffer
func (b *Buffer) Hook() logrus.Hook {
	return &bufferHook{buf: b}
}

// bufferHook implements logrus.Hook
type bufferHook struct {
	buf *Buffer
}

func (h *bufferHook) Levels() []logrus.Level {
	return logrus.AllLevels
}

func (h *bufferHook) Fire(entry *logrus.Entry) error {
	fields := make(map[string]any, len(entry.Data))
	var runID, stepID string

	for k, v := range entry.Data {
		switch k {
		case "runId":
			runID, _ = v.(string)
		case "stepId":
			stepID, _ = v.(string)
		default:
			fields[k] = v
		}
	}

	h.buf.Add(Entry{
		Timestamp: entry.Time,
		Level:     entry.Level.String(),
		Message:   entry.Message,
		RunID:     runID,
		StepID:    stepID,
		Fields:    fields,
	})

	return nil
}
