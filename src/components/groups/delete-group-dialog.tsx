"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteGroup } from "@/actions/group";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type DeleteGroupDialogProps = {
  groupId: string;
  groupName: string;
};

export function DeleteGroupDialog({
  groupId,
  groupName,
}: DeleteGroupDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [actionState, dispatchAction] = useActionState(deleteGroup, null);

  useEffect(() => {
    if (!actionState) return;

    if (actionState.error) {
      toast.error(actionState.error.message);
      return;
    }

    if (actionState.data) {
      toast.success("Group deleted successfully");
      router.push("/dashboard");
    }
  }, [actionState, router]);

  function handleDelete() {
    startTransition(() => {
      const formData = new FormData();
      formData.append("groupId", groupId);
      dispatchAction(formData);
    });
  }

  return (
    <div className="rounded-xl border-2 border-destructive/30 bg-white p-6 shadow-md sm:p-8">
      <h2 className="mb-1 text-xs font-bold uppercase tracking-ultra text-destructive">
        Danger Zone
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Permanently delete this group and all associated data.
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button variant="destructive" className="w-full">
              <Trash2 className="size-4" />
              DELETE GROUP
            </Button>
          }
        />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {groupName}?</DialogTitle>
            <DialogDescription>
              This action is permanent and cannot be undone. All expenses,
              settlements, and member data associated with this group will be
              permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" />}
              disabled={isPending}
            >
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending && <Loader2 className="animate-spin" />}
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
