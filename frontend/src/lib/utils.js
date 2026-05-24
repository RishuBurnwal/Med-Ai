import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...classes) {
  return twMerge(clsx(classes))
}

export function initials(name = 'MedAI User') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'MU'
}

export function formatDate(value, options = {}) {
  if (!value) return 'Not recorded'
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: options.dateStyle || 'medium',
    timeStyle: options.timeStyle,
    timeZone: options.timeZone
  }).format(new Date(value))
}

export function normalizeList(value) {
  if (Array.isArray(value)) return value
  if (!value) return []
  return String(value).split(',').map((item) => item.trim()).filter(Boolean)
}
