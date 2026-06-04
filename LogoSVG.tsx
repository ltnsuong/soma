// Simple SOMA Logo SVG Component
// Copy this into your App.tsx to use

const SomaLogoCircular = ({ size = 44 }: { size?: number }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <svg width={size} height={size} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="somaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9B8FFE" stopOpacity="1" />
          <stop offset="100%" stopColor="#7B6EF6" stopOpacity="1" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="95" fill="none" stroke="url(#somaGrad)" strokeWidth="2" opacity="0.6"/>
      <circle cx="100" cy="100" r="88" fill="none" stroke="url(#somaGrad)" strokeWidth="1" opacity="0.3"/>

      {/* S - Top Left */}
      <text x="60" y="95" fontSize="56" fontWeight="700" fill="url(#somaGrad)" textAnchor="middle" dominantBaseline="middle">S</text>

      {/* O - Top Right */}
      <text x="140" y="95" fontSize="56" fontWeight="700" fill="url(#somaGrad)" textAnchor="middle" dominantBaseline="middle">O</text>

      {/* M - Bottom Left */}
      <text x="60" y="120" fontSize="56" fontWeight="700" fill="url(#somaGrad)" textAnchor="middle" dominantBaseline="middle">M</text>

      {/* A - Bottom Right */}
      <text x="140" y="120" fontSize="56" fontWeight="700" fill="url(#somaGrad)" textAnchor="middle" dominantBaseline="middle">A</text>

      {/* Center dot */}
      <circle cx="100" cy="107" r="8" fill="url(#somaGrad)" opacity="0.8"/>
      <circle cx="100" cy="107" r="5" fill="url(#somaGrad)"/>
    </svg>
  </View>
)

const SomaLogoGeometric = ({ size = 44 }: { size?: number }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <svg width={size} height={size} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="modernGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9B8FFE" stopOpacity="1" />
          <stop offset="50%" stopColor="#7B6EF6" stopOpacity="1" />
          <stop offset="100%" stopColor="#5A4FD4" stopOpacity="1" />
        </linearGradient>
      </defs>

      {/* Hexagon frame */}
      <polygon points="100,20 160,50 160,150 100,180 40,150 40,50"
               fill="none" stroke="url(#modernGrad)" strokeWidth="2" opacity="0.5"/>

      {/* Center circle */}
      <circle cx="100" cy="100" r="70" fill="none" stroke="url(#modernGrad)" strokeWidth="1.5" opacity="0.3"/>

      {/* S - Top Left */}
      <circle cx="70" cy="70" r="22" fill="none" stroke="url(#modernGrad)" strokeWidth="1.5" opacity="0.6"/>
      <text x="70" y="78" fontSize="42" fontWeight="800" fill="url(#modernGrad)" textAnchor="middle" dominantBaseline="middle">S</text>

      {/* O - Top Right */}
      <circle cx="130" cy="70" r="22" fill="none" stroke="url(#modernGrad)" strokeWidth="1.5" opacity="0.6"/>
      <text x="130" y="78" fontSize="42" fontWeight="800" fill="url(#modernGrad)" textAnchor="middle" dominantBaseline="middle">O</text>

      {/* M - Bottom Left */}
      <circle cx="70" cy="130" r="22" fill="none" stroke="url(#modernGrad)" strokeWidth="1.5" opacity="0.6"/>
      <text x="70" y="138" fontSize="42" fontWeight="800" fill="url(#modernGrad)" textAnchor="middle" dominantBaseline="middle">M</text>

      {/* A - Bottom Right */}
      <circle cx="130" cy="130" r="22" fill="none" stroke="url(#modernGrad)" strokeWidth="1.5" opacity="0.6"/>
      <text x="130" y="138" fontSize="42" fontWeight="800" fill="url(#modernGrad)" textAnchor="middle" dominantBaseline="middle">A</text>

      {/* Center connection */}
      <circle cx="100" cy="100" r="12" fill="url(#modernGrad)" opacity="0.9"/>
      <circle cx="100" cy="100" r="8" fill="url(#modernGrad)"/>
      <circle cx="100" cy="100" r="4" fill="white" opacity="0.7"/>
    </svg>
  </View>
)

// Usage:
// <SomaLogoCircular size={44} />
// <SomaLogoGeometric size={44} />
