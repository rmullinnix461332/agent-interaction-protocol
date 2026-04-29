package main

import (
	"fmt"

	"github.com/agent-interaction-protocol/aip/internal/loader"
	"github.com/agent-interaction-protocol/aip/internal/runner"
	"github.com/spf13/cobra"
)

var mockDir string

var testCmd = &cobra.Command{
	Use:   "test <flow.yaml>",
	Short: "Run flow with mock participants",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		flow, err := loader.LoadFlow(args[0])
		if err != nil {
			return fmt.Errorf("load: %w", err)
		}

		result, err := runner.Execute(flow, mockDir)
		if err != nil {
			return fmt.Errorf("execution: %w", err)
		}

		fmt.Println(result.Summary())
		return nil
	},
}

func init() {
	testCmd.Flags().StringVar(&mockDir, "mocks", "mocks/", "directory containing mock participant definitions")
	rootCmd.AddCommand(testCmd)
}
