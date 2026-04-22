package logbuffer

import (
	"testing"
	"time"
)

func TestBufferAddAndQuery(t *testing.T) {
	buf := New(100)

	buf.Add(Entry{Timestamp: time.Now(), Level: "info", Message: "msg1", RunID: "run-1"})
	buf.Add(Entry{Timestamp: time.Now(), Level: "error", Message: "msg2", RunID: "run-1"})
	buf.Add(Entry{Timestamp: time.Now(), Level: "info", Message: "msg3", RunID: "run-2"})

	tests := []struct {
		name      string
		query     Query
		wantTotal int
		wantLen   int
	}{
		{
			name:      "all entries",
			query:     Query{},
			wantTotal: 3,
			wantLen:   3,
		},
		{
			name:      "filter by runId",
			query:     Query{RunID: "run-1"},
			wantTotal: 2,
			wantLen:   2,
		},
		{
			name:      "filter by level",
			query:     Query{Level: "error"},
			wantTotal: 1,
			wantLen:   1,
		},
		{
			name:      "filter by runId and level",
			query:     Query{RunID: "run-1", Level: "info"},
			wantTotal: 1,
			wantLen:   1,
		},
		{
			name:      "no match",
			query:     Query{RunID: "run-99"},
			wantTotal: 0,
			wantLen:   0,
		},
		{
			name:      "pagination limit",
			query:     Query{Limit: 2},
			wantTotal: 3,
			wantLen:   2,
		},
		{
			name:      "pagination offset",
			query:     Query{Offset: 1, Limit: 10},
			wantTotal: 3,
			wantLen:   2,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := buf.Query(tt.query)
			if result.Total != tt.wantTotal {
				t.Errorf("Total = %d, want %d", result.Total, tt.wantTotal)
			}
			if len(result.Entries) != tt.wantLen {
				t.Errorf("len(Entries) = %d, want %d", len(result.Entries), tt.wantLen)
			}
		})
	}
}

func TestBufferOverflow(t *testing.T) {
	buf := New(10)

	for i := 0; i < 15; i++ {
		buf.Add(Entry{Timestamp: time.Now(), Level: "info", Message: "msg"})
	}

	result := buf.Query(Query{})
	if result.Total > 10 {
		t.Errorf("buffer should cap at maxSize, got %d", result.Total)
	}
}

func TestBufferDefaultLimit(t *testing.T) {
	buf := New(100)
	buf.Add(Entry{Timestamp: time.Now(), Level: "info", Message: "msg"})

	result := buf.Query(Query{})
	if result.Limit != 100 {
		t.Errorf("default limit = %d, want 100", result.Limit)
	}
}

func TestBufferMaxLimit(t *testing.T) {
	buf := New(100)
	result := buf.Query(Query{Limit: 5000})
	if result.Limit != 1000 {
		t.Errorf("max limit = %d, want 1000", result.Limit)
	}
}

func TestBufferHasMore(t *testing.T) {
	buf := New(100)
	for i := 0; i < 5; i++ {
		buf.Add(Entry{Timestamp: time.Now(), Level: "info", Message: "msg"})
	}

	result := buf.Query(Query{Limit: 3})
	if !result.HasMore {
		t.Error("expected HasMore = true")
	}

	result = buf.Query(Query{Limit: 10})
	if result.HasMore {
		t.Error("expected HasMore = false")
	}
}

func TestNewBufferDefaultSize(t *testing.T) {
	buf := New(0)
	if buf.maxSize != 10000 {
		t.Errorf("default maxSize = %d, want 10000", buf.maxSize)
	}

	buf = New(-1)
	if buf.maxSize != 10000 {
		t.Errorf("negative maxSize = %d, want 10000", buf.maxSize)
	}
}
