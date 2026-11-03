"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowForwardIcon } from "@/components/icons";
import styles from "./login-dialog.module.css";

export type LoginReason = "edit" | "save";

/** Halaman daftar rundown yang disimpan lewat tombol Simpan Rundown. */
export const SAVED_PATH = "/rundown-tersimpan";

const COPY: Record<LoginReason, { title: string; body: string }> = {
  edit: {
    title: "Masuk dulu untuk mengedit rundown",
    body: "Instruksi AI untuk mengubah rencana hanya tersedia bagi akun yang sudah masuk, supaya setiap perubahanmu tersimpan dan bisa dibuka lagi.",
  },
  save: {
    title: "Masuk dulu untuk menyimpan rundown",
    body: "Dengan akun, rundown ini tersimpan atas namamu dan bisa kamu buka lagi kapan saja dari perangkat mana pun.",
  },
};

type Props = {
  /** null = tertutup. */
  reason: LoginReason | null;
  /** Tujuan tombol Masuk (tautan /login yang membawa halaman tujuan setelah login). */
  href: string;
  onClose: () => void;
};

/** Pengingat bahwa mengedit/menyimpan rundown butuh login. Tamu tetap boleh melihat rundown. */
export function LoginDialog({ reason, href, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const copy = COPY[reason ?? "edit"];

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (reason && !dialog.open) dialog.showModal();
    else if (!reason && dialog.open) dialog.close();
  }, [reason]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="login-dialog-title"
      aria-describedby="login-dialog-body"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) ref.current?.close();
      }}
    >
      <div className={styles.art} aria-hidden="true">
        <svg viewBox="0 0 320 132" className={styles.svg} focusable="false">
          <path className={styles.route} d="M28 96 C 72 96, 70 40, 118 40 S 176 92, 214 80" />
          <circle className={styles.stop} cx="28" cy="96" r="9" />
          <circle className={styles.stop} cx="118" cy="40" r="9" />
          <circle className={styles.stopSoft} cx="214" cy="80" r="9" />
          <g className={styles.badge}>
            <circle cx="268" cy="66" r="30" />
            <rect className={styles.lockBody} x="254" y="64" width="28" height="22" rx="5" />
            <path className={styles.lockShackle} d="M260 64 v-7 a8 8 0 0 1 16 0 v7" />
            <circle className={styles.lockHole} cx="268" cy="74" r="3" />
          </g>
        </svg>
      </div>

      <div className={styles.content}>
        <h2 id="login-dialog-title">{copy.title}</h2>
        <p id="login-dialog-body">{copy.body}</p>
        <p className={styles.reassure}>Rundown yang sedang kamu lihat tidak hilang. Setelah masuk, kamu kembali ke halaman ini.</p>

        {/* Tutup dulu: dialog modal yang tersisa di top layer akan menutupi dan mengunci halaman login. */}
        <Link className={styles.primary} href={href} autoFocus onClick={() => ref.current?.close()}>
          Masuk / Daftar
          <ArrowForwardIcon />
        </Link>
        <button className={styles.secondary} type="button" onClick={() => ref.current?.close()}>
          Nanti saja
        </button>
      </div>
    </dialog>
  );
}
