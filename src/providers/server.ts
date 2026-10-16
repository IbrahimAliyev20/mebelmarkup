import { QueryClient } from '@tanstack/react-query'

export function createServerQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    },
  })
}

// Get a server query client instance
export function getServerQueryClient() {
  return createServerQueryClient()
} 