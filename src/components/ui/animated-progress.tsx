import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedProgressProps {
  value: number;
  max?: number;
  className?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  showShimmer?: boolean;
  animationDuration?: number;
}

export function AnimatedProgress({
  value,
  max = 100,
  className,
  status = 'pending',
  showShimmer = true,
  animationDuration = 0.8
}: AnimatedProgressProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Animate to new value when it changes
  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => {
      setAnimatedValue(value);
      const endTimer = setTimeout(() => setIsAnimating(false), animationDuration * 1000);
      return () => clearTimeout(endTimer);
    }, 50);

    return () => clearTimeout(timer);
  }, [value, animationDuration]);

  // Get colors based on status and progress
  const { bgColor, fillColor, glowColor, shimmerColor } = useMemo(() => {
    switch (status) {
      case 'pending':
        return {
          bgColor: 'bg-gray-100',
          fillColor: 'from-blue-400 to-blue-500',
          glowColor: 'shadow-blue-200',
          shimmerColor: 'bg-blue-200'
        };
      case 'in_progress':
        return {
          bgColor: 'bg-orange-100',
          fillColor: 'from-orange-400 to-orange-500',
          glowColor: 'shadow-orange-200',
          shimmerColor: 'bg-orange-200'
        };
      case 'completed':
        return {
          bgColor: 'bg-green-100',
          fillColor: 'from-emerald-400 to-emerald-500',
          glowColor: 'shadow-emerald-200',
          shimmerColor: 'bg-emerald-200'
        };
      case 'cancelled':
        return {
          bgColor: 'bg-gray-100',
          fillColor: 'from-gray-400 to-gray-500',
          glowColor: 'shadow-gray-200',
          shimmerColor: 'bg-gray-200'
        };
      case 'on_hold':
        return {
          bgColor: 'bg-yellow-100',
          fillColor: 'from-yellow-400 to-yellow-500',
          glowColor: 'shadow-yellow-200',
          shimmerColor: 'bg-yellow-200'
        };
      default:
        return {
          bgColor: 'bg-gray-100',
          fillColor: 'from-gray-400 to-gray-500',
          glowColor: 'shadow-gray-200',
          shimmerColor: 'bg-gray-200'
        };
    }
  }, [status]);

  const percentage = Math.min((animatedValue / max) * 100, 100);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Background track */}
      <div className={cn(
        "w-full h-3 rounded-full relative",
        bgColor,
        "transition-all duration-300"
      )}>
        {/* Animated progress fill */}
        <motion.div
          className={cn(
            "h-full rounded-full relative overflow-hidden",
            "bg-gradient-to-r",
            fillColor,
            isAnimating && "shadow-md",
            isAnimating && glowColor
          )}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{
            duration: animationDuration,
            ease: [0.25, 0.46, 0.45, 0.94], // Custom easing for smooth feel
          }}
        >
          {/* Shimmer effect */}
          {showShimmer && percentage > 0 && (
            <motion.div
              className={cn(
                "absolute inset-0 -skew-x-12 w-6",
                shimmerColor,
                "opacity-40"
              )}
              animate={{
                x: ['-100%', '100%']
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear",
                delay: animationDuration
              }}
            />
          )}

          {/* Subtle shine effect */}
          <div className={cn(
            "absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent",
            "transform -skew-x-12"
          )} />
        </motion.div>

        {/* Pulse effect for recent updates */}
        {isAnimating && (
          <motion.div
            className={cn(
              "absolute inset-0 rounded-full",
              fillColor.replace('from-', 'bg-').split(' ')[0],
              "opacity-20"
            )}
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0.2, 0.1, 0]
            }}
            transition={{
              duration: 1,
              ease: "easeOut"
            }}
          />
        )}
      </div>

      {/* Completion celebration effect */}
      {percentage >= 100 && status === 'completed' && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          transition={{ duration: 0.6, ease: "backOut" }}
        >
          <motion.div
            className="w-2 h-2 bg-emerald-400 rounded-full"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [1, 0.5, 1]
            }}
            transition={{
              duration: 1,
              repeat: 3,
              ease: "easeInOut"
            }}
          />
        </motion.div>
      )}
    </div>
  );
}