import React from "react"
import { DownloadIcon } from "@radix-ui/react-icons"

interface ExportButtonProps {
  onClick: () => void
  className?: string
}

export const ExportButton: React.FC<ExportButtonProps> = ({ onClick, className }) => {
  return (
    <button
      onClick={onClick}
      className={`p-2 hover:bg-gray-100 rounded-md transition-colors ${className}`}
      title="Exporter les données"
    >
      <DownloadIcon className="w-4 h-4" />
    </button>
  )
} 