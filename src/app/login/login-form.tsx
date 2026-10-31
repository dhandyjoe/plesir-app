"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Brand } from "@/components/brand";
import {
  ArrowForwardIcon,
  EyeIcon,
  EyeOffIcon,
  GoogleIcon,
  LockIcon,
  MailIcon,
} from "@/components/icons";
import styles from "./login.module.css";

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("");

  // shortcut: belum ada backend, langsung ke Main Menu tanpa validasi; ganti dengan Firebase Auth + validasi server.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push("/");
  }

  return (
    <section className={styles.card} aria-labelledby="login-title">
      <Brand className={styles.cardBrand} />
      <h1 className={styles.title} id="login-title">
        Selamat datang kembali
      </h1>
      <p className={styles.lead}>
        Masuk untuk membuka lagi rundown dan rute perjalananmu.
      </p>

      <button
        className={styles.googleButton}
        type="button"
        onClick={() => setStatus("Masuk dengan Google belum tersedia.")}
      >
        <GoogleIcon />
        Lanjutkan dengan Google
      </button>

      <p className={styles.or}>atau masuk dengan email</p>

      <form onSubmit={handleSubmit} noValidate>
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
          <div className={styles.labelRow}>
            <label className={styles.label} htmlFor="password">
              Kata sandi
            </label>
            <button
              className={styles.textButton}
              type="button"
              onClick={() => setStatus("Pemulihan kata sandi belum tersedia.")}
            >
              Lupa kata sandi?
            </button>
          </div>
          <div className={styles.inputShell}>
            <span className={styles.inputIcon}>
              <LockIcon />
            </span>
            <input
              className={`${styles.input} ${styles.passwordInput}`}
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Masukkan kata sandi"
            />
            <button
              className={styles.eyeButton}
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-pressed={showPassword}
              aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        <button className={styles.submitButton} type="submit">
          Masuk
          <ArrowForwardIcon />
        </button>
      </form>

      {status && (
        <p className={styles.status} role="status">
          {status}
        </p>
      )}

      <p className={styles.register}>
        Belum punya akun?{" "}
        <Link className={styles.registerLink} href="/register">
          Daftar
        </Link>
      </p>
    </section>
  );
}
