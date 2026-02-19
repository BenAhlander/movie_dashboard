'use client'

import { Box, IconButton, Typography } from '@mui/material'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import { motion } from 'framer-motion'

interface VoteControlProps {
  score: number
  userVote: -1 | 0 | 1
  onVote: (direction: 'up' | 'down') => void
}

export function VoteControl({ score, userVote, onVote }: VoteControlProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0,
        minWidth: 40,
      }}
    >
      <motion.div whileTap={{ scale: 0.9 }}>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation()
            onVote('up')
          }}
          sx={{
            color: userVote === 1 ? 'primary.main' : 'text.secondary',
            bgcolor: userVote === 1 ? 'rgba(229,9,20,0.1)' : 'transparent',
            transition: 'all 0.15s ease',
            '&:hover': {
              bgcolor:
                userVote === 1
                  ? 'rgba(229,9,20,0.15)'
                  : 'rgba(255,255,255,0.06)',
            },
          }}
        >
          <KeyboardArrowUpIcon sx={{ fontSize: 22 }} />
        </IconButton>
      </motion.div>
      <Typography
        variant="body2"
        fontWeight={600}
        sx={{
          minWidth: 24,
          textAlign: 'center',
          color: userVote !== 0 ? 'primary.main' : 'text.primary',
          transition: 'color 0.15s ease',
        }}
      >
        {score}
      </Typography>
      <motion.div whileTap={{ scale: 0.9 }}>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation()
            onVote('down')
          }}
          sx={{
            color: userVote === -1 ? 'primary.main' : 'text.secondary',
            bgcolor: userVote === -1 ? 'rgba(229,9,20,0.1)' : 'transparent',
            transition: 'all 0.15s ease',
            '&:hover': {
              bgcolor:
                userVote === -1
                  ? 'rgba(229,9,20,0.15)'
                  : 'rgba(255,255,255,0.06)',
            },
          }}
        >
          <KeyboardArrowDownIcon sx={{ fontSize: 22 }} />
        </IconButton>
      </motion.div>
    </Box>
  )
}
