package config

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

// Load reads configuration from file and applies CLI flag overrides
func Load() (*Config, error) {
	cfg := DefaultConfig()

	// Parse CLI flags
	configPath := flag.String("config", "", "Path to config file")
	flag.StringVar(&cfg.Server.Host, "host", cfg.Server.Host, "HTTP server host")
	flag.IntVar(&cfg.Server.Port, "port", cfg.Server.Port, "HTTP server port")
	flag.StringVar(&cfg.Engine.DataDir, "data-dir", cfg.Engine.DataDir, "Data storage directory")
	flag.StringVar(&cfg.Logging.Level, "log-level", cfg.Logging.Level, "Log level (debug, info, warn, error)")
	showVersion := flag.Bool("version", false, "Show version and exit")
	flag.Parse()

	if *showVersion {
		fmt.Println("aip-engine v0.1.0")
		os.Exit(0)
	}

	// Load from config file if specified
	if *configPath != "" {
		if err := loadFromFile(*configPath, cfg); err != nil {
			return nil, fmt.Errorf("failed to load config file: %w", err)
		}
	}

	return cfg, nil
}

// loadFromFile reads configuration from a YAML or JSON file
func loadFromFile(path string, cfg *Config) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}

	ext := filepath.Ext(path)
	switch ext {
	case ".yaml", ".yml":
		return yaml.Unmarshal(data, cfg)
	case ".json":
		return json.Unmarshal(data, cfg)
	default:
		// Try YAML first, then JSON
		if err := yaml.Unmarshal(data, cfg); err != nil {
			return json.Unmarshal(data, cfg)
		}
		return nil
	}
}
