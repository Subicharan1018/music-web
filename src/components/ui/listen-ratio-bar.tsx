import { motion } from "motion/react"
import { cn } from "./cn"

export interface ListenRatioBarProps {
  ratio: number // 0 to 1
  className?: string
}

export function ListenRatioBar({ ratio, className }: ListenRatioBarProps) {
  // Ensure ratio is clamped
  const clamped = Math.max(0, Math.min(1, ratio))
  
  // Determine color based on ratio
  let colorClass = "bg-error"
  let shadowClass = "shadow-[0_0_8px_rgba(var(--color-error),0.6)]"
  
  if (clamped >= 0.8) {
    colorClass = "bg-success"
    shadowClass = "shadow-[0_0_8px_rgba(var(--color-success),0.6)]"
  } else if (clamped >= 0.5) {
    colorClass = "bg-warning"
    shadowClass = "shadow-[0_0_8px_rgba(var(--color-warning),0.6)]"
  }

  return (
    <div className={cn("w-full h-1 bg-white/10 rounded-full overflow-hidden", className)}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${clamped * 100}%` }}
        transition={{ duration: 1, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
        className={cn("h-full rounded-full relative", colorClass, shadowClass)}
      />
    </div>
  )
}
