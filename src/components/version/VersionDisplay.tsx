import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { getFormattedVersion, getVersionInfo } from '@/config/version';
import { Info } from 'lucide-react';
import { useEffect, useState } from 'react';

interface VersionDisplayProps {
  /**
   * Show detailed info on hover
   */
  showDetails?: boolean;
  /**
   * CSS class for styling
   */
  className?: string;
}

/**
 * Component that displays the current application version
 * Integrates with the dynamic versioning system to show:
 * - Version number
 * - Build timestamp
 * - Git commit hash (on hover)
 */
export function VersionDisplay({ showDetails = true, className = '' }: VersionDisplayProps) {
  const [versionInfo, setVersionInfo] = useState(getVersionInfo());

  useEffect(() => {
    // Update version info after initial load
    const timer = setTimeout(() => {
      setVersionInfo(getVersionInfo());
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unknown';
    }
  };

  if (!showDetails) {
    return (
      <span className={`text-xs text-muted-foreground ${className}`}>
        {getFormattedVersion()}
      </span>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`h-auto p-0 text-xs text-muted-foreground hover:text-foreground hover:bg-transparent ${className}`}
          >
            <span className="flex items-center gap-1">
              {getFormattedVersion()}
              <Info className="h-3 w-3 opacity-50" />
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between gap-4">
              <span className="font-semibold">Version:</span>
              <span className="font-mono">{versionInfo.version}</span>
            </div>

            {versionInfo.gitCommit !== 'unknown' && (
              <div className="flex justify-between gap-4">
                <span className="font-semibold">Commit:</span>
                <span className="font-mono">{versionInfo.gitCommit}</span>
              </div>
            )}

            {versionInfo.gitBranch !== 'unknown' && (
              <div className="flex justify-between gap-4">
                <span className="font-semibold">Branch:</span>
                <span className="font-mono">{versionInfo.gitBranch}</span>
              </div>
            )}

            <div className="flex justify-between gap-4">
              <span className="font-semibold">Build:</span>
              <span className="font-mono">{formatDate(versionInfo.buildTime)}</span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="font-semibold">Environment:</span>
              <span className="font-mono capitalize">{versionInfo.environment}</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
