import type { ReactNode } from "react";
import { Suspense } from "react";
import { Brand } from "@/components/brand";
import { SiteFooter } from "@/components/site-footer";
import { AuthAside } from "./auth-aside";
import styles from "./auth.module.css";

/** Kerangka halaman Login dan Register: form (children) di kiri, panel ilustrasi dengan `asideTitle` di kanan. */
export function AuthShell({ asideTitle, children }: { asideTitle: ReactNode; children: ReactNode }) {
  return (
    <div className={styles.split}>
      <div className={styles.formSide}>
        <Brand className={styles.splitBrand} />

        <main className={styles.formMain}>
          <Suspense>{children}</Suspense>
        </main>

        <SiteFooter />
      </div>

      <AuthAside title={asideTitle} />
    </div>
  );
}
