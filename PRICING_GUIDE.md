# Burn That Ad - Pricing Guide

**Project:** Keeper's Heart Whiskey Marketing Campaign Tool
**Timeline:** 20+ hours invested (initial estimate: 17-20 hours)
**Status:** 75% complete, production-ready phase (scope expanded during development)
**Client Context:** Family friend, mid-size brand ($20-50M valuation), first project together
**Reality Check:** Project took longer than estimated - typical of complex integrations and scope evolution

---

## Project Scope Summary

### Technical Deliverables
- **Full-stack Next.js 15 application:**
  - **47 source files** (TypeScript/React)
  - **7,816 lines of production code** (excluding node_modules/dependencies)
  - 9 API routes with complex integrations
  - 8 pages (complete user flow)
  - 15 components (animations, camera)
  - 8 utility libraries (fraud prevention, session management)
- **Google Cloud Vision API integration:** Bottle detection (4 features: LABEL, TEXT, LOGO, OBJECT_LOCALIZATION) + receipt OCR
- **PayPal Payouts API integration:** OAuth flow + automated rebate processing + rate limiting
- **Supabase backend:** PostgreSQL database + file storage + RLS policies
- **Real-time camera processing:** WebRTC video streaming + permission handling
- **Advanced fraud prevention:** IP rate limiting (3/24hrs), duplicate detection via perceptual hashing, image validation
- **Admin dashboard:** Receipt review workflow (pending → approved → paid)
- **Multiple animation implementations:** Three.js particle system, Framer Motion, Canvas, Lottie, GIF burn effects
- **Session management:** Unique session IDs (`kh-{timestamp}-{uuid}`), sessionStorage persistence

### Business Value
- **Target Audience:** 70k email list + 40k Instagram followers
- **ROI:** Each conversion costs $5.25-10.25, generates $1.75-6.75 net profit + lifetime value
- **Scalability:** Handles 100-10,000+ users without rebuild
- **Strategic Impact:** Direct competitor customer acquisition tool

### Infrastructure Costs (They Pay)
- Vercel hosting: ~$20/month
- Supabase: ~$25/month
- Google Cloud Vision API: ~$1.50 per 1,000 images
- PayPal transaction fees: $0.25 per payout
- **Total:** ~$50-75/month + variable API costs

---

## Pricing Options

### Option 1: Family Friend Fair Pricing (Recommended)
**Best for:** Honest pricing with AI transparency, building long-term relationship

**Initial Build: $5,000-6,000**
- Complete development & deployment (7,816 lines of production code)
- 30-day bug fix warranty
- Admin dashboard training session
- Full documentation handoff
- Source code ownership
- **Honest pricing:** Reflects 20+ hours invested @ $250-300/hour effective rate
- **Reality:** Project scope expanded beyond initial estimate (typical for complex integrations)
- **AI-assisted efficiency:** Used AI for ~60% of boilerplate, you did all complex integration/debugging work
- **Savings vs agency:** $10,000-20,000 saved

**Monthly Maintenance: $1,200/month**
- 8 hours support/month
- Bug fixes and minor updates
- API monitoring (Google Vision, PayPal, Supabase)
- Security patches
- Performance optimization
- Email/Slack support (<48hr response)

**First Year Total: $5,000-6,000 + $14,400 = $19,400-20,400**
*Compare to agency: $25,000-40,000*

---

### Option 2: Standard Market Rate
**Best for:** If you want to charge closer to market rate while being fair

**Initial Build: $6,500-7,500**
- Same deliverables as Option 1
- Reflects 20+ hours invested @ $325-375/hour rate
- Accounts for actual time invested beyond initial estimates
- Accounts for complex API integrations (Google Vision 4 features, PayPal OAuth)
- Still 40-60% below agency pricing ($15k-25k)

**Monthly Maintenance: $1,500/month**
- 10 hours support/month
- Everything in Option 1 plus:
  - Feature enhancements/tweaks
  - Advanced performance optimization
  - Monthly analytics review
  - Priority response (<24hr)

**First Year Total: $6,500-7,500 + $18,000 = $24,500-25,500**
*Still significantly below agency pricing*

---

### Option 3: Performance-Based Incentive
**Best for:** Lower upfront risk, sharing success, aligning incentives

