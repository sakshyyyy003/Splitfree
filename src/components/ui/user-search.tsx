"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Search, Users } from "lucide-react";

import { searchProfiles, searchGroups, type ProfileResult, type GroupResult } from "@/actions/search";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const DEBOUNCE_DELAY_MS = 300;
const MIN_QUERY_LENGTH = 2;

const categoryEmoji: Record<string, string> = {
  trip: "✈️",
  home: "🏠",
  couple: "❤️",
  work: "💼",
  friends: "🎉",
  other: "🌀",
};

type UserSearchProps = {
  onSelect: (profile: ProfileResult) => void;
  onGroupSelect?: (group: GroupResult) => void;
  excludeUserIds?: string[];
  placeholder?: string;
  showGroups?: boolean;
  suggestions?: ProfileResult[];
};

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  return email[0]?.toUpperCase() ?? "?";
}

export function UserSearch({
  onSelect,
  onGroupSelect,
  excludeUserIds = [],
  placeholder = "Search by name or email...",
  showGroups = false,
  suggestions = [],
}: UserSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileResult[]>([]);
  const [groupResults, setGroupResults] = useState<GroupResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const trimmed = query.trim();
  const isBelowMinLength = trimmed.length < MIN_QUERY_LENGTH;

  useEffect(() => {
    if (isBelowMinLength) {
      return;
    }

    const timeoutId = setTimeout(() => {
      startTransition(async () => {
        const [profileResult, groupResult] = await Promise.all([
          searchProfiles({ query: trimmed }),
          showGroups ? searchGroups({ query: trimmed }) : null,
        ]);

        if (profileResult.error) {
          setResults([]);
        } else {
          const filtered = excludeUserIds.length > 0
            ? profileResult.data.filter((profile) => !excludeUserIds.includes(profile.id))
            : profileResult.data;
          setResults(filtered);
        }

        if (groupResult && !groupResult.error) {
          setGroupResults(groupResult.data);
        } else {
          setGroupResults([]);
        }

        setHasSearched(true);
      });
    }, DEBOUNCE_DELAY_MS);

    return () => clearTimeout(timeoutId);
  }, [trimmed, isBelowMinLength, excludeUserIds, showGroups]);

  function handleSelect(profile: ProfileResult) {
    onSelect(profile);
    setQuery("");
    setResults([]);
    setGroupResults([]);
    setHasSearched(false);
    inputRef.current?.focus();
  }

  function handleGroupSelect(group: GroupResult) {
    onGroupSelect?.(group);
    setQuery("");
    setResults([]);
    setGroupResults([]);
    setHasSearched(false);
    inputRef.current?.focus();
  }

  const visibleResults = isBelowMinLength ? [] : results;
  const visibleGroups = isBelowMinLength ? [] : groupResults;
  const hasAnyResults = visibleResults.length > 0 || visibleGroups.length > 0;
  const showEmptyState = !isBelowMinLength && hasSearched && !isPending && !hasAnyResults;
  const showSuggestions = isFocused && isBelowMinLength && suggestions.length > 0 && !hasAnyResults;

  return (
    <div
      ref={containerRef}
      className="flex w-full flex-col gap-2"
      onBlur={(e) => {
        if (!containerRef.current?.contains(e.relatedTarget as Node)) {
          setIsFocused(false);
        }
      }}
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          autoComplete="off"
          className="pl-10"
        />
        {isPending && (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {showSuggestions && (
        <ul
          role="listbox"
          className="flex flex-col gap-1 rounded-none border border-border bg-background p-2 shadow-subtle"
        >
          <li className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
            People you know on Splitfree
          </li>
          {suggestions.map((profile) => (
            <li key={profile.id} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => handleSelect(profile)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none"
              >
                <Avatar size="sm">
                  {profile.avatar_url ? (
                    <AvatarImage
                      src={profile.avatar_url}
                      alt={profile.name ?? profile.email}
                    />
                  ) : null}
                  <AvatarFallback>
                    {getInitials(profile.name, profile.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  {profile.name ? (
                    <p className="truncate text-sm font-semibold">
                      {profile.name}
                    </p>
                  ) : null}
                  <p className="truncate text-sm text-muted-foreground">
                    {profile.email}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {hasAnyResults && (
        <ul
          role="listbox"
          className="flex flex-col gap-1 rounded-none border border-border bg-background p-2 shadow-subtle"
        >
          {visibleGroups.map((group) => (
            <li key={`group-${group.id}`} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => handleGroupSelect(group)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none"
              >
                <div className="flex size-8 items-center justify-center rounded-full bg-secondary">
                  <Users className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {categoryEmoji[group.category] ?? "📋"} {group.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Group
                  </p>
                </div>
              </button>
            </li>
          ))}
          {visibleResults.map((profile) => (
            <li key={profile.id} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => handleSelect(profile)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none"
              >
                <Avatar size="sm">
                  {profile.avatar_url ? (
                    <AvatarImage
                      src={profile.avatar_url}
                      alt={profile.name ?? profile.email}
                    />
                  ) : null}
                  <AvatarFallback>
                    {getInitials(profile.name, profile.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  {profile.name ? (
                    <p className="truncate text-sm font-semibold">
                      {profile.name}
                    </p>
                  ) : null}
                  <p className="truncate text-sm text-muted-foreground">
                    {profile.email}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {showEmptyState && (
        <div className="rounded-none border border-dashed border-border bg-secondary/30 px-4 py-6 text-center text-sm text-muted-foreground">
          No results found for &ldquo;{query.trim()}&rdquo;
        </div>
      )}
    </div>
  );
}
