import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  variant?: "default" | "success" | "warning" | "danger"
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, variant = "default", ...props }, ref) => {
    const variantStyles = {
      default: "bg-primary",
      success: "bg-emerald-500",
      warning: "bg-amber-500",
      danger: "bg-red-500",
    }

    return (
      <div
        ref={ref}
        className={cn(
          "relative h-2.5 w-full overflow-hidden rounded-full bg-secondary",
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "h-full w-full flex-1 rounded-full transition-all duration-500 ease-out",
            variantStyles[variant]
          )}
          style={{ transform: `translateX(-${100 - Math.min(Math.max(value, 0), 100)}%)` }}
        />
      </div>
    )
  }
)
Progress.displayName = "Progress"

export { Progress }