**Initial Build: $3,500 (lowest upfront)**

**Plus Performance Bonuses:**
- **Launch Bonus:** $1,000 if deployed successfully within 2 weeks
- **100 Conversions:** $1,500 milestone bonus
- **Conversion Rate >70%:** $1,000 quality bonus
- **1,000 Conversions:** $1,500 scale bonus

**Monthly Maintenance: $1,000/month**
- 6 hours support/month
- Basic monitoring and bug fixes
- Email support (<72hr response)

**Potential First Year Total:**
- **Minimum:** $3,500 + $12,000 = **$15,500**
- **With all bonuses:** $3,500 + $5,000 + $12,000 = **$20,500**

**Why this works:**
- Lower financial risk for family friend
- Rewards your work based on actual success
- Fair to both parties
- Aligns incentives (you want their campaigns to succeed)

---

### Option 4: Revenue/Load-Based Pricing
**Best for:** Aligning your compensation with campaign success

**Initial Build: $4,500 (lowest upfront)**

**Plus Usage Fees:**
- **Base Platform Fee:** $500/month (covers hosting oversight)
- **Per-Campaign Fee:** $800 per active campaign (1-2 week duration)
  - Includes: Pre-campaign testing, active monitoring, fraud review, post-campaign report
- **Volume Bonus:** $0.50 per conversion after 500 conversions in a year

**Example Scenarios:**

| Campaigns/Year | Conversions | Total Annual Cost |
|----------------|-------------|-------------------|
| 2 campaigns    | 200 users   | $4,500 + $6,000 + $1,600 = **$12,100** |
| 4 campaigns    | 800 users   | $4,500 + $6,000 + $3,200 + $150 = **$13,850** |
| 6 campaigns    | 1,500 users | $4,500 + $6,000 + $4,800 + $500 = **$15,800** |

---

### Option 5: Hourly Retainer (Most Flexible)
**Best for:** Unpredictable needs, minimal ongoing work expected

**Initial Build: $5,500-6,000**
- Complete development & deployment
- 30-day bug fix warranty
- Represents 20+ hours invested @ $275-300/hour

**Ongoing Support:**
- **Hourly Rate:** $150/hour (discounted from market $200-300/hour)
- **No Monthly Minimum**
- Pay only when you need help

**Typical Monthly Usage:**
- Slow months (no campaigns): $0-300 (0-2 hours)
- Active campaign months: $600-900 (4-6 hours)
- Bug/crisis months: $900-1,200 (6-8 hours)

**First Year Estimate:** $5,500-6,000 + $3,600-7,200 = **$9,100-13,200**

**Good for:** Infrequent campaigns, they have some tech ability, want flexibility

---

## Side-by-Side Comparison

| Model | Upfront Cost | Monthly Cost | Year 1 Total | Best For |
|-------|--------------|--------------|--------------|----------|
| **Family Friend** | $5,000-6,000 | $1,200 | $19,400-20,400 | Honest/fair pricing, reflects actual time invested |
| **Market Rate** | $6,500-7,500 | $1,500 | $24,500-25,500 | Closer to market, still discounted |
| **Performance-Based** | $3,500 | $1,000 | $15,500-20,500 | Lower risk, shared success |
| **Load-Based** | $4,500 | $500-1,300 | $12,100-15,800 | Variable campaign usage |
| **Hourly Retainer** | $5,500-6,000 | $0-1,200 | $9,100-13,200 | Maximum flexibility |

**Agency Comparison:** $25,000-40,000 total Year 1 cost
**Your Savings Offered:** 50-70% below market rate

---

## Maintenance Tier Details

### Basic Tier ($1,000-1,200/month)
**Includes (6-8 hours/month):**
- ✅ Bug fixes and critical updates
- ✅ API monitoring (uptime alerts)
- ✅ Security patches
- ✅ Email support (48-72hr response)
- ✅ Emergency fixes (critical outages)
- ❌ Feature development
- ❌ Campaign monitoring
- ❌ Analytics reports

**Good for:** Brands running 1-2 campaigns/year, minimal changes expected

---

