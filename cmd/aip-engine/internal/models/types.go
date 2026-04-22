package models

import "time"

// Flow represents an AIP workflow definition
type Flow struct {
	APIVersion      string           `json:"apiVersion"`
	Kind            string           `json:"kind"` // always "Flow"
	Metadata        FlowMetadata     `json:"metadata"`
	Participants    []Participant    `json:"participants"`
	Artifacts       []Artifact       `json:"artifacts"`
	Steps           []Step           `json:"steps"`
	ProviderBinding *ProviderBinding `json:"providerBinding,omitempty"`
}

// FlowMetadata contains flow identification and description
type FlowMetadata struct {
	Name        string            `json:"name"`
	Title       string            `json:"title,omitempty"`
	Version     string            `json:"version,omitempty"`
	Description string            `json:"description,omitempty"`
	Labels      map[string]string `json:"labels,omitempty"`
}

// Participant represents an entity capable of performing work
type Participant struct {
	ID           string          `json:"id"`
	Kind         ParticipantKind `json:"kind"`
	Title        string          `json:"title,omitempty"`
	Description  string          `json:"description,omitempty"`
	FlowRef      string          `json:"flowRef,omitempty"` // for subflow
	Version      string          `json:"version,omitempty"`
	Capabilities []string        `json:"capabilities,omitempty"`
	Constraints  map[string]any  `json:"constraints,omitempty"`
}

// ParticipantKind defines the type of participant
type ParticipantKind string

const (
	ParticipantKindAgent   ParticipantKind = "agent"
	ParticipantKindService ParticipantKind = "service"
	ParticipantKindHuman   ParticipantKind = "human"
	ParticipantKindSubflow ParticipantKind = "subflow"
)

// Artifact represents a data object in a flow
type Artifact struct {
	Ref         string         `json:"ref"`
	ContentType string         `json:"contentType,omitempty"`
	ContractRef string         `json:"contractRef,omitempty"`
	Title       string         `json:"title,omitempty"`
	Description string         `json:"description,omitempty"`
	Producer    string         `json:"producer,omitempty"`
	Consumers   []string       `json:"consumers,omitempty"`
	Required    bool           `json:"required,omitempty"`
	Metadata    map[string]any `json:"metadata,omitempty"`
}

// Step represents a single step in a flow
type Step struct {
	ID             string         `json:"id"`
	Type           StepType       `json:"type"`
	Title          string         `json:"title,omitempty"`
	Description    string         `json:"description,omitempty"`
	ParticipantRef string         `json:"participantRef,omitempty"`
	DependsOn      []string       `json:"dependsOn,omitempty"`
	Consumes       []string       `json:"consumes,omitempty"`
	Produces       []string       `json:"produces,omitempty"`
	Steps          []string       `json:"steps,omitempty"`     // fanOut
	Condition      string         `json:"condition,omitempty"` // fanIn
	Operator       *Operator      `json:"operator,omitempty"`
	Decision       *Decision      `json:"decision,omitempty"`
	Iteration      *Iteration     `json:"iteration,omitempty"`
	AwaitInput     *AwaitInput    `json:"awaitInput,omitempty"`
	Exit           *Exit          `json:"exit,omitempty"`
	Extensions     map[string]any `json:"extensions,omitempty"`
}

// StepType defines the type of step
type StepType string

const (
	StepTypeAction   StepType = "action"
	StepTypeFanOut   StepType = "fanOut"
	StepTypeFanIn    StepType = "fanIn"
	StepTypeDecision StepType = "decision"
	StepTypeAwait    StepType = "await"
	StepTypeExit     StepType = "exit"
)

// Operator represents a coordination operator
type Operator struct {
	Type        string         `json:"type"`
	Mode        string         `json:"mode,omitempty"`
	CriteriaRef string         `json:"criteriaRef,omitempty"`
	TopN        int            `json:"topN,omitempty"`
	Config      map[string]any `json:"config,omitempty"`
}

// Decision represents a branching decision
type Decision struct {
	Cases   []DecisionCase `json:"cases"`
	Default *DecisionNext  `json:"default,omitempty"`
}

