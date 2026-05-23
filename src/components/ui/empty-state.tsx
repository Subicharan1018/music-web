import { DivideIcon as LucideIcon } from "lucide-react"
import { motion } from "motion/react"
import { cn } from "./cn"
import { LiquidGlassButton } from "./liquid-glass-button"

export interface EmptyStateProps {
  icon: typeof LucideIcon
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className={cn("flex flex-col items-center justify-center p-8 text-center", className)}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5 border border-white/10 mb-4 text-muted-foreground">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-medium text-primary-foreground mb-1">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>}
      
      {actionLabel && onAction && (
        <LiquidGlassButton onClick={onAction}>
          {actionLabel}
        </LiquidGlassButton>
      )}
    </motion.div>
  )
}
