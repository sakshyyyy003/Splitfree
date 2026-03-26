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

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHr = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHr / 24);
  const diffWeek = Math.round(diffDay / 7);
  const diffMonth = Math.round(diffDay / 30);
  const diffYear = Math.round(diffDay / 365);

  if (diffSec < 60) return `${Math.max(diffSec, 1)}s ago`;
  if (diffMin < 60) return `${diffMin}min ago`;
  if (diffHr < 24) return `${diffHr}hr ago`;
  if (diffDay <= 6) return `${diffDay} ${diffDay === 1 ? "day" : "days"} ago`;
  if (diffWeek <= 4) return `${diffWeek} ${diffWeek === 1 ? "week" : "weeks"} ago`;
  if (diffMonth <= 12) return `${diffMonth} ${diffMonth === 1 ? "month" : "months"} ago`;
  return `${diffYear} ${diffYear === 1 ? "year" : "years"} ago`;
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

function buildLine1(entry: ActivityEntry, currentUserId: string): React.ReactNode {
  const actorName = entry.actor.name;
  const groupSuffix = entry.group ? (
    <>
      {" in "}
      <strong>&ldquo;{entry.group.name}&rdquo;</strong>
    </>
  ) : null;

  switch (entry.action) {
    case "expense_created": {
      const meta = entry.metadata as ActivityExpenseMetadata;
      return (
        <>
          <strong>{actorName}</strong> added{" "}
          <strong>&ldquo;{meta.description}&rdquo;</strong>
          {groupSuffix ?? " as direct expense"}
        </>
      );
    }
    case "expense_updated": {
      const meta = entry.metadata as ActivityExpenseMetadata;
      return (
        <>
          <strong>{actorName}</strong> updated{" "}
          <strong>&ldquo;{meta.description}&rdquo;</strong>
          {groupSuffix ?? " as direct expense"}
        </>
      );
    }
    case "expense_deleted": {
      const meta = entry.metadata as ActivityExpenseMetadata;
      return (
        <>
          <strong>{actorName}</strong> deleted{" "}
          <strong>&ldquo;{meta.description}&rdquo;</strong>
          {groupSuffix ?? " as direct expense"}
        </>
      );
    }
    case "settlement_recorded": {
      const meta = entry.metadata as ActivitySettlementMetadata;
      const isCurrentUserPayer = meta.paid_by === currentUserId;
      const isCurrentUserPayee = meta.paid_to === currentUserId;
      const otherName = isCurrentUserPayer
        ? (entry.targetUser?.name ?? "someone")
        : (entry.actor.name);

      if (isCurrentUserPayer) {
        return (
          <>
            <strong>You</strong> paid <strong>{otherName}</strong>
            {entry.group ? (
              <>
                {" in "}
                <strong>&ldquo;{entry.group.name}&rdquo;</strong>
              </>
            ) : (
              " directly"
            )}
          </>
        );
      }

      if (isCurrentUserPayee) {
        return (
          <>
            <strong>{otherName}</strong> paid <strong>you</strong>
            {entry.group ? (
              <>
                {" in "}
                <strong>&ldquo;{entry.group.name}&rdquo;</strong>
              </>
            ) : (
              " directly"
            )}
          </>
        );
      }

      // Fallback: neither party is the current user
      const payerName = entry.actor.name;
      const payeeName = entry.targetUser?.name ?? "someone";
      return (
        <>
          <strong>{payerName}</strong> paid <strong>{payeeName}</strong>
          {groupSuffix ?? " directly"}
        </>
      );
    }
    case "member_added": {
      if (entry.targetUser && entry.targetUser.userId !== entry.actor.userId) {
        return (
          <>
            <strong>{actorName}</strong> added{" "}
            <strong>{entry.targetUser.name}</strong> to{" "}
            <strong>&ldquo;{entry.group?.name ?? "the group"}&rdquo;</strong>
          </>
        );
      }
      return (
        <>
          <strong>{actorName}</strong> joined{" "}
          <strong>&ldquo;{entry.group?.name ?? "the group"}&rdquo;</strong>
        </>
      );
    }
    case "member_removed": {
      return (
        <>
          <strong>{actorName}</strong> removed{" "}
          <strong>{entry.targetUser?.name ?? "a member"}</strong> from{" "}
          <strong>&ldquo;{entry.group?.name ?? "the group"}&rdquo;</strong>
        </>
      );
    }
  }
}

function buildLine2(entry: ActivityEntry, currentUserId: string): React.ReactNode {
  const time = getRelativeTime(entry.createdAt);

  switch (entry.action) {
    case "expense_created": {
      if (entry.userShare !== null) {
        const meta = entry.metadata as ActivityExpenseMetadata;
        return (
          <>
            <span className="text-sm font-bold text-[#007a55]">
              You owe {formatCurrency(entry.userShare, meta.currency)}
            </span>
            <span className="text-[#404040]">&middot;</span>
            <span className="text-sm text-[#404040]">{time}</span>
          </>
        );
      }
      return <span className="text-sm text-[#404040]">{time}</span>;
    }
    case "expense_updated": {
      if (entry.userShare !== null) {
        const meta = entry.metadata as ActivityExpenseMetadata;
        return (
          <>
            <span className="text-sm font-bold text-[#007a55]">
              Your share updated to {formatCurrency(entry.userShare, meta.currency)}
            </span>
            <span className="text-[#404040]">&middot;</span>
            <span className="text-sm text-[#404040]">{time}</span>
          </>
        );
      }
      return <span className="text-sm text-[#404040]">{time}</span>;
    }
    case "expense_deleted": {
      return <span className="text-sm text-[#404040]">{time}</span>;
    }
    case "settlement_recorded": {
      const meta = entry.metadata as ActivitySettlementMetadata;
      const isCurrentUserPayer = meta.paid_by === currentUserId;
      const isCurrentUserPayee = meta.paid_to === currentUserId;

      let financialText: React.ReactNode = null;
      if (isCurrentUserPayer) {
        financialText = (
          <span className="text-sm font-bold text-red-600">
            You paid {formatCurrency(meta.amount)}
          </span>
        );
      } else if (isCurrentUserPayee) {
        financialText = (
          <span className="text-sm font-bold text-[#007a55]">
            You received {formatCurrency(meta.amount)}
          </span>
        );
      }

      if (financialText) {
        return (
          <>
            {financialText}
            <span className="text-[#404040]">&middot;</span>
            <span className="text-sm text-[#404040]">{time}</span>
          </>
        );
      }
      return <span className="text-sm text-[#404040]">{time}</span>;
    }
    case "member_added":
    case "member_removed": {
      return <span className="text-sm text-[#404040]">{time}</span>;
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

  const inner = (
    <div className="flex gap-3 border-b border-border px-1 py-4 last:border-b-0">
      <div className="relative h-12 w-10 shrink-0">
        <Avatar>
          {entry.actor.avatarUrl ? (
            <AvatarImage src={entry.actor.avatarUrl} alt={entry.actor.name} />
          ) : null}
          <AvatarFallback>
            {getInitials(entry.actor.name)}
          </AvatarFallback>
        </Avatar>
        <div className={`absolute bottom-0 left-5 flex size-5 items-center justify-center rounded-full border-2 border-background ${colorClass}`}>
          <Icon className="size-3" />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-base leading-snug">{buildLine1(entry, currentUserId)}</p>
        <div className="mt-0.5 flex items-center gap-2">
          {buildLine2(entry, currentUserId)}
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block transition-colors hover:bg-muted/40">
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
