package main

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

var schemaPath string

var rootCmd = &cobra.Command{
	Use:   "aip",
	Short: "AIP CLI — validate, render, lint, format, explain, plan, and test AIP flow YAML files",
}

func init() {
	rootCmd.PersistentFlags().StringVar(&schemaPath, "schema", "", "path to aip-core.json.schema (default: auto-detect)")
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
