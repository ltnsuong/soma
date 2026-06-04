import React from 'react'
import { View, SvgUri, StyleSheet } from 'react-native'
import { SvgXml } from 'react-native-svg'

// Inline SVG versions (no file needed)

const SOMA_LOGO_CIRCULAR = `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="somaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#9B8FFE;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7B6EF6;stop-opacity:1" />
    </linearGradient>
    <filter id="somaGlow">
      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <circle cx="100" cy="100" r="95" fill="none" stroke="url(#somaGradient)" stroke-width="2" opacity="0.6"/>
  <circle cx="100" cy="100" r="88" fill="none" stroke="url(#somaGradient)" stroke-width="1" opacity="0.3"/>

  <g filter="url(#somaGlow)">
    <text x="60" y="95" font-family="Arial, sans-serif" font-size="56" font-weight="700" fill="url(#somaGradient)" text-anchor="middle" dominant-baseline="middle">S</text>
    <text x="140" y="95" font-family="Arial, sans-serif" font-size="56" font-weight="700" fill="url(#somaGradient)" text-anchor="middle" dominant-baseline="middle">O</text>
    <text x="60" y="120" font-family="Arial, sans-serif" font-size="56" font-weight="700" fill="url(#somaGradient)" text-anchor="middle" dominant-baseline="middle">M</text>
    <text x="140" y="120" font-family="Arial, sans-serif" font-size="56" font-weight="700" fill="url(#somaGradient)" text-anchor="middle" dominant-baseline="middle">A</text>
  </g>

  <circle cx="100" cy="107" r="8" fill="url(#somaGradient)" opacity="0.8"/>
  <circle cx="100" cy="107" r="5" fill="url(#somaGradient)"/>

  <g stroke="url(#somaGradient)" stroke-width="1.5" fill="none" opacity="0.4">
    <line x1="60" y1="90" x2="100" y2="100" />
    <line x1="140" y1="90" x2="100" y2="100" />
    <line x1="60" y1="125" x2="100" y2="115" />
    <line x1="140" y1="125" x2="100" y2="115" />
  </g>

  <g fill="url(#somaGradient)" opacity="0.5">
    <circle cx="100" cy="20" r="3" />
    <circle cx="180" cy="100" r="3" />
    <circle cx="100" cy="180" r="3" />
    <circle cx="20" cy="100" r="3" />
  </g>
</svg>
`

const SOMA_LOGO_GEOMETRIC = `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="modernGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#9B8FFE;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#7B6EF6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#5A4FD4;stop-opacity:1" />
    </linearGradient>
    <filter id="glow2">
      <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <polygon points="100,20 160,50 160,150 100,180 40,150 40,50"
           fill="none" stroke="url(#modernGradient)" stroke-width="2" opacity="0.5"/>

  <circle cx="100" cy="100" r="70" fill="none" stroke="url(#modernGradient)" stroke-width="1.5" opacity="0.3"/>

  <g filter="url(#glow2)">
    <circle cx="70" cy="70" r="22" fill="none" stroke="url(#modernGradient)" stroke-width="1.5" opacity="0.6"/>
    <text x="70" y="78" font-family="Arial, sans-serif" font-size="42" font-weight="800" fill="url(#modernGradient)" text-anchor="middle" dominant-baseline="middle">S</text>

    <circle cx="130" cy="70" r="22" fill="none" stroke="url(#modernGradient)" stroke-width="1.5" opacity="0.6"/>
    <text x="130" y="78" font-family="Arial, sans-serif" font-size="42" font-weight="800" fill="url(#modernGradient)" text-anchor="middle" dominant-baseline="middle">O</text>

    <circle cx="70" cy="130" r="22" fill="none" stroke="url(#modernGradient)" stroke-width="1.5" opacity="0.6"/>
    <text x="70" y="138" font-family="Arial, sans-serif" font-size="42" font-weight="800" fill="url(#modernGradient)" text-anchor="middle" dominant-baseline="middle">M</text>

    <circle cx="130" cy="130" r="22" fill="none" stroke="url(#modernGradient)" stroke-width="1.5" opacity="0.6"/>
    <text x="130" y="138" font-family="Arial, sans-serif" font-size="42" font-weight="800" fill="url(#modernGradient)" text-anchor="middle" dominant-baseline="middle">A</text>
  </g>

  <circle cx="100" cy="100" r="12" fill="url(#modernGradient)" opacity="0.9" filter="url(#glow2)"/>
  <circle cx="100" cy="100" r="8" fill="url(#modernGradient)"/>
  <circle cx="100" cy="100" r="4" fill="white" opacity="0.7"/>

  <g stroke="url(#modernGradient)" stroke-width="1" fill="none" opacity="0.3">
    <line x1="70" y1="48" x2="100" y2="88" />
    <line x1="130" y1="48" x2="100" y2="88" />
    <line x1="70" y1="152" x2="100" y2="112" />
    <line x1="130" y1="152" x2="100" y2="112" />
  </g>

  <g fill="url(#modernGradient)" opacity="0.4" filter="url(#glow2)">
    <circle cx="100" cy="25" r="2.5" />
    <circle cx="175" cy="100" r="2.5" />
    <circle cx="100" cy="175" r="2.5" />
    <circle cx="25" cy="100" r="2.5" />
    <circle cx="145" cy="55" r="2" opacity="0.3" />
    <circle cx="145" cy="145" r="2" opacity="0.3" />
    <circle cx="55" cy="145" r="2" opacity="0.3" />
    <circle cx="55" cy="55" r="2" opacity="0.3" />
  </g>
</svg>
`

// Logo component with different size options
type LogoStyle = 'circular' | 'geometric'
type LogoSize = 'sm' | 'md' | 'lg' | 'xl'

interface LogoProps {
  style?: LogoStyle
  size?: LogoSize
  color?: string
}

const sizeMap = {
  sm: 60,
  md: 100,
  lg: 150,
  xl: 200
}

export const SomaLogo = ({ style = 'circular', size = 'md' }: LogoProps) => {
  const width = sizeMap[size]
  const svg = style === 'geometric' ? SOMA_LOGO_GEOMETRIC : SOMA_LOGO_CIRCULAR

  return (
    <View style={[styles.container, { width, height: width }]}>
      <SvgXml xml={svg} width={width} height={width} />
    </View>
  )
}

// Alternative: Logo with animation (pulsing glow effect)
export const SomaLogoAnimated = ({ style = 'circular', size = 'md' }: LogoProps) => {
  const width = sizeMap[size]
  const svg = style === 'geometric' ? SOMA_LOGO_GEOMETRIC : SOMA_LOGO_CIRCULAR

  return (
    <View style={[styles.container, { width, height: width }]}>
      <SvgXml xml={svg} width={width} height={width} />
    </View>
  )
}

// Simple logo text version (minimal)
export const SomaLogoText = ({ size = 'md' }: { size?: LogoSize }) => {
  const fontSizeMap = { sm: 24, md: 36, lg: 48, xl: 64 }
  return (
    <View style={styles.textLogo}>
      <Text style={[styles.logoText, { fontSize: fontSizeMap[size] }]}>✦</Text>
      <Text style={[styles.logoText, { fontSize: fontSizeMap[size] * 0.6, marginTop: -8 }]}>SOMA</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  textLogo: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  logoText: {
    fontWeight: '700',
    color: '#7B6EF6',
    letterSpacing: 2
  }
})
