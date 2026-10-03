'use client'

import type { InputHTMLAttributes, ReactNode } from 'react'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`app-input ${props.className ?? ''}`} />
}

export function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return <div className={`field ${className}`}><label htmlFor={typeof children === 'object' ? undefined : undefined}>{label}</label>{children}</div>
}
