export default function DashboardLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex flex-col gap-1.5">
        <div className="h-10 w-72 rounded bg-muted" />
      </div>
      <div className="flex gap-2">
        <div className="h-11 w-28 rounded bg-muted" />
        <div className="h-11 w-28 rounded bg-muted" />
      </div>
      <div className="space-y-3 mt-4">
        <div className="h-20 rounded-lg bg-muted" />
        <div className="h-20 rounded-lg bg-muted" />
        <div className="h-20 rounded-lg bg-muted" />
        <div className="h-20 rounded-lg bg-muted" />
      </div>
    </div>
  );
}
