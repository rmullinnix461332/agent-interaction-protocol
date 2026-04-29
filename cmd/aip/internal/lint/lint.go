package lint

import (
	"fmt"

	"github.com/agent-interaction-protocol/aip/internal/loader"
)

// Check runs opinionated best-practice checks on a flow.
func Check(flow *loader.Flow) []string {
	var warnings []string

	// Metadata checks
	if flow.Metadata.Description == "" {
		warnings = append(warnings, "metadata.description is empty — add a description for clarity")
	}
	if flow.Metadata.Version == "" {
		warnings = append(warnings, "metadata.version is missing — version your flows")
	}

	// Participant checks
	referenced := map[string]bool{}
	for _, s := range flow.Steps {
		if s.ParticipantRef != "" {
			referenced[s.ParticipantRef] = true
		}
	}
	for _, p := range flow.Participants {
		if !referenced[p.ID] {
			warnings = append(warnings, fmt.Sprintf("participant %q is declared but never referenced by any step", p.ID))
		}
		if p.Description == "" {
			warnings = append(warnings, fmt.Sprintf("participant %q has no description", p.ID))
		}
	}

	// Step checks
	for _, s := range flow.Steps {
		if s.Title == "" {
			warnings = append(warnings, fmt.Sprintf("step %q has no title — add one for readability", s.ID))
		}
		if s.Type == "action" && len(s.Produces) == 0 {
			warnings = append(warnings, fmt.Sprintf("action step %q produces no artifacts — consider declaring outputs", s.ID))
		}
	}

	// Artifact checks
	for _, a := range flow.Artifacts {
		if a.Producer == "" {
			warnings = append(warnings, fmt.Sprintf("artifact %q has no producer declared", a.Ref))
		}
		if len(a.Consumers) == 0 {
			warnings = append(warnings, fmt.Sprintf("artifact %q has no consumers — is it used?", a.Ref))
		}
	}

	return warnings
}
