package executor

import (
	"context"
	"testing"
	"time"

	"github.com/example/aip-engine/internal/models"
)

func TestEchoAdapter(t *testing.T) {
	adapter := &echoAdapter{}
	input := &models.AdapterInput{
		Artifacts: []models.ResolvedArtifact{
			{Ref: "aip://a/1", ContentType: "text/plain", Content: []byte("hello")},
			{Ref: "aip://a/2", ContentType: "text/plain", Content: []byte("world")},
		},
	}

	output, err := adapter.Execute(context.Background(), input)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(output.Artifacts) != 2 {
		t.Errorf("got %d artifacts, want 2", len(output.Artifacts))
	}
	if string(output.Artifacts[0].Content) != "hello" {
		t.Errorf("content = %q, want %q", output.Artifacts[0].Content, "hello")
	}
}

func TestMockAdapter(t *testing.T) {
	tests := []struct {
		name      string
		config    map[string]any
		wantCount int
		wantErr   bool
	}{
		{
			name:      "with response",
			config:    map[string]any{"response": map[string]any{"key": "val"}},
			wantCount: 1,
		},
		{
			name:      "nil response",
			config:    map[string]any{},
			wantCount: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			adapter := &mockAdapter{}
			input := &models.AdapterInput{
				StepID:      "step1",
				Participant: "agent1",
				Config:      tt.config,
			}

			output, err := adapter.Execute(context.Background(), input)
			if (err != nil) != tt.wantErr {
				t.Fatalf("error = %v, wantErr = %v", err, tt.wantErr)
			}
			if err == nil && len(output.Artifacts) != tt.wantCount {
				t.Errorf("got %d artifacts, want %d", len(output.Artifacts), tt.wantCount)
			}
		})
	}
}

func TestFailAdapter(t *testing.T) {
	tests := []struct {
		name     string
		config   map[string]any
		wantCode string
		wantMsg  string
	}{
		{
			name:     "defaults",
			config:   map[string]any{},
			wantCode: "ADAPTER_FAILURE",
			wantMsg:  "Simulated failure",
		},
		{
			name:     "custom",
			config:   map[string]any{"code": "CUSTOM", "message": "custom msg"},
			wantCode: "CUSTOM",
			wantMsg:  "custom msg",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			adapter := &failAdapter{}
			input := &models.AdapterInput{Config: tt.config}

			output, err := adapter.Execute(context.Background(), input)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if output.Error == nil {
				t.Fatal("expected adapter error")
			}
			if output.Error.Code != tt.wantCode {
				t.Errorf("code = %q, want %q", output.Error.Code, tt.wantCode)
			}
			if output.Error.Message != tt.wantMsg {
				t.Errorf("message = %q, want %q", output.Error.Message, tt.wantMsg)
			}
		})
	}
}

func TestDelayAdapter_Cancellation(t *testing.T) {
	adapter := &delayAdapter{}
	ctx, cancel := context.WithCancel(context.Background())

	go func() {
		time.Sleep(50 * time.Millisecond)
		cancel()
	}()

	input := &models.AdapterInput{Config: map[string]any{"duration": "10s"}}
	_, err := adapter.Execute(ctx, input)
	if err == nil {
		t.Error("expected cancellation error")
	}
}

func TestResolveBuiltin(t *testing.T) {
	tests := []struct {
		name    string
		target  string
		wantErr bool
	}{
		{name: "echo", target: "echo", wantErr: false},
		{name: "mock", target: "mock", wantErr: false},
		{name: "fail", target: "fail", wantErr: false},
		{name: "delay", target: "delay", wantErr: false},
		{name: "unknown", target: "bogus", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := resolveBuiltin(tt.target)
			if (err != nil) != tt.wantErr {
				t.Errorf("error = %v, wantErr = %v", err, tt.wantErr)
			}
		})
	}
}
