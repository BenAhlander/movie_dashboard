'use client'

import { useMemo } from 'react'
import { Box, Paper, Typography } from '@mui/material'
import ReactECharts from 'echarts-for-react'
import type { MovieListItem } from '@/types'
import { formatRevenue, formatDate } from '@/utils/formatters'

interface BoxOfficePanelProps {
  movies: MovieListItem[]
  loading?: boolean
}

const tooltipStyle = {
  backgroundColor: 'rgba(20,20,20,0.95)',
  borderColor: 'rgba(229,9,20,0.5)',
  textStyle: { color: '#fff' },
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '\u2026' : s
}

export function BoxOfficePanel({ movies, loading }: BoxOfficePanelProps) {
  const top5 = useMemo(
    () =>
      [...movies]
        .filter((m) => (m.revenue ?? 0) > 0)
        .sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0))
        .slice(0, 5),
    [movies],
  )

  const momentumScores = useMemo(() => {
    if (top5.length === 0) return []

    const totalCount = movies.length || 1

    // Compute revenue ranks for full list
    const byRevenue = [...movies]
      .filter((m) => (m.revenue ?? 0) > 0)
      .sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0))
    const revRankMap = new Map(byRevenue.map((m, i) => [m.id, i + 1]))

    // Compute popularity ranks for full list
    const byPopularity = [...movies].sort(
      (a, b) => (b.popularity ?? 0) - (a.popularity ?? 0),
    )
    const popRankMap = new Map(byPopularity.map((m, i) => [m.id, i + 1]))

    return top5.map((m) => {
      const revRank = revRankMap.get(m.id) ?? totalCount
      const popRank = popRankMap.get(m.id) ?? totalCount
      // Positive = popularity rank is better (lower number) than revenue rank = heating up
      return (revRank - popRank) / totalCount
    })
  }, [movies, top5])

  if (loading || top5.length === 0) return null

  // Reversed so highest revenue is at top of horizontal bar chart
  const titles = [...top5].reverse().map((m) => truncate(m.title, 20))
  const revenues = [...top5].reverse().map((m) => m.revenue ?? 0)
  const budgets = [...top5].reverse().map((m) => m.budget ?? 0)
  const top5Reversed = [...top5].reverse()
  const momentumReversed = [...momentumScores].reverse()

  const roiLabels = top5Reversed.map((m) => {
    const rev = m.revenue ?? 0
    const bud = m.budget ?? 0
    if (bud > 0) {
      const roi = ((rev - bud) / bud) * 100
      return {
        text: `${roi >= 0 ? '+' : ''}${roi.toFixed(0)}% ROI`,
        color: roi >= 0 ? '#4caf50' : '#f44336',
      }
    }
    return { text: 'Budget N/A', color: 'rgba(255,255,255,0.4)' }
  })

  const richStyles: Record<string, { color: string; fontSize: number }> = {}
  roiLabels.forEach((r, i) => {
    richStyles[`roi${i}`] = { color: r.color, fontSize: 11 }
  })

  const revenueOption = {
    backgroundColor: 'transparent',
    textStyle: { color: 'rgba(255,255,255,0.8)', fontFamily: 'Source Sans 3' },
    grid: { left: 170, right: 80, top: 8, bottom: 32 },
    tooltip: {
      ...tooltipStyle,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: { name: string; seriesName: string; value: number; dataIndex: number }[]) => {
        const rev = params.find((p) => p.seriesName === 'Revenue')
        const bud = params.find((p) => p.seriesName === 'Budget')
        if (!rev) return ''
        const movie = top5Reversed[rev.dataIndex]
        const daysOut = movie
          ? Math.max(1, Math.floor((Date.now() - new Date(movie.release_date).getTime()) / 86_400_000))
          : null
        let html = `<div style="font-weight:700;font-size:14px;margin-bottom:6px">${rev.name}</div>`
        html += `<div style="color:rgba(255,255,255,0.8)">Revenue: ${formatRevenue(rev.value)}`
        html += ` · Budget: ${bud && bud.value > 0 ? formatRevenue(bud.value) : 'N/A'}</div>`
        if (bud && bud.value > 0) {
          const roi = ((rev.value - bud.value) / bud.value) * 100
          const roiColor = roi >= 0 ? '#4caf50' : '#f44336'
          html += `<div style="color:${roiColor};margin-top:4px">ROI: ${roi >= 0 ? '+' : ''}${roi.toFixed(0)}%</div>`
        }
        if (daysOut) html += `<div style="color:rgba(255,255,255,0.5);font-size:12px;margin-top:4px">${formatDate(movie.release_date)} · ${daysOut} days in release</div>`
        return html
      },
    },
    xAxis: {
      type: 'value' as const,
      axisLabel: {
        formatter: (v: number) => {
          if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`
          if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`
          if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`
          return `$${v}`
        },
        color: 'rgba(255,255,255,0.5)',
      },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
    },
    yAxis: {
      type: 'category' as const,
      data: titles,
      axisLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
      axisTick: { show: false },
      axisLine: { show: false },
    },
    series: [
      {
        name: 'Revenue',
        type: 'bar' as const,
        data: revenues,
        z: 2,
        barMaxWidth: 24,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: '#b8860b' },
              { offset: 1, color: '#ffd700' },
            ],
          },
          borderRadius: [0, 3, 3, 0],
        },
        label: {
          show: true,
          position: 'right',
          formatter: (p: { dataIndex: number }) => {
            const idx = p.dataIndex
            return `{roi${idx}|${roiLabels[idx]?.text ?? ''}}`
          },
          color: '#fff',
          rich: richStyles,
        },
      },
      {
        name: 'Budget',
        type: 'bar' as const,
        data: budgets,
        z: 1,
        barMaxWidth: 24,
        barGap: '-100%',
        itemStyle: {
          color: 'rgba(255,255,255,0.15)',
          borderRadius: [0, 3, 3, 0],
        },
        label: { show: false },
      },
    ],
  }

  // Momentum chart
  const momentumOption = {
    backgroundColor: 'transparent',
    textStyle: { color: 'rgba(255,255,255,0.8)', fontFamily: 'Source Sans 3' },
    grid: { left: 170, right: 60, top: 8, bottom: 36 },
    tooltip: {
      ...tooltipStyle,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: { name: string; value: number; dataIndex: number }[]) => {
        const p = params?.[0]
        if (!p) return ''
        const movie = top5Reversed[p.dataIndex]
        const dir = p.value > 0 ? 'Heating' : p.value < 0 ? 'Cooling' : 'Neutral'
        const momentumColor = p.value >= 0 ? '#4caf50' : '#f44336'
        let html = `<div style="font-weight:700;font-size:14px;margin-bottom:6px">${p.name}</div>`
        html += `<div style="color:${momentumColor}">Momentum: ${p.value > 0 ? '+' : ''}${p.value.toFixed(2)} (${dir})</div>`
        if (movie) {
          const rev = movie.revenue ?? 0
          const daysOut = Math.max(1, Math.floor((Date.now() - new Date(movie.release_date).getTime()) / 86_400_000))
          if (rev > 0) html += `<div style="color:rgba(255,255,255,0.6);font-size:12px;margin-top:4px">Velocity: ${formatRevenue(rev / daysOut)}/day avg</div>`
          html += `<div style="color:rgba(255,255,255,0.5);font-size:12px">${daysOut} days in release</div>`
        }
        return html
      },
    },
    xAxis: {
      type: 'value' as const,
      min: -1,
      max: 1,
      axisLabel: {
        color: 'rgba(255,255,255,0.5)',
        formatter: (v: number) => (v === 0 ? '0' : v > 0 ? `+${v}` : `${v}`),
      },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
      name: '\u2190 Cooling \u00b7 Momentum \u00b7 Heating \u2192',
      nameLocation: 'center' as const,
      nameGap: 22,
      nameTextStyle: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
    },
    yAxis: {
      type: 'category' as const,
      data: titles,
      axisLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
      axisTick: { show: false },
      axisLine: { show: false },
    },
    series: [
      {
        type: 'bar' as const,
        data: momentumReversed.map((val) => ({
          value: val,
          itemStyle: {
            color: {
              type: 'linear',
              x: val >= 0 ? 0 : 1,
              y: 0,
              x2: val >= 0 ? 1 : 0,
              y2: 0,
              colorStops:
                val >= 0
                  ? [
                      { offset: 0, color: '#2e7d32' },
                      { offset: 1, color: '#4caf50' },
                    ]
                  : [
                      { offset: 0, color: '#c62828' },
                      { offset: 1, color: '#f44336' },
                    ],
            },
            borderRadius:
              val >= 0 ? [0, 3, 3, 0] : [3, 0, 0, 3],
          },
        })),
        barMaxWidth: 20,
      },
    ],
  }

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        Top 5 Box Office
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        Top 5 of {movies.length} films in theaters &middot; Worldwide gross via
        TMDB
      </Typography>

      <Typography
        variant="subtitle1"
        sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600, mb: 0.5 }}
      >
        Revenue & Profitability
      </Typography>
      <ReactECharts
        option={revenueOption}
        style={{ height: 280 }}
        opts={{ renderer: 'canvas' }}
      />

      <Box sx={{ mt: 2 }}>
        <Typography
          variant="subtitle1"
          sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600, mb: 0.5 }}
        >
          Momentum Tracker
        </Typography>
        <ReactECharts
          option={momentumOption}
          style={{ height: 240 }}
          opts={{ renderer: 'canvas' }}
        />
      </Box>

      <Typography
        variant="caption"
        sx={{
          display: 'block',
          mt: 1,
          fontStyle: 'italic',
          color: 'rgba(255,255,255,0.3)',
        }}
      >
        Revenue figures are cumulative worldwide gross reported by TMDB and may
        lag actual box office by several days. Momentum compares popularity rank
        vs revenue rank.
      </Typography>
    </Paper>
  )
}
