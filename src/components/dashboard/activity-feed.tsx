"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import {
  Banknote,
  Pencil,
  Plus,
  Trash2,
  UserMinus,
  UserPlus,
} from "lucide-react";

import { loadMoreActivity } from "@/actions/activity";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type {
  ActivityAction,
  ActivityEntry,
  ActivityExpenseMetadata,
  ActivityFeedResult,
  ActivitySettlementMetadata,
} from "@/types/activity";

type ActivityFeedProps = {
  initial: ActivityFeedResult;
  currentUserId: string;
};

const ACTION_ICON: Record<ActivityAction, React.ComponentType<{ className?: string }>> = {
  expense_created: Plus,
  expense_updated: Pencil,
  expense_deleted: Trash2,
  settlement_recorded: Banknote,
  member_added: UserPlus,
  member_removed: UserMinus,
};

const ACTION_COLOR: Record<ActivityAction, string> = {
  expense_created: "bg-emerald-100 text-emerald-700",
  expense_updated: "bg-amber-100 text-amber-700",
  expense_deleted: "bg-rose-100 text-rose-700",
  settlement_recorded: "bg-sky-100 text-sky-700",
  member_added: "bg-violet-100 text-violet-700",
  member_removed: "bg-rose-100 text-rose-700",
};

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
});

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = then - now;
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHr = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHr / 24);

  if (Math.abs(diffSec) < 60) return "just now";
  if (Math.abs(diffMin) < 60) return relativeTimeFormatter.format(diffMin, "minute");
  if (Math.abs(diffHr) < 24) return relativeTimeFormatter.format(diffHr, "hour");
  if (Math.abs(diffDay) < 30) return relativeTimeFormatter.format(diffDay, "day");

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  }).format(new Date(dateStr));
}

