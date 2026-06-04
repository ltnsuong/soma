# 🎨 SOMA Logo - Complete Guide

## Two Logo Styles Available

### **Style 1: Circular**
- **Best for**: App icon, headers, branding
- **Feel**: Warm, welcoming, connection-focused
- **Design**: 4 letters arranged in a circle with connecting center point
- **File**: `soma-logo.svg`

![Circular Logo Preview]
- Letters: S, O, M, A in a circle
- Center: Unified connection point
- Vibe: Friendly, holistic, whole

### **Style 2: Geometric**
- **Best for**: Modern apps, tech-forward branding
- **Feel**: Contemporary, professional, sophisticated
- **Design**: 4 letters in circles within a hexagon
- **File**: `soma-logo-geometric.svg`

![Geometric Logo Preview]
- Letters: S, O, M, A in 2x2 grid
- Frame: Hexagonal boundary
- Vibe: Modern, structured, premium

---

## Using the Logo in Your App

### **Option 1: React Component (Recommended)**

```tsx
import { SomaLogo } from './components/LogoComponent'

// In your screen components:
<SomaLogo style="circular" size="lg" />
<SomaLogo style="geometric" size="md" />
```

### **Option 2: Direct SVG File**

```tsx
import { SvgUri } from 'react-native-svg'

<SvgUri uri={require('./soma-logo.svg')} width={100} height={100} />
```

### **Option 3: Inline SVG**

```tsx
import { SvgXml } from 'react-native-svg'

const logoSvg = `<svg>...</svg>`
<SvgXml xml={logoSvg} width={100} height={100} />
```

---

## Logo Sizes

```
sm   = 60px   (icons, badges)
md   = 100px  (headers, nav)
lg   = 150px  (screens, hero)
xl   = 200px  (splash screen, app icon)
```

### Usage Examples

```tsx
// Small icon in navigation
<SomaLogo style="circular" size="sm" />

// Medium header logo
<SomaLogo style="geometric" size="md" />

// Large hero on splash screen
<SomaLogo style="circular" size="lg" />

// Extra large app icon
<SomaLogo style="geometric" size="xl" />
```

---

## Where to Use the Logo

### 🏠 **Home Screen**
```tsx
<View style={g.header}>
  <SomaLogo style="circular" size="md" />
  <Text style={g.greeting}>Welcome back!</Text>
</View>
```

### 💬 **Aura/Chat Header**
```tsx
<View style={g.header}>
  <SomaLogo style="circular" size="sm" />
  <View>
    <Text style={g.auraTitle}>Chat with Soma</Text>
  </View>
</View>
```

### 🎯 **Splash/Welcome Screen**
```tsx
<View style={g.centerWrap}>
  <SomaLogo style="geometric" size="xl" />
  <Text style={g.startTitle}>SOMA</Text>
  <Text style={g.startSub}>Your AI life companion</Text>
</View>
```

### 👥 **Circle Header**
```tsx
<View style={g.header}>
  <SomaLogo style="circular" size="md" />
  <Text style={g.auraTitle}>Your Circle</Text>
</View>
```

### 💕 **Dating Header**
```tsx
<View style={g.header}>
  <SomaLogo style="geometric" size="md" />
  <Text style={g.auraTitle}>Meet New People</Text>
</View>
```

### 🔧 **Settings**
```tsx
<View style={g.header}>
  <SomaLogo style="circular" size="sm" />
  <Text style={g.auraTitle}>Settings</Text>
</View>
```

---

## Logo Colors

