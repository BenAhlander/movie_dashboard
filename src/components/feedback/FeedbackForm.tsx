'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
} from '@mui/material'
import type { FeedbackCategory, FeedbackFormData } from '@/types'

interface FeedbackFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: FeedbackFormData) => Promise<boolean>
}

export function FeedbackForm({ open, onClose, onSubmit }: FeedbackFormProps) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState<FeedbackCategory | ''>('')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (title.trim().length < 3)
      errs.title = 'Title must be at least 3 characters'
    if (title.trim().length > 100)
      errs.title = 'Title must be 100 characters or less'
    if (body.trim().length < 10)
      errs.body = 'Details must be at least 10 characters'
    if (body.trim().length > 500)
      errs.body = 'Details must be 500 characters or less'
    if (!category) errs.category = 'Please select a category'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    setSubmitting(true)
    const success = await onSubmit({
      title: title.trim(),
      body: body.trim(),
      category: category as FeedbackCategory,
    })
    setSubmitting(false)
    if (success) {
      setTitle('')
      setBody('')
      setCategory('')
      setErrors({})
      onClose()
    }
  }

  function handleClose() {
    if (!submitting) {
      setTitle('')
      setBody('')
      setCategory('')
      setErrors({})
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
      <DialogTitle sx={{ fontWeight: 600 }}>Share your feedback</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          label="Title"
          placeholder="e.g., Add dark mode toggle"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          inputProps={{ maxLength: 100 }}
          helperText={errors.title || `${title.length}/100`}
          error={!!errors.title}
          sx={{ mt: 1, mb: 2 }}
        />
        <TextField
          fullWidth
          label="Details"
          placeholder="Describe your feedback..."
          multiline
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          inputProps={{ maxLength: 500 }}
          helperText={errors.body || `${body.length}/500`}
          error={!!errors.body}
          sx={{ mb: 2 }}
        />
        <FormControl fullWidth error={!!errors.category}>
          <InputLabel>Category</InputLabel>
          <Select
            value={category}
            label="Category"
            onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
          >
            <MenuItem value="bug">Bug Report</MenuItem>
            <MenuItem value="feature">Feature Request</MenuItem>
            <MenuItem value="general">General</MenuItem>
          </Select>
          {errors.category && (
            <span
              style={{
                color: '#f44336',
                fontSize: '0.75rem',
                marginTop: 4,
                marginLeft: 14,
              }}
            >
              {errors.category}
            </span>
          )}
        </FormControl>
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
          {submitting ? 'Posting...' : 'Post'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
