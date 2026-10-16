'use client'

import { DehydratedState, HydrationBoundary as TanStackHydrationBoundary } from '@tanstack/react-query'
import { ReactNode } from 'react'

interface HydrationBoundaryProps {
  children: ReactNode
  state: DehydratedState
}

export function HydrationBoundary({ children, state }: HydrationBoundaryProps) {
  return (
    <TanStackHydrationBoundary state={state}>
      {children}
    </TanStackHydrationBoundary>
  )
} 