/**
 * @file Studio tokens (bootstrap)
 * @version 1.0.0
 */

export const tokens = {
  font: {
    family: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
  space: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  radius: {
    md: '0.75rem',
  },
  color: {
    bg: '#ffffff',
    fg: '#111827',
    muted: '#6b7280',
    border: '#e5e7eb',
    card: '#f9fafb',
    primary: '#2563eb',
    danger: '#b91c1c',
  },
} as const;
