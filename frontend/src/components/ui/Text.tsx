import React from "react"
import { cn } from "@/lib/utils"

interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export function Text({ className, ...props }: TextProps) {
  return (
    <p
      className={cn(
        "text-sm text-gray-600 dark:text-gray-400",
        className
      )}
      {...props}
    />
  )
} 