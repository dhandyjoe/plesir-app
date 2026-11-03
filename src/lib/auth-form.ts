import { z } from "zod";

const email = z
  .string()
  .trim()
  .min(1, "Masukkan alamat email.")
  .max(254, "Alamat email terlalu panjang.")
  .pipe(z.email("Format email belum benar, contoh nama@email.com."));

export const LoginInput = z.object({
  email,
  // Tanpa aturan kekuatan agar akun yang sudah ada tetap bisa masuk.
  password: z.string().min(1, "Masukkan kata sandi."),
});

export const ResetInput = z.object({ email });

export const RegisterInput = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Nama minimal 2 karakter.")
      .max(50, "Nama maksimal 50 karakter.")
      .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), "Nama berisi karakter yang tidak valid."),
    email,
    password: z
      .string()
      .min(8, "Kata sandi minimal 8 karakter dan berisi huruf serta angka.")
      .max(128, "Kata sandi maksimal 128 karakter.")
      .regex(/[A-Za-z]/, "Kata sandi minimal 8 karakter dan berisi huruf serta angka.")
      .regex(/\d/, "Kata sandi minimal 8 karakter dan berisi huruf serta angka."),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password.toLowerCase() !== value.email.toLowerCase(), {
    path: ["password"],
    message: "Kata sandi tidak boleh sama dengan email.",
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Konfirmasi kata sandi tidak sama.",
  });

export type FieldErrors = Record<string, string>;
export type Parsed<T> = { ok: true; data: T } | { ok: false; errors: FieldErrors };

/** Satu pesan per field (pesan pertama); `values` biasanya `Object.fromEntries(new FormData(form))`. */
export function parseFields<T>(schema: z.ZodType<T>, values: Record<string, unknown>): Parsed<T> {
  const result = schema.safeParse(values);
  if (result.success) return { ok: true, data: result.data };
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0] ?? "form");
    errors[field] ??= issue.message;
  }
  return { ok: false, errors };
}

const GENERIC = "Gagal masuk. Coba lagi.";
const MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Email atau kata sandi salah.",
  "auth/wrong-password": "Email atau kata sandi salah.",
  "auth/user-not-found": "Email atau kata sandi salah.",
  "auth/invalid-email": "Format email belum benar, contoh nama@email.com.",
  "auth/email-already-in-use": "Email sudah terdaftar. Masuk atau pakai Lupa kata sandi.",
  "auth/weak-password": "Kata sandi terlalu lemah. Pakai minimal 8 karakter dengan huruf dan angka.",
  "auth/password-does-not-meet-requirements": "Kata sandi belum memenuhi syarat. Pakai minimal 8 karakter dengan huruf dan angka.",
  "auth/too-many-requests": "Terlalu banyak percobaan. Coba lagi beberapa menit lagi.",
  "auth/network-request-failed": "Koneksi terputus. Periksa jaringanmu lalu coba lagi.",
  "auth/popup-blocked": "Izinkan pop-up untuk masuk dengan Google.",
  "auth/account-exists-with-different-credential":
    "Email ini terdaftar dengan metode lain. Masuk dengan email dan kata sandi.",
  "auth/user-disabled": "Akun ini dinonaktifkan.",
  "auth/operation-not-allowed": "Metode masuk ini belum diaktifkan.",
  "auth/unauthorized-domain": "Domain ini belum diizinkan untuk masuk.",
};
/** Pengguna menutup popup sendiri: bukan error, jangan ditampilkan. */
const SILENT = new Set(["auth/popup-closed-by-user", "auth/cancelled-popup-request"]);

/** Pesan Indonesia untuk kode error Firebase Auth; string kosong berarti tidak perlu ditampilkan. */
export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code !== "string") return GENERIC;
  return SILENT.has(code) ? "" : (MESSAGES[code] ?? GENERIC);
}

/** Tujuan setelah login; hanya path internal agar `?next=` tidak jadi open redirect. */
export function safeNext(value: string | null | undefined): string {
  return value && /^\/(?![/\\])/.test(value) ? value : "/";
}

/** Tautan ke /login yang kembali ke halaman `path` (+ `query`) setelah berhasil. */
export function loginHref(path: string, query = ""): string {
  const here = query ? `${path}?${query}` : path;
  return here === "/" ? "/login" : `/login?next=${encodeURIComponent(here)}`;
}
