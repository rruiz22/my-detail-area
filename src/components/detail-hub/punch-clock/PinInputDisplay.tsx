/**
 * PinInputDisplay Component
 *
 * Displays PIN input as dots (like iOS passcode)
 *
 * Props:
 * - pin: string (current PIN value)
 * - length: number (expected PIN length, default 6)
 * - error?: boolean (shows red border on error)
 */

interface PinInputDisplayProps {
  pin: string;
  length?: number;
  error?: boolean;
}

export function PinInputDisplay({ pin, length = 6, error = false }: PinInputDisplayProps) {
  const dots = Array.from({ length }, (_, i) => i);

  return (
    <div className="flex justify-center gap-3">
      {dots.map((index) => (
        <div
          key={index}
          className={`
            w-14 h-14 rounded-lg border-2 flex items-center justify-center
            transition-all
            ${error ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'}
            ${pin.length > index ? (error ? 'bg-red-100' : 'bg-emerald-50 border-emerald-500') : ''}
          `}
        >
          {pin.length > index && (
            <div className={`w-3 h-3 rounded-full ${error ? 'bg-red-600' : 'bg-emerald-600'}`} />
          )}
        </div>
      ))}
    </div>
  );
}
