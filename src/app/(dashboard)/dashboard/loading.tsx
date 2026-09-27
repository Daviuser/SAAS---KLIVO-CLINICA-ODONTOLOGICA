function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-surface rounded ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <div className="p-8 max-w-6xl">
      <SkeletonBlock className="h-7 w-56 mb-2" />
      <SkeletonBlock className="h-4 w-72 mb-8" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white border border-border rounded-2xl p-5">
            <SkeletonBlock className="h-9 w-9 rounded-full mb-4" />
            <SkeletonBlock className="h-3.5 w-24 mb-3" />
            <SkeletonBlock className="h-7 w-20 mb-2" />
            <SkeletonBlock className="h-3 w-28" />
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-border rounded-2xl p-6">
          <SkeletonBlock className="h-4 w-64 mb-6" />
          <SkeletonBlock className="h-48 w-full" />
        </div>
        <div className="bg-white border border-border rounded-2xl p-5 space-y-4">
          <SkeletonBlock className="h-4 w-40 mb-2" />
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