function formatCurrency(amount: number, currency: string = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function buildMessage(entry: ActivityEntry): React.ReactNode {
  const actorName = entry.actor.name;

  switch (entry.action) {
    case "expense_created": {
      const meta = entry.metadata as ActivityExpenseMetadata;
      return (
        <>
          <strong>{actorName}</strong> added{" "}
          <strong>&ldquo;{meta.description}&rdquo;</strong>{" "}
          <span className="text-muted-foreground">
            ({formatCurrency(meta.amount, meta.currency)})
          </span>
        </>
      );
    }
    case "expense_updated": {
      const meta = entry.metadata as ActivityExpenseMetadata;
      const parts: string[] = [];
      if (meta.old_amount !== undefined) {
        parts.push(
          `amount ${formatCurrency(meta.old_amount, meta.currency)} → ${formatCurrency(meta.amount, meta.currency)}`,
        );
      }
      if (meta.old_description) {
        parts.push(`"${meta.old_description}" → "${meta.description}"`);
      }
      return (
        <>
          <strong>{actorName}</strong> updated{" "}
          <strong>&ldquo;{meta.description}&rdquo;</strong>
          {parts.length > 0 ? (
            <span className="text-muted-foreground"> — {parts.join(", ")}</span>
          ) : null}
        </>
      );
    }
    case "expense_deleted": {
      const meta = entry.metadata as ActivityExpenseMetadata;
      return (
        <>
          <strong>{actorName}</strong> deleted{" "}
          <strong>&ldquo;{meta.description}&rdquo;</strong>{" "}
          <span className="text-muted-foreground">
            ({formatCurrency(meta.amount, meta.currency)})
          </span>
        </>
      );
    }
    case "settlement_recorded": {
      const meta = entry.metadata as ActivitySettlementMetadata;
      const payerName =
        meta.paid_by === entry.actor.userId
          ? actorName
          : entry.targetUser?.name ?? "someone";
      const payeeName =
        meta.paid_to === entry.actor.userId
          ? actorName
          : entry.targetUser?.name ?? "someone";
      return (
        <>
          <strong>{payerName}</strong> paid <strong>{payeeName}</strong>{" "}
          <span className="text-muted-foreground">
            ({formatCurrency(meta.amount)})
          </span>
        </>
      );
    }
    case "member_added": {
      if (entry.targetUser && entry.targetUser.userId !== entry.actor.userId) {
        return (
          <>
            <strong>{actorName}</strong> added{" "}
            <strong>{entry.targetUser.name}</strong> to the group
          </>
        );
      }
      return (
        <>
          <strong>{actorName}</strong> joined the group
        </>
      );
    }
    case "member_removed": {
      return (
        <>
          <strong>{actorName}</strong> removed{" "}
          <strong>{entry.targetUser?.name ?? "a member"}</strong> from the group
        </>
      );
    }
  }
}

function getActivityHref(entry: ActivityEntry, currentUserId: string): string | null {
  const groupId = entry.group?.id;

  switch (entry.action) {
    case "expense_created":
    case "expense_updated":
      return groupId
        ? `/groups/${groupId}/expenses/${entry.entityId}`
        : null;

    case "expense_deleted":
      return groupId ? `/groups/${groupId}` : null;

    case "settlement_recorded":
      if (groupId) return `/groups/${groupId}/settlements/${entry.entityId}`;
      // Direct settlement — link to the other person's detail page
      break;

    case "member_added":
    case "member_removed":
      return groupId ? `/groups/${groupId}` : null;
  }

  // Direct activity fallback — other person's detail page
  const otherId =
    entry.actor.userId === currentUserId
      ? entry.targetUser?.userId
      : entry.actor.userId;
  return otherId ? `/people/${otherId}` : null;
}

function ActivityItem({ entry, currentUserId }: { entry: ActivityEntry; currentUserId: string }) {
  const Icon = ACTION_ICON[entry.action];
  const colorClass = ACTION_COLOR[entry.action];
  const href = getActivityHref(entry, currentUserId);

  const sourceLabel = entry.group ? (
    <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
      {entry.group.name}
    </span>
  ) : (
    <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
      Direct
    </span>
  );

  const inner = (
    <div className="flex gap-3 border-b border-border px-1 py-4 last:border-b-0">
      <div className="flex flex-col items-center gap-1 pt-0.5">
        <Avatar className="size-8">
          {entry.actor.avatarUrl ? (
            <AvatarImage src={entry.actor.avatarUrl} alt={entry.actor.name} />
          ) : null}
          <AvatarFallback className="text-xs">
            {getInitials(entry.actor.name)}
          </AvatarFallback>
        </Avatar>
        <div className={`flex size-5 items-center justify-center rounded-full ${colorClass}`}>
          <Icon className="size-3" />
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm leading-snug">{buildMessage(entry)}</p>
        <div className="flex items-center gap-2">
          {sourceLabel}
          <span className="text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">
            {getRelativeTime(entry.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block hover:bg-muted/40 transition-colors">
        {inner}
      </Link>
    );
  }

  return inner;
}

export function ActivityFeed({ initial, currentUserId }: ActivityFeedProps) {
  const [entries, setEntries] = useState(initial.entries);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [isPending, startTransition] = useTransition();

  const handleLoadMore = useCallback(() => {
    if (!cursor) return;
    startTransition(async () => {
      const result = await loadMoreActivity(cursor);
      setEntries((prev) => [...prev, ...result.entries]);
      setHasMore(result.hasMore);
      setCursor(result.nextCursor);
    });
  }, [cursor]);

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center">
        <p className="text-sm font-semibold text-muted-foreground">
          No activity yet
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Actions like adding expenses, settling up, or inviting members will
          appear here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="divide-y-0">
        {entries.map((entry) => (
          <ActivityItem key={entry.id} entry={entry} currentUserId={currentUserId} />
        ))}
      </div>

      {hasMore ? (
        <button
          onClick={handleLoadMore}
          disabled={isPending}
          className="mt-4 inline-flex h-10 w-full items-center justify-center border-2 border-foreground bg-background text-sm font-bold uppercase tracking-wide text-foreground transition-all hover:bg-secondary active:translate-y-px disabled:opacity-50"
        >
          {isPending ? "Loading..." : "View more"}
        </button>
      ) : null}
    </div>
  );
}
