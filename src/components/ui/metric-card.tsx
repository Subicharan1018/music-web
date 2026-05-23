import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "./cn"

interface MetricCardProps {
  title: string
  value: string | number
  trend?: "up" | "down"
  trendValue?: string
  className?: string
}

export function MetricCard({ title, value, trend, trendValue, className }: MetricCardProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col p-4 md:p-6 overflow-hidden transition-all duration-250",
        "bg-white/[0.04] backdrop-blur-[12px] border border-white/[0.08] rounded-xl shadow-sm",
        "hover:shadow-[0_0_24px_rgba(var(--color-primary),0.1)] hover:border-primary/20",
        className
      )}
    >
      {/* Soft glow on hover */}
      <div className="absolute inset-0 bg-primary/0 hover:bg-primary/5 transition-colors duration-250 pointer-events-none rounded-xl" />

      <h3 className="text-sm font-medium text-muted-foreground mb-2 relative z-10">
        {title}
      </h3>
      <div className="flex items-end justify-between mt-auto relative z-10">
        <div className="text-2xl lg:text-3xl font-mono font-semibold text-primary-foreground tabular-nums leading-none">
          {value}
        </div>
        {trend && trendValue && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
              trend === "up" ? "text-success bg-success/10" : "text-error bg-error/10"
            )}
          >
            {trend === "up" ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            <span>{trendValue}</span>
          </div>
        )}
      </div>
    </div>
  )
}
