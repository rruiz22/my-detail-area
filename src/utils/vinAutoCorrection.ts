interface VinCorrectionResult {
  correctedVin: string;
  confidence: number;
  corrections: Array<{
    position: number;
    original: string;
    corrected: string;
    reason: string;
  }>;
  isValid: boolean;
}

interface VinPatternRule {
  pattern: RegExp;
  replacement: string | ((match: string, ...args: string[]) => string);
  confidence: number;
  description: string;
}

export class VinAutoCorrection {
  private static instance: VinAutoCorrection;
  private correctionRules: VinPatternRule[] = [];
  private learningData: Map<string, string> = new Map();
  private successfulCorrections: Map<string, number> = new Map();

  constructor() {
    this.initializeCorrectionRules();
    this.loadLearningData();
  }

  static getInstance(): VinAutoCorrection {
    if (!VinAutoCorrection.instance) {
      VinAutoCorrection.instance = new VinAutoCorrection();
    }
    return VinAutoCorrection.instance;
  }

  private initializeCorrectionRules(): void {
    this.correctionRules = [
      // Common OCR misreads
      {
        pattern: /[IOQ]/g,
        replacement: '0',
        confidence: 0.9,
        description: 'I, O, Q are not valid in VINs - likely 0'
      },
      {
        pattern: /(?<![A-Z0-9])[1l](?![A-Z0-9])/g,
        replacement: 'I',
        confidence: 0.8,
        description: 'Isolated 1 or l likely means I'
      },
      {
        pattern: /(?<![A-Z0-9])[5S](?=.*[0-9].*[0-9])/g,
        replacement: 'S',
        confidence: 0.7,
        description: 'S vs 5 disambiguation based on context'
      },
      {
        pattern: /(?<![A-Z0-9])[8B](?=.*[A-Z].*[A-Z])/g,
        replacement: 'B',
        confidence: 0.7,
        description: 'B vs 8 disambiguation based on context'
      },
      {
        pattern: /(?<![A-Z0-9])[6G](?=.*[A-Z].*[A-Z])/g,
        replacement: 'G',
        confidence: 0.7,
        description: 'G vs 6 disambiguation based on context'
      },

      // Position-specific corrections
      {
        pattern: /^[^A-Z]/,
        replacement: (match: string) => this.suggestFirstCharacter(match),
        confidence: 0.8,
        description: 'First character must be letter (World Manufacturer Identifier)'
      } as VinPatternRule,

      // Check digit validation-based corrections
      {
        pattern: /.{8}(.)/,
        replacement: (match: string, p1: string, offset: number, string: string) => {
          const calculatedCheckDigit = this.calculateCheckDigit(string);
          return calculatedCheckDigit;
        },
        confidence: 0.95,
        description: 'Check digit correction based on VIN algorithm'
      } as VinPatternRule,

      // Model year character validation (position 10)
      {
        pattern: /(.{9})([^A-HJ-NPR-Y1-9])/,
        replacement: '$1Y', // Default to current era
        confidence: 0.6,
        description: 'Model year character validation'
      }
    ];
  }

  private loadLearningData(): void {
    try {
      const stored = localStorage.getItem('vinAutoCorrection_learningData');
      if (stored) {
        const data = JSON.parse(stored);
        this.learningData = new Map(data.learningData || []);
        this.successfulCorrections = new Map(data.successfulCorrections || []);
      }
    } catch (error) {
      console.warn('Failed to load VIN correction learning data:', error);
    }
  }

