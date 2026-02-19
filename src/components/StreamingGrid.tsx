import { Box, Skeleton } from '@mui/material'
import { motion, AnimatePresence } from 'framer-motion'
import { StreamingCard } from './StreamingCard'
import type { StreamingListItem } from '../types'

interface StreamingGridProps {
  items: StreamingListItem[]
  loading?: boolean
  onSelectItem?: (item: StreamingListItem) => void
  showRank?: boolean
}

function CardSkeleton() {
  return (
    <Box sx={{ width: 160, minWidth: 160 }}>
      <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 1 }} className="shimmer" />
      <Skeleton variant="text" width="80%" height={24} sx={{ mt: 1 }} />
      <Skeleton variant="text" width="40%" height={20} sx={{ mt: 0.5 }} />
    </Box>
  )
}

export function StreamingGrid({ items, loading, onSelectItem, showRank }: StreamingGridProps) {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </Box>
    )
  }

  return (
    <Box
      component={motion.div}
      layout
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: 2,
      }}
    >
      <AnimatePresence mode="popLayout">
        {items.map((item, index) => (
          <motion.div
            key={`${item.media_type}-${item.id}`}
            layout
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, delay: index % 10 * 0.02 }}
          >
            <StreamingCard
              item={item}
              rank={showRank ? index + 1 : undefined}
              onClick={onSelectItem ? () => onSelectItem(item) : undefined}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </Box>
  )
}
