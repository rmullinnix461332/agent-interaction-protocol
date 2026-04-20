package main

import (
	"fmt"

	"github.com/agent-interaction-protocol/aip/internal/graph"
	"github.com/agent-interaction-protocol/aip/internal/loader"
	"github.com/spf13/cobra"
)

var renderCmd = &cobra.Command{
	Use:   "render <flow.yaml>",
	Short: "Render execution graph as ASCII DAG",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		flow, err := loader.LoadFlow(args[0])
		if err != nil {
			return fmt.Errorf("load: %w", err)
		}
		fmt.Println(graph.RenderASCII(flow))
		return nil
	},
}

func init() {
	rootCmd.AddCommand(renderCmd)
}
