// What Soma heard, shown back at the end of the first conversation.
//
// The close is what people remember (peak-end), and this is the payoff the
// opening promised: proof that talking produced something, before we ask for
// anything else. Deliberately shows the gaps too — the empty domains are what
// Soma will ask about over the following days, so they are a promise, not a
// failure.
//
// Takes plain props, never UserProfile, so it cannot import App.tsx.
import React from 'react'
import { View, Text } from 'react-native'
import { DOMAINS, type DomainKey } from '../../shared/domains'

export interface OverviewFacts {
  age?: number
  heightCm?: number
  city?: string
  job?: string
  hobbies?: string[]
}

const Chip = ({ label, color, filled }: { label: string; color: string; filled: boolean }) => (
  <View style={{
    paddingHorizontal: 11, paddingVertical: 6, borderRadius: 14,
    backgroundColor: filled ? color + '22' : 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: filled ? color + '66' : 'rgba(168,155,250,0.14)',
  }}>
    <Text style={{
      fontSize: 12, fontWeight: '700',
      color: filled ? '#E8E5FF' : 'rgba(168,155,250,0.35)',
    }}>{label}</Text>
  </View>
)

const Row = ({ label, value }: { label: string; value: string }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 }}>
    <Text style={{ fontSize: 13, color: 'rgba(168,155,250,0.5)' }}>{label}</Text>
    <Text style={{ fontSize: 13, color: '#E8E5FF', fontWeight: '600', flexShrink: 1, textAlign: 'right' }}>{value}</Text>
  </View>
)

const cmToFeet = (cm: number) => {
  const inches = Math.round(cm / 2.54)
  return `${Math.floor(inches / 12)}'${inches % 12}"`
}

// Only the facts we actually have, in a fixed order. Kept out of the component
// so the component stays inside the complexity budget.
export const factRows = (f: OverviewFacts): [string, string][] => {
  const out: [string, string][] = []
  if (f.age) out.push(['Age', String(f.age)])
  if (f.heightCm) out.push(['Height', `${f.heightCm} cm · ${cmToFeet(f.heightCm)}`])
  if (f.job) out.push(['Work', f.job])
  if (f.city) out.push(['Lives in', f.city])
  return out
}

export function ProfileOverview({ name, facts, covered, people }: {
  name: string
  facts: OverviewFacts
  covered: DomainKey[]
  people: string[]
}) {
  const known = new Set(covered)
  const rows = factRows(facts)

  return (
    <View style={{
      width: '100%', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 20,
      borderWidth: 1, borderColor: 'rgba(123,110,246,0.22)', marginBottom: 20,
    }}>
      <Text style={{
        fontSize: 11, fontWeight: '800', color: '#7B6EF6',
        letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 4,
      }}>What I heard</Text>
      <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 16, letterSpacing: -0.4 }}>
        {name || 'You'}
      </Text>

      {rows.length > 0 && (
        <View style={{ marginBottom: 16 }}>
          {rows.map(([l, v]) => <Row key={l} label={l} value={v} />)}
        </View>
      )}

      {!!facts.hobbies?.length && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 12, color: 'rgba(168,155,250,0.5)', marginBottom: 8 }}>For you</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {facts.hobbies.slice(0, 6).map(h => (
              <Chip key={h} label={h} color="#F6A86E" filled />
            ))}
          </View>
        </View>
      )}

      {people.length > 0 && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 12, color: 'rgba(168,155,250,0.5)', marginBottom: 8 }}>
            People you mentioned
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {people.slice(0, 8).map(n => <Chip key={n} label={n} color="#7B6EF6" filled />)}
          </View>
        </View>
      )}

      <Text style={{ fontSize: 12, color: 'rgba(168,155,250,0.5)', marginBottom: 8 }}>
        Your life areas — {known.size} of {DOMAINS.length} so far
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {DOMAINS.map(d => (
          <Chip key={d.key} label={`${d.icon} ${d.label}`} color={d.color} filled={known.has(d.key)} />
        ))}
      </View>

      {known.size < DOMAINS.length && (
        <Text style={{ fontSize: 12, color: 'rgba(168,155,250,0.45)', lineHeight: 18, marginTop: 12 }}>
          The dim ones I&apos;ll ask about as we go. No rush.
        </Text>
      )}
    </View>
  )
}
