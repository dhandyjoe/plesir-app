"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { loginHref } from "@/lib/auth-form";
import { signOutUser, useAuthUser } from "@/lib/firebase/auth";
import styles from "./account-menu.module.css";

type Props = {
  /** Gaya tombol/tautan di header halaman pemanggil, dipakai untuk kedua keadaan. */
  className: string;
  /** Isi tautan saat belum login (ikon + label). */
  guest: ReactNode;
};

/** Tautan "Masuk / Daftar" untuk tamu; setelah login menjadi menu berisi email dan Keluar. */
export function AccountMenu(props: Props) {
  // useSearchParams butuh Suspense; selama menunggu, tampilkan tautan tamu biasa.
  return (
    <Suspense
      fallback={
        <Link className={props.className} href="/login" aria-label="Masuk atau daftar">
          {props.guest}
        </Link>
      }
    >
      <Menu {...props} />
    </Suspense>
  );
}

function Menu({ className, guest }: Props) {
  const user = useAuthUser();
  const path = usePathname();
  const router = useRouter();
  const query = useSearchParams().toString();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !root.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  if (!user) {
    return (
      <Link
        className={className}
        href={loginHref(path, query)}
        aria-label="Masuk atau daftar"
      >
        {guest}
      </Link>
    );
  }

  const name = user.displayName?.trim() || user.email?.split("@")[0] || "Akun";
  return (
    <div className={styles.root} ref={root}>
      <button
        className={className}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Menu akun ${name}`}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.initial} aria-hidden="true">
          {name[0].toUpperCase()}
        </span>
        <span className={styles.name}>{name.split(/\s+/)[0]}</span>
      </button>
      {open && (
        <div className={styles.menu} id={menuId}>
          {user.email && <p className={styles.email}>{user.email}</p>}
          <Link className={styles.item} href="/rundown-tersimpan" onClick={() => setOpen(false)}>
            Rundown Tersimpan
          </Link>
          <button
            className={styles.item}
            type="button"
            onClick={async () => {
              setOpen(false);
              await signOutUser();
              router.replace("/login");
            }}
          >
            Keluar
          </button>
        </div>
      )}
    </div>
  );
}
