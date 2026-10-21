"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { loginSchema, type LoginFormValues } from "@/features/auth/schemas";
import { useLogin } from "@/features/auth/hooks";
import { useLoginRememberStore } from "@/stores/login-remember-store";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const login = useLogin();
  const remember = useLoginRememberStore((s) => s.remember);
  const setRemember = useLoginRememberStore((s) => s.setRemember);
  const saveCredentials = useLoginRememberStore((s) => s.saveCredentials);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    function applySaved() {
      const { remember: r, email, password } = useLoginRememberStore.getState();
      if (r && (email || password)) {
        reset({ email, password });
      }
    }
    if (useLoginRememberStore.persist.hasHydrated()) {
      applySaved();
    }
    return useLoginRememberStore.persist.onFinishHydration(applySaved);
  }, [reset]);

  return (
    <form
      className="space-y-5"
      onSubmit={handleSubmit((values) => {
        saveCredentials(values.email, values.password);
        login.mutate(values);
      })}
      noValidate
    >
      <div className="space-y-2">
        <Label htmlFor="email" className="text-slate-700">
          Work email
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          placeholder="you@hiwetclinic.et"
          className="h-11 border-slate-200 bg-white focus-visible:ring-teal-600/40"
          {...register("email")}
        />
        {errors.email ? (
          <p className="text-sm text-red-600" role="alert">
            {errors.email.message}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-slate-700">
          Password
        </Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          className="h-11 border-slate-200 bg-white focus-visible:ring-teal-600/40"
          {...register("password")}
        />
        {errors.password ? (
          <p className="text-sm text-red-600" role="alert">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-800 focus:ring-teal-600"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
        />
        <span>
          Remember my password on this device
          <span className="mt-0.5 block text-[11px] font-normal text-slate-500">
            Saves email and password in this browser only. Do not use on shared
            computers.
          </span>
        </span>
      </label>

      <Button
        type="submit"
        className={cn(
          "h-11 w-full bg-teal-800 text-base font-semibold hover:bg-teal-900",
          login.isPending && "pointer-events-none",
        )}
        disabled={login.isPending}
      >
        {login.isPending ? (
          <span className="flex w-full items-center justify-center gap-2">
            <Skeleton className="h-2 w-24 rounded-full bg-teal-400/50" />
            <span className="text-teal-100">Signing in…</span>
          </span>
        ) : (
          "Sign in"
        )}
      </Button>
    </form>
  );
}
