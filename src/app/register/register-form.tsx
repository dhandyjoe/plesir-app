"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  AccountIcon,
  ArrowForwardIcon,
  EyeIcon,
  EyeOffIcon,
  GoogleIcon,
  LockIcon,
  MailIcon,
} from "@/components/icons";
import { RegisterInput, authErrorMessage, parseFields, safeNext, type FieldErrors } from "@/lib/auth-form";
import { onSignedOut, registerEmail, signInGoogle, useAuthUser } from "@/lib/firebase/auth";
import { FieldError, errorProps } from "../login/field-error";
import styles from "../login/auth.module.css";

export function RegisterForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const user = useAuthUser();
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const suffix = next === "/" ? "" : `?next=${encodeURIComponent(next)}`;

  // Sudah login saat membuka halaman ini; saat submit, pengalihan dilakukan sendiri setelah nama tersimpan.
  useEffect(() => {
    if (user && !pending) router.replace(next);
  }, [user, pending, next, router]);

  // Next menyimpan state halaman ini setelah pindah rute; saat keluar (user jadi null), kembalikan form ke keadaan awal.
  useEffect(
    () =>
      onSignedOut(() => {
        formRef.current?.reset();
        setShowPassword(false);
        setErrors({});
        setStatus("");
        setPending(false);
      }),
    [],
  );

  async function run(task: () => Promise<unknown>) {
    setPending(true);
    setStatus("");
    try {
      await task();
      router.replace(next);
    } catch (error) {
      setPending(false);
      setStatus(authErrorMessage(error));
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const parsed = parseFields(RegisterInput, Object.fromEntries(new FormData(form)));
    if (!parsed.ok) {
      setErrors(parsed.errors);
      setStatus("");
      form.querySelector<HTMLInputElement>(`[name="${Object.keys(parsed.errors)[0]}"]`)?.focus();
      return;
    }
    setErrors({});
    const { name, email, password } = parsed.data;
    void run(() => registerEmail(name, email, password));
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
    <section className={styles.panel} aria-labelledby="register-title">
      <h1 className={styles.heading} id="register-title">
        Mulai rencanakan perjalananmu
      </h1>
      <p className={styles.subtitle}>
        Daftar untuk menyimpan rundown dan membukanya lagi kapan saja.
      </p>

      <button
        className={styles.googleButton}
        type="button"
        disabled={pending}
        onClick={() => void run(signInGoogle)}
      >
        <GoogleIcon />
        Daftar dengan Google
      </button>

      <p className={styles.or}>atau daftar dengan email</p>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        onInput={(event) => {
          const { name } = event.target as HTMLInputElement;
          setErrors((found) => Object.fromEntries(Object.entries(found).filter(([key]) => key !== name)));
          setStatus("");
        }}
        noValidate
      >
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
              {...errorProps(errors, "name")}
            />
          </div>
          <FieldError errors={errors} name="name" />
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
              {...errorProps(errors, "email")}
            />
          </div>
          <FieldError errors={errors} name="email" />
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
              {...errorProps(errors, "password", "password-hint")}
            />
            {passwordToggle}
          </div>
          <FieldError errors={errors} name="password" />
          <p className={styles.hint} id="password-hint">
            Minimal 8 karakter, berisi huruf dan angka.
          </p>
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
              {...errorProps(errors, "confirmPassword")}
            />
            {passwordToggle}
          </div>
          <FieldError errors={errors} name="confirmPassword" />
        </div>

        <button className={styles.submitButton} type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "Memproses…" : "Buat akun"}
          {!pending && <ArrowForwardIcon />}
        </button>
      </form>

      {status && (
        <p className={`${styles.status} ${styles.statusError}`} role="alert">
          {status}
        </p>
      )}

      <p className={styles.register}>
        Sudah punya akun?{" "}
        <Link className={styles.registerLink} href={`/login${suffix}`}>
          Masuk
        </Link>
      </p>
    </section>
  );
}