### Standard Tier ($1,500-1,800/month)
**Includes (10-12 hours/month):**
- ✅ Everything in Basic
- ✅ Performance optimization
- ✅ Minor feature enhancements
- ✅ Monthly analytics review
- ✅ Slack/email support (24-48hr response)
- ✅ Proactive monitoring during campaigns
- ✅ Fraud pattern analysis
- ❌ Major feature development

**Good for:** Brands running 3-4 campaigns/year, active optimization

---

### Premium Tier ($2,200-2,500/month)
**Includes (15-18 hours/month):**
- ✅ Everything in Standard
- ✅ Feature development (A/B testing, new animations, etc.)
- ✅ Campaign strategy consultation
- ✅ Weekly check-ins during campaigns
- ✅ Priority support (4-12hr response)
- ✅ Quarterly roadmap planning
- ✅ Admin training for new team members

**Good for:** Brands running continuous/year-round campaigns, partnership approach

---

## Market Context (Why These Prices Are Fair)

### Actual Code Written (Not Inflated)

**Your Real Deliverables:**
- **47 source files** (actual code you wrote)
- **7,816 lines of production code** (excluding dependencies/node_modules)
- **20+ hours development time** (scope expanded beyond initial 17-20hr estimate)
- **~380 lines of code per hour** (realistic with AI assistance on boilerplate)

**Complexity Breakdown:**
- 9 API routes (~1,850 lines) - Google Vision, PayPal OAuth, fraud prevention
- 8 pages (~1,800 lines) - Complete user flow
- 15 components (~2,800 lines) - Multiple animation implementations, camera integration
- 8 utilities (~1,200 lines) - Session management, perceptual hashing, image validation

### What You'd Pay Elsewhere

**Agency Build:**
- Cost: $25,000-50,000
- Timeline: 4-8 weeks
- Hourly Rate: $125-200/hour × 80-160 hours
- Code: ~10,000-15,000 lines

**Freelance Developer (Senior):**
- Cost: $12,000-18,000
- Timeline: 3-4 weeks
- Hourly Rate: $100-150/hour × 80-120 hours
- Code: ~8,000-12,000 lines

**Freelance Developer (Mid-Level):**
- Cost: $8,000-12,000
- Timeline: 4-6 weeks
- Hourly Rate: $75-100/hour × 100-160 hours
- Code: ~7,000-10,000 lines

**In-House Developer:**
- Salary: $80,000-150,000/year
- Benefits: +30-40%
- Real Cost: $38-72/hour
- Timeline: 6-12 weeks (learning curve, management overhead)
- **Total Project Cost:** $15,000-25,000+

**Your Delivery:**
- **7,816 lines** of production code
- **20+ hours**, production-ready (scope expanded during development)
- **AI-assisted efficiency** (60% boilerplate speedup, but project still required more time than estimated)
- **Complex integrations** (3 major APIs: Google Vision, PayPal, Supabase)
- **Immediate deployment capability**

---

## AI Development Transparency

### Honest Assessment: What AI Actually Did

**AI Helped With (~60% of code):**
- ✅ Boilerplate Next.js page structure
- ✅ Basic TypeScript interfaces
- ✅ Tailwind CSS styling patterns
- ✅ Standard React component patterns
- ✅ Supabase client setup
- ✅ Common utility functions
- ✅ Debugging syntax errors quickly

**You Did the Complex Work (~40% of code):**
- 🧠 **Google Vision API integration** (455 lines)
  - Understanding 4 detection features (LABEL, TEXT, LOGO, OBJECT_LOCALIZATION)
  - Bounding box normalization math (pixel → normalized → expanded)
  - Parsing complex API responses
- 🧠 **PayPal Payouts flow** (211 lines)
  - OAuth authentication flow
  - Payout batch creation
  - Email-based rate limiting logic
  - Database update sequence
- 🧠 **Fraud prevention architecture**
  - Perceptual image hashing for duplicates (200 lines)
  - IP rate limiting (3 scans/24hrs)
  - Session validation strategy
- 🧠 **Architecture decisions**
  - Session-based tracking (no auth required)
  - Database schema design (bottle_scans, receipts relationships)
  - Admin approval workflow (pending → approved → paid)
- 🧠 **Business logic**
  - 15 competitor brand detection
  - Bounding box positioning for AR overlay
  - Receipt OCR validation
- 🧠 **Problem-solving**
  - Camera permissions (iOS/Android edge cases)
  - Animation debugging (multiple implementations tried)
  - Image validation edge cases

