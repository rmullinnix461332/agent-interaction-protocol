package main

import (
	"fmt"
	"os"

	"github.com/agent-interaction-protocol/aip/internal/lint"
	"github.com/agent-interaction-protocol/aip/internal/loader"
	"github.com/spf13/cobra"
)

var lintCmd = &cobra.Command{
	Use:   "lint <flow.yaml>",
	Short: "Opinionated best-practice linting for AIP flows",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		flow, err := loader.LoadFlow(args[0])
		if err != nil {
			return fmt.Errorf("load: %w", err)
		}

		warnings := lint.Check(flow)
		if len(warnings) == 0 {
			fmt.Println("✓ no lint issues")
			return nil
		}
		for _, w := range warnings {
			fmt.Fprintf(os.Stderr, "⚠ %s\n", w)
		}
		os.Exit(1)
		return nil
	},
}

func init() {
	rootCmd.AddCommand(lintCmd)
}
