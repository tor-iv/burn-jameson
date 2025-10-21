/**
 * Bottle Shape Utility
 *
 * Generates CSS clip-path polygon coordinates representing a typical whiskey bottle shape.
 * Used for clipping fire animation to approximate bottle contours without requiring
 * expensive segmentation APIs.
 *
 * Standard whiskey bottle proportions:
 * - Neck: Top 20% height, 40% width (narrow)
 * - Shoulder: 20-30% height, gradual taper
 * - Body: 30-70% height, 80% width (widest)
 * - Base: 70-100% height, slight taper
 */

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Generate a CSS clip-path polygon representing a bottle shape
 *
 * @param boundingBox - The normalized bounding box (0-1 coordinates)
 * @returns CSS clip-path string (e.g., "polygon(30% 0%, 70% 0%, ...)")
 */
export function generateBottleClipPath(boundingBox: BoundingBox): string {
  // Define bottle proportions as percentages
  // These create a typical whiskey bottle silhouette

  const points: Array<[number, number]> = [
    // LEFT SIDE (top to bottom)
    // Neck - narrow top
    [30, 0],    // Top left corner of neck
    [28, 5],    // Slight curve at top
    [28, 18],   // Bottom of neck left

    // Shoulder - taper from neck to body
    [25, 22],   // Shoulder start
    [18, 28],   // Shoulder curve
    [12, 32],   // Shoulder to body transition

    // Body - widest part
    [10, 40],   // Upper body left
    [10, 65],   // Lower body left

    // Base - slight taper at bottom
    [12, 75],   // Base taper start
    [15, 85],   // Base curve
    [18, 95],   // Near bottom
    [20, 100],  // Bottom left corner

    // BOTTOM EDGE
    [50, 100],  // Bottom center (optional, for symmetry)
    [80, 100],  // Bottom right corner

    // RIGHT SIDE (bottom to top - mirror of left)
    [82, 95],   // Near bottom
    [85, 85],   // Base curve
    [88, 75],   // Base taper start

    [90, 65],   // Lower body right
    [90, 40],   // Upper body right

    [88, 32],   // Shoulder to body transition
    [82, 28],   // Shoulder curve
    [75, 22],   // Shoulder start

    [72, 18],   // Bottom of neck right
    [72, 5],    // Slight curve at top
    [70, 0],    // Top right corner of neck

    // TOP EDGE (close the polygon)
    [50, 0],    // Top center (optional, for symmetry)
  ];

  // Convert points to CSS polygon format
  const polygonString = points
    .map(([x, y]) => `${x}% ${y}%`)
    .join(', ');

  return `polygon(${polygonString})`;
}

/**
 * Generate a simpler bottle shape with fewer points (for performance)
 *
 * @param boundingBox - The normalized bounding box
 * @returns CSS clip-path string with 8 points
 */
export function generateSimpleBottleClipPath(boundingBox: BoundingBox): string {
  const points: Array<[number, number]> = [
    // Simple 8-point bottle shape
    [35, 0],    // Top left (neck)
    [65, 0],    // Top right (neck)
    [75, 25],   // Shoulder right
    [85, 50],   // Body right
    [80, 100],  // Bottom right
    [20, 100],  // Bottom left
    [15, 50],   // Body left
    [25, 25],   // Shoulder left
  ];

  const polygonString = points
    .map(([x, y]) => `${x}% ${y}%`)
    .join(', ');

  return `polygon(${polygonString})`;
}

/**
 * Generate bottle shape optimized for different bottle types
 *
 * @param boundingBox - The normalized bounding box
 * @param type - Bottle type (standard, tall, squat)
 * @returns CSS clip-path string
 */
export function generateBottleClipPathByType(
  boundingBox: BoundingBox,
  type: 'standard' | 'tall' | 'squat' = 'standard'
): string {
  switch (type) {
    case 'tall':
      // Taller, narrower bottle (like Bulleit)
      return generateTallBottleClipPath();

    case 'squat':
      // Shorter, wider bottle
      return generateSquatBottleClipPath();

    case 'standard':
    default:
      // Standard whiskey bottle shape
      return generateBottleClipPath(boundingBox);
  }
}

function generateTallBottleClipPath(): string {
  const points: Array<[number, number]> = [
    [32, 0],    // Narrow neck
    [32, 25],   // Long neck
    [20, 35],   // Shoulder
    [15, 45],   // Narrow body
    [15, 85],
    [20, 100],
    [80, 100],
    [85, 85],
    [85, 45],
    [80, 35],
    [68, 25],
    [68, 0],
  ];

  return `polygon(${points.map(([x, y]) => `${x}% ${y}%`).join(', ')})`;
}

function generateSquatBottleClipPath(): string {
  const points: Array<[number, number]> = [
    [35, 0],    // Short neck
    [35, 15],
    [20, 25],   // Wide shoulder
    [10, 35],   // Wide body
    [10, 75],
    [15, 100],
    [85, 100],
    [90, 75],
    [90, 35],
    [80, 25],
    [65, 15],
    [65, 0],
  ];

  return `polygon(${points.map(([x, y]) => `${x}% ${y}%`).join(', ')})`;
}

/**
 * Debug: Visualize the bottle shape as an SVG path
 * Useful for testing/debugging the clip-path coordinates
 *
 * @param boundingBox - The normalized bounding box
 * @returns SVG path string
 */
export function generateBottleSVGPath(boundingBox: BoundingBox): string {
  const clipPath = generateBottleClipPath(boundingBox);

  // Convert polygon coordinates to SVG path
  // This is for debugging/visualization only
  const pointsMatch = clipPath.match(/polygon\((.*)\)/);
  if (!pointsMatch) return '';

  const points = pointsMatch[1].split(', ');
  const pathParts = points.map((point, index) => {
    const [x, y] = point.split(' ').map(coord => parseFloat(coord));
    return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
  });

  return `${pathParts.join(' ')} Z`;
}
