import React from 'react';

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden">
      {Array.from({ length: rows }).map((_, ri) => (
        <div key={ri} className="flex items-center gap-4 border-b border-line px-5 py-4">
          {Array.from({ length: cols }).map((_, ci) => (
            <div
              key={ci}
              className="h-4 animate-pulse rounded bg-canvas"
              style={{ width: ci === 0 ? '22%' : ci === cols - 1 ? '8%' : `${Math.floor(Math.random() * 15) + 10}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}