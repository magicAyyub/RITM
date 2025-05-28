import { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface OperatorIdProps {
  id: string;
  className?: string;
}

export function OperatorId({ id, className }: OperatorIdProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const shortId = id.slice(0, 8) + '...';

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="font-mono text-sm">
        Opérateur : {isExpanded ? id : shortId}
      </span>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
        title={isExpanded ? "Réduire" : "Voir l'ID complet"}
      >
        {isExpanded ? (
          <ChevronUpIcon className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDownIcon className="w-4 h-4 text-gray-500" />
        )}
      </button>
    </div>
  );
} 