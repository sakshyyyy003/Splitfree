"use client";

import { useRef, useState, useTransition } from "react";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  updateProfileSchema,
  type UpdateProfileInput,
} from "@/lib/validators/profile";
import { updateProfile, uploadAvatar } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldError } from "@/components/ui/field";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type Profile = {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
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

export function ProfileForm({ profile }: { profile: Profile }) {
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [isUploadPending, startUploadTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: profile.name ?? "",
      description: profile.description ?? "",
    },
  });

  async function onSubmit(data: UpdateProfileInput) {
    const result = await updateProfile(data);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    toast.success("Profile updated successfully.");
  }

  function handleAvatarClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    startUploadTransition(async () => {
      const formData = new FormData();
      formData.append("avatar", file);

      const result = await uploadAvatar(formData);

      if (result.error) {
        toast.error(result.error.message);
        return;
      }

      setAvatarUrl(result.data.avatarUrl);
      toast.success("Avatar updated successfully.");
    });

    // Reset file input so the same file can be re-selected
    event.target.value = "";
  }

  const initials = getInitials(profile.name, profile.email);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile picture</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        {/* Avatar Upload */}
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleAvatarClick}
            disabled={isUploadPending}
            className={cn(
              "group relative size-20 cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              isUploadPending && "pointer-events-none opacity-50"
            )}
            aria-label="Change avatar"
          >
            <Avatar className="size-20">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt="Your avatar" />
              ) : (
                <AvatarFallback className="text-lg">
                  {initials}
                </AvatarFallback>
              )}
            </Avatar>

            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              {isUploadPending ? (
                <Loader2 className="size-5 animate-spin text-white" />
              ) : (
                <Camera className="size-5 text-white" />
              )}
            </div>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="sr-only"
            aria-label="Upload avatar image"
          />

          <p className="text-xs text-muted-foreground">
            Click to upload. JPEG, PNG or WebP (max 2 MB).
          </p>
        </div>

        {/* Profile Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <Field>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Your name"
              autoComplete="name"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            <FieldError>{errors.name?.message}</FieldError>
          </Field>

          <Field>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Tell us about yourself"
              rows={3}
              aria-invalid={!!errors.description}
              {...register("description")}
            />
            <FieldError>{errors.description?.message}</FieldError>
          </Field>

          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting || isUploadPending}
          >
            {isSubmitting && <Loader2 className="animate-spin" />}
            Save Changes
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
