import { createTheme, alpha } from '@mui/material/styles'

const cinematicTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#e50914' },
    secondary: { main: '#b20710' },
    background: {
      default: '#0a0a0a',
      paper: alpha('#141414', 0.85),
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255,255,255,0.7)',
      disabled: 'rgba(255,255,255,0.5)',
    },
    divider: 'rgba(255,255,255,0.08)',
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Netflix Sans", "Helvetica Neue", Helvetica, Arial, sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: 'linear-gradient(180deg, #0a0a0a 0%, #141414 100%)',
          minHeight: '100vh',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: alpha('#1a1a1a', 0.6),
          backdropFilter: 'blur(12px)',
          border: `1px solid ${alpha('#fff', 0.06)}`,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600 },
        contained: { boxShadow: 'none' },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          backgroundColor: alpha('#fff', 0.08),
          border: `1px solid ${alpha('#fff', 0.12)}`,
          fontWeight: 500,
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: { color: '#e50914' },
        thumb: { '&:hover, &.Mui-focusVisible': { boxShadow: '0 0 0 8px rgba(229,9,20,0.16)' } },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#0d0d0d',
          borderLeft: `1px solid ${alpha('#fff', 0.08)}`,
        },
      },
    },
  },
})

export default cinematicTheme
