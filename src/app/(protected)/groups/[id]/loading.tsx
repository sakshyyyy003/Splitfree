export default function GroupDetailLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <section>
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="mt-10 flex items-center justify-between px-1 py-2">
          <div className="flex items-center gap-[13px]">
            <div className="h-7 w-7 rounded bg-muted" />
            <div className="h-10 w-52 rounded bg-muted" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-11 w-28 rounded bg-muted" />
            <div className="h-11 w-36 rounded bg-muted" />
            <div className="h-11 w-11 rounded bg-muted" />
          </div>
        </div>
        <div className="mt-2 space-y-1 px-[5px]">
          <div className="h-7 w-64 rounded bg-muted" />
          <div className="h-6 w-48 rounded bg-muted" />
        </div>
      </section>

      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="h-11 w-28 rounded bg-muted" />
          <div className="h-11 w-28 rounded bg-muted" />
          <div className="h-11 w-28 rounded bg-muted" />
        </div>
        <div className="space-y-3">
          <div className="h-[72px] rounded bg-muted" />
          <div className="h-[72px] rounded bg-muted" />
          <div className="h-[72px] rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
