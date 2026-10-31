import { initializeApp } from "firebase-admin/app";
import { onCall } from "firebase-functions/v2/https";

initializeApp();

// shortcut: region provisional sampai keputusan deployment dikunci.
export const healthCheck = onCall({ region: "asia-southeast2" }, () => ({
  ok: true,
}));
