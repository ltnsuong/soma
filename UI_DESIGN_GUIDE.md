# 🎨 SOMA Premium UI Design Guide

## Design Philosophy

Create a **premium, modern dating app** with:
- Smooth animations & micro-interactions
- Gradient backgrounds & glassmorphism
- Better visual hierarchy
- Premium typography
- Delightful user experience

---

## 1. Color Palette (Enhanced)

### Primary Colors
- **Purple Gradient**: `#7B6EF6` → `#5A4FD4` (primary brand)
- **Pink Gradient**: `#F6379B` → `#D41E6D` (romantic/matches)
- **Cyan Gradient**: `#6ECFF6` → `#0A8FD4` (info/secondary)
- **Green Gradient**: `#6EF6A8` → `#0FD49F` (positive/success)
- **Orange Gradient**: `#F6A86E` → `#D47D2E` (attention/action)

### Neutral Colors
- **Dark Background**: `#0C0C0F` (base)
- **Card Background**: `#141418` (elevated)
- **Border Dark**: `#1A1A22` (subtle dividers)
- **Text Light**: `#F5F4F0` (primary text)
- **Text Secondary**: `#A5A3B0` (secondary text)

---

## 2. Typography (Premium Hierarchy)

### Font Sizes
```
Display: 44px bold (dating profile names)
Heading: 28px bold (screen titles)
Title: 20px bold (section headers)
Body Large: 16px regular (content)
Body: 15px regular (descriptions)
Caption: 13px regular (meta info)
Small: 12px regular (labels)
```

### Font Weights
- **700 Bold**: Headlines, buttons
- **600 Semibold**: Labels, secondary titles
- **500 Medium**: Important text
- **400 Regular**: Body text

### Letter Spacing
- Headlines: +0.5px (open, elegant)
- Labels: +1.2px (premium feel)
- Body: 0px (readable)

---

## 3. Animations & Transitions

### Button Press Feedback
```typescript
// Scale down on press, spring back
onPressIn: scale 0.95
onPressOut: spring scale 1.0
duration: 200ms
```

### Screen Transitions
- **Fade In**: 300ms ease-out
- **Slide Up**: 300ms cubic-bezier(0.4, 0, 0.2, 1)
- **Scale In**: 300ms with spring

### Card Hover/Interaction
- **Lift on Press**: translateY(-2px)
- **Shadow Increase**: shadowMd → shadowLg
- **Duration**: 200ms

### Micro-animations
- **Typing Indicator**: Pulsing dots (1.4s loop)
- **Like Heart**: Pop animation (+20% scale, 400ms)
- **Match Confetti**: Staggered fade-in
- **Profile Photo**: Smooth parallax scroll

---

## 4. Component Styles

### Buttons

**Primary Button**
- Gradient: `#7B6EF6 → #5A4FD4`
- Height: 56px
- Border-radius: 16px
- Shadow: shadowMd
- Border: 1px solid rgba(155,143,254,0.3) (subtle highlight)
- Text: White, bold, letter-spaced

**Secondary Button**
- Background: `#141418`
- Border: 1.5px solid `#7B6EF640`
- Height: 52px
- Text: `#7B6EF6`, bold

**Icon Button (Circular)**
- Size: 46x46px
- Border-radius: 23px
- Background: `#141418`
- On Press: Scale 0.9, shadow increases
- On Hover: Background lightens

### Cards

**Premium Card Style**
- Background: `#141418`
- Border: 1.5px solid `#7B6EF640`
- Border-radius: 20px
- Shadow: shadowMd
- Left border accent: 4px colored left border
- Gradient overlay: Subtle `rgba(color, 0.05)` 45° angle
- Padding: 18-24px
- Hover: lift effect (+4px translateY)

**Dating Profile Card**
- Full-bleed image (540px height)
- Gradient overlay: `rgba(0,0,0,0.6)` to `rgba(0,0,0,0.1)`
- Content positioned at bottom with padding
- Score badge: Positioned top-right
- Name/age overlay with white text
- Smooth parallax on scroll

### Input Fields

**Premium Input**
- Background: `#141418`
- Border: 1.5px solid `#2A2A35`
- Border-radius: 14px
- Padding: 14px 16px
- Focus state: Border color → `#7B6EF6`, shadow: shadowSm
- Placeholder: `#6A6A76`
- Text: `#F5F4F0`

---

## 5. Spacing System (8px base unit)

```
xs: 4px
sm: 8px
md: 12px
lg: 16px
xl: 20px
2xl: 24px
3xl: 32px
```

### Screen Padding
- Horizontal: 20-24px
- Top: 60px (with header)
- Bottom: 40-60px

### Section Spacing
- Between sections: 28-32px
- Between items: 12-16px
- Within components: 8-12px

---

## 6. Visual Hierarchy & Depth

### Shadow Levels
```typescript
shadowSm: offset 2px, opacity 15%, blur 4px (subtle cards)
shadowMd: offset 8px, opacity 20%, blur 12px (elevated cards)
shadowLg: offset 16px, opacity 25%, blur 20px (modals)
```