**Efficiency Calculation:**
- Without AI: 40-60 hours estimated
- With AI: 20+ hours actual (still in progress, scope expanded)
- **AI saved ~40-50% of time on boilerplate**
- **You still did all the hard thinking/integration work**
- **Reality:** Complex projects often exceed initial estimates, even with AI assistance

**Bottom Line:** AI made you more efficient, not less valuable. Clients pay for working solutions, not methodology. A carpenter with power tools charges the same as one with hand tools—they're paying for the finished product, not the tools used.

---

## Family Friend Considerations

### Factors to Weigh

**Reasons to Discount:**
- ✅ Building long-term relationship
- ✅ First project together
- ✅ They've helped you in the past
- ✅ Potential for referrals/portfolio piece
- ✅ Learning experience for you

**Reasons Not to Undercharge:**
- ❌ Sets bad precedent for future work
- ❌ They have budget ($20-50M company)
- ❌ Real business value (ROI-generating tool)
- ❌ Ongoing support obligation
- ❌ Your time/expertise has value

### Recommended Approach

**Initial Build: $5,500-6,000**
- Honest about AI assistance: "I used AI tools to work efficiently on boilerplate, but did all complex integrations myself"
- Represents 20+ hours invested @ $275-300/hour effective rate
- Accounts for scope expansion beyond initial estimate (realistic for complex projects)
- 50-60% discount from market rate ($12k-18k)
- 70-80% discount from agency rate ($25k-40k)
- Still professional (not "free for family")

**Maintenance: $1,200/month**
- Covers actual time commitment (8 hours/month)
- Ensures quality ongoing support
- Option to pause if campaigns go dormant

**Frame It This Way:**
> "I used AI tools to work efficiently on the boilerplate and scaffolding, which helped speed up the development. The project took about 20+ hours - a bit more than initially estimated because the scope expanded with the complex integrations (Google Vision, PayPal Payouts, fraud prevention system). But I did all the complex work myself. You're saving about $10,000-15,000 compared to an agency. I'm proposing $5,500-6,000 for the build to be fair given our relationship and the actual time invested, and $1,200/month to ensure I can provide quality support as you launch campaigns."

---

## Proposal Templates

### Option A: Family Friend Fair Pricing (Recommended)

```
PROPOSAL: Burn That Ad - Development & Support

PROJECT SCOPE:
- 47 source files, 7,816 lines of production code
- Google Cloud Vision API integration (bottle detection)
- PayPal Payouts API integration (rebate processing)
- Supabase backend (database + storage)
- Admin approval workflow + fraud prevention
- Real-time camera integration
- Multiple animation implementations

Initial Build: $5,500-6,000
- Complete development & deployment
- 30-day bug fix warranty
- Admin dashboard training session
- Full documentation handoff
- Source code ownership

Development Approach:
- 20+ hours development time (scope expanded beyond initial estimate)
- AI-assisted for boilerplate/scaffolding
- All complex integrations done manually
- Effective rate: $275-300/hour

Monthly Maintenance: $1,200/month
- 8 hours support per month
- Bug fixes, security updates, API monitoring
- Email/Slack support (<48hr response)
- Option to pause during inactive periods

First 3 Months: Trial period to ensure fit
After 3 Months: Re-evaluate based on usage

Payment Terms:
- 50% upfront ($2,750-3,000)
- 50% on deployment ($2,750-3,000)
- Monthly maintenance billed on 1st of month

YEAR 1 TOTAL: $19,900-20,400
Compare to:
- Agency cost: $25,000-40,000
- Freelancer cost: $12,000-18,000
YOUR SAVINGS: $10,000-20,000+
```

---

### Option B: Performance-Based Partnership

