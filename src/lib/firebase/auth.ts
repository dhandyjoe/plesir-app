"use client";

import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { useSyncExternalStore } from "react";
import { getFirebaseApp } from "./client";

function firebaseAuth() {
  const auth = getAuth(getFirebaseApp());
  auth.languageCode = "id";
  return auth;
}

export const signInEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(firebaseAuth(), email, password);

export async function registerEmail(name: string, email: string, password: string) {
  const { user } = await createUserWithEmailAndPassword(firebaseAuth(), email, password);
  // Akun sudah terbuat; gagal menyimpan nama tidak boleh membuat pendaftaran terlihat gagal.
  await updateProfile(user, { displayName: name }).catch(() => undefined);
}

// shortcut: hanya popup, tanpa fallback signInWithRedirect; pesan "pop-up diblokir" tampil bila gagal, tambahkan redirect bila banyak keluhan di browser in-app mobile.
export function signInGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(firebaseAuth(), provider);
}

/** Selalu kembali ke /login setelah atur ulang; Firebase menolak domain yang belum masuk Authorized domains. */
export const sendReset = (email: string) =>
  sendPasswordResetEmail(firebaseAuth(), email, { url: `${window.location.origin}/login` });

export const signOutUser = () => signOut(firebaseAuth());

// undefined = belum tahu (memuat), null = tamu.
let current: User | null | undefined;

function subscribe(onChange: () => void) {
  try {
    return onAuthStateChanged(firebaseAuth(), (user) => {
      current = user;
      onChange();
    });
  } catch {
    // Konfigurasi Firebase belum lengkap: perlakukan sebagai tamu.
    current = null;
    onChange();
    return () => undefined;
  }
}

/** Panggil `callback` setiap kali tidak ada pengguna login (termasuk saat pertama dimuat sebagai tamu). */
export function onSignedOut(callback: () => void) {
  try {
    return onAuthStateChanged(firebaseAuth(), (user) => {
      if (!user) callback();
    });
  } catch {
    return () => undefined;
  }
}

export function useAuthUser(): User | null | undefined {
  return useSyncExternalStore(subscribe, () => current, () => undefined);
}

/** fetch dengan ID token pengguna yang sedang login (SDK memperbarui token yang kedaluwarsa). */
export async function authFetch(url: string, init: RequestInit = {}) {
  const auth = firebaseAuth();
  await auth.authStateReady(); // sesi tersimpan dipulihkan async; tanpa ini pengguna login bisa terkirim sebagai tamu
  const user = auth.currentUser;
  const headers = new Headers(init.headers);
  if (user) headers.set("Authorization", `Bearer ${await user.getIdToken()}`);
  return fetch(url, { ...init, headers });
}
