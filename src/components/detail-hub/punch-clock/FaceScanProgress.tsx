/**
 * FaceScanProgress Component
 *
 * Enhanced face scanning UI with visual feedback and progress indicators
 *
 * Features:
 * - Animated progress ring showing time remaining
 * - Dynamic status messages
 * - Face guide overlay with breathing animation
 * - Countdown timer
 * - Loading states
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Camera, CheckCircle, AlertCircle } from "lucide-react";

interface FaceScanProgressProps {
  scanning: boolean;
  message: string;
  timeoutSeconds?: number;
  onTimeout?: () => void;
}

export function FaceScanProgress({
  scanning,
  message,
  timeoutSeconds = 30,
  onTimeout
}: FaceScanProgressProps) {
  const { t } = useTranslation();
  const [secondsRemaining, setSecondsRemaining] = useState(timeoutSeconds);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!scanning) {
      setSecondsRemaining(timeoutSeconds);
      setProgress(100);
      return;
    }

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeout?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [scanning, timeoutSeconds, onTimeout]);

  useEffect(() => {
    if (scanning) {
      setProgress((secondsRemaining / timeoutSeconds) * 100);
    }
  }, [secondsRemaining, timeoutSeconds, scanning]);

  if (!scanning) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div className="relative">
        {/* Animated Progress Ring */}
        <svg
          className="absolute inset-0 -rotate-90"
          width="320"
          height="400"
          style={{
            filter: 'drop-shadow(0 4px 6px rgba(16, 185, 129, 0.3))'
          }}
        >
          {/* Background circle */}
          <rect
            x="28"
            y="60"
            width="264"
            height="280"
            rx="20"
            fill="none"
            stroke="rgba(16, 185, 129, 0.2)"
            strokeWidth="4"
            className="animate-pulse"
          />

          {/* Progress rect */}
          <rect
            x="28"
            y="60"
            width="264"
            height="280"
            rx="20"
            fill="none"
            stroke="rgb(16, 185, 129)"
            strokeWidth="4"
            strokeDasharray="1088"
            strokeDashoffset={1088 * (1 - progress / 100)}
            className="transition-all duration-1000 ease-linear"
            style={{
              strokeLinecap: 'round'
            }}
          />
        </svg>

        {/* Face Guide Overlay */}
        <div className="w-64 h-80 border-4 border-emerald-500 rounded-2xl animate-breathing" />

        {/* Instruction Badge */}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg animate-fade-in flex items-center gap-2">
          <Camera className="w-4 h-4" />
          {t('detail_hub.punch_clock.messages.position_face')}
        </div>

        {/* Countdown Timer */}
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900/80 text-white px-4 py-2 rounded-full text-sm font-mono shadow-lg animate-fade-in flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{secondsRemaining}s</span>
        </div>

        {/* Status Message */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg border border-emerald-200 max-w-[200px] text-center">
            <div className="flex items-center justify-center gap-2 text-emerald-700 text-sm font-medium">
              {message.includes('detected') || message.includes('Detected') ? (
                <CheckCircle className="w-4 h-4 text-emerald-500 animate-scale-in" />
              ) : message.includes('error') || message.includes('Error') ? (
                <AlertCircle className="w-4 h-4 text-red-500 animate-bounce-subtle" />
              ) : (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              <span className="line-clamp-2">{message}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes breathing {
          0%, 100% {
            transform: scale(1);
            border-color: rgb(16, 185, 129);
          }
          50% {
            transform: scale(1.02);
            border-color: rgb(52, 211, 153);
          }
        }

        @keyframes fade-in {
          0% {
            opacity: 0;
            transform: translateY(-5px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scale-in {
          0% {
            transform: scale(0);
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes bounce-subtle {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-3px);
          }
        }

        .animate-breathing {
          animation: breathing 3s ease-in-out infinite;
        }

        .animate-fade-in {
          animation: fade-in 0.4s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }

        .animate-bounce-subtle {
          animation: bounce-subtle 0.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
