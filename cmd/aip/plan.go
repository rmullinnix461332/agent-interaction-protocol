package main

import (
	"fmt"

	"github.com/agent-interaction-protocol/aip/internal/graph"
	"github.com/agent-interaction-protocol/aip/internal/loader"
	"github.com/spf13/cobra"
)

var planCmd = &cobra.Command{
	Use:   "plan <flow.yaml>",
	Short: "Show runnable order and dependency resolution",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		flow, err := loader.LoadFlow(args[0])
		if err != nil {
			return fmt.Errorf("load: %w", err)
		}

		stages, err := graph.TopoSort(flow)
		if err != nil {
			return fmt.Errorf("dependency resolution: %w", err)
		}

		for i, stage := range stages {
			fmt.Printf("Stage %d: %v\n", i+1, stage)
		}
		return nil
	},
}

func init() {
	rootCmd.AddCommand(planCmd)
}
