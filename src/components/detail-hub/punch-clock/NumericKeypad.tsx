/**
 * NumericKeypad Component
 *
 * Enterprise-style numeric keypad for PIN entry
 *
 * Props:
 * - onNumberClick: (number: string) => void
 * - onBackspace: () => void
 * - onSubmit: () => void
 * - disabled?: boolean (disables submit button)
 */

import { Button } from "@/components/ui/button";
import { Delete, Check } from "lucide-react";
import { useTranslation } from "react-i18next";

interface NumericKeypadProps {
  onNumberClick: (number: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export function NumericKeypad({ onNumberClick, onBackspace, onSubmit, disabled }: NumericKeypadProps) {
  const { t } = useTranslation();

  const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="grid grid-cols-3 gap-3" role="group" aria-label="Numeric keypad for PIN entry">
      {/* Numbers 1-9 */}
      {numbers.map((num) => (
        <Button
          key={num}
          variant="outline"
          size="lg"
          className="h-16 text-2xl font-semibold hover:bg-gray-100 hover:border-gray-400"
          onClick={() => onNumberClick(num)}
          aria-label={`Number ${num}`}
        >
          {num}
        </Button>
      ))}

      {/* Backspace */}
      <Button
        variant="outline"
        size="lg"
        className="h-16 hover:bg-red-50 hover:border-red-400"
        onClick={onBackspace}
        aria-label="Delete last digit"
      >
        <Delete className="w-6 h-6" aria-hidden="true" />
        <span className="sr-only">Backspace</span>
      </Button>

      {/* Zero */}
      <Button
        variant="outline"
        size="lg"
        className="h-16 text-2xl font-semibold hover:bg-gray-100 hover:border-gray-400"
        onClick={() => onNumberClick('0')}
        aria-label="Number 0"
      >
        0
      </Button>

      {/* Submit */}
      <Button
        size="lg"
        className="h-16 bg-emerald-600 hover:bg-emerald-700"
        onClick={onSubmit}
        disabled={disabled}
        aria-label={disabled ? "Submit PIN (disabled - enter at least 4 digits)" : "Submit PIN"}
      >
        <Check className="w-6 h-6" aria-hidden="true" />
        <span className="sr-only">Submit</span>
      </Button>
    </div>
  );
}
