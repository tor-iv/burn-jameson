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
  // Define bottle proportions with MORE points for smoother, more natural curves
  // Refined to create organic bottle silhouette with gradual transitions

  const points: Array<[number, number]> = [
    // LEFT SIDE (top to bottom)
    // Neck - narrow top with subtle curves
    [32, 0],    // Top left corner of neck
    [30, 3],    // Subtle neck curve
    [29, 8],    // Neck middle
    [28.5, 13], // Neck lower
    [28, 18],   // Bottom of neck left

    // Shoulder - gradual taper from neck to body (MORE points for smoothness)
    [27, 21],   // Shoulder start (subtle transition)
    [25, 24],   // Early shoulder curve
    [22, 27],   // Shoulder mid-curve
    [19, 30],   // Shoulder continuing
    [16, 33],   // Shoulder to body transition
    [13, 36],   // Upper body start
    [11, 39],   // Upper body curve

    // Body - widest part (slightly curved, not perfectly straight)
    [10, 43],   // Upper body left
    [9.5, 50],  // Body middle-upper (slight outward curve)
    [9.5, 58],  // Body middle-lower
    [10, 65],   // Lower body left

    // Base - gradual taper at bottom (MORE points for natural curve)
    [11, 70],   // Base taper start
    [13, 76],   // Base curve continuing
    [15, 82],   // Base mid-curve
    [17, 88],   // Base lower curve
    [19, 94],   // Near bottom
    [22, 98],   // Bottom curve
    [25, 100],  // Bottom left corner

    // BOTTOM EDGE (rounded base)
    [35, 100],  // Bottom left-center
    [50, 100],  // Bottom center
    [65, 100],  // Bottom right-center
    [75, 100],  // Bottom right corner

    // RIGHT SIDE (bottom to top - mirror of left with natural curves)
    [78, 98],   // Bottom curve
    [81, 94],   // Near bottom
    [83, 88],   // Base lower curve
    [85, 82],   // Base mid-curve
    [87, 76],   // Base curve continuing
    [89, 70],   // Base taper start

    [90, 65],   // Lower body right
    [90.5, 58], // Body middle-lower (slight outward curve)
    [90.5, 50], // Body middle-upper
    [90, 43],   // Upper body right

    [89, 39],   // Upper body curve
    [87, 36],   // Upper body start
    [84, 33],   // Shoulder to body transition
    [81, 30],   // Shoulder continuing
    [78, 27],   // Shoulder mid-curve
    [75, 24],   // Early shoulder curve
    [73, 21],   // Shoulder start (subtle transition)

    // Neck right side
    [72, 18],   // Bottom of neck right
    [71.5, 13], // Neck lower
    [71, 8],    // Neck middle
    [70, 3],    // Subtle neck curve
    [68, 0],    // Top right corner of neck

    // TOP EDGE (close the polygon)
    [50, 0],    // Top center
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

/**
 * Get brand-specific bottle shape based on detected brand and aspect ratio
 *
 * @param brand - Brand name detected by Vision API (e.g., "Jameson Irish Whiskey", "Bulleit")
 * @param aspectRatio - Height/width ratio of bounding box (optional, for validation)
 * @param boundingBox - The normalized bounding box
 * @returns CSS clip-path string optimized for that specific brand
 */
export function getBrandSpecificShape(
  brand: string | null,
  aspectRatio: number | null,
  boundingBox: BoundingBox
): string {
  // Normalize brand name for matching
  const brandLower = brand?.toLowerCase() || '';

  // Match brand to specific template
  // Irish Whiskey
  if (brandLower.includes('jameson')) {
    return generateJamesonShape();
  } else if (brandLower.includes('tullamore')) {
    return generateTullamoreDewShape();
  } else if (brandLower.includes('bushmills')) {
    return generateBushmillsShape();
  } else if (brandLower.includes('redbreast')) {
    return generateRedbreastShape();
  } else if (brandLower.includes('writers')) {
    return generateWritersTearsShape();
  } else if (brandLower.includes('teeling')) {
    return generateTeelingShape();
  }
  // Scotch Whisky
  else if (brandLower.includes('johnnie')) {
    return generateJohnnieWalkerShape();
  }
  // American Whiskey (Bourbon/Rye)
  else if (brandLower.includes('bulleit')) {
    return generateBulleitShape();
  } else if (brandLower.includes('woodford')) {
    return generateWoodfordShape();
  } else if (brandLower.includes('maker')) {
    return generateMakersMarkShape();
  } else if (brandLower.includes('angel')) {
    return generateAngelsEnvyShape();
  } else if (brandLower.includes('high west')) {
    return generateHighWestShape();
  } else if (brandLower.includes('michter')) {
    return generateMichtersShape();
  } else if (brandLower.includes('knob creek')) {
    return generateKnobCreekShape();
  } else if (brandLower.includes('four roses')) {
    return generateFourRosesShape();
  }

  // Fallback: Use aspect ratio to pick generic shape
  if (aspectRatio) {
    if (aspectRatio > 3.5) {
      return generateTallBottleClipPath(); // Tall, narrow
    } else if (aspectRatio < 2.5) {
      return generateSquatBottleClipPath(); // Short, wide
    }
  }

  // Final fallback: Standard generic bottle shape
  return generateBottleClipPath(boundingBox);
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

// ============================================================================
// BRAND-SPECIFIC BOTTLE SHAPES
// ============================================================================

/**
 * Jameson Irish Whiskey - Standard Irish whiskey bottle
 * Characteristics: Moderate neck, smooth shoulder transition, classic proportions
 */
function generateJamesonShape(): string {
  const points: Array<[number, number]> = [
    // Left side (top to bottom)
    [32, 0],    // Top left of neck
    [30, 4],    // Neck curve
    [29, 10],
    [28, 16],
    [27, 20],   // Shoulder start
    [24, 24],
    [20, 28],   // Smooth shoulder
    [16, 32],
    [12, 36],
    [10, 42],   // Body start
    [9, 50],    // Widest point
    [9, 62],
    [10, 70],   // Base taper
    [12, 78],
    [15, 86],
    [18, 93],
    [22, 100],  // Bottom left

    // Bottom edge
    [35, 100],
    [50, 100],
    [65, 100],
    [78, 100],  // Bottom right

    // Right side (bottom to top - mirror)
    [82, 93],
    [85, 86],
    [88, 78],
    [90, 70],
    [91, 62],
    [91, 50],
    [90, 42],
    [88, 36],
    [84, 32],
    [80, 28],
    [76, 24],
    [73, 20],
    [72, 16],
    [71, 10],
    [70, 4],
    [68, 0],    // Top right of neck

    // Top edge
    [50, 0],
  ];

  return `polygon(${points.map(([x, y]) => `${x}% ${y}%`).join(', ')})`;
}

/**
 * Bulleit Bourbon - Distinctive tall, narrow bottle
 * Characteristics: Very tall (4:1 ratio), narrow throughout, long neck, minimal shoulder
 */
function generateBulleitShape(): string {
  const points: Array<[number, number]> = [
    // Left side - TALL and NARROW
    [33, 0],    // Narrow neck top
    [32, 8],    // Long neck
    [31, 16],
    [30, 24],
    [29, 30],   // Minimal shoulder
    [27, 34],
    [24, 38],
    [20, 42],   // Narrow body start
    [18, 46],
    [16, 52],   // Narrow throughout
    [15, 60],
    [15, 70],
    [16, 80],   // Slight base taper
    [18, 88],
    [20, 95],
    [24, 100],  // Bottom left

    // Bottom edge
    [38, 100],
    [50, 100],
    [62, 100],
    [76, 100],  // Bottom right

    // Right side (mirror)
    [80, 95],
    [82, 88],
    [84, 80],
    [85, 70],
    [85, 60],
    [84, 52],
    [82, 46],
    [80, 42],
    [76, 38],
    [73, 34],
    [71, 30],
    [70, 24],
    [69, 16],
    [68, 8],
    [67, 0],    // Narrow neck top right

    // Top edge
    [50, 0],
  ];

  return `polygon(${points.map(([x, y]) => `${x}% ${y}%`).join(', ')})`;
}

/**
 * Maker's Mark - Distinctive squat bottle with wax seal top
 * Characteristics: Wide shoulders, squat proportions, distinctive wax drip at top
 */
function generateMakersMarkShape(): string {
  const points: Array<[number, number]> = [
    // Left side - SQUAT with WAX DRIPS
    [30, 0],    // Top with wax
    [28, 2],    // Irregular wax drip
    [26, 4],
    [28, 6],    // Wax variation
    [27, 10],
    [26, 14],   // Short neck
    [24, 18],   // Wide shoulder immediately
    [20, 22],
    [14, 26],
    [10, 30],   // Very wide body
    [8, 38],
    [8, 48],    // Widest point early
    [8, 60],
    [9, 70],
    [11, 80],   // Gradual base
    [14, 90],
    [18, 100],  // Bottom left

    // Bottom edge - WIDE
    [30, 100],
    [50, 100],
    [70, 100],
    [82, 100],  // Bottom right

    // Right side (mirror with wax)
    [86, 90],
    [89, 80],
    [91, 70],
    [92, 60],
    [92, 48],
    [92, 38],
    [90, 30],
    [86, 26],
    [80, 22],
    [76, 18],
    [74, 14],
    [73, 10],
    [72, 6],
    [74, 4],    // Wax variation
    [72, 2],
    [70, 0],    // Top with wax right

    // Top edge
    [50, 0],
  ];

  return `polygon(${points.map(([x, y]) => `${x}% ${y}%`).join(', ')})`;
}

/**
 * Johnnie Walker - Distinctive square bottle with sharp shoulders
 * Characteristics: Square profile, sharp angular shoulders, flat sides
 */
function generateJohnnieWalkerShape(): string {
  const points: Array<[number, number]> = [
    // Left side - SQUARE PROFILE
    [32, 0],    // Neck top
    [30, 6],
    [29, 12],
    [28, 18],   // End of neck
    [26, 20],   // SHARP shoulder angle
    [22, 22],   // Quick transition
    [16, 24],   // Flat side start
    [14, 26],
    [12, 30],   // Nearly vertical sides
    [11, 40],
    [11, 52],
    [11, 64],
    [11, 76],   // Very straight body
    [12, 84],
    [14, 92],
    [18, 100],  // Bottom left

    // Bottom edge
    [32, 100],
    [50, 100],
    [68, 100],
    [82, 100],  // Bottom right

    // Right side (mirror - angular)
    [86, 92],
    [88, 84],
    [89, 76],
    [89, 64],
    [89, 52],
    [89, 40],
    [88, 30],
    [86, 26],
    [84, 24],
    [78, 22],
    [74, 20],   // SHARP shoulder
    [72, 18],
    [71, 12],
    [70, 6],
    [68, 0],    // Neck top right

    // Top edge
    [50, 0],
  ];

  return `polygon(${points.map(([x, y]) => `${x}% ${y}%`).join(', ')})`;
}

/**
 * Woodford Reserve - Classic bourbon bottle shape
 * Characteristics: Similar to standard but with slightly more pronounced shoulders
 */
function generateWoodfordShape(): string {
  const points: Array<[number, number]> = [
    // Left side - Classic bourbon
    [31, 0],    // Neck top
    [29, 5],
    [28, 12],
    [27, 18],
    [26, 22],   // Shoulder start
    [23, 26],   // Pronounced shoulder
    [18, 30],
    [14, 34],
    [11, 38],
    [9, 44],    // Body
    [8, 52],
    [8, 62],
    [9, 72],    // Base taper
    [11, 82],
    [14, 90],
    [18, 96],
    [23, 100],  // Bottom left

    // Bottom edge
    [34, 100],
    [50, 100],
    [66, 100],
    [77, 100],  // Bottom right

    // Right side (mirror)
    [82, 96],
    [86, 90],
    [89, 82],
    [91, 72],
    [92, 62],
    [92, 52],
    [91, 44],
    [89, 38],
    [86, 34],
    [82, 30],
    [77, 26],
    [74, 22],
    [73, 18],
    [72, 12],
    [71, 5],
    [69, 0],    // Neck top right

    // Top edge
    [50, 0],
  ];

  return `polygon(${points.map(([x, y]) => `${x}% ${y}%`).join(', ')})`;
}

/**
 * Tullamore Dew - Standard Irish whiskey bottle
 * Characteristics: Similar to Jameson, classic proportions, smooth curves
 */
function generateTullamoreDewShape(): string {
  // Use Jameson shape as base (very similar bottle style)
  return generateJamesonShape();
}

/**
 * Bushmills - Traditional Irish whiskey bottle
 * Characteristics: Slightly more rounded shoulder than Jameson
 */
function generateBushmillsShape(): string {
  const points: Array<[number, number]> = [
    // Left side - softer shoulder curves
    [33, 0], [31, 4], [30, 10], [29, 16], [27, 21],
    [23, 26], [18, 31], [14, 36], [11, 41], [9, 48],
    [8, 58], [9, 68], [11, 78], [14, 87], [18, 94], [23, 100],
    // Bottom
    [36, 100], [50, 100], [64, 100], [77, 100],
    // Right side (mirror)
    [82, 94], [86, 87], [89, 78], [91, 68], [92, 58],
    [91, 48], [89, 41], [86, 36], [82, 31], [77, 26],
    [73, 21], [71, 16], [70, 10], [69, 4], [67, 0], [50, 0],
  ];
  return `polygon(${points.map(([x, y]) => `${x}% ${y}%`).join(', ')})`;
}

/**
 * Redbreast - Premium Irish whiskey
 * Characteristics: Taller neck, elegant proportions, narrow shoulders
 */
function generateRedbreastShape(): string {
  const points: Array<[number, number]> = [
    [34, 0], [33, 6], [32, 12], [31, 18], [30, 24], [29, 28],
    [26, 32], [22, 36], [18, 40], [15, 45], [12, 52], [11, 60],
    [11, 70], [12, 80], [15, 88], [19, 95], [24, 100],
    [37, 100], [50, 100], [63, 100], [76, 100],
    [81, 95], [85, 88], [88, 80], [89, 70], [89, 60], [88, 52],
    [85, 45], [82, 40], [78, 36], [74, 32], [71, 28], [70, 24],
    [69, 18], [68, 12], [67, 6], [66, 0], [50, 0],
  ];
  return `polygon(${points.map(([x, y]) => `${x}% ${y}%`).join(', ')})`;
}

/**
 * Writers' Tears - Unique teardrop-shaped bottle
 * Characteristics: Distinctive bulbous body, very rounded
 */
function generateWritersTearsShape(): string {
  const points: Array<[number, number]> = [
    [35, 0], [33, 5], [32, 12], [30, 18], [27, 24],
    [22, 30], [16, 36], [12, 42], [9, 48], [7, 55],
    [6, 64], [7, 73], [9, 81], [13, 88], [18, 94], [24, 100],
    [35, 100], [50, 100], [65, 100], [76, 100],
    [82, 94], [87, 88], [91, 81], [93, 73], [94, 64],
    [93, 55], [91, 48], [88, 42], [84, 36], [78, 30],
    [73, 24], [70, 18], [68, 12], [67, 5], [65, 0], [50, 0],
  ];
  return `polygon(${points.map(([x, y]) => `${x}% ${y}%`).join(', ')})`;
}

/**
 * Teeling - Modern angular design
 * Characteristics: Contemporary sharp angles, unique profile
 */
function generateTeelingShape(): string {
  const points: Array<[number, number]> = [
    [33, 0], [32, 8], [31, 16], [29, 22], [25, 26],
    [20, 30], [16, 34], [13, 40], [11, 48], [10, 58],
    [10, 70], [11, 80], [14, 88], [18, 94], [23, 100],
    [36, 100], [50, 100], [64, 100], [77, 100],
    [82, 94], [86, 88], [89, 80], [90, 70], [90, 58],
    [89, 48], [87, 40], [84, 34], [80, 30], [75, 26],
    [71, 22], [69, 16], [68, 8], [67, 0], [50, 0],
  ];
  return `polygon(${points.map(([x, y]) => `${x}% ${y}%`).join(', ')})`;
}

/**
 * Angel's Envy - Port wine finish bottle
 * Characteristics: Wine bottle-inspired, elegant curves
 */
function generateAngelsEnvyShape(): string {
  const points: Array<[number, number]> = [
    [32, 0], [30, 5], [29, 12], [27, 19], [24, 26],
    [20, 32], [16, 38], [13, 44], [11, 51], [10, 59],
    [10, 68], [11, 77], [13, 85], [16, 91], [20, 96], [25, 100],
    [37, 100], [50, 100], [63, 100], [75, 100],
    [80, 96], [84, 91], [87, 85], [89, 77], [90, 68],
    [90, 59], [89, 51], [87, 44], [84, 38], [80, 32],
    [76, 26], [73, 19], [71, 12], [70, 5], [68, 0], [50, 0],
  ];
  return `polygon(${points.map(([x, y]) => `${x}% ${y}%`).join(', ')})`;
}

/**
 * High West - Western-style tall bottle
 * Characteristics: Tall, narrow, reminiscent of Old West bottles
 */
function generateHighWestShape(): string {
  const points: Array<[number, number]> = [
    [34, 0], [33, 10], [32, 20], [31, 28], [29, 34],
    [26, 38], [22, 42], [19, 46], [17, 52], [16, 60],
    [16, 72], [17, 82], [19, 90], [22, 96], [26, 100],
    [38, 100], [50, 100], [62, 100], [74, 100],
    [78, 96], [81, 90], [83, 82], [84, 72], [84, 60],
    [83, 52], [81, 46], [78, 42], [74, 38], [71, 34],
    [69, 28], [68, 20], [67, 10], [66, 0], [50, 0],
  ];
  return `polygon(${points.map(([x, y]) => `${x}% ${y}%`).join(', ')})`;
}

/**
 * Michter's - Classic squat bourbon bottle
 * Characteristics: Shorter, wider, traditional bourbon proportions
 */
function generateMichtersShape(): string {
  const points: Array<[number, number]> = [
    [32, 0], [30, 8], [28, 16], [26, 22], [22, 28],
    [17, 34], [13, 40], [10, 46], [8, 54], [8, 64],
    [9, 74], [11, 83], [14, 90], [18, 96], [23, 100],
    [35, 100], [50, 100], [65, 100], [77, 100],
    [82, 96], [86, 90], [89, 83], [91, 74], [92, 64],
    [92, 54], [90, 46], [87, 40], [83, 34], [78, 28],
    [74, 22], [72, 16], [70, 8], [68, 0], [50, 0],
  ];
  return `polygon(${points.map(([x, y]) => `${x}% ${y}%`).join(', ')})`;
}

/**
 * Knob Creek - Standard bourbon bottle
 * Characteristics: Classic bourbon shape, moderate proportions
 */
function generateKnobCreekShape(): string {
  // Similar to Woodford Reserve - classic bourbon
  return generateWoodfordShape();
}

/**
 * Four Roses - Distinctive diamond-shaped label bottle
 * Characteristics: Unique profile with wider mid-body
 */
function generateFourRosesShape(): string {
  const points: Array<[number, number]> = [
    [32, 0], [30, 6], [29, 14], [27, 22], [24, 28],
    [20, 34], [16, 40], [13, 46], [10, 52], [9, 58],
    [10, 64], [12, 72], [15, 80], [18, 88], [22, 94], [26, 100],
    [38, 100], [50, 100], [62, 100], [74, 100],
    [78, 94], [82, 88], [85, 80], [88, 72], [90, 64],
    [91, 58], [90, 52], [87, 46], [84, 40], [80, 34],
    [76, 28], [73, 22], [71, 14], [70, 6], [68, 0], [50, 0],
  ];
  return `polygon(${points.map(([x, y]) => `${x}% ${y}%`).join(', ')})`;
}
