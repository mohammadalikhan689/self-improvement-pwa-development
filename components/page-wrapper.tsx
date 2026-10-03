import type { ReactNode } from 'react'

export function PageWrapper({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`page-wrapper ${className}`}>{children}</div>
}

export function PageScreen({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <main className={`page-screen ${className}`}>{children}</main>
}
