'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  IconButton,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Collapse,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

type ExpiryOption = '1d' | '3d' | '7d' | null

interface PollFormData {
  title: string
  description?: string
  options: string[]
  expires_in: ExpiryOption
}

interface PollFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: PollFormData) => Promise<boolean>
}

const MIN_OPTIONS = 2
const MAX_OPTIONS = 6
const TITLE_MAX = 200
const TITLE_MIN = 10
const OPTION_MAX = 100

export function PollForm({ open, onClose, onSubmit }: PollFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [showDescription, setShowDescription] = useState(false)
  const [options, setOptions] = useState<string[]>(['', ''])
  const [expiresIn, setExpiresIn] = useState<ExpiryOption>('7d')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(): boolean {
    const errs: Record<string, string> = {}
    const trimmedTitle = title.trim()
    if (trimmedTitle.length < TITLE_MIN) {
      errs.title = `Question must be at least ${TITLE_MIN} characters`
    }
    if (trimmedTitle.length > TITLE_MAX) {
      errs.title = `Question must be ${TITLE_MAX} characters or less`
    }

    const filledOptions = options.map((o) => o.trim())
    const hasEmptyOption = filledOptions.some((o) => o.length === 0)
    if (hasEmptyOption) {
      errs.options = 'All options must have at least 1 character'
    }

    const tooLong = filledOptions.some((o) => o.length > OPTION_MAX)
    if (tooLong) {
      errs.options = `Options must be ${OPTION_MAX} characters or less`
    }

    const uniqueOptions = new Set(filledOptions.map((o) => o.toLowerCase()))
    if (uniqueOptions.size < filledOptions.length) {
      errs.options = 'All options must be unique'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function addOption() {
    if (options.length < MAX_OPTIONS) {
      setOptions([...options, ''])
    }
  }

  function removeOption(index: number) {
    if (options.length > MIN_OPTIONS) {
      setOptions(options.filter((_, i) => i !== index))
    }
  }

  function updateOption(index: number, value: string) {
    setOptions(options.map((o, i) => (i === index ? value : o)))
  }

  async function handleSubmit() {
    if (!validate()) return
    setSubmitting(true)
    const success = await onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      options: options.map((o) => o.trim()),
      expires_in: expiresIn,
    })
    setSubmitting(false)
    if (success) {
      resetForm()
      onClose()
    }
  }

  function resetForm() {
    setTitle('')
    setDescription('')
    setShowDescription(false)
    setOptions(['', ''])
    setExpiresIn('7d')
    setErrors({})
  }

  function handleClose() {
    if (!submitting) {
      resetForm()
      onClose()
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#1a1a1a',
          border: '1px solid rgba(255,255,255,0.08)',
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 600 }}>Create a Poll</DialogTitle>
      <DialogContent>
        {/* Question */}
        <TextField
          fullWidth
          label="Question"
          placeholder="What do you want to ask?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          inputProps={{ maxLength: TITLE_MAX }}
          helperText={errors.title || `${title.length}/${TITLE_MAX}`}
          error={!!errors.title}
          sx={{ mt: 1, mb: 2 }}
        />

        {/* Optional description */}
        <Box sx={{ mb: 2 }}>
          <Button
            size="small"
            onClick={() => setShowDescription(!showDescription)}
            endIcon={
              <ExpandMoreIcon
                sx={{
                  transform: showDescription
                    ? 'rotate(180deg)'
                    : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                }}
              />
            }
            sx={{
              color: 'text.secondary',
              textTransform: 'none',
              mb: 0.5,
            }}
          >
            Add description (optional)
          </Button>
          <Collapse in={showDescription}>
            <TextField
              fullWidth
              label="Description"
              placeholder="Add context to your poll..."
              multiline
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              inputProps={{ maxLength: 500 }}
              helperText={`${description.length}/500`}
            />
          </Collapse>
        </Box>

        {/* Options */}
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          Options ({options.length}/{MAX_OPTIONS})
        </Typography>
        {errors.options && (
          <Typography
            variant="caption"
            color="error"
            sx={{ display: 'block', mb: 1 }}
          >
            {errors.options}
          </Typography>
        )}
        {options.map((opt, i) => (
          <Box
            key={i}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 1,
            }}
          >
            <TextField
              fullWidth
              size="small"
              label={`Option ${i + 1}`}
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
              inputProps={{ maxLength: OPTION_MAX }}
              error={!!errors.options && opt.trim().length === 0}
            />
            {options.length > MIN_OPTIONS && (
              <IconButton
                size="small"
                onClick={() => removeOption(i)}
                sx={{
                  color: 'text.disabled',
                  '&:hover': { color: '#f44336' },
                }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        ))}
        {options.length < MAX_OPTIONS && (
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={addOption}
            sx={{
              color: 'text.secondary',
              textTransform: 'none',
              mb: 2,
            }}
          >
            Add option
          </Button>
        )}

        {/* Expiry */}
        <Typography
          variant="subtitle2"
          color="text.secondary"
          sx={{ mb: 1, mt: 1 }}
        >
          Poll duration
        </Typography>
        <ToggleButtonGroup
          value={expiresIn ?? 'none'}
          exclusive
          onChange={(_, v: string | null) => {
            if (v === null) return
            setExpiresIn(v === 'none' ? null : (v as '1d' | '3d' | '7d'))
          }}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              py: 0.5,
              px: 1.5,
              color: 'text.secondary',
              borderColor: 'divider',
              textTransform: 'none',
              '&.Mui-selected': {
                color: 'primary.main',
                borderColor: 'primary.main',
                bgcolor: 'rgba(229,9,20,0.08)',
              },
            },
          }}
        >
          <ToggleButton value="1d">1 day</ToggleButton>
          <ToggleButton value="3d">3 days</ToggleButton>
          <ToggleButton value="7d">7 days</ToggleButton>
          <ToggleButton value="none">No expiry</ToggleButton>
        </ToggleButtonGroup>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={submitting}
          startIcon={
            submitting ? <CircularProgress size={16} color="inherit" /> : null
          }
        >
          {submitting ? 'Creating...' : 'Create Poll'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