### Elevation States
1. **Flat**: No shadow (text, labels)
2. **Raised**: shadowSm (input fields, small buttons)
3. **Elevated**: shadowMd (cards, main buttons)
4. **Floating**: shadowLg (modals, overlays)

### Focus Hierarchy
- Primary action: Most visible, largest shadow
- Secondary action: Smaller, less color contrast
- Tertiary action: Ghost button (outline only)

---

## 7. Glassmorphism Effects

### Frosted Glass Cards
```css
background: rgba(20, 20, 24, 0.7);
backdrop-filter: blur(10px);
border: 1px solid rgba(255, 255, 255, 0.1);
border-radius: 16px;
```

### Blur Backgrounds
- **Modals**: Background blur 4-8px
- **Headers**: Subtle blur on scroll
- **Floating Elements**: No blur (stands out)

---

## 8. Match Screen (Premium Design)

### Profile Photo
- Full-bleed, 100% viewport width
- Aspect ratio: 9:16 (mobile standard)
- Smooth fade overlay (top to bottom)
- Parallax scroll effect
- Status badge: Top-right corner

### Profile Details
- Slide up from bottom on tap
- Smooth animation (300ms)
- Content cards with left accent border
- Better typography hierarchy
- Color-coded sections

### Action Buttons
- Bottom fixed bar
- Gradient backgrounds (pass: white, like: pink)
- Larger hit targets (60px height)
- Spring animation on press
- Icon only (👋 and ❤️)

---

## 9. Chat Interface

### Message Bubbles
- **Assistant**: `#141418` bg, `#7B6EF640` border
- **User**: `#2A2060` bg (dark purple), `#7B6EF650` border
- Border-radius: 18px
- Padding: 13px 16px
- Shadow: shadowSm
- Max width: 74%

### Typing Indicator
- Three pulsing dots
- Animation: 1.4s loop
- Scale: 0.6x → 1.0x → 0.6x

---

## 10. Animations Implementation

### Quick (200ms)
- Button press feedback
- Icon state changes
- Loading spinners

### Normal (300ms)
- Screen transitions
- Card animations
- Page fades

### Smooth (500ms)
- Page swipes
- Bottom sheet slides
- Complex transitions

---

## 11. Mobile-First Responsive

### Breakpoints
- **Mobile**: < 425px (primary)
- **Tablet**: 425px - 768px
- **Desktop**: > 768px

### Adjustments
- Button height: 56px mobile, 48px tablet
- Card padding: 18px mobile, 20px tablet
- Font sizes: -1-2px tablet
- Spacing: Proportional scaling

---

## 12. Accessibility

### Color Contrast
- Text: 4.5:1 minimum (WCAG AA)
- Interactive elements: 3:1
- Border visibility: Sufficient contrast

### Focus States
- All interactive elements: Focus ring `#7B6EF6` 2px
- Visible focus indicator
- Keyboard navigation support

### Touch Targets
- Minimum 48x48px for buttons
- Minimum 44x44px for icons
- Adequate spacing (8px min gap)

---

## 13. Premium UI Checklist

- ✅ Gradient overlays on cards
- ✅ Smooth animations on interactions
- ✅ Glassmorphism effects
- ✅ Better typography hierarchy
- ✅ Micro-interactions (press feedback)
- ✅ Elevation system with shadows
- ✅ Premium spacing & padding
- ✅ Color-coded sections
- ✅ Smooth transitions between screens
- ✅ Accessible focus states
- ✅ Mobile-first responsive
- ✅ Consistent border styling
- ✅ Letter-spacing on headlines
- ✅ Better visual hierarchy

---

## 14. Implementation Priority

### Phase 1 (Quick Wins)
1. Add gradient overlays to cards
2. Enhance button styling with borders
3. Improve typography spacing
4. Better shadow hierarchy

### Phase 2 (Animations)
1. Button press feedback animations
2. Screen transition animations
3. Micro-interactions (like button pop)
4. Typing indicator enhancement

### Phase 3 (Polish)
1. Glassmorphism effects
2. Better parallax on photos
3. Advanced micro-interactions
4. Accessibility refinements

---

## Code Example: Premium Card

```typescript
const premiumCard = {
  backgroundColor: '#141418',
  borderRadius: 20,
  borderWidth: 1.5,
  borderColor: '#7B6EF640',
  borderLeftWidth: 4,
  borderLeftColor: '#7B6EF6',
  padding: 18,
  marginBottom: 28,
  ...shadowMd,
  // Gradient overlay
  backgroundImage: 'linear-gradient(135deg, rgba(123,110,246,0.05) 0%, rgba(123,110,246,0) 100%)'
}

// Animated Press
const animatedPress = () => {
  const scale = useRef(new Animated.Value(1)).current
  
  const onPressIn = () => Animated.spring(scale, { 
    toValue: 0.95, 
    useNativeDriver: true 
  }).start()
  
  const onPressOut = () => Animated.spring(scale, { 
    toValue: 1, 
    useNativeDriver: true 
  }).start()
  
  return { scale, onPressIn, onPressOut }
}
```

---

**Remember**: Premium design is about subtle details, smooth animations, and visual polish. Each interaction should feel responsive and delightful! ✨
