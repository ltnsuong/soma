// The ten life areas the Wheel of Life is built from. Pure data with no
// dependencies, which is why this is the first thing to leave App.tsx: every
// feature module needs DomainKey, and importing it from App.tsx would make a cycle.
export const DOMAINS = [
  { key: 'health',       label: 'Health',  icon: '❤️',  color: '#F66E8E' },
  { key: 'career',       label: 'Career',  icon: '💼',  color: '#6E8BF6' },
  { key: 'finance',      label: 'Finance', icon: '💰',  color: '#6EF6A8' },
  { key: 'relationship', label: 'Love',    icon: '💞',  color: '#7B6EF6' },
  { key: 'family',       label: 'Family',  icon: '👨‍👩‍👧', color: '#F6C26E' },
  { key: 'growth',       label: 'Growth',  icon: '🌱',  color: '#6EE6C0' },
  { key: 'hobby',        label: 'Fun',     icon: '🎨',  color: '#F6A86E' },
  { key: 'purpose',      label: 'Purpose', icon: '🎯',  color: '#6ECFF6' },
  { key: 'mind',         label: 'Mind',    icon: '🧘',  color: '#A89BFA' },
  { key: 'environment',  label: 'Home',    icon: '🏡',  color: '#C9A0F6' },
] as const
export type DomainKey = typeof DOMAINS[number]['key']
