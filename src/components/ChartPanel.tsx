'use client'

import { useMemo } from 'react'
import { Box, Paper, Typography } from '@mui/material'
import ReactECharts from 'echarts-for-react'
import type { MovieListItem } from '@/types'
import { scalePopularityToHype, audienceScorePercent } from '@/utils/scoreScaling'

interface ChartPanelProps {
  movies: MovieListItem[]
  loading?: boolean
}

const chartBase = {
  backgroundColor: 'transparent',
  textStyle: { color: 'rgba(255,255,255,0.8)', fontFamily: 'Source Sans 3' },
  grid: { left: 60, right: 24, top: 24, bottom: 40 },
}

export function ChartPanel({ movies, loading }: ChartPanelProps) {
  const topByMomentum = useMemo(
    () =>
      [...movies]
        .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
        .slice(0, 12),
    [movies],
  )

  const scatterData = useMemo(
    () =>
      movies.map((m) => [
        scalePopularityToHype(m.popularity ?? 0),
        audienceScorePercent(m.vote_average),
        Math.min(100, Math.max(10, Math.sqrt(m.vote_count ?? 0) / 3)),
        m.title,
      ]),
    [movies],
  )

  const barOption = {
    ...chartBase,
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(20,20,20,0.95)',
      borderColor: 'rgba(229,9,20,0.5)',
      textStyle: { color: '#fff' },
      formatter: (params: { name: string; value: number }[]) => {
        const p = params?.[0]
        return p ? `${p.name}<br/>Momentum (popularity): ${(p.value ?? 0).toFixed(1)}` : ''
      },
    },
    xAxis: {
      type: 'category' as const,
      data: topByMomentum.map((m) => m.title.length > 18 ? m.title.slice(0, 17) + '…' : m.title),
      axisLabel: { rotate: 35, fontSize: 10 },
    },
    yAxis: { type: 'value' as const, name: 'Popularity', nameTextStyle: { color: 'rgba(255,255,255,0.6)' } },
    series: [
      {
        type: 'bar' as const,
        data: topByMomentum.map((m) => m.popularity ?? 0),
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#e50914' },
              { offset: 1, color: '#8b0000' },
            ],
          },
        },
        emphasis: { itemStyle: { color: '#ff6b6b' } },
      },
    ],
  }

  const scatterOption = {
    ...chartBase,
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(20,20,20,0.95)',
      borderColor: 'rgba(229,9,20,0.5)',
      formatter: (p: { data: (number | string)[] }) =>
        `${p.data[3]}<br/>Hype: ${p.data[0]} · Score: ${p.data[1]}%<br/>Vote count → bubble size`,
    },
    xAxis: { type: 'value' as const, name: 'Hype (Momentum proxy)', nameTextStyle: { color: 'rgba(255,255,255,0.6)' } },
    yAxis: { type: 'value' as const, name: 'Audience Score %', nameTextStyle: { color: 'rgba(255,255,255,0.6)' } },
    series: [
      {
        type: 'scatter' as const,
        symbolSize: (val: number[]) => val[2],
        data: scatterData,
        itemStyle: {
          color: 'rgba(229,9,20,0.7)',
          borderColor: 'rgba(255,255,255,0.3)',
          borderWidth: 1,
        },
        emphasis: { itemStyle: { color: '#e50914', borderColor: '#fff' } },
      },
    ],
  }

  const histData = useMemo(() => {
    const scoreCounts = new Map<number, number>()
    movies.forEach((m) => {
      const bucket = Math.floor(audienceScorePercent(m.vote_average) / 10) * 10
      scoreCounts.set(bucket, (scoreCounts.get(bucket) || 0) + 1)
    })
    return [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((b) => scoreCounts.get(b) ?? 0)
  }, [movies])

  const histOption = {
    ...chartBase,
    tooltip: {
      trigger: 'axis',
      formatter: (params: { name: string; value: number }[]) =>
        `Score range ${params?.[0]?.name ?? ''}: ${params?.[0]?.value ?? 0} titles`,
    },
    xAxis: {
      type: 'category' as const,
      data: ['0-9', '10-19', '20-29', '30-39', '40-49', '50-59', '60-69', '70-79', '80-89', '90-100'],
    },
    yAxis: { type: 'value' as const, name: 'Count' },
    series: [
      {
        type: 'bar' as const,
        data: histData,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(229,9,20,0.3)' },
              { offset: 1, color: 'rgba(229,9,20,0.8)' },
            ],
          },
        },
      },
    ],
  }

  if (loading || !movies.length) {
    return (
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography color="text.secondary">Charts will appear when data is loaded.</Typography>
      </Paper>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Top titles by Momentum (popularity proxy)
        </Typography>
        <ReactECharts option={barOption} style={{ height: 320 }} opts={{ renderer: 'canvas' }} />
      </Paper>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Audience Score vs Momentum (bubble = vote count)
        </Typography>
        <ReactECharts option={scatterOption} style={{ height: 320 }} opts={{ renderer: 'canvas' }} />
      </Paper>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Score distribution
        </Typography>
        <ReactECharts option={histOption} style={{ height: 240 }} opts={{ renderer: 'canvas' }} />
      </Paper>
    </Box>
  )
}
