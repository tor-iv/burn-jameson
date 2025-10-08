Create a mobile-first web application for an AR whiskey marketing campaign called "Burn That Ad" by Keeper's Heart Whiskey.

**BRAND DESIGN SYSTEM:**

Colors:
- Primary: Deep whiskey amber (#B8860B, #CD853F)
- Secondary: Creamy white (#FFF8DC)
- Accent: Emerald green (#2C5F2D), Copper (#B87333)
- Dark: Charcoal (#2C2C2C), Black (#000000)
- Background: Soft charred oak tone (#F5F5DC with subtle wood texture)

Typography:
- Headlines: Playfair Display (serif, elegant, bold)
- Body: Inter or Open Sans (sans-serif, clean)
- Generous line spacing (1.6-1.8)
- Large headlines (32-48px mobile, 48-72px desktop)

**SCREENS TO BUILD:**

1. **Age Gate Screen**
   - Full-screen modal overlay (dark charcoal #2C2C2C background)
   - Centered Keeper's Heart logo (150px wide)
   - Headline: "Burn That Ad" in Playfair Display, 48px
   - Subheadline: "Turn competitor ads into Keeper's Heart rewards"
   - Two large rounded buttons: "YES, I'M 21+" (amber #B8860B), "NO, EXIT" (outlined)
   - Small legal text at bottom
   - Amber gradient glow behind headline

2. **Campaign Intro / How It Works**
   - Sticky header: Logo left, hamburger menu right
   - Hero section: 
     - Headline: "Discover Hidden Whiskey" (Playfair, 40px)
     - Decorative underline (amber, 4px)
   - Three-step process with icons:
     - 📸 Scan Any Jameson Ad
     - 🔥 Watch It Transform  
     - 🎁 Get Your Reward
   - Each step: Icon (copper/emerald, 64px), title (24px bold), description (16px)
   - Large CTA button at bottom: "START SCANNING" (amber, rounded, 20px padding)
   - Subtle wood grain texture overlay on background (5% opacity)
   - Ample whitespace between sections (80px margins)

3. **AR Camera View**
   - Full-screen camera viewport
   - Minimal UI overlays:
     - Top-left: Exit button (× white, 40px)
     - Center: Scanning indicator (pulsing amber circle, 100px)
     - Scanning text: "Point camera at any Jameson advertisement"
     - Bottom bar: Translucent charcoal (#2C2C2C80)
       - "Ads Burned: 3 🔥" counter
       - "View My Coupons" button
   - Dark gradient vignette on edges

4. **Coupon Reveal Screen**
   - Cream background (#FFF8DC)
   - Top: Celebration header "🎉 Success! 🎉" (32px)
   - Product image: Keeper's Heart bottle (300px height, centered, amber gradient background)
   - Headline: "You've Unlocked" (Playfair, 28px)
   - Offer: "$5 OFF" (bold, 48px, amber color)
   - Subtext: "Any Keeper's Heart Whiskey"
   - Coupon card (white, rounded, shadow):
     - Label: "YOUR COUPON CODE:"
     - Code: "KH-A7D9F2E1" (monospace, 24px, bold)
     - Copy button (amber, 16px padding)
   - Expiration date (14px, gray)
   - Two CTAs: 
     - Primary: "FIND RETAILERS" (amber, full-width)
     - Secondary: "SCAN AGAIN" (outlined, full-width)
   - Social share section: "Share Your Win 📱" with icon buttons

**COMPONENT FEATURES:**

Buttons:
- Rounded corners (12px border-radius)
- Generous padding (16px vertical, 32px horizontal)
- Hover: Slight color shift + subtle shadow
- Primary: Amber (#B8860B) with white text
- Secondary: Outlined (2px amber border) with amber text

Cards:
- White background
- Subtle shadow (0 4px 12px rgba(0,0,0,0.1))
- Rounded corners (16px)
- 24px padding

Animations:
- Fade-in transitions for modals (300ms ease)
- Pulsing animation for scanning indicator
- Confetti burst on coupon reveal (brief, 2s)
- Smooth page transitions

Responsive:
- Mobile-first design
- Breakpoints: 640px, 768px, 1024px
- Stack columns on mobile
- Maintain touch-friendly tap targets (44px minimum)

**TECHNICAL REQUIREMENTS:**
- React + Tailwind CSS
- Smooth animations (Framer Motion)
- Mobile-optimized
- Accessible (WCAG AA)
- Fast loading (lazy load images)

**OVERALL VIBE:**
Sophisticated, inviting, premium whiskey brand with modern web standards and a touch of rustic heritage. Balance elegance with usability. Make it feel like a premium experience worthy of a craft whiskey brand.