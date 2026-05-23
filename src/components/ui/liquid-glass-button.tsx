import * as React from "react"
import { motion, HTMLMotionProps } from "motion/react"

import { cn } from "./cn"

export interface LiquidGlassButtonProps extends HTMLMotionProps<"button"> {
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
}

export const LiquidGlassButton = React.forwardRef<HTMLButtonElement, LiquidGlassButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-primary/15 text-primary-foreground backdrop-blur-md border border-white/10 hover:bg-primary/25":
              variant === "default",
            "border border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10 text-primary-foreground":
              variant === "outline",
            "hover:bg-white/10 text-primary-foreground": variant === "ghost",
            "h-10 px-4 py-2 rounded-md": size === "default",
            "h-9 rounded-sm px-3": size === "sm",
            "h-11 rounded-md px-8": size === "lg",
            "size-10 rounded-md": size === "icon",
          },
          className
        )}
        {...props}
      />
    )
  }
)
LiquidGlassButton.displayName = "LiquidGlassButton"