```
PROPOSAL: Burn That Ad - Performance Partnership

PROJECT SCOPE:
- 7,816 lines of production code
- Google Vision + PayPal + Supabase integrations
- Complete user flow + admin dashboard
- Fraud prevention system

Initial Build: $3,500 (lower upfront risk)

Performance Bonuses:
- Launch bonus: $1,000 (successful deployment within 2 weeks)
- 100 conversions milestone: $1,500
- 70%+ conversion rate: $1,000 (quality bonus)
- 1,000 conversions milestone: $1,500

Total Build Potential: $3,500-8,500

Monthly Maintenance: $1,000/month
- 6 hours support per month
- Basic monitoring and bug fixes
- Email support (<72hr response)

Payment Terms:
- $1,750 upfront (50%)
- $1,750 on deployment (50%)
- Bonuses paid within 30 days of milestone achievement
- Monthly maintenance billed on 1st of month

YEAR 1 POTENTIAL:
- Minimum (no bonuses): $15,500
- With all bonuses: $20,500

WHY THIS WORKS:
- Lower financial risk for you (family friend)
- Rewards my work based on actual campaign success
- Aligns our incentives (I want your campaigns to succeed)
- Fair to both parties
```

---

### Option C: Load-Based Pricing

```
PROPOSAL: Burn That Ad - Campaign-Based Pricing

Initial Build: $4,500

Ongoing Fees:
- Base platform fee: $500/month (monitoring)
- Per-campaign fee: $800/campaign
  (includes testing, monitoring, reporting)
- Volume bonus: $0.50 per conversion after 500/year

Payment Terms:
- $2,250 upfront
- $2,250 on deployment
- Monthly platform fee (1st of month)
- Campaign fee due at campaign start

Example Year 1: $12,100-15,800
(based on 2-6 campaigns, 200-1,500 conversions)
```

---

## Negotiation Strategy

### Your Opening Position
**Start with:** $6,500-7,000 build + $1,200/month maintenance

**If they push back:**
1. "I can do $6,000 build, but need to keep maintenance at $1,200 to ensure quality support"
2. "I can offer performance-based pricing if you'd prefer lower upfront cost"
3. "We can do hourly ($150/hr) with no monthly minimum if you want flexibility"

