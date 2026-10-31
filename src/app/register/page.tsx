import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import styles from "../login/login.module.css";
import { RundownBackdrop } from "../login/rundown-backdrop";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Daftar — plesir.app",
  description: "Buat akun untuk menyimpan rundown perjalanan dan rute dari Google Maps.",
};

export default function RegisterPage() {
  return (
    <div className={styles.page}>
      <RundownBackdrop />

      <main className={styles.main}>
        <RegisterForm />
      </main>

      <SiteFooter className={styles.footer} />
    </div>
  );
}
