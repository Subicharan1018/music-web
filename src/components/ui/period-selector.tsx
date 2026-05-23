import { motion } from "motion/react"
import { cn } from "./cn"

export type Period = "Daily" | "Weekly" | "Monthly" | "All"

export interface PeriodSelectorProps {
  selected: Period
  onChange: (period: Period) => void
  className?: string
}

const PERIODS: Period[] = ["Daily", "Weekly", "Monthly", "All"]

export function PeriodSelector({ selected, onChange, className }: PeriodSelectorProps) {
  return (
    <div className={cn("flex items-center p-1 bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] rounded-full w-fit", className)}>
      {PERIODS.map((period) => {
        const isSelected = selected === period
        return (
          <button
            key={period}
            onClick={() => onChange(period)}
            className={cn(
              "relative px-4 py-1.5 text-sm font-medium transition-colors rounded-full outline-none",
              isSelected ? "text-primary-foreground" : "text-muted-foreground hover:text-primary-foreground/80"
            )}
          >
            {isSelected && (
              <motion.div
                layoutId="period-pill"
                className="absolute inset-0 bg-white/10 rounded-full"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{period}</span>
          </button>
        )
      })}
    </div>
  )
}
