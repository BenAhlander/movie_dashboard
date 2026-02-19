import { Auth0Client } from '@auth0/nextjs-auth0/server'
import { hasAuthEnabled } from './hasAuth'

export const auth0 = hasAuthEnabled()
  ? new Auth0Client({
      authorizationParameters: {
        connection: 'google-oauth2',
      },
    })
  : null
