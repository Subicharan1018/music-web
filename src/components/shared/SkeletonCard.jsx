/**
 * SkeletonCard.jsx
 * Loading skeleton for album cards.
 */

export const SkeletonCard = () => {
  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="aspect-square rounded-md overflow-hidden bg-gradient-to-r from-ink/5 via-ink/10 to-ink/5 bg-[length:200%_100%] animate-shimmer" />
      <div className="h-4 w-3/4 rounded bg-gradient-to-r from-ink/5 via-ink/10 to-ink/5 bg-[length:200%_100%] animate-shimmer" />
      <div className="h-3 w-1/2 rounded bg-gradient-to-r from-ink/5 via-ink/10 to-ink/5 bg-[length:200%_100%] animate-shimmer" />
    </div>
  );
};
