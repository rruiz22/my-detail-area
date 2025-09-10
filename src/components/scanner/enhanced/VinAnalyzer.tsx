import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Car, 
  Calendar,
  MapPin,
  Factory,
  Hash,
  Shield
} from 'lucide-react';

interface VinAnalysis {
  vin: string;
  isValid: boolean;
  confidence: number;
  wmi: string;              // World Manufacturer Identifier
  vds: string;              // Vehicle Descriptor Section
  checkDigit: string;       // Check digit
  modelYear: string;        // Model year
  plantCode: string;        // Assembly plant code
  serialNumber: string;     // Serial number
  manufacturer?: string;
  country?: string;
  vehicleType?: string;
}

interface VinAnalyzerProps {
  vin: string;
  className?: string;
}

export function VinAnalyzer({ vin, className }: VinAnalyzerProps) {
  const { t } = useTranslation();
  const [analysis, setAnalysis] = useState<VinAnalysis | null>(null);

  const analyzeVin = useCallback((vinCode: string): VinAnalysis => {
    if (!vinCode || vinCode.length !== 17) {
      return {
        vin: vinCode,
        isValid: false,
        confidence: 0,
        wmi: '',
        vds: '',
        checkDigit: '',
        modelYear: '',
        plantCode: '',
        serialNumber: ''
      };
    }

    // Basic VIN structure parsing
    const wmi = vinCode.substring(0, 3);
    const vds = vinCode.substring(3, 9);
    const checkDigit = vinCode.charAt(8);
    const modelYear = vinCode.charAt(9);
    const plantCode = vinCode.charAt(10);
    const serialNumber = vinCode.substring(11);

    // Simple manufacturer detection (expandable)
    const manufacturerMap: Record<string, string> = {
      '1': 'United States',
      '2': 'Canada',
      '3': 'Mexico',
      'J': 'Japan',
      'K': 'Korea',
      'L': 'China',
      'S': 'United Kingdom',
      'T': 'Czechoslovakia',
      'V': 'France',
      'W': 'Germany',
      'Y': 'Sweden',
      'Z': 'Italy'
    };

    const country = manufacturerMap[wmi.charAt(0)] || 'Unknown';

    // Model year mapping (simplified)
    const yearMap: Record<string, string> = {
      'A': '2010', 'B': '2011', 'C': '2012', 'D': '2013', 'E': '2014',
      'F': '2015', 'G': '2016', 'H': '2017', 'J': '2018', 'K': '2019',
      'L': '2020', 'M': '2021', 'N': '2022', 'P': '2023', 'R': '2024',
      'S': '2025', 'T': '2026', 'V': '2027', 'W': '2028', 'X': '2029',
      'Y': '2030'
    };

    const year = yearMap[modelYear] || `20${modelYear}` || 'Unknown';

    // Check digit validation (basic)
    const isValidCheckDigit = /[0-9X]/.test(checkDigit);
    const hasValidPattern = /^[A-HJ-NPR-Z0-9]{17}$/.test(vinCode);
    
    const confidence = hasValidPattern && isValidCheckDigit ? 0.95 : 0.3;

    return {
      vin: vinCode,
      isValid: hasValidPattern && isValidCheckDigit,
      confidence,
      wmi,
      vds,
      checkDigit,
      modelYear: year,
      plantCode,
      serialNumber,
      country,
      manufacturer: `${wmi} (${country})`
    };
  }, []);

  // Analyze VIN when component mounts or vin changes
  useState(() => {
    if (vin) {
      setAnalysis(analyzeVin(vin));
    }
  });

  if (!vin || !analysis) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="w-5 h-5" />
            VIN Analysis
          </CardTitle>
          <CardDescription>Enter a VIN to see detailed analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No VIN provided for analysis
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car className="w-5 h-5" />
            VIN Analysis
          </div>
          <div className="flex items-center gap-2">
            {analysis.isValid ? (
              <CheckCircle className="w-5 h-5 text-success" />
            ) : (
              <XCircle className="w-5 h-5 text-destructive" />
            )}
            <Badge variant={analysis.isValid ? "default" : "destructive"}>
              {analysis.isValid ? 'Valid' : 'Invalid'}
            </Badge>
          </div>
        </CardTitle>
        <CardDescription>
          Confidence: {Math.round(analysis.confidence * 100)}%
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* VIN Display */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Vehicle Identification Number</label>
          <div className="font-mono text-lg p-3 bg-muted rounded-lg border">
            {analysis.vin}
          </div>
        </div>

        <Separator />

        {/* VIN Breakdown */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-medium">
              <MapPin className="w-4 h-4" />
              Manufacturer Info
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">WMI (1-3):</span>
                <span className="font-mono">{analysis.wmi}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Country:</span>
                <span>{analysis.country}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Manufacturer:</span>
                <span>{analysis.manufacturer}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 font-medium">
              <Calendar className="w-4 h-4" />
              Vehicle Details
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model Year:</span>
                <span>{analysis.modelYear}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Check Digit:</span>
                <span className="font-mono">{analysis.checkDigit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plant Code:</span>
                <span className="font-mono">{analysis.plantCode}</span>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* VDS and Serial */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-medium">
              <Shield className="w-4 h-4" />
              Vehicle Descriptor
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">VDS (4-9):</span>
                <span className="font-mono">{analysis.vds}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 font-medium">
              <Hash className="w-4 h-4" />
              Serial Number
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Serial (12-17):</span>
                <span className="font-mono">{analysis.serialNumber}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Validation Status */}
        {!analysis.isValid && (
          <>
            <Separator />
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <div className="text-sm">
                <div className="font-medium text-destructive">Invalid VIN Format</div>
                <div className="text-muted-foreground">
                  VIN must be exactly 17 characters and cannot contain I, O, or Q
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}