// DecisionCase represents a single case in a decision
type DecisionCase struct {
	When DecisionCondition `json:"when"`
	Next DecisionNext      `json:"next"`
}

// DecisionCondition represents a condition expression (simplified for MVP)
type DecisionCondition map[string]any

// DecisionNext represents the next step(s) after a decision
type DecisionNext struct {
	NextStep  string   `json:"nextStep,omitempty"`
	NextSteps []string `json:"nextSteps,omitempty"`
}

// Iteration represents iteration configuration
type Iteration struct {
	Mode          string         `json:"mode"`
	CollectionRef string         `json:"collectionRef,omitempty"`
	Condition     map[string]any `json:"condition,omitempty"`
	Strategy      string         `json:"strategy,omitempty"`
	OutputMode    string         `json:"outputMode,omitempty"`
	OnItemFailure string         `json:"onItemFailure,omitempty"`
	MaxIterations int            `json:"maxIterations,omitempty"`
	Timeout       string         `json:"timeout,omitempty"`
}

// AwaitInput represents input expected for an await step
type AwaitInput struct {
	Ref                  string `json:"ref"`
	ContentType          string `json:"contentType,omitempty"`
	ContractRef          string `json:"contractRef,omitempty"`
	SourceParticipantRef string `json:"sourceParticipantRef,omitempty"`
	Description          string `json:"description,omitempty"`
}

// Exit represents flow termination
type Exit struct {
	Status  string `json:"status"`
	Code    string `json:"code,omitempty"`
	Message string `json:"message,omitempty"`
}

// ProviderBinding represents provider-specific bindings
type ProviderBinding struct {
	ProviderRef         string               `json:"providerRef"`
	ParticipantBindings []ParticipantBinding `json:"participantBindings,omitempty"`
	ArtifactBindings    []ArtifactBinding    `json:"artifactBindings,omitempty"`
	Config              map[string]any       `json:"config,omitempty"`
}

// ParticipantBinding maps a participant to a provider target
type ParticipantBinding struct {
	ParticipantRef string         `json:"participantRef"`
	ProviderTarget string         `json:"providerTarget"`
	Config         map[string]any `json:"config,omitempty"`
}

// ArtifactBinding maps an artifact to a provider
type ArtifactBinding struct {
	ArtifactRef string `json:"artifactRef"`
	ProviderRef string `json:"providerRef"`
}

// Run represents a single execution instance of a flow
type Run struct {
	ID           string                `json:"id"`
	FlowID       string                `json:"flowId"`
	FlowName     string                `json:"flowName"`
	Status       RunStatus             `json:"status"`
	StartedAt    time.Time             `json:"startedAt"`
	CompletedAt  *time.Time            `json:"completedAt,omitempty"`
	CurrentStep  string                `json:"currentStep,omitempty"`
	AwaitState   *AwaitState           `json:"awaitState,omitempty"`
	StepStatuses map[string]StepStatus `json:"stepStatuses"`
	Input        map[string]any        `json:"input,omitempty"`
	Output       map[string]any        `json:"output,omitempty"`
	Error        string                `json:"error,omitempty"`
}

// RunStatus defines the status of a run
type RunStatus string

const (
	RunStatusPending   RunStatus = "pending"
	RunStatusRunning   RunStatus = "running"
	RunStatusAwaiting  RunStatus = "awaiting"
	RunStatusCompleted RunStatus = "completed"
	RunStatusFailed    RunStatus = "failed"
	RunStatusCancelled RunStatus = "cancelled"
)

// StepStatus represents the status of a step within a run
type StepStatus struct {
	Status      string     `json:"status"`
	StartedAt   *time.Time `json:"startedAt,omitempty"`
	CompletedAt *time.Time `json:"completedAt,omitempty"`
	Error       string     `json:"error,omitempty"`
}

// AwaitState represents the state of an awaiting run
type AwaitState struct {
	StepID        string     `json:"stepId"`
	AwaitInputRef string     `json:"awaitInputRef"`
	ResumedAt     *time.Time `json:"resumedAt,omitempty"`
	ResumeValue   any        `json:"resumeValue,omitempty"`
}

