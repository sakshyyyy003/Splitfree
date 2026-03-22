"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Link, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { regenerateInviteCode } from "@/actions/group";
import { Button } from "@/components/ui/button";

type InviteLinkSectionProps = {
  groupId: string;
  inviteCode: string;
};

export function InviteLinkSection({
  groupId,
  inviteCode: initialCode,
}: InviteLinkSectionProps) {
  const [inviteCode, setInviteCode] = useState(initialCode);
  const [copied, setCopied] = useState(false);
  const [isRegenerating, startTransition] = useTransition();

  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${inviteCode}`
      : `/join/${inviteCode}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("Invite link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  }

  function handleRegenerate() {
    startTransition(async () => {
      const result = await regenerateInviteCode(groupId);

      if (result.error) {
        toast.error(result.error.message);
        return;
      }

      setInviteCode(result.data!.inviteCode);
      toast.success("Invite link regenerated");
    });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-md sm:p-8">
      <div className="mb-4 flex items-center gap-2">
        <Link className="size-4 text-muted-foreground" />
        <h2 className="text-xs font-bold uppercase tracking-ultra">
          Invite Link
        </h2>
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        Share this link to let others join the group.
      </p>

      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1 truncate rounded-lg border-2 border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium">
          {inviteUrl}
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleCopy}
          className="shrink-0"
          aria-label="Copy invite link"
        >
          {copied ? (
            <Check className="size-4 text-emerald-600" />
          ) : (
            <Copy className="size-4" />
          )}
        </Button>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Regenerating will invalidate the current link.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="text-xs"
        >
          {isRegenerating ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
          Regenerate
        </Button>
      </div>
    </div>
  );
}
