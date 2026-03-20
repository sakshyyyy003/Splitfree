"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Search } from "lucide-react";

import { searchProfiles, type ProfileResult } from "@/actions/search";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const DEBOUNCE_DELAY_MS = 300;
const MIN_QUERY_LENGTH = 2;

type UserSearchProps = {
  onSelect: (profile: ProfileResult) => void;
  excludeUserIds?: string[];
  placeholder?: string;
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
  excludeUserIds = [],
  placeholder = "Search by name or email...",
}: UserSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmed = query.trim();
  const isBelowMinLength = trimmed.length < MIN_QUERY_LENGTH;

  useEffect(() => {
    if (isBelowMinLength) {
      return;
    }

    const timeoutId = setTimeout(() => {
      startTransition(async () => {
        const result = await searchProfiles({ query: trimmed });

        if (result.error) {
          setResults([]);
          setHasSearched(true);
          return;
        }

        const filtered = excludeUserIds.length > 0
          ? result.data.filter((profile) => !excludeUserIds.includes(profile.id))
          : result.data;

        setResults(filtered);
        setHasSearched(true);
      });
    }, DEBOUNCE_DELAY_MS);

    return () => clearTimeout(timeoutId);
  }, [trimmed, isBelowMinLength, excludeUserIds]);

  function handleSelect(profile: ProfileResult) {
    onSelect(profile);
    setQuery("");
    setResults([]);
    setHasSearched(false);
    inputRef.current?.focus();
  }

  const visibleResults = isBelowMinLength ? [] : results;
  const showEmptyState = !isBelowMinLength && hasSearched && !isPending && visibleResults.length === 0;

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="pl-10"
        />
        {isPending && (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {visibleResults.length > 0 && (
        <ul
          role="listbox"
          className="flex flex-col gap-1 rounded-2xl border border-border bg-background p-2 shadow-subtle"
        >
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
        <div className="rounded-2xl border border-dashed border-border bg-secondary/30 px-4 py-6 text-center text-sm text-muted-foreground">
          No results found for &ldquo;{query.trim()}&rdquo;
        </div>
      )}
    </div>
  );
}
