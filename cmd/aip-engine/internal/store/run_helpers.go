package store

import (
	"os"
)

// ensureDir creates a directory if it doesn't exist
func ensureDir(path string) error {
	return os.MkdirAll(path, 0755)
}

// removeDir removes a directory and all its contents
func removeDir(path string) error {
	return os.RemoveAll(path)
}

// isNotExist returns true if the error indicates the file doesn't exist
func isNotExist(err error) bool {
	return os.IsNotExist(err)
}
