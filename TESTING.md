# Testing Guide - Burn That Ad

## 🚀 Current Status

**Week 1 ✅ Complete**
- Age gate
- Campaign intro
- Project structure
- Database schema

**Week 2 ✅ Complete**
- QR scanner
- Burn animation
- Coupon reveal
- Receipt upload (UI only)
- Local state management

## 🧪 How to Test

### Prerequisites
The app is running at **http://localhost:3000**

### Test Flow

#### 1. Age Gate
- Visit http://localhost:3000
- Should see age verification modal
- Click "YES, I'M 21+"
- Should redirect to /intro

#### 2. Campaign Intro
- Should see "Discover Hidden Whiskey" headline
- Three-step process with icons (Scan, Transform, Reward)
- Click "START SCANNING" button
- Should navigate to /scan

#### 3. QR Scanner
- Browser will request camera permissions - **allow it**
- You should see live camera feed
- Point camera at **any QR code** (doesn't have to be Jameson-specific for testing)
- Try these QR codes for testing:
  - Your phone's WiFi QR code
  - Any URL QR code generator (e.g., qr-code-generator.com)
  - Create a test QR: `https://burnthatad.com/test`

#### 4. Burn Animation
- When QR code is detected, burn animation should trigger automatically
- You'll see:
  - Rising flames from bottom
  - Orange glow effect
  - Embers/particles
  - "🔥 Burned!" text
- Animation lasts ~2.5 seconds
- Auto-redirects to reveal page

#### 5. Coupon Reveal
- URL: `/reveal/[random-id]`
- Should see:
  - "🎉 Success! 🎉" header
  - Confetti animation (3 seconds)
  - Product bottle placeholder
  - "$5 OFF" offer
  - Generated coupon code (format: `KH-XXXXXXXX`)
  - "Copy Code" button (test clipboard)
  - "FIND RETAILERS" button (opens Keeper's Heart website)
  - "SCAN AGAIN" button (returns to /scan)
  - "Upload Receipt" CTA at bottom

#### 6. Receipt Upload
- Click "Upload Receipt" from reveal page
- URL: `/upload/[scan-id]`
- Should see:
  - Upload area (click to open camera or file picker)
  - Take photo or select image
  - Preview should appear
  - Enter Venmo username (e.g., "testuser")
  - Click "Submit Receipt"
  - Should see success confirmation

### Testing Camera Issues

If camera doesn't work:
- **Desktop browsers:** Chrome/Edge work best
- **Mobile:** Safari (iOS) or Chrome (Android)
- **Permissions:** Check browser settings if denied
- **HTTPS required:** Camera API only works on localhost or HTTPS

### Testing Without Camera

To test without camera access, you can manually navigate:
```
1. Visit /intro
2. Open browser console
3. Run: localStorage.setItem('keepersHeart_scans', JSON.stringify([{id: 'test-123', qrCode: 'test', scannedAt: new Date().toISOString(), couponCode: 'KH-TEST1234'}]))
4. Visit /reveal/test-123
```

## 📱 Mobile Testing

**Recommended:** Test on real mobile device for camera functionality

### Get Mobile URL:
The dev server shows network URL: `http://192.168.1.237:3000`
- Make sure phone is on same WiFi
- Visit that URL on your mobile browser

### Mobile-Specific Tests:
- [ ] Age gate tap targets (44px minimum)
- [ ] Camera permissions on iOS Safari
- [ ] Camera permissions on Android Chrome
- [ ] Burn animation performance
- [ ] Coupon code copy to clipboard
- [ ] Receipt photo capture vs file upload
- [ ] Responsive layout (375px - 430px width)

## 🔍 Data Storage

All data is stored in **localStorage** (no Supabase needed for testing):

### View Scans:
```javascript
// Open browser console
JSON.parse(localStorage.getItem('keepersHeart_scans'))
```

### Clear All Data:
```javascript
localStorage.clear()
// Then refresh page
```

### Check Age Verification:
```javascript
localStorage.getItem('keepersHeartAgeVerified')
```

## ✅ Feature Checklist

### Core Flow
- [ ] Age gate appears on first visit
- [ ] Age verification persists (localStorage)
- [ ] Campaign intro loads with animations
- [ ] "START SCANNING" navigates to /scan
- [ ] Camera permissions requested
- [ ] QR code detection works
- [ ] Burn animation triggers on scan
- [ ] Coupon page shows with confetti
- [ ] Coupon code is unique (format: KH-XXXXXXXX)
- [ ] Copy to clipboard works
- [ ] Receipt upload form works
- [ ] Success confirmation after upload

### UI/UX
- [ ] All fonts load (Playfair Display, Inter)
- [ ] Brand colors render correctly
- [ ] Animations are smooth (60fps)
- [ ] Buttons have proper tap targets (44px)
- [ ] Loading states appear
- [ ] Error handling works
- [ ] Back navigation works

### Performance
- [ ] Page load < 2 seconds
- [ ] No console errors
- [ ] Camera stream is smooth
- [ ] Animations don't drop frames

## 🐛 Known Limitations (MVP)

These are intentional omissions for the MVP:
- No actual Supabase integration (local storage only)
- Receipt uploads don't save anywhere (UI only)
- No OCR on receipts
- No automated Venmo payouts
- No fraud prevention
- No admin dashboard yet
- QR codes don't validate Jameson-specific codes
- Social sharing buttons are placeholders

## 🚧 Next Steps

**Week 3 (Receipt Upload - Full Implementation):**
- Integrate Supabase Storage
- Save receipts to database
- Build admin review dashboard

**Week 4 (Polish):**
- Add error boundaries
- Implement rate limiting
- Add loading skeletons
- Test on multiple devices
- Deploy to Vercel

## 📞 Troubleshooting

### Camera not working
- Check browser console for errors
- Verify HTTPS or localhost
- Try different browser
- Check camera permissions in system settings

### QR code not scanning
- Ensure good lighting
- Hold phone steady
- Try different QR code
- Check camera focus

### Page not loading
- Clear browser cache
- Check console for errors
- Restart dev server: `npm run dev`

### Animations choppy
- Close other browser tabs
- Test on better hardware
- Check CPU usage

---

**Ready to test?** Start at http://localhost:3000 and follow the flow above! 🎉