// RuntimeArtifact represents a stored artifact with content
type RuntimeArtifact struct {
	Artifact
	RunID       string    `json:"runId"`
	StepID      string    `json:"stepId,omitempty"`
	Content     []byte    `json:"content,omitempty"`
	ContentPath string    `json:"contentPath,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
	Size        int64     `json:"size"`
}

// Event represents a runtime lifecycle event
type Event struct {
	ID        string         `json:"id"`
	RunID     string         `json:"runId"`
	Type      EventType      `json:"type"`
	StepID    string         `json:"stepId,omitempty"`
	Timestamp time.Time      `json:"timestamp"`
	Message   string         `json:"message,omitempty"`
	Data      map[string]any `json:"data,omitempty"`
}

// EventType defines the type of event
type EventType string

const (
	EventTypeRunStarted       EventType = "run_started"
	EventTypeStepStarted      EventType = "step_started"
	EventTypeStepCompleted    EventType = "step_completed"
	EventTypeStepFailed       EventType = "step_failed"
	EventTypeAwaitEntered     EventType = "await_entered"
	EventTypeAwaitResumed     EventType = "await_resumed"
	EventTypeArtifactProduced EventType = "artifact_produced"
	EventTypeRunCompleted     EventType = "run_completed"
	EventTypeRunFailed        EventType = "run_failed"
)

// Condition represents a decision condition expression
type Condition struct {
	Eq     *Comparison `json:"eq,omitempty"`
	Ne     *Comparison `json:"ne,omitempty"`
	Gt     *Comparison `json:"gt,omitempty"`
	Gte    *Comparison `json:"gte,omitempty"`
	Lt     *Comparison `json:"lt,omitempty"`
	Lte    *Comparison `json:"lte,omitempty"`
	Exists *PathExpr   `json:"exists,omitempty"`
	And    []Condition `json:"and,omitempty"`
	Or     []Condition `json:"or,omitempty"`
	Not    *Condition  `json:"not,omitempty"`
}

// Comparison represents a comparison expression
type Comparison struct {
	Path  string `json:"path"`
	Value any    `json:"value"`
}

// PathExpr represents a path existence check
type PathExpr struct {
	Path string `json:"path"`
}

// AdapterInput is passed to participant adapters
type AdapterInput struct {
	RunID       string             `json:"runId"`
	StepID      string             `json:"stepId"`
	Participant string             `json:"participant"`
	Artifacts   []ResolvedArtifact `json:"artifacts"`
	Config      map[string]any     `json:"config,omitempty"`
}

// ResolvedArtifact contains resolved metadata and optionally content
type ResolvedArtifact struct {
	Ref         string         `json:"ref"`
	ContentType string         `json:"contentType"`
	Metadata    map[string]any `json:"metadata,omitempty"`
	Content     []byte         `json:"content,omitempty"`
	HasContent  bool           `json:"hasContent,omitempty"`
}

// AdapterOutput is returned by participant adapters
type AdapterOutput struct {
	Artifacts []ProducedArtifact `json:"artifacts,omitempty"`
	Error     *AdapterError      `json:"error,omitempty"`
}

// ProducedArtifact represents an artifact produced by a participant
type ProducedArtifact struct {
	Ref         string         `json:"ref"`
	ContentType string         `json:"contentType"`
	Content     []byte         `json:"content,omitempty"`
	ContentPath string         `json:"contentPath,omitempty"`
	Metadata    map[string]any `json:"metadata,omitempty"`
}

// AdapterError represents a structured error from a participant adapter
type AdapterError struct {
	Code      string `json:"code"`
	Message   string `json:"message"`
	Retryable bool   `json:"retryable,omitempty"`
}

// ResumePayload is the artifact-shaped payload for resuming await states
type ResumePayload struct {
	Ref         string `json:"ref"`
	ContentType string `json:"contentType,omitempty"`
	Value       any    `json:"value,omitempty"`
}

// ConnectedFlow represents a flow installed in the engine
type ConnectedFlow struct {
	Flow
	InstalledAt time.Time  `json:"installedAt"`
	LastRunAt   *time.Time `json:"lastRunAt,omitempty"`
	RunCount    int        `json:"runCount"`
	Status      string     `json:"status"`
}
