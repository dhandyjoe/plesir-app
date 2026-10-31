import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { LoginForm } from "./login-form";
import { RundownBackdrop } from "./rundown-backdrop";
import styles from "./login.module.css";

export const metadata: Metadata = {
  title: "Masuk — plesir.app",
  description: "Masuk untuk membuka rundown perjalanan dan rute dari Google Maps.",
};

export default function LoginPage() {
  return (
    <div className={styles.page}>
      <RundownBackdrop />

      <main className={styles.main}>
        <LoginForm />
      </main>

      <SiteFooter className={styles.footer} />
    </div>
  );
}
