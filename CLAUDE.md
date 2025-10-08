# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Burn That Ad" - A mobile-first web application for an AR whiskey marketing campaign by Keeper's Heart Whiskey. The campaign allows consumers to scan competitor (Jameson) advertisements with their phone camera, watch an AR "burn" effect, and receive discount codes/rewards for Keeper's Heart whiskey.

## Technology Stack

- **Frontend:** React + Tailwind CSS
- **Animations:** Framer Motion
- **AR/Computer Vision:** WebAR (8thWall, MindAR, or AR.js for menu word detection)
- **OCR:** Tesseract.js (web-based) or ML Kit Text Recognition
- **Backend:** Node.js/Express with PostgreSQL
- **Receipt Processing:** Tabscanner, Veryfi, or Google Document AI
- **Payment Rails:** Tremendous API or PayPal Payouts
- **Analytics:** Segment or Amplitude

## Architecture

### Consumer Flow (Bar-Agnostic)
1. User scans QR code or accesses microsite via digital ads
2. Camera/AR recognizes "Jameson" or competitor brand on menu/ad (no QR needed for target)
3. AR burn effect overlays on screen, Keeper's Heart offer appears
4. Consumer purchases Keeper's Heart, uploads receipt via OCR
5. Direct payout to consumer (Venmo/PayPal/prepaid Visa) - no bar/distributor involvement

### Core Screens
1. **Age Gate** - Modal overlay with 21+ verification
2. **Campaign Intro** - Three-step process explanation with CTA
3. **AR Camera View** - Full-screen camera with scanning indicator and counter
4. **Coupon Reveal** - Success screen with discount code and sharing options

## Brand Design System

### Colors
- Primary: Deep whiskey amber (#B8860B, #CD853F)
- Secondary: Creamy white (#FFF8DC)
- Accent: Emerald green (#2C5F2D), Copper (#B87333)
- Dark: Charcoal (#2C2C2C), Black (#000000)
- Background: Soft charred oak (#F5F5DC with wood texture)

### Typography
- Headlines: Playfair Display (serif, elegant, bold) - 32-48px mobile, 48-72px desktop
- Body: Inter or Open Sans (sans-serif, clean)
- Line spacing: 1.6-1.8

### Component Standards
- **Buttons:** 12px border-radius, 16px vertical/32px horizontal padding, amber primary (#B8860B)
- **Cards:** White background, 16px border-radius, 24px padding, subtle shadow
- **Animations:** 300ms fade-ins, pulsing scanning indicator, 2s confetti on reveal
- **Responsive:** Mobile-first, breakpoints at 640px/768px/1024px, 44px minimum tap targets

## Key Requirements

- **Accessibility:** WCAG AA compliant
- **Performance:** Lazy load images, optimize for mobile
- **Anti-Abuse:** Age gating, device/email verification, rate limiting (one per X days), geofencing, duplicate prevention
- **Legal:** Comparative advertising compliance, tied-house law compliance, AMOE for sweepstakes states, privacy/terms

## Project Status

This is a greenfield project currently in planning phase. See [outline-docs/outline.md](outline-docs/outline.md) for detailed screen specifications and [outline-docs/patrick-planning.md](outline-docs/patrick-planning.md) for technical architecture and vendor options.
