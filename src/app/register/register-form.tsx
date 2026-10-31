"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Brand } from "@/components/brand";
import {
  AccountIcon,
  ArrowForwardIcon,
  EyeIcon,
  EyeOffIcon,
  GoogleIcon,
  LockIcon,
  MailIcon,
} from "@/components/icons";
import styles from "../login/login.module.css";

export function RegisterForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("");

  // shortcut: belum ada backend, hanya cek kedua sandi sama lalu ke Main Menu; ganti dengan Firebase Auth + validasi server.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (data.get("password") !== data.get("confirmPassword")) {
      setStatus("Konfirmasi kata sandi tidak sama.");
      return;
    }
    router.push("/");
  }

  const passwordToggle = (
    <button
      className={styles.eyeButton}
      type="button"
      onClick={() => setShowPassword((value) => !value)}
      aria-pressed={showPassword}
      aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
    >
      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  );

  return (
    <section className={styles.card} aria-labelledby="register-title">
      <Brand className={styles.cardBrand} />
      <h1 className={styles.title} id="register-title">
        Mulai rencanakan perjalananmu
      </h1>
      <p className={styles.lead}>
        Daftar untuk menyimpan rundown dan membukanya lagi kapan saja.
      </p>

      <button
        className={styles.googleButton}
        type="button"
        onClick={() => setStatus("Daftar dengan Google belum tersedia.")}
      >
        <GoogleIcon />
        Daftar dengan Google
      </button>

      <p className={styles.or}>atau daftar dengan email</p>

      <form onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="name">
            Nama
          </label>
          <div className={styles.inputShell}>
            <span className={styles.inputIcon}>
              <AccountIcon />
            </span>
            <input
              className={styles.input}
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Nama lengkapmu"
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="email">
            Alamat email
          </label>
          <div className={styles.inputShell}>
            <span className={styles.inputIcon}>
              <MailIcon />
            </span>
            <input
              className={styles.input}
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="nama@email.com"
              spellCheck={false}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="password">
            Kata sandi
          </label>
          <div className={styles.inputShell}>
            <span className={styles.inputIcon}>
              <LockIcon />
            </span>
            <input
              className={`${styles.input} ${styles.passwordInput}`}
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Buat kata sandi"
              onChange={() => setStatus("")}
            />
            {passwordToggle}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="confirmPassword">
            Konfirmasi kata sandi
          </label>
          <div className={styles.inputShell}>
            <span className={styles.inputIcon}>
              <LockIcon />
            </span>
            <input
              className={`${styles.input} ${styles.passwordInput}`}
              id="confirmPassword"
              name="confirmPassword"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Ulangi kata sandi"
              onChange={() => setStatus("")}
            />
            {passwordToggle}
          </div>
        </div>

        <button className={styles.submitButton} type="submit">
          Buat akun
          <ArrowForwardIcon />
        </button>
      </form>

      {status && (
        <p className={styles.status} role="status">
          {status}
        </p>
      )}

      <p className={styles.register}>
        Sudah punya akun?{" "}
        <Link className={styles.registerLink} href="/login">
          Masuk
        </Link>
      </p>
    </section>
  );
}
