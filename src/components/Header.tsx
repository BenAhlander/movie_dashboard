import { AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import { motion } from 'framer-motion'
import { alpha } from '@mui/material/styles'

export function Header() {
  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backgroundColor: (t) => alpha(t.palette.background.paper, 0.8),
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', py: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton color="inherit" edge="start" aria-label="menu" sx={{ mr: 0.5 }}>
            <MenuIcon />
          </IconButton>
          <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
            <Typography
              variant="h6"
              component="span"
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(90deg, #e50914 0%, #ff6b6b 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
              }}
            >
              FreshTomatoes
            </Typography>
          </motion.div>
        </Box>
      </Toolbar>
    </AppBar>
  )
}