### Default
- **Gradient**: #9B8FFE → #7B6EF6 → #5A4FD4
- **Works on**: Dark backgrounds (#0C0C0F, #141418)

### Customization

You can override the gradient in the SVG:

```tsx
// Create a variant with different colors
const customLogoSvg = logoSvg.replace(
  '#7B6EF6',
  '#F6379B' // Pink version for special sections
)
```

---

## Logo Variations

### Light Background
```tsx
// If you ever need logo on light background
const lightLogoSvg = `
  <svg>
    <defs>
      <linearGradient>
        <stop color="#5A4FD4" />
        <stop color="#3D3EB8" />
      </linearGradient>
    </defs>
  </svg>
`
```

### White/Transparent
```tsx
// For dark backgrounds, logo is already perfect
// For white backgrounds, make gradient darker
// For transparent use, white outline version works
```

---

## Integration Examples

### Full Header with Logo

```tsx
function ScreenHeader({ title }: { title: string }) {
  return (
    <View style={[g.header, { gap: 16 }]}>
      <SomaLogo style="circular" size="sm" />
      <View style={{ flex: 1 }}>
        <Text style={g.auraTitle}>{title}</Text>
        <Text style={g.auraSub}>Your AI companion</Text>
      </View>
    </View>
  )
}

// Usage
<ScreenHeader title="Soma" />
```

### Loading Screen with Animated Logo

```tsx
function LoadingScreen() {
  return (
    <View style={g.centerWrap}>
      <SomaLogo style="geometric" size="xl" />
      <Text style={g.startSub}>Loading your life...</Text>
      <LoadingSpinner />
    </View>
  )
}
```

### App Icon (Best Practice)

```tsx
// For app icon, use the geometric style at xl size
// Export as:
// - 192x192px PNG (Android)
// - 180x180px PNG (iOS)
// - 512x512px PNG (Web)

function AppIcon() {
  return <SomaLogo style="geometric" size="xl" />
}
```

---

## Design Principles

### ✨ **Logo Characteristics**

1. **Recognizable**: 4 letters form distinct shapes
2. **Scalable**: Works at any size (60px - 512px)
3. **Professional**: Modern, clean geometry
4. **Brand-aligned**: Matches app's purple palette
5. **Versatile**: Works on dark and light backgrounds
6. **Memorable**: Simple but distinctive

### 📐 **Geometry Meaning**

- **Circle (Style 1)**: Unity, wholeness, connection
- **Hexagon (Style 2)**: Balance, structure, wellness
- **Center dot**: You at the heart of SOMA
- **Connecting lines**: Relationships and growth

---

## Export Instructions

### For Web/App Icon

1. Open `soma-logo-geometric.svg` in design tool
2. Export as PNG at these sizes:
   - 192x192px (Android icon)
   - 180x180px (iOS icon)
   - 512x512px (Web icon)
   - 1024x1024px (App store)

### For Print

1. Export as PDF (vector, scalable)
2. Can be printed at any size
3. Gradient looks great on white or dark backgrounds

### For Social Media

1. 1200x1200px PNG (square)
2. 500x500px PNG (small)
3. Circular crop for profile pictures

---

## Color Variations

### Primary (Current)
```
Start: #9B8FFE (light purple)
Mid: #7B6EF6 (brand purple)
End: #5A4FD4 (dark purple)
```

### Alternative - Sunset
```
Start: #FFB347 (orange)
Mid: #FF7F50 (coral)
End: #FF6347 (tomato)
```

### Alternative - Ocean
```
Start: #87CEEB (sky blue)
Mid: #4A90E2 (blue)
End: #0A3F7B (navy)
```

### Alternative - Growth
```
Start: #90EE90 (light green)
Mid: #6EF6A8 (green)
End: #0FD49F (teal)
```

---

## Testing the Logo

### Checklist

- ✅ Looks good at sm size (60px)
- ✅ Readable at md size (100px)
- ✅ Professional at lg size (150px)
- ✅ Bold at xl size (200px)
- ✅ Works on dark backgrounds
- ✅ Gradient is smooth
- ✅ No pixelation when scaled
- ✅ Center elements are crisp
- ✅ Text is readable alongside
- ✅ Colors match brand palette

---

## Quick Copy-Paste Code

### Add to Home Screen Header
```tsx
// In Home screen, find the header
<View style={g.header}>
  <SomaLogo style="circular" size="md" />
  <View style={{ flex: 1 }}>
    <Text style={g.greeting}>Welcome to SOMA</Text>
  </View>
</View>
```

### Add to Welcome/Splash Screen
```tsx
<View style={g.centerWrap}>
  <SomaLogo style="geometric" size="xl" />
  <Text style={[g.startTitle, { marginTop: 24 }]}>SOMA</Text>
  <Text style={g.startSub}>Your AI companion for life, relationships & growth</Text>
  <TouchableOpacity style={g.primaryBtn} onPress={onStart}>
    <Text style={g.primaryBtnTxt}>✦  Get Started</Text>
  </TouchableOpacity>
</View>
```

### Add to Settings
```tsx
<View style={[g.header, { marginBottom: 24 }]}>
  <SomaLogo style="circular" size="sm" />
  <Text style={g.greeting}>Settings</Text>
</View>
```

---

## Next Steps

1. **Choose a style**: Circular (warm) or Geometric (modern)?
2. **Add to screens**: Update headers with the logo
3. **Test sizing**: Make sure it looks good in your app
4. **Export icon**: Create app icon from geometric version
5. **Deploy**: Ship with professional branding

---

## Files

- `soma-logo.svg` - Circular style (main)
- `soma-logo-geometric.svg` - Geometric style (alternative)
- `components/LogoComponent.tsx` - React component

---

**Your SOMA logo is ready! 🎉 It perfectly represents your app's mission: connection, growth, and wholeness.** ✨
