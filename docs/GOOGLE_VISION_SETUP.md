# Google Vision API Setup Guide

This guide walks you through setting up Google Cloud Vision API for bottle detection and receipt validation.

## Why Google Vision API?

- **Bottle Detection:** Identifies whiskey bottles, brands, and labels in photos
- **Receipt OCR:** Extracts text from receipt images for validation
- **Cost:** Free tier includes 1,000 requests/month (plenty for MVP testing)
- **Accuracy:** Industry-leading image recognition

---

## Step 1: Create Google Cloud Project (5 minutes)

### 1.1 Go to Google Cloud Console
Visit: https://console.cloud.google.com/

### 1.2 Create New Project
1. Click the project dropdown at the top
2. Click "New Project"
3. Enter project name: `burn-that-ad` (or your preferred name)
4. Click "Create"

### 1.3 Select Your Project
- Make sure your new project is selected in the dropdown

---

## Step 2: Enable Vision API (2 minutes)

### 2.1 Enable the API
1. Go to: https://console.cloud.google.com/apis/library/vision.googleapis.com
2. Make sure your project is selected
3. Click "Enable"
4. Wait for activation (~30 seconds)

### 2.2 Verify Enabled
- You should see "API enabled" status
- You'll be taken to the API dashboard

---

## Step 3: Create Service Account (5 minutes)

### 3.1 Navigate to Service Accounts
1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts
2. Make sure your project is selected at the top

### 3.2 Create Service Account
1. Click "+ CREATE SERVICE ACCOUNT"
2. **Service account details:**
   - Service account name: `burn-that-ad-vision`
   - Service account ID: (auto-generated)
   - Description: `Vision API access for bottle detection`
3. Click "CREATE AND CONTINUE"

### 3.3 Grant Permissions
1. **Select a role:** Choose "Cloud Vision API User"
   - Search for "vision" in the role dropdown
   - Select "Cloud Vision API User"
2. Click "CONTINUE"
3. Click "DONE"

---

## Step 4: Create & Download Key (3 minutes)

### 4.1 Create Key
1. Find your service account in the list
2. Click the three dots (⋮) on the right
3. Select "Manage keys"
4. Click "ADD KEY" → "Create new key"
5. Choose **JSON** format
6. Click "CREATE"

### 4.2 Save the Key
- A JSON file will download automatically
- **IMPORTANT:** Keep this file secure! Don't commit to Git!
- Suggested location: `/Users/torcox/burn-jameson/secrets/google-vision-key.json`

### 4.3 Create Secrets Directory
```bash
mkdir -p secrets
mv ~/Downloads/burn-that-ad-vision-*.json secrets/google-vision-key.json
```

### 4.4 Update .gitignore
Make sure `secrets/` is in your `.gitignore`:
```
# Secrets
secrets/
*.json
!package*.json
!tsconfig.json
```

---

## Step 5: Configure Environment Variables (2 minutes)

### 5.1 Add to .env.local
```bash
# Google Vision API
GOOGLE_APPLICATION_CREDENTIALS=./secrets/google-vision-key.json
GOOGLE_CLOUD_PROJECT_ID=burn-that-ad
```

### 5.2 Get Your Project ID
- Find your project ID in Google Cloud Console (top bar)
- Or in the JSON key file: `"project_id": "your-project-id"`

---

## Step 6: Test the Integration (Claude Code handles this)

Once credentials are set up, Claude Code can:
1. Implement bottle detection with Vision API
2. Implement receipt OCR with Vision API
3. Add error handling and fallbacks
4. Test with sample images

---

## Pricing & Limits

### Free Tier (Monthly)
- **Label Detection:** 1,000 images FREE, then $1.50 per 1,000
- **Text Detection (OCR):** 1,000 images FREE, then $1.50 per 1,000
- **Document Text Detection:** 1,000 images FREE, then $1.50 per 1,000

### Estimated Costs for MVP
- **100 users/month:** FREE (well under 1,000 images)
- **500 users/month:** ~$0-5/month
- **1,000 users/month:** ~$5-15/month

### Cost Optimization
- Cache results in database (already implemented)
- Only call API for new images
- Use confidence thresholds to reduce retries
- Batch requests if possible

---

## Security Best Practices ✅

### Do's
- ✅ Store credentials in `secrets/` directory
- ✅ Add `secrets/` to `.gitignore`
- ✅ Use environment variables
- ✅ Keep JSON key secure
- ✅ Rotate keys periodically (every 90 days)

### Don'ts
- ❌ Never commit JSON key to Git
- ❌ Don't share key in screenshots/docs
- ❌ Don't use key in client-side code
- ❌ Don't reuse key across projects

---

## Troubleshooting

### Error: "Permission Denied"
**Solution:** Make sure service account has "Cloud Vision API User" role

### Error: "API not enabled"
**Solution:** Enable Vision API in Google Cloud Console

### Error: "Invalid credentials"
**Solution:** Check file path in GOOGLE_APPLICATION_CREDENTIALS

### Error: "Quota exceeded"
**Solution:** Check usage in GCP Console → APIs & Services → Dashboard

---

## Verification Checklist

Before proceeding, verify:
- [ ] Google Cloud project created
- [ ] Vision API enabled
- [ ] Service account created with correct role
- [ ] JSON key downloaded
- [ ] Key saved in `secrets/` directory
- [ ] `.gitignore` updated
- [ ] `.env.local` updated with credentials
- [ ] Project ID matches your GCP project

---

## Next Steps

Once setup is complete, tell Claude Code:

> "Google Vision API is set up. Please implement bottle detection and receipt validation."

Claude Code will:
1. ✅ Update `app/api/detect-bottle/route.ts` with Vision API
2. ✅ Add receipt validation with OCR
3. ✅ Add error handling
4. ✅ Test with sample images

---

## Resources

- [Google Vision API Docs](https://cloud.google.com/vision/docs)
- [Node.js Client Library](https://cloud.google.com/vision/docs/libraries#client-libraries-install-nodejs)
- [Pricing Calculator](https://cloud.google.com/vision/pricing)
- [API Quotas](https://cloud.google.com/vision/quotas)

---

## Support

If you encounter issues:
1. Check the [Troubleshooting](#troubleshooting) section
2. Verify all credentials are correct
3. Check GCP Console for API status
4. Review error logs in terminal
