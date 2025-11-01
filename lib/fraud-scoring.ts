/**
 * Fraud Scoring System for Automated Receipt Approval
 *
 * Calculates a confidence score (0-1) based on multiple validation factors.
 * Receipts with high confidence scores are auto-approved instantly.
 * Low confidence receipts are flagged for manual admin review.
 */

interface ReceiptValidationData {
  hasKeepersHeart: boolean;
  hasReceiptKeywords: boolean;
  detectedText: string;
  matchedKeywords: string[];
  errors: string[];
  isLikelyRealPhoto: boolean;
  fraudWarnings: string[];
}

interface SessionData {
  sessionId: string;
  ipAddress: string;
  bottleConfidence: number;
  bottleDetectedBrand: string;
}

interface FraudScore {
  score: number; // 0-1 (higher is better)
  autoApprove: boolean;
  reviewReason?: string;
  details: {
    ocrScore: number;
    imageQualityScore: number;
    sessionScore: number;
    textLengthScore: number;
    keywordScore: number;
  };
}

/**
 * Calculate OCR validation score (0-1)
 */
function calculateOcrScore(validation: ReceiptValidationData): number {
  let score = 0;

  // Must have Keeper's Heart text (critical)
  if (validation.hasKeepersHeart) {
    score += 0.4;
  } else {
    return 0; // Auto-fail if no Keeper's Heart
  }

  // Must have receipt keywords
  if (validation.hasReceiptKeywords) {
    score += 0.3;
  }

  // Bonus for more matched keywords (0-0.3)
  const keywordRatio = validation.matchedKeywords.length / 9; // 9 receipt keywords
  score += keywordRatio * 0.3;

  return Math.min(score, 1.0);
}

/**
 * Calculate image quality score (0-1)
 */
function calculateImageQualityScore(validation: ReceiptValidationData): number {
  let score = 1.0;

  // Penalize if not a real photo (screenshot detection)
  if (!validation.isLikelyRealPhoto) {
    score -= 0.5;
  }

  // Penalize for fraud warnings
  score -= validation.fraudWarnings.length * 0.2;

  return Math.max(score, 0);
}

/**
 * Calculate session trust score (0-1)
 */
function calculateSessionScore(session: SessionData): number {
  let score = 1.0;

  // High bottle detection confidence = good
  if (session.bottleConfidence >= 0.9) {
    score = 1.0;
  } else if (session.bottleConfidence >= 0.7) {
    score = 0.8;
  } else if (session.bottleConfidence >= 0.5) {
    score = 0.6;
  } else {
    score = 0.3;
  }

  return score;
}

/**
 * Calculate text length score (0-1)
 */
function calculateTextLengthScore(detectedText: string): number {
  const length = detectedText.length;

  // Receipts should have substantial text
  if (length >= 200) return 1.0;
  if (length >= 150) return 0.8;
  if (length >= 100) return 0.5;
  if (length >= 50) return 0.3;
  return 0.1;
}

/**
 * Calculate keyword match score (0-1)
 */
function calculateKeywordScore(matchedKeywords: string[]): number {
  // More keywords = higher confidence
  const keywordCount = matchedKeywords.length;

  if (keywordCount >= 6) return 1.0;
  if (keywordCount >= 4) return 0.8;
  if (keywordCount >= 2) return 0.5;
  return 0.2;
}

/**
 * Main fraud scoring function
 * Returns confidence score and auto-approval decision
 */
export function calculateFraudScore(
  validation: ReceiptValidationData,
  session: SessionData
): FraudScore {
  // Calculate individual component scores
  const ocrScore = calculateOcrScore(validation);
  const imageQualityScore = calculateImageQualityScore(validation);
  const sessionScore = calculateSessionScore(session);
  const textLengthScore = calculateTextLengthScore(validation.detectedText);
  const keywordScore = calculateKeywordScore(validation.matchedKeywords);

  // Weighted average (OCR and image quality are most important)
  const totalScore = (
    ocrScore * 0.35 +           // 35% - Must have Keeper's Heart + receipt keywords
    imageQualityScore * 0.25 +  // 25% - Real photo, not screenshot
    sessionScore * 0.15 +       // 15% - Bottle detection confidence
    textLengthScore * 0.15 +    // 15% - Substantial text length
    keywordScore * 0.10         // 10% - Multiple receipt keywords
  );

  // Get minimum threshold from ENV (default 0.85 = 85%)
  const minThreshold = parseFloat(process.env.AUTO_APPROVAL_CONFIDENCE_MIN || '0.85');

  // Determine if should auto-approve
  const autoApprove = totalScore >= minThreshold && validation.errors.length === 0;

  // Generate review reason if flagged
  let reviewReason: string | undefined;
  if (!autoApprove) {
    if (validation.errors.length > 0) {
      reviewReason = `Validation errors: ${validation.errors.join('; ')}`;
    } else if (ocrScore < 0.7) {
      reviewReason = 'Low OCR confidence - unclear receipt text or missing Keeper\'s Heart';
    } else if (imageQualityScore < 0.5) {
      reviewReason = 'Poor image quality - possible screenshot or edited image';
    } else if (sessionScore < 0.5) {
      reviewReason = 'Low bottle detection confidence - unclear bottle scan';
    } else if (textLengthScore < 0.5) {
      reviewReason = 'Receipt text too short - may not be a complete receipt';
    } else {
      reviewReason = `Overall confidence too low (${(totalScore * 100).toFixed(1)}% < ${(minThreshold * 100)}%)`;
    }
  }

  return {
    score: totalScore,
    autoApprove,
    reviewReason,
    details: {
      ocrScore,
      imageQualityScore,
      sessionScore,
      textLengthScore,
      keywordScore,
    },
  };
}

/**
 * Log fraud score details for debugging/auditing
 */
export function logFraudScore(fraudScore: FraudScore, sessionId: string): void {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🛡️ FRAUD SCORE CALCULATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Session ID:', sessionId);
  console.log('Overall Score:', (fraudScore.score * 100).toFixed(1) + '%');
  console.log('Decision:', fraudScore.autoApprove ? '✅ AUTO-APPROVED' : '⚠️ FLAGGED FOR REVIEW');
  if (fraudScore.reviewReason) {
    console.log('Review Reason:', fraudScore.reviewReason);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Component Scores:');
  console.log('  OCR (35%):', (fraudScore.details.ocrScore * 100).toFixed(1) + '%');
  console.log('  Image Quality (25%):', (fraudScore.details.imageQualityScore * 100).toFixed(1) + '%');
  console.log('  Session Trust (15%):', (fraudScore.details.sessionScore * 100).toFixed(1) + '%');
  console.log('  Text Length (15%):', (fraudScore.details.textLengthScore * 100).toFixed(1) + '%');
  console.log('  Keyword Match (10%):', (fraudScore.details.keywordScore * 100).toFixed(1) + '%');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}
