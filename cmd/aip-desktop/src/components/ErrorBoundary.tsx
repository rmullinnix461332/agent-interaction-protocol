import { Component, type ReactNode } from 'react'
import { Box, Typography, Button, Paper } from '@mui/material'
import ErrorIcon from '@mui/icons-material/Error'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
          <Paper sx={{ p: 4, maxWidth: 500, textAlign: 'center' }}>
            <ErrorIcon color="error" sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="h6" gutterBottom>Something went wrong</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontFamily: 'monospace', fontSize: 12 }}>
              {this.state.error?.message}
            </Typography>
            <Button
              variant="outlined"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try Again
            </Button>
          </Paper>
        </Box>
      )
    }

    return this.props.children
  }
}
