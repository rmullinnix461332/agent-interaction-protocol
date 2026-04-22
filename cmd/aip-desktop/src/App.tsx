import { useState } from 'react'
import { Box, CssBaseline, ThemeProvider } from '@mui/material'
import { theme } from '@/theme/theme'
import { EngineProvider } from '@/store/EngineContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { Dashboard } from '@/pages/Dashboard'
import { Engines } from '@/pages/Engines'
import { Flows } from '@/pages/Flows'
import { Runs } from '@/pages/Runs'
import { RunDetail } from '@/pages/RunDetail'
import { Participants } from '@/pages/Participants'
import { Diagnostics } from '@/pages/Diagnostics'

const DRAWER_WIDTH = 220

type PageState =
  | { page: 'dashboard' }
  | { page: 'engines' }
  | { page: 'flows' }
  | { page: 'runs' }
  | { page: 'run-detail'; runId: string }
  | { page: 'participants' }
  | { page: 'diagnostics' }

function PageContent({ state, navigate }: { state: PageState; navigate: (s: PageState) => void }) {
  switch (state.page) {
    case 'dashboard':
      return (
        <Dashboard
          onNavigateRun={(runId) => navigate({ page: 'run-detail', runId })}
        />
      )
    case 'engines':
      return <Engines />
    case 'flows':
      return (
        <Flows
          onStartRun={() => navigate({ page: 'runs' })}
        />
      )
    case 'runs':
      return (
        <Runs
          onInspect={(runId) => navigate({ page: 'run-detail', runId })}
        />
      )
    case 'run-detail':
      return (
        <RunDetail
          runId={state.runId}
          onBack={() => navigate({ page: 'runs' })}
        />
      )
    case 'participants':
      return <Participants />
    case 'diagnostics':
      return <Diagnostics />
    default:
      return <Dashboard />
  }
}

export default function App() {
  const [pageState, setPageState] = useState<PageState>({ page: 'dashboard' })

  const handleNavigate = (page: string) => {
    setPageState({ page } as PageState)
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <EngineProvider>
        <Box sx={{ display: 'flex', height: '100vh' }}>
          <Sidebar currentPage={pageState.page === 'run-detail' ? 'runs' : pageState.page} onNavigate={handleNavigate} />
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', ml: `${DRAWER_WIDTH}px` }}>
            <Header />
            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
              <ErrorBoundary>
                <PageContent state={pageState} navigate={setPageState} />
              </ErrorBoundary>
            </Box>
          </Box>
        </Box>
      </EngineProvider>
    </ThemeProvider>
  )
}
