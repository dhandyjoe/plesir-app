import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MAX_TRIP_DAYS } from "@/lib/calendar";
import { PLACES_ATTRIBUTION } from "@/lib/geoapify";
import { Notice } from "./notice";
import { PlanLoader } from "./plan-loader";
import { parseTrip } from "./trip";
import styles from "./rundown.module.css";

export const metadata: Metadata = {
  title: "Rundown — plesir.app",
  // Setiap URL rundown memicu job AI; crawler tidak perlu mengikutinya.
  robots: { index: false, follow: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type SearchParams =Promise<Record<string, string | string[] | undefined>>;

export default function RundownPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<div className={styles.page} aria-busy="true" />}>
      <Trip searchParams={searchParams} />
    </Suspense>
  );
}

async function Trip({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const trip = parseTrip(params);
  // Hanya untuk menghindari fetch sia-sia; server memvalidasi id sebenarnya.
  const planId = typeof params.plan === "string" && UUID.test(params.plan) ? params.plan : undefined;

  if (trip) return <PlanLoader {...trip} planId={planId} attribution={PLACES_ATTRIBUTION} />;

  return (
    <Notice title="Data perjalanan belum lengkap">
      <p>
        Pilih kota tujuan dari daftar dan tanggal perjalanan (maksimal {MAX_TRIP_DAYS} hari) di Main
        Menu dulu, lalu buat rencananya.
      </p>
      <Link className={styles.primaryLink} href="/">
        Kembali ke Main Menu
      </Link>
    </Notice>
  );
}
