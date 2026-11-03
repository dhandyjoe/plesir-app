import assert from "node:assert/strict";
import test from "node:test";
import { LoginInput, RegisterInput, ResetInput, authErrorMessage, loginHref, parseFields, safeNext } from "./auth-form.ts";

const valid = { name: "Dina", email: "dina@mail.com", password: "rahasia123", confirmPassword: "rahasia123" };

test("login: email dipangkas, sandi wajib", () => {
  const ok = parseFields(LoginInput, { email: "  a@b.co ", password: "x" });
  assert.deepEqual(ok, { ok: true, data: { email: "a@b.co", password: "x" } });
  const bad = parseFields(LoginInput, { email: "", password: "" });
  assert.equal(bad.ok, false);
  assert.equal(bad.errors.email, "Masukkan alamat email.");
  assert.equal(bad.errors.password, "Masukkan kata sandi.");
});

test("email: format salah dan terlalu panjang", () => {
  assert.match(parseFields(ResetInput, { email: "nama@" }).errors.email, /Format email/);
  assert.match(parseFields(ResetInput, { email: `${"a".repeat(250)}@b.co` }).errors.email, /terlalu panjang/);
});

test("register: valid", () => {
  assert.equal(parseFields(RegisterInput, valid).ok, true);
});

test("register: nama pendek atau berisi karakter kontrol", () => {
  assert.match(parseFields(RegisterInput, { ...valid, name: " D " }).errors.name, /minimal 2/);
  assert.match(parseFields(RegisterInput, { ...valid, name: "Di\nna" }).errors.name, /tidak valid/);
});

test("register: aturan kata sandi", () => {
  for (const password of ["abc123", "hanyahuruf", "12345678"]) {
    const result = parseFields(RegisterInput, { ...valid, password, confirmPassword: password });
    assert.equal(result.ok, false, password);
    assert.match(result.errors.password, /minimal 8 karakter/);
  }
  const same = parseFields(RegisterInput, { ...valid, email: "abcd1234@mail.com", password: "abcd1234@mail.com", confirmPassword: "abcd1234@mail.com" });
  assert.match(same.errors.password, /sama dengan email/);
});

test("register: konfirmasi beda → error di field konfirmasi", () => {
  const result = parseFields(RegisterInput, { ...valid, confirmPassword: "lain12345" });
  assert.equal(result.errors.confirmPassword, "Konfirmasi kata sandi tidak sama.");
  assert.equal(result.errors.password, undefined);
});

test("authErrorMessage", () => {
  assert.equal(authErrorMessage({ code: "auth/invalid-credential" }), "Email atau kata sandi salah.");
  assert.equal(authErrorMessage({ code: "auth/popup-closed-by-user" }), "");
  assert.equal(authErrorMessage({ code: "auth/aneh" }), "Gagal masuk. Coba lagi.");
  assert.equal(authErrorMessage(new Error("x")), "Gagal masuk. Coba lagi.");
  assert.equal(authErrorMessage(null), "Gagal masuk. Coba lagi.");
});

test("safeNext hanya menerima path internal", () => {
  assert.equal(safeNext("/rundown?dest=1&start=2"), "/rundown?dest=1&start=2");
  for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com", "evil", "", null, undefined]) {
    assert.equal(safeNext(bad), "/", String(bad));
  }
});

test("loginHref membawa path dan query, round-trip lewat safeNext", () => {
  assert.equal(loginHref("/"), "/login");
  const href = loginHref("/rundown", "dest=1&start=2");
  assert.equal(href, "/login?next=%2Frundown%3Fdest%3D1%26start%3D2");
  assert.equal(safeNext(new URL(href, "http://x").searchParams.get("next")), "/rundown?dest=1&start=2");
});
