/**
 * NumericKeypad Component
 *
 * Visual numeric keypad (0-9) with backspace and submit buttons.
 * Designed for PIN entry in kiosk systems.
 *
 * Part of the intelligent kiosk system.
 */

import { Button } from "@/components/ui/button";
import { Delete, CheckCircle } from "lucide-react";

interface NumericKeypadProps {
  onNumberClick: (num: number) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export function NumericKeypad({
  onNumberClick,
  onBackspace,
  onSubmit,
  disabled = false
}: NumericKeypadProps) {
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
      {/* Numbers 1-9 */}
      {numbers.map(num => (
        <Button
          key={num}
          variant="outline"
          size="lg"
          className="h-16 text-2xl font-bold hover:bg-gray-100 active:scale-95 transition-transform"
          onClick={() => onNumberClick(num)}
          disabled={disabled}
          type="button"
        >
          {num}
        </Button>
      ))}

      {/* Bottom row: Backspace, 0, Submit */}
      <Button
        variant="outline"
        size="lg"
        className="h-16 hover:bg-red-50 active:scale-95 transition-transform"
        onClick={onBackspace}
        disabled={disabled}
        type="button"
      >
        <Delete className="w-6 h-6 text-red-600" />
      </Button>

      <Button
        variant="outline"
        size="lg"
        className="h-16 text-2xl font-bold hover:bg-gray-100 active:scale-95 transition-transform"
        onClick={() => onNumberClick(0)}
        disabled={disabled}
        type="button"
      >
        0
      </Button>

      <Button
        variant="outline"
        size="lg"
        className="h-16 bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600 active:scale-95 transition-transform"
        onClick={onSubmit}
        disabled={disabled}
        type="button"
      >
        <CheckCircle className="w-6 h-6" />
      </Button>
    </div>
  );
}
