import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-5">
      <h1
        className="text-4xl font-medium tracking-tight"
        style={{ fontFamily: "var(--font-display), Georgia, serif" }}
      >
        Recipe Box
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        Enter the household password to continue.
      </p>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
