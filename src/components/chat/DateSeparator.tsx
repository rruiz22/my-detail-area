import React from 'react';

interface DateSeparatorProps {
  date: string;
}

export const DateSeparator: React.FC<DateSeparatorProps> = ({ date }) => {
  return (
    <div className="flex items-center justify-center my-4">
      <div className="flex-1 border-t border-muted" />
      <div className="px-4">
        <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded-full border">
          {date}
        </span>
      </div>
      <div className="flex-1 border-t border-muted" />
    </div>
  );
};