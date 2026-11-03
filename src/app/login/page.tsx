import type { Metadata } from "next";
import { AuthShell } from "./auth-shell";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Masuk — plesir.app",
  description: "Masuk untuk membuka rundown perjalanan dan rute dari Google Maps.",
};

export default function LoginPage() {
  return (
    <AuthShell
      asideTitle={
        <>
          Rundown-mu masih di sini. <span>Tinggal lanjut jalan.</span>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
