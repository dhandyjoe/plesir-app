# Plesir

Plesir adalah rancangan aplikasi web berbahasa Indonesia untuk membantu menyusun rencana perjalanan. Pengguna memasukkan kota tujuan dan rentang tanggal perjalanan, lalu aplikasi dirancang untuk menyajikan itinerary dengan rekomendasi tempat, sumber informasi, serta tautan Google Maps.

AI dirancang untuk membantu memilih kandidat tempat yang terverifikasi dan menyusun itinerary—bukan menjadi sumber fakta tempat. Jarak dan waktu perjalanan harus berupa estimasi dari layanan rute yang sesuai.

## Status

Fondasi web sudah tersedia: Next.js App Router, TypeScript, Firebase Web SDK, Cloud Functions Gen 2, dan Firestore rules tertutup. Main Menu sudah diimplementasikan sebagai form awal kota dan rentang tanggal berangkat–pulang; penyusunan rencana dan autentikasi belum tersambung ke backend.

## Menjalankan

Kebutuhan runtime:

- Node.js 24.12+ untuk frontend.
- Node.js 22 untuk instalasi dan build paket `functions/` agar sesuai runtime deploy.
- Java dan Firebase Emulator tidak dipakai pada proyek ini.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Isi konfigurasi Firebase Web SDK di `.env.local`. Nilai `NEXT_PUBLIC_FIREBASE_*` adalah identifier klien, bukan secret backend. API key Gemini, Geoapify (`GEOAPIFY_API_KEY`), dan provider rute hanya untuk server; jangan diletakkan di environment frontend.

Pemeriksaan:

```bash
npm run check
```

Perintah tersebut menjalankan lint, typecheck frontend, typecheck Functions, build Next.js, dan build Functions.

Unit test (`node:test`, Node 24.12+, tanpa dependensi tambahan; belum termasuk dalam `npm run check`):

```bash
node --test "src/**/*.test.mjs"
node --test --experimental-test-coverage "src/**/*.test.mjs"   # dengan coverage
```

Test mencakup logika murni di `src/lib` dan `src/app/rundown`. Kode server (`src/lib/server`, `/api/*`) serta komponen React belum dites.

## Backend dan Firebase

```bash
npm --prefix functions install
npx firebase login
npx firebase use --add
npx firebase deploy --only firestore:rules
npx firebase deploy --only functions
```

- `firebase.json` mengatur Functions Gen 2 dengan runtime `nodejs22`.
- `firestore.rules` sengaja menutup semua akses sampai aturan per collection dibuat.
- Project Firebase belum dikonfigurasi di repository ini; `.firebaserc` dibuat saat `firebase use --add`.
- Firebase App Hosting belum diaktifkan. App Hosting memerlukan paket Blaze dan keputusan region sebelum deployment.
- Proyek ini memakai satu environment. Pengujian dapat mengubah data nyata; gunakan data uji untuk automated test dan jangan menaruh data pribadi di log.

## Deploy (Vercel)

Aplikasi butuh server (route `/api/*`, job `after()`, `firebase-admin`), jadi tidak bisa di GitHub Pages. Repo dihubungkan ke Vercel; tiap push ke `main` otomatis deploy.

- Node.js 24.x di Settings → General.
- Environment Variables: empat `NEXT_PUBLIC_FIREBASE_*`, `GEOAPIFY_API_KEY`, `GEMINI_API_KEY`, dan `FIREBASE_SERVICE_ACCOUNT` (isi JSON service account; menggantikan `GOOGLE_APPLICATION_CREDENTIALS`).
- Domain Vercel ditambahkan di Firebase Console → Authentication → Settings → Authorized domains.
- Route yang menjalankan Gemini di `after()` memakai `maxDuration = 300` (batas paket Hobby).

## Struktur

```text
src/                 Next.js App Router dan Firebase client
functions/           Cloud Functions Gen 2 (TypeScript)
firebase.json        Konfigurasi Functions dan Firestore
firestore.rules      Baseline rules tertutup
```


## Dokumen

- [PRD](prd.md) — kebutuhan dan ruang lingkup produk.
- [Arsitektur teknis](architecture.md) — rancangan sistem dan pilihan teknologi yang masih perlu divalidasi.

## Arah MVP

- Perencanaan perjalanan satu kawasan; Malang Raya merupakan usulan wilayah pilot.
- Itinerary harian dengan rekomendasi penginapan, tempat makan, kafe/kopi, dan wisata.
- Sumber tempat ditampilkan, dan navigasi dapat dilanjutkan melalui Google Maps.
- Membuat rencana dirancang tetap bisa dilakukan tanpa login; login untuk menyimpan riwayat.

Untuk detail dan batasan, lihat [PRD](prd.md) dan [dokumen arsitektur](architecture.md).
