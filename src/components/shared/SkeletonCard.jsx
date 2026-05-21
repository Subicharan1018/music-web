/**
 * SkeletonCard.jsx
 * Loading skeleton for album cards — black shimmer.
 */

export const SkeletonCard = () => {
  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="aspect-square rounded-xl overflow-hidden bg-gradient-to-r from-white/[0.03] via-white/[0.06] to-white/[0.03] bg-[length:200%_100%] animate-shimmer" />
      <div className="h-3.5 w-3/4 rounded bg-gradient-to-r from-white/[0.03] via-white/[0.06] to-white/[0.03] bg-[length:200%_100%] animate-shimmer" />
      <div className="h-2.5 w-1/2 rounded bg-gradient-to-r from-white/[0.03] via-white/[0.06] to-white/[0.03] bg-[length:200%_100%] animate-shimmer" />
    </div>
  );
};
