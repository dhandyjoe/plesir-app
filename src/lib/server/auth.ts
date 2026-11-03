import "server-only";
import { getAuth } from "firebase-admin/auth";
import { adminApp } from "./firestore";

/**
 * UID dari header `Authorization: Bearer <Firebase ID token>`, atau null bila kosong/rusak/kedaluwarsa.
 * shortcut: tanpa checkRevoked, token yang dicabut tetap berlaku sampai kedaluwarsa (maks 1 jam); aktifkan bila ada kebutuhan pencabutan segera.
 */
export async function userId(request: Request): Promise<string | null> {
  const token = /^Bearer (\S+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token) return null;
  try {
    return (await getAuth(adminApp()).verifyIdToken(token)).uid;
  } catch {
    return null;
  }
}
