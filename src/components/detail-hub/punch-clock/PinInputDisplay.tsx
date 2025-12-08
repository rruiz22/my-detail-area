/**
 * PinInputDisplay Component
 *
 * Displays PIN input as dynamic dots (banking/iOS style)
 * No fixed number of squares - dots grow as user types
 *
 * Props:
 * - pin: string (current PIN value)
 * - length: number (maximum PIN length, default 6)
 * - error?: boolean (shows red dots on error)
 */

interface PinInputDisplayProps {
  pin: string;
  length?: number;
  error?: boolean;
}

export function PinInputDisplay({ pin, length = 6, error = false }: PinInputDisplayProps) {
  // Only show dots for entered digits (grow dynamically)
  const enteredDots = pin.length;

  return (
    <div className="flex justify-center items-center gap-2 py-4 min-h-[40px]">
      {enteredDots > 0 && (
        // Show dots only for entered digits
        Array.from({ length: enteredDots }, (_, i) => (
          <div
            key={i}
            className={`
              w-3 h-3 rounded-full transition-all animate-in fade-in zoom-in duration-200
              ${error ? 'bg-red-600' : 'bg-emerald-600'}
            `}
          />
        ))
      )}
    </div>
  );
}
