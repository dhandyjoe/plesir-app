import Image from "next/image";
import type { ReactNode } from "react";
import { SparkleIcon } from "@/components/icons";
import styles from "./auth.module.css";

export function AuthAside({ title }: { title: ReactNode }) {
  return (
    <aside className={styles.aside}>
      <div className={styles.asidePanel}>
        <div>
          <span className={styles.badge}>
            <SparkleIcon />
            AI itinerary planner · Terintegrasi Google Maps
          </span>
          <p className={styles.asideTitle}>{title}</p>
        </div>

        <div className={styles.stage} aria-hidden="true">
          <svg className={styles.stageRoute} viewBox="0 0 560 360" preserveAspectRatio="none" fill="none">
            <path d="M150 250C230 340 330 300 400 160" />
          </svg>
          <figure className={`${styles.photoCard} ${styles.photoCardA}`}>
            <div className={styles.photoFrame}>
              <Image src="/auth/surabaya.jpg" alt="" fill sizes="300px" />
            </div>
            <figcaption>
              <strong>Kota Surabaya</strong>
              <span>Contoh rundown · 2 hari</span>
            </figcaption>
          </figure>
          <figure className={`${styles.photoCard} ${styles.photoCardB}`}>
            <div className={styles.photoFrame}>
              <Image src="/auth/demak.jpg" alt="" fill sizes="240px" />
            </div>
            <figcaption>
              <strong>Kabupaten Demak</strong>
              <span>Contoh rundown · 1 hari</span>
            </figcaption>
          </figure>
        </div>

        <p className={styles.credit}>
          Foto: P. Hughes (CC BY 4.0), Hastosuprayogo (CC BY-SA 4.0) ·{" "}
          <a href="https://commons.wikimedia.org" target="_blank" rel="noopener noreferrer">
            Wikimedia Commons
          </a>
        </p>
      </div>
    </aside>
  );
}
