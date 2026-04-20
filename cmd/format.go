package main

import (
	"fmt"
	"os"

	"github.com/agent-interaction-protocol/aip/internal/format"
	"github.com/agent-interaction-protocol/aip/internal/loader"
	"github.com/spf13/cobra"
)

var (
	formatWrite  bool
	formatIndent int
)

var formatCmd = &cobra.Command{
	Use:   "format <flow.yaml>",
	Short: "Canonical formatting — indentation, key ordering, output normalization",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		flow, err := loader.LoadFlow(args[0])
		if err != nil {
			return fmt.Errorf("load: %w", err)
		}

		out, err := format.Canonical(flow, formatIndent)
		if err != nil {
			return err
		}

		if formatWrite {
			return os.WriteFile(args[0], out, 0644)
		}
		fmt.Print(string(out))
		return nil
	},
}

func init() {
	formatCmd.Flags().BoolVarP(&formatWrite, "write", "w", false, "write formatted output back to file")
	formatCmd.Flags().IntVar(&formatIndent, "indent", 2, "indentation spaces")
	rootCmd.AddCommand(formatCmd)
}
