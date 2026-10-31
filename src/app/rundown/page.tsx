import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Brand } from "@/components/brand";
import { SiteFooter } from "@/components/site-footer";
import { parseTrip } from "./trip";
import { RundownView } from "./rundown-view";
import styles from "./rundown.module.css";

export const metadata: Metadata = {
  title: "Rundown — plesir.app",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function RundownPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<div className={styles.page} aria-busy="true" />}>
      <Trip searchParams={searchParams} />
    </Suspense>
  );
}

async function Trip({ searchParams }: { searchParams: SearchParams }) {
  const trip = parseTrip(await searchParams);

  if (trip) return <RundownView {...trip} />;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Brand />
        </div>
      </header>
      <main className={styles.invalid}>
        <h1>Data perjalanan belum lengkap</h1>
        <p>Isi kota tujuan dan tanggal perjalanan di Main Menu dulu, lalu buat rencananya.</p>
        <Link className={styles.primaryLink} href="/">
          Kembali ke Main Menu
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
