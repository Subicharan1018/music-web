/**
 * SkeletonRow.jsx
 * Loading skeleton for song rows.
 */

export const SkeletonRow = () => {
  return (
    <div className="flex items-center gap-4 py-2 border-b border-ink/5 w-full">
      <div className="w-8 h-4 rounded bg-gradient-to-r from-ink/5 via-ink/10 to-ink/5 bg-[length:200%_100%] animate-shimmer" />
      <div className="flex-1 flex flex-col gap-1">
        <div className="h-4 w-1/2 rounded bg-gradient-to-r from-ink/5 via-ink/10 to-ink/5 bg-[length:200%_100%] animate-shimmer" />
        <div className="h-3 w-1/3 rounded bg-gradient-to-r from-ink/5 via-ink/10 to-ink/5 bg-[length:200%_100%] animate-shimmer" />
      </div>
      <div className="w-12 h-4 rounded bg-gradient-to-r from-ink/5 via-ink/10 to-ink/5 bg-[length:200%_100%] animate-shimmer" />
      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-ink/5 via-ink/10 to-ink/5 bg-[length:200%_100%] animate-shimmer" />
    </div>
  );
};
