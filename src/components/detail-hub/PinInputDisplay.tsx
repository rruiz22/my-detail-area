/**
 * PinInputDisplay Component
 *
 * Visual PIN input display showing individual boxes for each digit (like OTP input).
 * Shows filled state with bullet points and error state with red styling.
 *
 * Part of the intelligent kiosk system.
 */

interface PinInputDisplayProps {
  pin: string;
  length: number; // 4 or 6
  error?: boolean;
}

export function PinInputDisplay({ pin, length, error = false }: PinInputDisplayProps) {
  const boxes = Array.from({ length }, (_, i) => i);

  return (
    <div className="flex justify-center gap-3">
      {boxes.map(i => {
        const isFilled = pin.length > i;
        const isActive = pin.length === i; // Currently being filled

        return (
          <div
            key={i}
            className={`
              w-14 h-14 rounded-lg border-2 flex items-center justify-center
              text-2xl font-bold transition-all duration-200
              ${error
                ? 'border-red-500 bg-red-50'
                : isFilled
                  ? 'border-emerald-500 bg-emerald-50'
                  : isActive
                    ? 'border-gray-400 bg-gray-50'
                    : 'border-gray-300 bg-white'
              }
            `}
          >
            {isFilled ? (
              <span className={error ? 'text-red-600' : 'text-emerald-600'}>•</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