  private saveLearningData(): void {
    try {
      const data = {
        learningData: Array.from(this.learningData.entries()),
        successfulCorrections: Array.from(this.successfulCorrections.entries()),
        lastUpdated: Date.now()
      };
      localStorage.setItem('vinAutoCorrection_learningData', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save VIN correction learning data:', error);
    }
  }

  // Main correction method
  public correctVin(detectedText: string): VinCorrectionResult {
    const originalVin = detectedText.toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (originalVin.length !== 17) {
      return {
        correctedVin: originalVin,
        confidence: 0,
        corrections: [],
        isValid: false
      };
    }

    // Check if already valid
    if (this.isValidVin(originalVin)) {
      return {
        correctedVin: originalVin,
        confidence: 1.0,
        corrections: [],
        isValid: true
      };
    }

    // Check learning data first
    const learned = this.learningData.get(originalVin);
    if (learned && this.isValidVin(learned)) {
      return {
        correctedVin: learned,
        confidence: 0.9,
        corrections: [{
          position: -1,
          original: originalVin,
          corrected: learned,
          reason: 'Machine learning correction'
        }],
        isValid: true
      };
    }

    // Apply correction rules
    let correctedVin = originalVin;
    const corrections: VinCorrectionResult['corrections'] = [];
    let totalConfidence = 0;

    for (const rule of this.correctionRules) {
      const beforeCorrection = correctedVin;

      if (typeof rule.replacement === 'function') {
        correctedVin = correctedVin.replace(rule.pattern, rule.replacement as any);
      } else {
        correctedVin = correctedVin.replace(rule.pattern, rule.replacement);
      }

      if (beforeCorrection !== correctedVin) {
        corrections.push({
          position: correctedVin.indexOf(correctedVin.charAt(correctedVin.length - 1)),
          original: beforeCorrection,
          corrected: correctedVin,
          reason: rule.description
        });
        totalConfidence += rule.confidence;
      }
    }

    // Normalize confidence
    const finalConfidence = Math.min(totalConfidence / this.correctionRules.length, 1.0);
    const isValid = this.isValidVin(correctedVin);

    // Learn from successful corrections
    if (isValid && corrections.length > 0) {
      this.learningData.set(originalVin, correctedVin);
      this.successfulCorrections.set(correctedVin, (this.successfulCorrections.get(correctedVin) || 0) + 1);
      this.saveLearningData();
    }

    return {
      correctedVin,
      confidence: finalConfidence,
      corrections,
      isValid
    };
  }

  // Advanced VIN validation with check digit
  private isValidVin(vin: string): boolean {
    if (!vin || vin.length !== 17) return false;
    if (/[IOQ]/.test(vin)) return false;

    const checkDigit = vin.charAt(8);
    const calculatedCheckDigit = this.calculateCheckDigit(vin);

    return checkDigit === calculatedCheckDigit || checkDigit === 'X';
  }

  private calculateCheckDigit(vin: string): string {
    const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
    const values: { [key: string]: number } = {
      'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8,
      'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'P': 7, 'R': 9,
      'S': 2, 'T': 3, 'U': 4, 'V': 5, 'W': 6, 'X': 7, 'Y': 8, 'Z': 9,
      '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9
    };

    let sum = 0;
    for (let i = 0; i < 17; i++) {
      if (i === 8) continue;
      const char = vin.charAt(i);
      sum += (values[char] || 0) * weights[i];
    }

    const remainder = sum % 11;
    return remainder === 10 ? 'X' : remainder.toString();
  }

  private suggestFirstCharacter(char: string): string {
    // Common manufacturer codes
    const manufacturerMap: { [key: string]: string } = {
      '1': '1', '4': '4', '5': '5', // USA
      '2': '2', // Canada
      '3': '3', // Mexico
      'J': 'J', // Japan
      'K': 'K', // Korea
      'L': 'L', // China
      'S': 'S', // UK
      'W': 'W', // Germany
      'V': 'V', // France
      'Z': 'Z'  // Italy
    };

    // If OCR detected a number, try to map to nearest manufacturer
    if (/[0-9]/.test(char)) {
      return char === '0' ? '1' : char;
    }

    return manufacturerMap[char] || char;
  }

  // Get correction statistics
  public getStats() {
    return {
      totalLearned: this.learningData.size,
      totalCorrections: Array.from(this.successfulCorrections.values()).reduce((a, b) => a + b, 0),
      topCorrections: Array.from(this.successfulCorrections.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
    };
  }

  // Export learning data for analysis
  public exportLearningData(): object {
    return {
      learningData: Array.from(this.learningData.entries()),
      successfulCorrections: Array.from(this.successfulCorrections.entries()),
      stats: this.getStats(),
      exportedAt: new Date().toISOString()
    };
  }

  // Manual learning input
  public teachCorrection(original: string, corrected: string): void {
    if (this.isValidVin(corrected)) {
      this.learningData.set(original.toUpperCase(), corrected.toUpperCase());
      this.saveLearningData();
    }
  }
}

// Export singleton instance
export const vinAutoCorrection = VinAutoCorrection.getInstance();