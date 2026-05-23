import { motion } from "motion/react"
import { cn } from "./cn"

export interface NaviSkeletonProps {
  className?: string
}

export function NaviSkeleton({ className }: NaviSkeletonProps) {
  return (
    <motion.div
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={cn("bg-white/[0.06] rounded-md", className)}
    />
  )
}
