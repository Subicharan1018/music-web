import { motion } from "motion/react"
import { cn } from "./cn"

export interface HourlyHeatmapProps {
  data: number[] // exactly 24 elements representing hours 0-23
  className?: string
}

export function HourlyHeatmap({ data, className }: HourlyHeatmapProps) {
  // Pad or trim to exactly 24
  const hourlyData = data.slice(0, 24).concat(Array(Math.max(0, 24 - data.length)).fill(0))
  const maxCount = Math.max(...hourlyData, 1)

  const labels = [0, 6, 12, 18]

  return (
    <div className={cn("w-full flex flex-col gap-2", className)}>
      <div className="flex items-end justify-between h-24 gap-1 w-full px-1">
        {hourlyData.map((count, i) => {
          const intensity = count / maxCount
          return (
            <motion.div
              key={i}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: `${Math.max(4, intensity * 100)}%`, opacity: Math.max(0.2, intensity) }}
              transition={{ duration: 0.5, delay: i * 0.02, ease: [0.4, 0, 0.2, 1] }}
              className="flex-1 bg-primary rounded-t-sm"
              title={`Hour ${i}: ${count} plays`}
            />
          )
        })}
      </div>
      
      <div className="flex justify-between px-1 text-[10px] text-muted-foreground font-mono">
        {labels.map((hour) => (
          <div key={hour} className="text-center w-8">
            {hour}:00
          </div>
        ))}
      </div>
    </div>
  )
}
