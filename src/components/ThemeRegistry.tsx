'use client'

import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { darkTheme, lightTheme } from '@/theme'
import { ThemeModeProvider, useThemeMode } from './ThemeContext'

function ThemeRegistryInner({ children }: { children: React.ReactNode }) {
  const { mode } = useThemeMode()
  const theme = mode === 'dark' ? darkTheme : lightTheme

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  )
}

export function ThemeRegistry({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider>
      <ThemeModeProvider>
        <ThemeRegistryInner>{children}</ThemeRegistryInner>
      </ThemeModeProvider>
    </AppRouterCacheProvider>
  )
}
