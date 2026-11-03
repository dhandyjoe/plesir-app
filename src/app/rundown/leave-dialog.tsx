"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import styles from "./login-dialog.module.css";

/**
 * Rundown yang belum disimpan tidak diingat di sisi klien: pindah halaman membuangnya.
 * Klik tautan internal ke halaman lain dicegat dan diganti dialog konfirmasi.
 * shortcut: tombol Kembali/Maju browser, muat ulang, dan tombol Keluar (bukan tautan) tidak dicegat; tingkatkan bila perlu.
 */
export function LeaveDialog({ active }: { active: boolean }) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    function intercept(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      // Tautan di dalam dialog (mis. Masuk/Daftar) kembali ke rundown ini, jadi tidak dicegat.
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || link.hasAttribute("download") || link.closest("dialog")) return;
      const url = new URL(link.href);
      if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
      event.preventDefault();
      event.stopPropagation();
      setTarget(url.pathname + url.search + url.hash);
    }
    // Fase capture di document berjalan sebelum handler <Link> Next.js.
    document.addEventListener("click", intercept, true);
    return () => document.removeEventListener("click", intercept, true);
  }, [active]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (target && !dialog.open) dialog.showModal();
    else if (!target && dialog.open) dialog.close();
  }, [target]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="leave-dialog-title"
      aria-describedby="leave-dialog-body"
      onClose={() => setTarget(null)}
      onClick={(event) => {
        if (event.target === event.currentTarget) ref.current?.close();
      }}
    >
      <div className={styles.content}>
        <h2 id="leave-dialog-title">Tinggalkan halaman ini?</h2>
        <p id="leave-dialog-body">
          Rundown ini akan hilang kalau kamu pindah ke halaman lain. Simpan dulu lewat tombol Simpan Rundown bila ingin
          membukanya lagi nanti.
        </p>
        <button className={styles.primary} type="button" autoFocus onClick={() => ref.current?.close()}>
          Tetap di halaman ini
        </button>
        <button
          className={styles.secondary}
          type="button"
          onClick={() => {
            const to = target;
            ref.current?.close();
            if (to) router.push(to);
          }}
        >
          Tinggalkan rundown
        </button>
      </div>
    </dialog>
  );
}
