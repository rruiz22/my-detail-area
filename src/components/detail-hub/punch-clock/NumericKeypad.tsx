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
    <div className="grid grid-cols-3 gap-3">
      {/* Numbers 1-9 */}
      {numbers.map((num) => (
        <Button
          key={num}
          variant="outline"
          size="lg"
          className="h-16 text-2xl font-semibold hover:bg-gray-100 hover:border-gray-400"
          onClick={() => onNumberClick(num)}
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
      >
        <Delete className="w-6 h-6" />
      </Button>

      {/* Zero */}
      <Button
        variant="outline"
        size="lg"
        className="h-16 text-2xl font-semibold hover:bg-gray-100 hover:border-gray-400"
        onClick={() => onNumberClick('0')}
      >
        0
      </Button>

      {/* Submit */}
      <Button
        size="lg"
        className="h-16 bg-emerald-600 hover:bg-emerald-700"
        onClick={onSubmit}
        disabled={disabled}
      >
        <Check className="w-6 h-6" />
      </Button>
    </div>
  );
}
