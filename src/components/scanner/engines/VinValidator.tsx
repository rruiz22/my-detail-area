import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface VinValidationResult {
  isValid: boolean;
  confidence: number;
  checkDigitValid: boolean;
  year?: number;
  manufacturer?: string;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

interface VinComponents {
  wmi: string;           // World Manufacturer Identifier (positions 1-3)
  vds: string;           // Vehicle Descriptor Section (positions 4-9)
  checkDigit: string;    // Check digit (position 9)
  modelYear: string;     // Model year (position 10)
  plantCode: string;     // Plant code (position 11)
  serialNumber: string;  // Serial number (positions 12-17)
}

export function useVinValidator() {
  const { t } = useTranslation();

  const vinWeights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
  const vinValues: { [key: string]: number } = {
    'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8,
    'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'P': 7, 'R': 9,
    'S': 2, 'T': 3, 'U': 4, 'V': 5, 'W': 6, 'X': 7, 'Y': 8, 'Z': 9,
    '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9
  };

  const yearCodes: { [key: string]: number } = {
    'A': 1980, 'B': 1981, 'C': 1982, 'D': 1983, 'E': 1984, 'F': 1985, 'G': 1986, 'H': 1987,
    'J': 1988, 'K': 1989, 'L': 1990, 'M': 1991, 'N': 1992, 'P': 1993, 'R': 1994, 'S': 1995,
    'T': 1996, 'V': 1997, 'W': 1998, 'X': 1999, 'Y': 2000, '1': 2001, '2': 2002, '3': 2003,
    '4': 2004, '5': 2005, '6': 2006, '7': 2007, '8': 2008, '9': 2009
  };

  const manufacturerCodes: { [key: string]: string } = {
    '1': 'United States', '4': 'United States', '5': 'United States',
    '2': 'Canada', '3': 'Mexico',
    'J': 'Japan', 'K': 'South Korea', 'L': 'China',
    'S': 'United Kingdom', 'T': 'Czechoslovakia', 'V': 'France',
    'W': 'Germany', 'Y': 'Sweden', 'Z': 'Italy'
  };

  const parseVinComponents = useCallback((vin: string): VinComponents => {
    return {
      wmi: vin.substring(0, 3),
      vds: vin.substring(3, 9),
      checkDigit: vin.substring(8, 9),
      modelYear: vin.substring(9, 10),
      plantCode: vin.substring(10, 11),
      serialNumber: vin.substring(11, 17)
    };
  }, []);

  const calculateCheckDigit = useCallback((vin: string): string => {
    let sum = 0;
    
    for (let i = 0; i < 17; i++) {
      if (i !== 8) { // Skip check digit position
        const value = vinValues[vin[i]] || 0;
        sum += value * vinWeights[i];
      }
    }
    
    const checkDigit = sum % 11;
    return checkDigit === 10 ? 'X' : checkDigit.toString();
  }, [vinValues, vinWeights]);

  const validateBasicFormat = useCallback((vin: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Check length
    if (vin.length !== 17) {
      errors.push(t('vin_validator.errors.invalid_length'));
      return { valid: false, errors };
    }
    
    // Check for invalid characters (I, O, Q not allowed)
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
      if (/[IOQ]/.test(vin)) {
        errors.push(t('vin_validator.errors.invalid_characters_ioq'));
      } else {
        errors.push(t('vin_validator.errors.invalid_characters'));
      }
      return { valid: false, errors };
    }
    
    return { valid: true, errors: [] };
  }, [t]);

  const validateCheckDigit = useCallback((vin: string): boolean => {
    const expectedCheckDigit = calculateCheckDigit(vin);
    return vin[8] === expectedCheckDigit;
  }, [calculateCheckDigit]);

  const getModelYear = useCallback((vin: string): number | undefined => {
    const yearChar = vin[9];
    const baseYear = yearCodes[yearChar];
    
    if (!baseYear) return undefined;
    
    // Determine if it's the first or second cycle (30-year cycles)
    const currentYear = new Date().getFullYear();
    const year1 = baseYear;
    const year2 = baseYear + 30;
    
    // Choose the year closest to current year that makes sense
    if (Math.abs(currentYear - year1) <= Math.abs(currentYear - year2)) {
      return year1;
    } else {
      return year2;
    }
  }, [yearCodes]);

  const getManufacturer = useCallback((vin: string): string | undefined => {
    const wmi = vin.substring(0, 3);
    const firstChar = wmi[0];

    return manufacturerCodes[firstChar];
  }, [manufacturerCodes]);

  const validateVin = useCallback((vin: string): VinValidationResult => {
    const cleanVin = vin.toUpperCase().trim();
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    // Basic format validation
    const basicValidation = validateBasicFormat(cleanVin);
    if (!basicValidation.valid) {
      return {
        isValid: false,
        confidence: 0,
        checkDigitValid: false,
        errors: basicValidation.errors,
        warnings,
        suggestions
      };
    }
    
    // Check digit validation
    const checkDigitValid = validateCheckDigit(cleanVin);
    if (!checkDigitValid) {
      errors.push(t('vin_validator.errors.invalid_check_digit'));
    }
    
    // Parse components
    const components = parseVinComponents(cleanVin);
    const year = getModelYear(cleanVin);
    const manufacturer = getManufacturer(cleanVin);
    
    // Additional validations and warnings
    if (!year) {
      warnings.push(t('vin_validator.warnings.unknown_year'));
    } else if (year > new Date().getFullYear() + 1) {
      warnings.push(t('vin_validator.warnings.future_year'));
    } else if (year < 1980) {
      warnings.push(t('vin_validator.warnings.old_year'));
    }
    
    if (!manufacturer) {
      warnings.push(t('vin_validator.warnings.unknown_manufacturer'));
    }
    
    // Calculate confidence score
    let confidence = 0.5; // Base confidence
    
    if (checkDigitValid) confidence += 0.3;
    if (year && year >= 1980 && year <= new Date().getFullYear() + 1) confidence += 0.1;
    if (manufacturer) confidence += 0.1;
    
    // Suggestions for common issues
    if (!checkDigitValid) {
      const expectedCheckDigit = calculateCheckDigit(cleanVin);
      suggestions.push(t('vin_validator.suggestions.check_digit_should_be', { digit: expectedCheckDigit }));
    }
    
    // Check for common OCR errors
    const commonSubstitutions = [
      { from: '0', to: 'O' },
      { from: '1', to: 'I' },
      { from: '5', to: 'S' },
      { from: '8', to: 'B' },
      { from: '6', to: 'G' }
    ];
    
    for (const sub of commonSubstitutions) {
      if (cleanVin.includes(sub.from)) {
        const suggested = cleanVin.replace(new RegExp(sub.from, 'g'), sub.to);
        if (validateCheckDigit(suggested)) {
          suggestions.push(t('vin_validator.suggestions.try_substitution', { 
            from: sub.from, 
            to: sub.to,
            vin: suggested 
          }));
        }
      }
    }
    
    const isValid = errors.length === 0;
    
    return {
      isValid,
      confidence: Math.min(1, confidence),
      checkDigitValid,
      year,
      manufacturer,
      errors,
      warnings,
      suggestions
    };
  }, [validateBasicFormat, validateCheckDigit, parseVinComponents, getModelYear, getManufacturer, calculateCheckDigit, t]);

  const validateMultipleVins = useCallback((vins: string[]): VinValidationResult[] => {
    return vins.map(validateVin);
  }, [validateVin]);

  const suggestCorrections = useCallback((vin: string): string[] => {
    const suggestions: string[] = [];
    const cleanVin = vin.toUpperCase().trim();
    
    // Common OCR corrections
    const corrections = [
      { pattern: /O/g, replacement: '0' },
      { pattern: /I/g, replacement: '1' },
      { pattern: /Q/g, replacement: '0' },
      { pattern: /[^A-HJ-NPR-Z0-9]/g, replacement: '' }
    ];
    
    let corrected = cleanVin;
    for (const correction of corrections) {
      corrected = corrected.replace(correction.pattern, correction.replacement);
    }
    
    if (corrected !== cleanVin && validateVin(corrected).isValid) {
      suggestions.push(corrected);
    }
    
    return suggestions;
  }, [validateVin]);

  return {
    validateVin,
    validateMultipleVins,
    suggestCorrections,
    calculateCheckDigit,
    parseVinComponents,
    getModelYear,
    getManufacturer
  };
}

export function VinValidator() {
  return null; // Hook-only component
}