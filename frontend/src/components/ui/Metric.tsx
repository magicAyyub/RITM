import React from "react"
import { cn } from "@/lib/utils"

interface MetricProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export function Metric({ className, ...props }: MetricProps) {
  return (
    <p
      className={cn(
        "text-3xl font-semibold text-gray-900 dark:text-gray-50",
        className
      )}
      {...props}
    />
  )
} 