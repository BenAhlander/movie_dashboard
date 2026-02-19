import { neon } from '@neondatabase/serverless'

export function getDb() {
  const databaseUrl = process.env.POSTGRES_URL
  if (!databaseUrl) {
    throw new Error('POSTGRES_URL environment variable is not set')
  }
  return neon(databaseUrl)
}

export function hasDatabase(): boolean {
  return !!process.env.POSTGRES_URL
}
