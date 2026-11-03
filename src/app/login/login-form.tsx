"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowForwardIcon,
  EyeIcon,
  EyeOffIcon,
  GoogleIcon,
  LockIcon,
  MailIcon,
} from "@/components/icons";
import { LoginInput, ResetInput, authErrorMessage, parseFields, safeNext, type FieldErrors } from "@/lib/auth-form";
import { onSignedOut, sendReset, signInEmail, signInGoogle, useAuthUser } from "@/lib/firebase/auth";
import { FieldError, errorProps } from "./field-error";
import styles from "./auth.module.css";

type Notice = { text: string; error: boolean };

export function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const user = useAuthUser();
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const reset = mode === "reset";
  const suffix = next === "/" ? "" : `?next=${encodeURIComponent(next)}`;

  // Sudah login saat membuka halaman ini; saat submit, pengalihan dilakukan sendiri setelah berhasil.
  useEffect(() => {
    if (user && !pending) router.replace(next);
  }, [user, pending, next, router]);

  // Next menyimpan state halaman ini setelah pindah rute; saat keluar (user jadi null), kembalikan form ke keadaan awal.
  useEffect(
    () =>
      onSignedOut(() => {
        formRef.current?.reset();
        setMode("login");
        setShowPassword(false);
        setErrors({});
        setNotice(null);
        setPending(false);
      }),
    [],
  );

  async function run(task: () => Promise<unknown>, done: () => void) {
    setPending(true);
    setNotice(null);
    try {
      await task();
      done();
    } catch (error) {
      setPending(false);
      const text = authErrorMessage(error);
      if (text) setNotice({ text, error: true });
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const fail = (found: FieldErrors) => {
      setErrors(found);
      setNotice(null);
      form.querySelector<HTMLInputElement>(`[name="${Object.keys(found)[0]}"]`)?.focus();
    };
    if (reset) {
      const parsed = parseFields(ResetInput, values);
      if (!parsed.ok) return fail(parsed.errors);
      setErrors({});
      // Pesan sama untuk email terdaftar maupun tidak (tidak membocorkan akun yang ada).
      void run(
        () =>
          sendReset(parsed.data.email).catch((error: unknown) => {
            if ((error as { code?: string }).code !== "auth/user-not-found") throw error;
          }),
        () => {
          setPending(false);
          setNotice({
            text: "Jika email terdaftar, tautan atur ulang kata sandi sudah dikirim. Cek juga folder spam.",
            error: false,
          });
        },
      );
      return;
    }
    const parsed = parseFields(LoginInput, values);
    if (!parsed.ok) return fail(parsed.errors);
    setErrors({});
    void run(() => signInEmail(parsed.data.email, parsed.data.password), () => router.replace(next));
  }

  function switchMode(target: "login" | "reset") {
    setMode(target);
    setErrors({});
    setNotice(null);
  }

  return (
    <section className={styles.panel} aria-labelledby="login-title">
      <h1 className={styles.heading} id="login-title">
        {reset ? "Atur ulang kata sandi" : "Selamat datang kembali"}
      </h1>
      <p className={styles.subtitle}>
        {reset
          ? "Masukkan email akunmu, kami kirim tautan untuk membuat kata sandi baru."
          : "Masuk untuk membuka lagi rundown dan rute perjalananmu."}
      </p>

      {!reset && (
        <>
          <button
            className={styles.googleButton}
            type="button"
            disabled={pending}
            onClick={() => void run(signInGoogle, () => router.replace(next))}
          >
            <GoogleIcon />
            Lanjutkan dengan Google
          </button>

          <p className={styles.or}>atau masuk dengan email</p>
        </>
      )}

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        onInput={(event) => {
          const { name } = event.target as HTMLInputElement;
          setErrors((found) => Object.fromEntries(Object.entries(found).filter(([key]) => key !== name)));
          setNotice(null);
        }}
        noValidate
      >
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

        {!reset && (
          <div className={styles.field}>
            <div className={styles.labelRow}>
              <label className={styles.label} htmlFor="password">
                Kata sandi
              </label>
              <button className={styles.textButton} type="button" onClick={() => switchMode("reset")}>
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
                {...errorProps(errors, "password")}
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
            <FieldError errors={errors} name="password" />
          </div>
        )}

        <button className={styles.submitButton} type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "Memproses…" : reset ? "Kirim tautan" : "Masuk"}
          {!pending && <ArrowForwardIcon />}
        </button>
      </form>

      {notice && (
        <p className={`${styles.status} ${notice.error ? styles.statusError : ""}`} role={notice.error ? "alert" : "status"}>
          {notice.text}
        </p>
      )}

      <p className={styles.register}>
        {reset ? (
          <button className={styles.registerLink} type="button" onClick={() => switchMode("login")}>
            Kembali ke Masuk
          </button>
        ) : (
          <>
            Belum punya akun?{" "}
            <Link className={styles.registerLink} href={`/register${suffix}`}>
              Daftar
            </Link>
          </>
        )}
      </p>
    </section>
  );
}
