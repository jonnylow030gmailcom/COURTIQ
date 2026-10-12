import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthFrame } from "@/components/layout/auth-frame";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Anmelden" };

export default function LoginPage() {
  return (
    <AuthFrame title="Willkommen bei COURT IQ" subtitle="by Elitehandball · Melde dich an oder lege ein Trainerkonto an.">
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthFrame>
  );
}
