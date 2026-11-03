import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Kredensial service account (server saja): FIREBASE_SERVICE_ACCOUNT berisi JSON-nya untuk hosting
 * yang tidak punya file (Vercel); bila kosong, pakai GOOGLE_APPLICATION_CREDENTIALS (path file, lokal).
 */
export const adminApp = () => {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  return getApps()[0] ?? initializeApp(serviceAccount ? { credential: cert(JSON.parse(serviceAccount)) } : undefined);
};

export function db() {
  return getFirestore(adminApp());
}
