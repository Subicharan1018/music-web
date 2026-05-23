import { WifiOff } from "lucide-react"
import { motion } from "motion/react"
import { cn } from "./cn"
import { LiquidGlassButton } from "./liquid-glass-button"

export interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({ 
  title = "Connection Error", 
  message = "Something went wrong while loading the data.", 
  onRetry, 
  className 
}: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className={cn("flex flex-col items-center justify-center p-8 text-center", className)}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-error/10 border border-error/20 mb-4 text-error">
        <WifiOff className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-medium text-primary-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{message}</p>
      
      {onRetry && (
        <LiquidGlassButton variant="outline" onClick={onRetry}>
          Retry
        </LiquidGlassButton>
      )}
    </motion.div>
  )
}
