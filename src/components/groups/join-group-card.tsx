"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UsersRound } from "lucide-react";
import { toast } from "sonner";

import { joinGroup } from "@/actions/group";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

const categoryLabels: Record<string, string> = {
  trip: "Trip",
  home: "Home",
  couple: "Couple",
  other: "Other",
};

type JoinGroupCardProps = {
  group: {
    id: string;
    name: string;
    category: string;
  };
  inviteCode: string;
};

export function JoinGroupCard({ group, inviteCode }: JoinGroupCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleJoin() {
    startTransition(async () => {
      const result = await joinGroup(inviteCode);

      if (result.error) {
        toast.error(result.error.message);
        return;
      }

      toast.success(`You've joined ${group.name}!`);
      router.push(`/groups/${result.data.groupId}`);
    });
  }

  return (
    <Card className="border-border/80 bg-gradient-to-br from-white via-card to-secondary/35">
      <CardHeader className="items-center gap-3 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
          <UsersRound className="size-7 text-primary" />
        </div>
        <Badge variant="secondary">
          {categoryLabels[group.category] ?? group.category}
        </Badge>
        <CardTitle className="text-2xl">{group.name}</CardTitle>
        <CardDescription>
          You&apos;ve been invited to join this group. Click below to accept.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Button size="lg" onClick={handleJoin} disabled={isPending}>
          {isPending && <Loader2 className="animate-spin" />}
          Join Group
        </Button>
      </CardContent>
    </Card>
  );
}
