"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { loginSchema, type LoginInput } from "@/lib/validators/auth";
import { signIn } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, FieldError } from "@/components/ui/field";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

export function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginInput) {
    setServerError(null);

    const result = await signIn(data, redirectTo);

    if (result?.error) {
      setServerError(result.error.message);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Log in</CardTitle>
        <CardDescription>Welcome back to SplitFree.</CardDescription>
      </CardHeader>

      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          {serverError && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {serverError}
            </div>
          )}

          <Field>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            <FieldError>{errors.email?.message}</FieldError>
          </Field>

          <Field>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Your password"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            <FieldError>{errors.password?.message}</FieldError>
          </Field>

          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            Log in
          </Button>
        </form>

        {/* TODO: Re-enable once Google OAuth is configured
        <div className="flex items-center gap-3 py-4">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground uppercase">or</span>
          <Separator className="flex-1" />
        </div>

        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={handleGoogleSignIn}
        >
          <GoogleIcon />
          Sign in with Google
        </Button>
        */}
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href={redirectTo ? `/signup?redirectTo=${encodeURIComponent(redirectTo)}` : "/signup"} className="text-primary underline-offset-4 hover:underline" aria-label="Sign up for a new account">
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
