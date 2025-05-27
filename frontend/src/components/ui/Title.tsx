import React from "react"
import { cn } from "@/lib/utils"

interface TitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export function Title({ className, ...props }: TitleProps) {
  return (
    <h3
      className={cn(
        "text-lg font-medium text-gray-900 dark:text-gray-50",
        className
      )}
      {...props}
    />
  )
} 