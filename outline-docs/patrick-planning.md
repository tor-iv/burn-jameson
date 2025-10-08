# Keeper’s Heart Campaign — Planning Document

## TECHNOLOGY OPTIONS

### 1. AR / App-Based “Burn” Experience
- **How it works:**  
  - Consumer scans QR on menu/tent/coaster.
  - Opens branded microsite or app (webAR: 8thWall, ZapWorks; no download needed).
  - Competitor menu item (Jameson/Paddy’s) burns in AR.
  - Discount QR code or wallet pass appears post-burn.
- **Back-end Tech:**  
  - WebAR + Unique promo code generator  
  - POS: Integrates with Toast, Square, Aloha  
  - Code validation + reporting for reimbursement

### 2. Geofenced Mobile Ad + NFC / QR Redemption
- **How it works:**  
  - Ad served via Instagram, TikTok, Google Maps (geofenced) to consumers near premises.
  - “Burn the Competition” click triggers burn animation, issuing discount code.
  - Redeem via QR scan at bartender POS.
- **Back-end Tech:**  
  - Loyalty platforms: Thanx, Belly, InKind  
  - Direct reimbursement via distributor’s marketing fund

### 3. POS-Integrated Promo Redemption
- **How it works:**  
  - Direct promo integration into bar POS.
  - Bartender enters consumer code; tracks discount for automated Keeper’s Heart reimbursement.
- **Back-end Tech:**  
  - POS partners: Toast, Square, Aloha, Micros  
  - Sponsored discounts, monthly net invoicing

### 4. Digital Wallet Pass (Apple Wallet / Google Wallet)
- **How it works:**  
  - Consumer receives wallet pass after AR experience.
  - QR scanned at bar applies offer at POS.
- **Back-end Tech:**  
  - PassKit or Walletly for pass generation  
  - Redemption tracking + automated payout

## PAYMENT / SETTLEMENT OPTIONS

- **A: Bar absorbs upfront, we reimburse monthly**  
  - Discount entered at POS, distributor deducts from Keeper’s Heart LMF.
- **B: Mobile cashback**  
  - Consumer uploads bar receipt; Keeper’s Heart sends rebate (Venmo/PayPal/Zelle).
- **C: Distributor pre-loads credits**  
  - Bar credited up front for redemptions; Keeper’s Heart funds distributor.

---

## CAMPAIGN CONCEPTS

- “Burn the Competition” / “Light It Up”:
  - AR burn of Jameson/Paddy’s on menu, Keeper’s Heart discount revealed
- “Flip the Script”:
  - Shake phone, competitor menu flips, Keeper’s Heart takes its place
- “Keeper’s Heart Challenge”:
  - Burn competitor drink, share on socials for chance at merch/bottle
- “Heart Beats Fire”:
  - Competitor glass melts, Keeper’s Heart bottle rises, QR redemption
- **Activation Tie-Ins:**
  - Coasters reveal discount, staff shirts, on-screen AR QR TV ad loop

---

## RECOMMENDATION

**Best path:**  
WebAR microsite + QR/code trigger (no app download), AR burns competitor drink, instant Keeper’s Heart discount, bar-free settlement (consumer uploads receipt; brand pays rebate directly).

**Pilot:**  
Start with 5–10 bars, measure consumer redemption, optimize, then scale.

---

## BAR/DISTRIBUTOR-FREE CONSUMER FLOW (Key Insights)
- **Why:** Avoid tension—no bar/distributor involvement.
- **How:**
  1. Consumer scans QR/ad OR opens microsite (digital ads, table tents, etc).
  2. AR trigger: Phone/AI recognizes “Jameson” or “Paddy’s” menu item (no QR needed).
  3. AR burn effect overlays, Keeper’s Heart offer/code appears on screen.
  4. Consumer buys Keeper’s Heart at bar, uploads receipt, receives direct payout (Venmo/PayPal/Zelle, prepaid Visa, gift card).
  5. No interaction with bar/distributor for promo—just consumer and Keeper’s Heart.
- **Tech options:**
  - WebAR (8thWall, MindAR, AR.js)
  - OCR: Tesseract.js (web), ML Kit Text Recognition (native), Tabscanner, Veryfi, Google Document AI
  - Payment: Tremendous API, PayPal Payouts, Venmo, Prepaid Visa
  - Receipt parsing: Tabscanner, Veryfi, Google Document AI
- **Anti-abuse:**  
  Age gating, device/phone/email verification, one-per-X-days, geofence compliance, duplicate prevention.
- **Legal guardrails:**  
  Truthful comparative ad, Tied-house law compliance, AMOE in sweepstakes states, privacy/terms/official rules.

---

## BAR-AGNOSTIC CREATIVE HOOKS

- “Burn to Earn” – burn competitor item, Keeper’s Heart reward
- “Trade Up” – AR flip to Keeper’s Heart drink
- UGC challenge – burn and share for contest entry
- Leaderboards/gamified sweepstakes

---

## LAUNCH PLAYBOOK

- **Step 1:** Build PWA microsite (camera, OCR — Tesseract.js; AR “burn” effect — MindAR/three.js).
- **Step 2:** Session management + offer module (DB: Postgres; API: Node/Express).
- **Step 3:** Receipt upload/verification (Tabscanner, Veryfi, Google Document AI).
- **Step 4:** Payment rails (Tremendous API, PayPal Payouts).
- **Step 5:** Analytics/fraud controls (Segment, Amplitude).
- **Step 6:** Age/geo gating, compliance checks, terms/privacy.
- **Step 7:** Pilot launch (10–20 bars; street teams/digital ads).
- **Step 8:** National scale, influencer/UGC push.
- **Step 9:** Ongoing measurement (redemption, viral sharing, CAC per cocktail, fraud rate).

---

## NOTES

- AR/Computer vision can work with no QR code (menu word detection, AR effect, unlocking offer).
- Entire process consumer-facing; bars and distributors are “hands-off.”
- Highly viral, frictionless, scalable anywhere Keeper’s Heart is sold.
- Cost per redemption: estimate $2–$7 depending on tech and payout platform.

---

## NEXT STEPS

- Map exact vendor stack (OCR/AR/payment/verification).
- Develop open-source POC and/or native app modules.
- Draft creative assets, legal terms, privacy/AMOE documentation.
