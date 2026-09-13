export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-maroon-700/60 text-sm">
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-card bg-maroon-900/5 border border-maroon-900/10 px-4 py-4 text-maroon-800 text-sm flex flex-col gap-3">
      <p>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="self-start rounded-full bg-maroon-800 text-white text-sm px-4 py-2 touch-target"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-card border border-dashed border-clay-300 px-4 py-10 text-center text-maroon-700/60">
      <p className="font-medium">{title}</p>
      {hint && <p className="text-sm mt-1">{hint}</p>}
    </div>
  );
}
