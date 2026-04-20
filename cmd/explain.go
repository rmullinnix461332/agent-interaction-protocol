package main

import (
	"fmt"

	"github.com/agent-interaction-protocol/aip/internal/explain"
	"github.com/spf13/cobra"
)

var explainCmd = &cobra.Command{
	Use:   "explain <object>",
	Short: "Show schema help for an AIP object (e.g. step, participant, artifact)",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		help, err := explain.Object(args[0], schemaPath)
		if err != nil {
			return err
		}
		fmt.Println(help)
		return nil
	},
}

func init() {
	rootCmd.AddCommand(explainCmd)
}
