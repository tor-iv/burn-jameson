# Repository Cleanup Recommendations

**Generated:** 2025-10-16

This document lists files that can be safely removed from the repository.

---

## 🗑️ Files to Remove

### Test/Debug Files (Root Directory)

**Remove these test files:**
- ❌ `test-gemini-simple.js` - Gemini API test file (3.2KB)
- ❌ `test-morph-api.js` - Morph API test file (2.2KB)

**Reason:** These are one-off test scripts for debugging. Not needed in production or development.

**Keep these config files:**
- ✅ `next.config.js` - Required for Next.js
- ✅ `postcss.config.js` - Required for Tailwind CSS

---

### Old Migration Files (Root Directory)

**Remove:**
- ❌ `supabase-update-receipts.sql` - Old migration to rename venmo → paypal (241 bytes)

**Reason:** This was a manual migration that's already been applied. The proper migration is in `supabase/migrations/003_receipt_fraud_prevention.sql`.

---

### Outdated Documentation (Root Directory)

**Remove:**
- ❌ `BOTTLE_MORPH_SETUP.md` - Experimental bottle morph setup (8.2KB)
- ❌ `FIRE_ANIMATION_SETUP.md` - Fire animation setup (6KB)
- ❌ `SSR_HYDRATION_ANALYSIS.md` - SSR debugging notes (7.7KB)
- ❌ `NEXT_STEPS.md` - Old planning doc (8.9KB) - superseded by PROGRESS.md

**Reason:** These are experimental/debug docs. Core info is already in CLAUDE.md, PROGRESS.md, and README.md.

**Keep these important docs:**
- ✅ `README.md` - Main project documentation
- ✅ `CLAUDE.md` - AI development guidelines
- ✅ `OVERVIEW.md` - Project overview
- ✅ `PROGRESS.md` - Current progress tracker
- ✅ `PAYPAL_INTEGRATION_PLAN.md` - PayPal setup guide
- ✅ `PAYPAL_QUICK_START.md` - Quick reference
- ✅ `FRAUD_PREVENTION_SUMMARY.md` - Fraud prevention quick ref

---

### Old Planning Files (docs/outline-docs/)

**Remove entire folder:**
- ❌ `docs/outline-docs/` - Old planning documents (4 files)
  - `email.md` - Email templates (outdated)
  - `outline.md` - Initial project outline (outdated)
  - `ui-elements.md` - UI element notes (outdated)
  - `patrick-planning.md` - Planning notes (outdated)

**Reason:** These are early planning documents. Project has evolved significantly. Key info is now in OVERVIEW.md and REQUIREMENTS.md.

---

## 📊 Cleanup Summary

**Total files to remove:** 12 files
**Total space saved:** ~50KB (minimal, but reduces clutter)

### Breakdown:
- Test files: 2
- Old migrations: 1
- Outdated docs: 4
- Old planning: 5 (entire folder)

---

## 🚀 How to Clean Up

### Option 1: Manual Deletion (Safest)

```bash
# From project root: /Users/torcox/burn-jameson

# Remove test files
rm test-gemini-simple.js
rm test-morph-api.js

# Remove old migration
rm supabase-update-receipts.sql

# Remove outdated documentation
rm BOTTLE_MORPH_SETUP.md
rm FIRE_ANIMATION_SETUP.md
rm SSR_HYDRATION_ANALYSIS.md
rm NEXT_STEPS.md

# Remove old planning folder
rm -rf docs/outline-docs/
```

### Option 2: Review Before Deletion

```bash
# Preview files before deleting
ls -lh test-*.js supabase-update-receipts.sql BOTTLE_MORPH_SETUP.md FIRE_ANIMATION_SETUP.md SSR_HYDRATION_ANALYSIS.md NEXT_STEPS.md

# If satisfied, run deletion commands above
```

---

## ✅ What to Keep

### Essential Project Files
- `README.md` - Main documentation
- `CLAUDE.md` - Development guidelines
- `OVERVIEW.md` - Project overview
- `PROGRESS.md` - Progress tracker
- `PAYPAL_INTEGRATION_PLAN.md` - PayPal guide
- `PAYPAL_QUICK_START.md` - Quick reference
- `FRAUD_PREVENTION_SUMMARY.md` - Fraud prevention summary

### Essential Config Files
- `next.config.js` - Next.js config
- `postcss.config.js` - PostCSS config
- `tailwind.config.ts` - Tailwind config
- `tsconfig.json` - TypeScript config
- `package.json` - Dependencies
- `.env.example` - Environment variables template
- `.gitignore` - Git ignore rules

### Documentation Folder (docs/)
- Keep all files in `docs/` except `docs/outline-docs/`
- These are current, relevant documentation

### Supabase Migrations (supabase/migrations/)
- Keep all migration files (001, 002, 003)
- These define your database schema

---

## 🔍 Additional Recommendations

### Update .gitignore

Consider adding these patterns to `.gitignore`:

```bash
# Test files
test-*.js
test-*.ts
*-test.js

# Temporary SQL files
*-update-*.sql

# Debug/scratch files
scratch/
temp/
debug/
```

### Future File Organization

**Suggested structure for test files:**
```
/tests/
  /unit/
  /integration/
  /e2e/
```

Currently, you don't have a test suite, so no action needed now.

---

## ⚠️ Files NOT to Delete

**Do NOT remove:**
- Any file in `app/`, `components/`, `lib/`
- Any file in `node_modules/` (managed by npm)
- Any file in `supabase/migrations/`
- `.env.local` (your local environment variables)
- `.git/` folder (your git history)

---

## 📝 Git Commit Message

After cleanup:

```bash
git add -A
git commit -m "chore: remove outdated test files and documentation

- Remove test-gemini-simple.js and test-morph-api.js
- Remove old migration file (supabase-update-receipts.sql)
- Remove outdated docs (BOTTLE_MORPH_SETUP, FIRE_ANIMATION_SETUP, SSR_HYDRATION_ANALYSIS, NEXT_STEPS)
- Remove old planning folder (docs/outline-docs)
- Keep essential documentation (README, CLAUDE, OVERVIEW, PROGRESS, PAYPAL guides, FRAUD_PREVENTION)"
```

---

**Ready to clean up?** Run the commands in "Option 1: Manual Deletion" above.
