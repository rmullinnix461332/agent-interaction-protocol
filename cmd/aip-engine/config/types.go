package config

import "time"

// Config is the root configuration for the engine
type Config struct {
	Server       ServerConfig       `yaml:"server" json:"server"`
	Engine       EngineConfig       `yaml:"engine" json:"engine"`
	Execution    ExecutionConfig    `yaml:"execution" json:"execution"`
	Retention    RetentionConfig    `yaml:"retention" json:"retention"`
	Logging      LoggingConfig      `yaml:"logging" json:"logging"`
	Participants ParticipantsConfig `yaml:"participants" json:"participants"`
}

// ServerConfig holds HTTP server settings
type ServerConfig struct {
	Host string `yaml:"host" json:"host"`
	Port int    `yaml:"port" json:"port"`
}

// EngineConfig holds engine identity and behavior settings
type EngineConfig struct {
	Name                  string `yaml:"name" json:"name"`
	Type                  string `yaml:"type" json:"type"`
	DataDir               string `yaml:"dataDir" json:"dataDir"`
	MaxConcurrency        int    `yaml:"maxConcurrency" json:"maxConcurrency"`
	ArtifactSizeThreshold int64  `yaml:"artifactSizeThreshold" json:"artifactSizeThreshold"`
}

// ExecutionConfig holds execution behavior settings
type ExecutionConfig struct {
	DefaultAwaitTimeout  string `yaml:"defaultAwaitTimeout" json:"defaultAwaitTimeout"`
	AwaitTimeoutBehavior string `yaml:"awaitTimeoutBehavior" json:"awaitTimeoutBehavior"`
}

// RetentionConfig holds data retention settings
type RetentionConfig struct {
	MaxRuns int    `yaml:"maxRuns" json:"maxRuns"`
	MaxAge  string `yaml:"maxAge" json:"maxAge"`
}

// LoggingConfig holds logging settings
type LoggingConfig struct {
	Level  string `yaml:"level" json:"level"`
	Format string `yaml:"format" json:"format"`
}

// ParticipantsConfig holds built-in participant settings
type ParticipantsConfig struct {
	Builtins BuiltinParticipantsConfig `yaml:"builtins" json:"builtins"`
}

// BuiltinParticipantsConfig enables/disables built-in participants
type BuiltinParticipantsConfig struct {
	Echo           bool `yaml:"echo" json:"echo"`
	Mock           bool `yaml:"mock" json:"mock"`
	Fail           bool `yaml:"fail" json:"fail"`
	Delay          bool `yaml:"delay" json:"delay"`
	ArtifactLoader bool `yaml:"artifact-loader" json:"artifact-loader"`
}

// DefaultConfig returns the default configuration
func DefaultConfig() *Config {
	return &Config{
		Server: ServerConfig{
			Host: "localhost",
			Port: 8080,
		},
		Engine: EngineConfig{
			Name:                  "local-engine",
			Type:                  "local",
			DataDir:               "./data",
			MaxConcurrency:        10,
			ArtifactSizeThreshold: 65536,
		},
		Execution: ExecutionConfig{
			DefaultAwaitTimeout:  "",
			AwaitTimeoutBehavior: "fail",
		},
		Retention: RetentionConfig{
			MaxRuns: 100,
			MaxAge:  "168h",
		},
		Logging: LoggingConfig{
			Level:  "info",
			Format: "json",
		},
		Participants: ParticipantsConfig{
			Builtins: BuiltinParticipantsConfig{
				Echo:           true,
				Mock:           true,
				Fail:           true,
				Delay:          false,
				ArtifactLoader: false,
			},
		},
	}
}

// MaxAgeDuration parses the MaxAge string into a duration
func (r *RetentionConfig) MaxAgeDuration() (time.Duration, error) {
	if r.MaxAge == "" {
		return 0, nil
	}
	return time.ParseDuration(r.MaxAge)
}