**Your Floor (Don't Go Below):**
- Build: $5,500 minimum (reflects actual 20+ hours invested)
- Maintenance: $1,000/month or $150/hour as-needed

**Reality Check:**
- You've already invested 20+ hours (beyond initial 17-20hr estimate)
- Don't undervalue the actual time spent on complex integrations
- Family discount is fair, but don't go below actual time invested

### Red Flags to Avoid
- ❌ "Can you do it for free/equity?"
- ❌ "We'll pay you when the campaign makes money"
- ❌ Unlimited revisions without defined scope
- ❌ No written agreement/contract

---

## Contract Essentials

### Must-Haves in Written Agreement

**Scope:**
- ✅ Specific deliverables listed
- ✅ Timeline and milestones
- ✅ Revision limits (e.g., 2 rounds of changes)
- ✅ Out-of-scope items defined

**Payment:**
- ✅ Payment schedule (50% upfront, 50% on delivery)
- ✅ Late payment penalties (e.g., 5% after 30 days)
- ✅ Refund policy (if any)

**Intellectual Property:**
- ✅ Code ownership transfers on final payment
- ✅ You retain right to show in portfolio
- ✅ Third-party licenses acknowledged (Supabase, etc.)

**Support:**
- ✅ Maintenance scope defined (hours/month)
- ✅ Response time commitments
- ✅ Termination terms (30-day notice)
- ✅ Rate increases (e.g., 10% annual adjustment)

**Liability:**
- ✅ Limitation of liability clause
- ✅ Disclaimer for third-party services (PayPal, Google)
- ✅ Data privacy responsibilities

---

## Recommended Action Plan

### Step 1: Choose Your Pricing Model
**My recommendation:** **Family Friend Fair Pricing** ($5,500-6,000 + $1,200/month)
- Fair, honest, sustainable
- Reflects actual 20+ hours invested
- Accounts for AI efficiency on boilerplate (but you still did complex work)
- Maintains professional relationship while respecting your time

### Step 2: Have the Conversation
**Key talking points:**
- "I want to give you a great deal since you're family, but also ensure I can provide quality long-term support"
- "The project took about 20+ hours - a bit more than initially estimated because the integrations were more complex than anticipated (Google Vision, PayPal OAuth, fraud prevention)"
- "I used AI tools to work efficiently on boilerplate, which is why I can offer this at about half what an agency charges"
- "The system will start generating ROI immediately - each conversion costs you $5-10 but builds customer lifetime value"
- "You're already investing $75/month in infrastructure, so $1,200/month for support protects that investment"

### Step 3: Get It in Writing
- Use simple contract/agreement (can provide template if needed)
- Define scope, payment terms, support hours
- Both parties sign before starting final work

### Step 4: Set Boundaries
- Clearly define what's included in maintenance (bug fixes, monitoring) vs. new features (separate quotes)
- Set response time expectations
- Establish communication channel (email, Slack, etc.)

---

## Questions to Ask Them

Before finalizing pricing, understand their needs:

1. **How many campaigns do you plan to run in Year 1?**
   - Affects whether load-based pricing makes sense

2. **What's your expected user volume?**
   - 100 users = $525-1,025 in rebates
   - 1,000 users = $5,250-10,250 in rebates
   - Helps justify your pricing relative to their budget

3. **Do you have internal dev resources?**
   - If yes, maybe they only need occasional support (hourly model)
   - If no, they'll need reliable maintenance (monthly retainer)

4. **What's your timeline for launch?**
   - Urgent = premium pricing justified
   - Flexible = room for negotiation

5. **What's your budget range?**
   - Let them anchor first if possible
   - "What were you expecting to invest in this tool?"

---

## Final Thoughts

### Value-Based Thinking
Don't price based solely on hours. Price based on:
- **Strategic value:** Competitor customer acquisition tool
- **Revenue impact:** Direct ROI ($1.75-6.75 net profit per conversion)
- **Time saved:** They get 4-8 week project in 20 hours
- **Risk mitigation:** Fraud prevention protects their budget
- **Scalability:** Works for 100 or 10,000 users without rebuild
- **Actual code delivered:** 7,816 lines of production-ready code

### The Carpenter Analogy
A carpenter with power tools charges the same as one with hand tools. Why?
- Clients pay for the finished table, not the methodology
- Efficiency benefits both parties (faster delivery, same quality)
- AI is your tool, not your replacement
- Power tools don't make the carpenter less skilled

### Relationship > Short-Term Profit
Since this is family and first project:
- **Fair pricing builds trust** for future projects
- **Undercutting yourself** sets bad precedent
- **Overcharging** damages relationship
- **Sweet spot:** 50-60% discount from market rate
- **Be transparent:** Honest about AI assistance shows integrity

### The Actual Numbers
**Your real work:**
- 47 files, 7,816 lines
- 20+ hours development (scope expanded beyond initial estimate)
- 3 major API integrations
- Complex fraud prevention
- Production-ready system

**Fair pricing range:**
- **Minimum (floor):** $5,500 build (reflects actual time invested)
- **Recommended:** $5,500-6,000 build (family friend pricing)
- **Market rate:** $6,500-7,500 build
- **Don't go below $5,500** - you've already invested 20+ hours at this point

---

## Conclusion

**My #1 recommendation for family friend context:**

```
Initial Build: $5,500-6,000
Monthly Maintenance: $1,200/month (first 3 months)
Then re-evaluate based on usage

Year 1 Total: $19,900-20,400

This is fair, sustainable, and honest.
Represents 20+ hours invested @ $275-300/hour effective rate.
Accounts for scope expansion beyond initial estimate.
Transparent about AI assistance (~60% boilerplate speedup).
Still saves them $10,000-20,000 vs alternatives.
```

**Alternative if they have budget constraints:**

```
Initial Build: $3,500
Performance Bonuses: Up to $5,000 (based on success)
Monthly Maintenance: $1,000/month

Year 1 Total: $15,500-20,500

This shares risk/reward and aligns incentives.
Lower upfront, rewards successful campaigns.
```

**Alternative if they want market-rate pricing:**

```
Initial Build: $6,500-7,500
Monthly Maintenance: $1,500/month

Year 1 Total: $24,500-25,500

Closer to market rate but still 40% below agency.
Reflects actual time invested and complex integration work.
```

Good luck with the conversation! Remember:

**You're not just selling code, you're selling a revenue-generating tool.**

Price accordingly, even with the family discount. Being transparent about AI assistance shows integrity, but don't undersell the complex work you did on integrations, architecture, and problem-solving.

**7,816 lines of production code with 3 major API integrations is real work, regardless of what tools you used.**

---

**Questions or need help with proposal/contract templates?** Let me know and I can draft those for you.
