import type { ReactNode } from "react";
import { Brand } from "@/components/brand";
import { SiteFooter } from "@/components/site-footer";
import styles from "./rundown.module.css";

/** Layar penuh untuk state rundown non-sukses: input tidak valid, sedang disusun, atau gagal. */
export function Notice({ title, busy, children }: { title: string; busy?: boolean; children: ReactNode }) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Brand />
        </div>
      </header>
      <main className={styles.invalid} aria-busy={busy}>
        <h1>{title}</h1>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
