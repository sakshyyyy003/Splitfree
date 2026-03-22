export default function ProfileLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-32 rounded bg-muted" />
      <div className="flex items-center gap-4">
        <div className="size-16 rounded-full bg-muted" />
        <div className="space-y-2">
          <div className="h-6 w-40 rounded bg-muted" />
          <div className="h-4 w-56 rounded bg-muted" />
        </div>
      </div>
      <div className="h-48 rounded-lg bg-muted" />
    </div>
  );
}
