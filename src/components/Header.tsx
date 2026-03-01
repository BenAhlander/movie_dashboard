'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Button,
  Avatar,
  Menu,
  MenuItem,
  Skeleton,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import MovieIcon from '@mui/icons-material/Movie'
import LiveTvIcon from '@mui/icons-material/LiveTv'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import PollIcon from '@mui/icons-material/Poll'
import QuizIcon from '@mui/icons-material/Quiz'
import CompareArrowsIcon from '@mui/icons-material/CompareArrows'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import { motion } from 'framer-motion'
import { alpha } from '@mui/material/styles'
import { useUser } from '@auth0/nextjs-auth0/client'

const menuItems = [
  { label: 'Theater', path: '/theater', icon: MovieIcon },
  { label: 'Streaming', path: '/streaming', icon: LiveTvIcon },
  { label: 'Feedback', path: '/feedback', icon: ChatBubbleOutlineIcon },
  { label: 'Polls', path: '/polls', icon: PollIcon },
  { label: 'Trivia', path: '/trivia', icon: QuizIcon },
  { label: 'Versus', path: '/head-to-head', icon: CompareArrowsIcon },
  { label: 'Leaderboard', path: '/leaderboard', icon: EmojiEventsIcon },
  { label: 'Profile', path: '/profile', icon: PersonOutlineIcon, authOnly: true },
]

interface HeaderProps {
  authEnabled?: boolean
}

export function Header({ authEnabled }: HeaderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoading } = useUser()

  const handleMenuClick = () => {
    setDrawerOpen(true)
  }

  const handleDrawerClose = () => {
    setDrawerOpen(false)
  }

  const handleNavigation = (path: string) => {
    router.push(path)
    setDrawerOpen(false)
  }

  return (
    <>
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
            <IconButton
              color="inherit"
              edge="start"
              aria-label="menu"
              onClick={handleMenuClick}
              sx={{ mr: 0.5 }}
            >
              <MenuIcon />
            </IconButton>
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Typography
                variant="h6"
                component="a"
                href="/theater"
                sx={{
                  fontWeight: 700,
                  background:
                    'linear-gradient(90deg, #e50914 0%, #ff6b6b 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                  textDecoration: 'none',
                  cursor: 'pointer',
                }}
              >
                FreshTomatoes
              </Typography>
            </motion.div>
          </Box>

          {authEnabled && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {isLoading ? (
                <Skeleton variant="circular" width={32} height={32} />
              ) : user ? (
                <>
                  <IconButton
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    size="small"
                  >
                    <Avatar
                      src={user.picture ?? undefined}
                      alt={user.name ?? ''}
                      sx={{ width: 32, height: 32 }}
                    />
                  </IconButton>
                  <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={() => setAnchorEl(null)}
                    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                  >
                    <MenuItem disabled sx={{ opacity: '1 !important' }}>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {user.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {user.email}
                        </Typography>
                      </Box>
                    </MenuItem>
                    <Divider />
                    <MenuItem
                      component="a"
                      href="/auth/logout"
                      onClick={() => setAnchorEl(null)}
                    >
                      Sign out
                    </MenuItem>
                  </Menu>
                </>
              ) : (
                <Button
                  href="/auth/login"
                  variant="outlined"
                  size="small"
                  sx={{
                    borderColor: 'divider',
                    color: 'text.primary',
                    textTransform: 'none',
                    '&:hover': {
                      borderColor: 'primary.main',
                      color: 'primary.main',
                    },
                  }}
                >
                  Sign in
                </Button>
              )}
            </Box>
          )}
        </Toolbar>
      </AppBar>
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={handleDrawerClose}
        slotProps={{
          backdrop: { sx: { backgroundColor: 'rgba(0,0,0,0.8)' } },
        }}
        PaperProps={{
          sx: {
            width: { xs: 280, sm: 320 },
            bgcolor: 'background.paper',
          },
        }}
      >
        <Box sx={{ pt: 2 }}>
          <Typography
            variant="h6"
            sx={{
              px: 2,
              pb: 1,
              fontWeight: 700,
              background: 'linear-gradient(90deg, #e50914 0%, #ff6b6b 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}
          >
            FreshTomatoes
          </Typography>
          <Divider sx={{ my: 1 }} />
          <List>
            {menuItems
              .filter((item) => !item.authOnly || (authEnabled && user))
              .map((item) => {
              const Icon = item.icon
              const isActive = pathname.startsWith(item.path)
              return (
                <ListItem key={item.path} disablePadding>
                  <ListItemButton
                    onClick={() => handleNavigation(item.path)}
                    selected={isActive}
                    sx={{
                      '&.Mui-selected': {
                        bgcolor: 'rgba(229,9,20,0.08)',
                        borderLeft: '3px solid',
                        borderColor: 'primary.main',
                        '&:hover': {
                          bgcolor: 'rgba(229,9,20,0.12)',
                        },
                      },
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.04)',
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        color: isActive ? 'primary.main' : 'text.secondary',
                        minWidth: 40,
                      }}
                    >
                      <Icon />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? 'primary.main' : 'text.primary',
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              )
            })}
          </List>
        </Box>
      </Drawer>
    </>
  )
}
