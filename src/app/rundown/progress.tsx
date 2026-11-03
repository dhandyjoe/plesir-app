"use client";

import { useEffect, useState } from "react";
import { estimateProgress, stageAt, type Stage } from "@/lib/progress";
import styles from "./rundown.module.css";

/** Persentase perkiraan sejak `startedAt` (ms epoch); `done` melompat ke 100%. */
export function useProgress(startedAt: number, expectedMs: number, done = false) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (done) return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [done]);
  return done ? 100 : estimateProgress(now - startedAt, expectedMs);
}

type Props = { label: string; startedAt: number; expectedMs: number; stages: Stage[]; done?: boolean };

/** Bar kemajuan perkiraan. Hanya nama tahap yang diumumkan pembaca layar; persen berubah terlalu sering. */
export function ProgressBar({ label, startedAt, expectedMs, stages, done }: Props) {
  const percent = useProgress(startedAt, expectedMs, done);
  const stage = done ? "Selesai" : stageAt(percent, stages);
  return (
    <div className={styles.progress}>
      <div className={styles.progressHead}>
        <span aria-live="polite">{stage}</span>
        <span className={styles.progressValue}>{percent}%</span>
      </div>
      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${percent}%, ${stage}`}
      >
        <div className={styles.progressFill} style={{ transform: `scaleX(${percent / 100})` }} />
      </div>
    </div>
  );
}
