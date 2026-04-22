import { createTheme } from '@mui/material/styles'
import type { ThemeMode } from '@/store/ui-context'

export function buildTheme(mode: ThemeMode) {
  const resolvedMode =
    mode === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : mode

  return createTheme({
    palette: {
      mode: resolvedMode,
      primary: { main: '#1976d2' },
      secondary: { main: '#f57c00' },
    },
    typography: {
      fontSize: 13,
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    },
    components: {
      MuiAccordion: {
        defaultProps: { disableGutters: true, elevation: 0 },
        styleOverrides: {
          root: { '&:before': { display: 'none' } },
        },
      },
    },
  })
}
