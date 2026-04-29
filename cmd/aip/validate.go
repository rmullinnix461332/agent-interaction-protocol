package main

import (
	"fmt"
	"os"

	"github.com/agent-interaction-protocol/aip/internal/loader"
	"github.com/agent-interaction-protocol/aip/internal/validate"
	"github.com/spf13/cobra"
)

var validateCmd = &cobra.Command{
	Use:   "validate <flow.yaml>",
	Short: "Validate schema and semantic integrity of an AIP flow file",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		flow, err := loader.LoadFlow(args[0])
		if err != nil {
			return fmt.Errorf("load: %w", err)
		}

		errs := validate.Schema(flow, schemaPath)
		errs = append(errs, validate.Semantic(flow)...)

		if len(errs) == 0 {
			fmt.Println("✓ valid")
			return nil
		}
		for _, e := range errs {
			fmt.Fprintf(os.Stderr, "✗ %s\n", e)
		}
		os.Exit(1)
		return nil
	},
}

func init() {
	rootCmd.AddCommand(validateCmd)
}
