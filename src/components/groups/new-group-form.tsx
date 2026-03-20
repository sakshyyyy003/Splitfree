"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import {
  createGroupSchema,
  GROUP_CATEGORIES,
  type CreateGroupInput,
  type GroupCategory,
} from "@/lib/validators/group";
import { createGroup } from "@/actions/group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldError } from "@/components/ui/field";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const categoryLabels: Record<GroupCategory, string> = {
  trip: "Trip",
  home: "Home",
  couple: "Couple",
  other: "Other",
};

export function NewGroupForm() {
  const router = useRouter();
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateGroupInput>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: "",
      category: "other",
    },
  });

  const selectedCategory = watch("category");

  function handleCoverClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setCoverFile(file);
    const objectUrl = URL.createObjectURL(file);
    setCoverPreview(objectUrl);

    event.target.value = "";
  }

  function handleRemoveCover() {
    setCoverFile(null);
    if (coverPreview) {
      URL.revokeObjectURL(coverPreview);
      setCoverPreview(null);
    }
  }

  function onSubmit(data: CreateGroupInput) {
    startTransition(async () => {
      let coverFormData: FormData | undefined;

      if (coverFile) {
        coverFormData = new FormData();
        coverFormData.append("cover", coverFile);
      }

      const result = await createGroup(data, coverFormData);

      if (result.error) {
        toast.error(result.error.message);
        return;
      }

      toast.success("Group created successfully!");
      router.push(`/groups/${result.data.groupId}`);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Group</CardTitle>
        <CardDescription>
          Create a group to start tracking shared expenses with friends.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5"
        >
          {/* Cover Image Upload */}
          <div className="flex flex-col gap-2">
            <Label>Cover Image</Label>
            {coverPreview ? (
              <div className="relative overflow-hidden rounded-2xl border border-border">
                <Image
                  src={coverPreview}
                  alt="Cover preview"
                  width={600}
                  height={200}
                  className="h-40 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveCover}
                  className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
                  aria-label="Remove cover image"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleCoverClick}
                className={cn(
                  "flex h-40 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-secondary/50 text-muted-foreground transition-colors hover:border-ring hover:bg-secondary",
                )}
              >
                <ImagePlus className="size-8" />
                <span className="text-sm font-medium">
                  Click to upload a cover image
                </span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="sr-only"
              aria-label="Upload cover image"
            />
            <p className="text-xs text-muted-foreground">
              Optional. JPEG, PNG or WebP (max 5 MB).
            </p>
          </div>

          {/* Group Name */}
          <Field>
            <Label htmlFor="name">Group Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="e.g. Goa Trip 2026"
              autoComplete="off"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            <FieldError>{errors.name?.message}</FieldError>
          </Field>

          {/* Category */}
          <Field>
            <Label>Category</Label>
            <Select
              value={selectedCategory}
              onValueChange={(val) =>
                setValue("category", val as GroupCategory, {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger className="w-full" aria-invalid={!!errors.category}>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {GROUP_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {categoryLabels[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError>{errors.category?.message}</FieldError>
          </Field>

          <Button type="submit" size="lg" disabled={isPending}>
            {isPending && <Loader2 className="animate-spin" />}
            Create Group
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
