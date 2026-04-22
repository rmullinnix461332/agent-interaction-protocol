package executor

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/example/aip-engine/internal/models"
)

// builtinRegistry resolves participant refs to built-in adapters
type builtinRegistry struct{}

// NewAdapterRegistry creates a new adapter registry with built-in participants
func NewAdapterRegistry() AdapterRegistry {
	return &builtinRegistry{}
}

// Resolve returns the adapter for a participant based on provider bindings
func (r *builtinRegistry) Resolve(participantRef string, flow *models.ConnectedFlow) (Adapter, map[string]any, error) {
	// Check provider bindings first
	if flow.ProviderBinding != nil {
		for _, binding := range flow.ProviderBinding.ParticipantBindings {
			if binding.ParticipantRef == participantRef {
				adapter, err := resolveBuiltin(binding.ProviderTarget)
				if err != nil {
					return nil, nil, err
				}
				return adapter, binding.Config, nil
			}
		}
	}

	// Default to echo adapter when no binding is specified
	return &echoAdapter{}, nil, nil
}

// resolveBuiltin returns a built-in adapter by name
func resolveBuiltin(target string) (Adapter, error) {
	switch target {
	case "echo":
		return &echoAdapter{}, nil
	case "mock":
		return &mockAdapter{}, nil
	case "fail":
		return &failAdapter{}, nil
	case "delay":
		return &delayAdapter{}, nil
	default:
		return nil, fmt.Errorf("unknown adapter target: %s", target)
	}
}

// echoAdapter returns consumed artifacts as produced artifacts
type echoAdapter struct{}

func (a *echoAdapter) Execute(_ context.Context, input *models.AdapterInput) (*models.AdapterOutput, error) {
	var produced []models.ProducedArtifact
	for _, art := range input.Artifacts {
		produced = append(produced, models.ProducedArtifact{
			Ref:         art.Ref,
			ContentType: art.ContentType,
			Content:     art.Content,
			Metadata:    art.Metadata,
		})
	}
	return &models.AdapterOutput{Artifacts: produced}, nil
}

// mockAdapter returns a configured mock response
type mockAdapter struct{}

func (a *mockAdapter) Execute(_ context.Context, input *models.AdapterInput) (*models.AdapterOutput, error) {
	response := input.Config["response"]
	if response == nil {
		// Return empty success
		return &models.AdapterOutput{}, nil
	}

	content, err := json.Marshal(response)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal mock response: %w", err)
	}

	// Produce one artifact per expected output
	produced := []models.ProducedArtifact{
		{
			Ref:         fmt.Sprintf("aip://artifact/mock/%s/%s", input.StepID, input.Participant),
			ContentType: "application/json",
			Content:     content,
		},
	}

	return &models.AdapterOutput{Artifacts: produced}, nil
}

// failAdapter always returns an error
type failAdapter struct{}

func (a *failAdapter) Execute(_ context.Context, input *models.AdapterInput) (*models.AdapterOutput, error) {
	code := "ADAPTER_FAILURE"
	message := "Simulated failure"
	retryable := false

	if v, ok := input.Config["code"].(string); ok {
		code = v
	}
	if v, ok := input.Config["message"].(string); ok {
		message = v
	}
	if v, ok := input.Config["retryable"].(bool); ok {
		retryable = v
	}

	return &models.AdapterOutput{
		Error: &models.AdapterError{
			Code:      code,
			Message:   message,
			Retryable: retryable,
		},
	}, nil
}

// delayAdapter waits a configured duration then returns success
type delayAdapter struct{}

func (a *delayAdapter) Execute(ctx context.Context, input *models.AdapterInput) (*models.AdapterOutput, error) {
	durationStr, _ := input.Config["duration"].(string)
	if durationStr == "" {
		durationStr = "1s"
	}

	d, err := time.ParseDuration(durationStr)
	if err != nil {
		return nil, fmt.Errorf("invalid delay duration: %w", err)
	}

	select {
	case <-time.After(d):
		return &models.AdapterOutput{}, nil
	case <-ctx.Done():
		return nil, ctx.Err()
	}
}
