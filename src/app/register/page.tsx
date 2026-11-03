import type { Metadata } from "next";
import { AuthShell } from "../login/auth-shell";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Daftar — plesir.app",
  description: "Buat akun untuk menyimpan rundown perjalanan dan rute dari Google Maps.",
};

export default function RegisterPage() {
  return (
    <AuthShell
      asideTitle={
        <>
          Sebut kotanya, <span>AI susun rutenya.</span>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
