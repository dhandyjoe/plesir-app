# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Instruksi ini berlaku untuk seluruh repository. Ikuti permintaan pengguna dan instruksi agent yang lebih spesifik terlebih dahulu; jangan memperluas scope tanpa alasan.

## Konteks project

- Plesir adalah aplikasi web berbahasa Indonesia untuk menyusun rencana perjalanan, dengan rekomendasi tempat dan rundown yang bersumber serta dapat dibuka di Google Maps.
- `prd.md` menjelaskan kebutuhan produk; `architecture.md` menjelaskan rancangan teknis. Keduanya masih berstatus draft. Gunakan sebagai konteks utama, tetapi jangan menganggap semua keputusan sudah diterapkan atau final.
- Sebelum memilih teknologi, pola, atau perintah, periksa isi repository dan konfigurasi aktual. Dokumen mengusulkan Next.js, TypeScript, Firebase, Gemini, Geoapify, dan Routes; verifikasi dulu sebelum mengandalkannya.
- Jika PRD, dokumen arsitektur, kode yang ada, dan permintaan terbaru pengguna bertentangan, jangan menyelesaikannya diam-diam. Jelaskan konflik dan minta keputusan bila konflik itu menghalangi pekerjaan.
- Status saat ini: Main Menu (form kota + rentang tanggal, maks 5 hari), halaman rundown yang menyusun rencana nyata, dan login/register dengan Firebase Authentication (Google + email/kata sandi, lupa kata sandi, menu akun/Keluar di header; validasi di `src/lib/auth-form.ts`, klien di `src/lib/firebase/auth.ts`). Tamu boleh menyusun rundown; `/api/itineraries*` wajib `Authorization: Bearer <ID token>` (`src/lib/server/auth.ts`) dan itinerary punya `ownerUid`. `/rundown` (`plan-loader.tsx`) memanggil `POST /api/plans` lalu memantau `GET /api/plans` sampai selesai; job disimpan di Firestore `planJobs/{dest}_{start}_{end}` dan dijalankan di `after()` (`src/lib/server/plan-jobs.ts`) karena Gemini free tier butuh 1–3 menit. Isi job: `generatePlan()` (`src/lib/server/plan.ts`) — kandidat Geoapify untuk 4 kategori → Gemini (REST, `src/lib/server/gemini.ts`) memilih `ref` kandidat dan menyusun jadwal → validasi `toRundown()` (`src/lib/plan.ts`: jam 07:00–21:00, sarapan/makan siang/makan malam wajib, tempat tutup menurut `opening_hours` ditolak lewat `src/lib/opening-hours.ts`). Kuota harian Geoapify dan Gemini dijaga `reserveQuota()` di Firestore; Gemini otomatis pindah dari `GEMINI_MODEL` (default 3.5 Flash Lite) ke `GEMINI_FALLBACK_MODEL` (default 3.8 Flash) saat kuota model utama habis, kena 429/5xx, atau timeout; model yang timeout/5xx di-cooldown 10 menit (`src/lib/server/gemini.ts`). Setelah validasi, `enrichDays()` (`src/lib/server/enrich.ts`) menempelkan foto Wikimedia Commons (dari tag OSM, `src/lib/server/photos.ts`) dan estimasi jarak/waktu berkendara tiap ruas berurutan penginapan → stop → … → penginapan (`fromPrev`, ditampilkan di garis penghubung; Geoapify Route Matrix 1×1 per ruas, `src/lib/server/routes.ts`); gagal berarti field dibiarkan kosong. Pada revisi `carryOver()` (`src/lib/enrich.ts`) membawa data stop lama. `GET /api/places` juga tersedia. Loading penyusunan dan revisi menampilkan progress bar 0–95% perkiraan berbasis waktu (`src/lib/progress.ts`, `progress.tsx`; server mengirim `elapsedMs` agar bar lanjut saat halaman dimuat ulang), lalu 100% saat selesai. Prompt bar di rundown merevisi rencana: `useRevision` (`use-revision.ts`) membuat `itineraries/{uuid}` lewat `/api/itineraries`, Gemini mengembalikan rundown utuh yang divalidasi `toRevision()` (`src/lib/plan.ts`, pipeline di `src/lib/server/revise.ts`), pengguna melihat preview lalu Terapkan/Undo (lihat `architecture.md` §7.5). Tombol Simpan Rundown menandai itinerary `saved: true` (`PATCH {action:"save"}` atau `POST` dengan `save: true`, maks `MAX_SAVED` = 30 per akun); yang tersimpan tidak kena TTL 30 hari. `/rundown-tersimpan` (`saved-list.tsx`) menampilkan daftar dari `GET /api/itineraries` (ringkasan `toSummary()`), membuka/mengedit lewat `/rundown?…&plan=<id>`, dan menghapus lewat `DELETE /api/itineraries/{id}`; tamu melihat panel ajakan masuk. Login dan register memakai kerangka dua kolom bersama (`src/app/login/auth-shell.tsx`, gaya di `auth.module.css`). Firebase di paket Spark (tanpa Blaze), jadi `functions/` (hanya callable `healthCheck`) tidak bisa di-deploy; `firestore.rules` menolak semua akses klien (server memakai `firebase-admin`). Hosting: Vercel (auto-deploy dari `main`); di sana kredensial admin lewat env `FIREBASE_SERVICE_ACCOUNT` (JSON), lokal lewat `GOOGLE_APPLICATION_CREDENTIALS`.

## Commands

```bash
npm run dev              # Next.js dev server
npm run lint             # eslint .
npm run typecheck        # tsc --noEmit (frontend only; functions/ is excluded)
npm run functions:typecheck
npm run build            # next build
npm run functions:build
npm run check            # lint + typecheck + functions typecheck + build + functions build

# Tests: node:test files (*.test.mjs) beside the code they cover (src/lib, src/app/rundown), no npm script — run directly (TS imports need Node's type stripping, Node >=24.12):
node --test src/lib/calendar.test.mjs
node --test "src/**/*.test.mjs"
node --test --experimental-test-coverage "src/**/*.test.mjs"   # with coverage

# Regenerate src/data/destinations.json from Wikidata (manual, hits network):
node scripts/build-destinations.mjs
```

Node 24.12+ for the frontend; Node 22 for installing/building `functions/` (matches the `nodejs22` deploy runtime). `functions/` has its own `package.json` (`npm --prefix functions install`). No Firebase emulator is used; there is a single environment, so use test data only. Copy `.env.example` to `.env.local` for the `NEXT_PUBLIC_FIREBASE_*` client identifiers; backend/provider keys (Gemini, Geoapify, Routes) must never go in frontend env.

## Testing

- Test hanya untuk logika murni; import modul dengan ekstensi `.ts` dan jalur relatif (Node tidak mengenal alias `@/`), jadi modul yang dites tidak boleh meng-import `@/…`, `server-only`, atau SDK Firebase.
- `src/lib/server/*`, route `/api/*`, `src/lib/firebase/*`, dan komponen React belum punya test (butuh mock/emulator atau test runner komponen). Letakkan logika yang perlu dites di `src/lib` agar tetap bisa dites tanpa itu.
- Gaya test: satu perilaku per `test()`, nama dalam Bahasa Indonesia, `node:assert/strict`, tanpa jaringan/Firestore/API berbiaya.

## Architecture

- **Next.js 16 breaking changes**: APIs and conventions differ from training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any Next.js code and heed deprecation notices.
- **Next.js 16 App Router** (`src/app`) with React 19, `cacheComponents` and `partialPrefetching` enabled in `next.config.ts`. Pages that read `searchParams` wrap the dynamic part in `<Suspense>` (see `src/app/rundown/page.tsx`).
- **Styling**: CSS Modules per component/page plus `globals.css`; no CSS framework. Design tokens/guidance live in `DESIGN.md` ("Kinetic Horizon"). Import alias `@/*` → `src/*`.
- **Destinations**: `src/data/destinations.json` (514 Indonesian kabupaten/kota, built from Wikidata) is served statically via `src/lib/destinations.ts` and `GET /api/destinations?q=` (zod-validated, publicly cacheable); `src/app/destination-combobox.tsx` is the client consumer.
- **Dates**: `src/lib/calendar.ts` holds date helpers used by `src/components/date-range-picker.tsx`; trip query params are parsed in `src/app/rundown/trip.ts`.
- **Firebase**: client SDK init in `src/lib/firebase/client.ts`; server side is Cloud Functions Gen 2 in `functions/src/index.ts` (region `asia-southeast2` is provisional). `firebase.json` builds functions in predeploy. App Hosting is not enabled and `.firebaserc` is not committed.
- `.taste-skill/` holds screenshot/report output from the design-taste inspector; it is tooling output, not app code.

## Skills yang wajib dipakai

### Ponytail — semua pekerjaan coding

Untuk menulis, memperbaiki, merefaktor, atau meninjau kode, wajib gunakan skill **Ponytail** yang dipasang di `.claude/skills/ponytail/SKILL.md`. Sumber: [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail). Jika runtime tidak memuat skill otomatis, baca file tersebut dan ikuti instruksinya; jangan mengaku telah memuat skill bila belum membacanya.

- Baca kode dan alur yang terdampak sebelum mengedit; cari pemanggil, test, fixture, konfigurasi, dan ekspor terkait.
- Pilih perubahan terkecil yang menyelesaikan seluruh permintaan. Utamakan pola atau helper yang sudah ada, fitur platform, dan dependensi yang sudah terpasang. Jangan menambah abstraksi, opsi, atau dependensi tanpa kebutuhan yang jelas.
- Jangan memangkas validasi di trust boundary, penanganan error yang mencegah kehilangan data, keamanan, aksesibilitas, atau test yang diperlukan demi membuat diff lebih kecil.
- Untuk logika baru yang nontrivial—misalnya kondisi, loop, parser, uang, atau keamanan—tambahkan test kecil atau self-check yang sesuai.
- Jangan melakukan perubahan di luar scope. Jika ada shortcut dengan batas yang diketahui, dokumentasikan batas dan kapan perlu ditingkatkan dengan komentar `shortcut: <batas>, <kapan ditingkatkan>`.
- Ringkasan akhir harus menyebutkan pemeriksaan yang dilewati/tidak dijalankan dan risiko yang masih ada.

### Taste Skill — semua pekerjaan UI/frontend

Saat membuat, mendesain ulang, merapikan, atau meninjau halaman publik maupun layar aplikasi, wajib gunakan skill **`design-taste-frontend`** yang dipasang di `.claude/skills/design-taste-frontend/SKILL.md`. Sumber: [Leonxlnx/taste-skill](https://github.com/leonxlnx/taste-skill). Baca skill tersebut sebelum mulai dan ikuti panduan lengkapnya yang relevan; jangan mengandalkan ringkasan ini sebagai pengganti skill.

- Tentukan apakah pekerjaan berupa halaman yang dibaca/discroll atau layar aplikasi yang dipakai untuk bekerja; gunakan alur Taste Skill yang sesuai. Aturan halaman marketing tidak otomatis berlaku untuk dashboard atau layar aplikasi.
- Baca UI dan desain yang sudah ada. Pertahankan stack, perilaku, konten, brand, dan bagian yang berfungsi; jangan migrasi framework atau styling library sebagai bagian dari pekerjaan visual.
- Hindari hasil generik/template. Dasarkan komposisi dan visual pada produk Plesir serta kebutuhan pengguna, bukan dekorasi yang tidak punya alasan.
- Gunakan aset yang benar-benar tersedia atau dapat digunakan secara sah. Cantumkan atribusi untuk gambar eksternal dan jangan mengarang testimoni, ulasan, metrik, atau bukti produk.
- Periksa hasil pada ukuran layar yang relevan dan state penting. Jalankan lint/inspector/screenshot workflow milik skill jika tool dan dependensinya tersedia. Jangan mengklaim pemeriksaan visual yang tidak dilakukan; laporkan blocker bila tidak dapat dijalankan.

Kedua skill berjalan bersama: Ponytail mengarahkan scope dan implementasi, Taste Skill mengarahkan kualitas visual UI.

### Caveman — gaya balasan chat yang ringkas

Untuk balasan di chat, gunakan skill **Caveman** yang dipasang di `.claude/skills/caveman/SKILL.md` (varian `.claude/skills/ultracave/` dan `.claude/skills/megacave/` hanya dipakai bila diminta eksplisit lewat `/ultracave`, `/megacave`, `/caveman ultra`, atau `/caveman wenyan`). Sumber: [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman) v4.0.1, lisensi Apache-2.0. Jika runtime tidak memuat skill otomatis, baca file tersebut dan ikuti instruksinya.

- Caveman hanya mengatur cara balasan dibaca; Ponytail tetap mengatur berapa banyak kode yang ditulis.
- Tetap gunakan Bahasa Indonesia. Kode, perintah, path, angka, dan pesan error tetap verbatim.
- Jangan pakai gaya caveman untuk apa pun yang disimpan di luar chat: kode, komentar, commit, dokumen, PR, issue, dan memori. Peringatan keamanan, konfirmasi aksi yang tidak dapat dibatalkan, dan pertanyaan ke pengguna ditulis dengan kalimat lengkap.
- Berhenti bila pengguna meminta "stop caveman" atau "normal mode".

## Batasan produk, data, dan keamanan

- Model AI membantu memahami preferensi, memilih kandidat terverifikasi, dan menyusun itinerary. Model bukan sumber fakta tempat dan tidak boleh mengarang nama, alamat, koordinat, jam buka, harga, rating, jarak, waktu tempuh, atau status operasional.
- Prompt pengguna Plesir adalah untuk merevisi itinerary. Jangan membuat fitur yang memberi prompt akses untuk mengubah source code, menjalankan query bebas, atau menulis langsung ke database.
- Validasi input dan output di server, khususnya hasil AI terstruktur, ID tempat, kepemilikan data, versi itinerary, dan operasi yang mengubah data. Jangan percaya validasi frontend sebagai satu-satunya pengaman.
- Jangan menaruh secret/API key di browser, source control, log, atau variabel `NEXT_PUBLIC_*`. Jangan menggunakan data produksi untuk pengujian lokal.
- Hormati autentikasi, kepemilikan data, Security Rules, rate limit, App Check, idempotensi, kontrol biaya, ketentuan lisensi/cache provider, dan atribusi sumber yang diwajibkan.
- Minimalkan data pribadi. Jangan mengirim email, UID, token, atau informasi sensitif ke model/provider bila tidak diperlukan; jangan memasukkan prompt mentah atau PII ke analytics/log tanpa kebutuhan dan dasar yang jelas.
- Jangan mengarang fallback faktual ketika provider gagal. Tampilkan hasil parsial atau ketidaktersediaan data secara jujur.

## Kualitas implementasi dan UX

- Gunakan konvensi, struktur, dan dependensi repository yang sudah ada. Jangan membuat ulang komponen atau service jika yang sesuai sudah tersedia.
- Untuk UI Plesir, utamakan Bahasa Indonesia, mobile-first, akses keyboard, label yang jelas, focus state, kontras memadai, dan dukungan reduced motion bila ada animasi.
- Rancang state kosong, loading, error, offline, dan data parsial—bukan hanya tampilan sukses.
- Jarak dan waktu perjalanan harus berasal dari layanan rute yang sesuai moda. Labeli sebagai estimasi; jangan tampilkan jarak garis lurus seolah-olah jarak berkendara.
- Jaga perubahan tetap fokus dan mudah ditinjau. Jangan mengubah atau menghapus pekerjaan pengguna yang tidak terkait.

## Alur kerja dan verifikasi

1. Periksa file, pola, status perubahan yang ada, dan instruksi lokal sebelum mengedit.
2. Tentukan file serta alur yang terdampak; pahami risiko perubahan terhadap pengguna dan data.
3. Implementasikan solusi terkecil yang lengkap, termasuk memperbarui pemanggil dan test yang terdampak.
4. Jalankan pemeriksaan yang memang dikonfigurasi repository (lihat Commands). Jangan menebak atau mengklaim perintah berhasil bila tidak dijalankan.
5. Tinjau diff akhir untuk perubahan tak terkait, secret, error handling, dan hasil verifikasi.

Jangan menjalankan perintah destruktif atau membuang perubahan yang sudah ada. Jangan memasang dependensi, mengubah infrastruktur, atau menggunakan layanan/API berbiaya tanpa kebutuhan yang jelas dan persetujuan yang sesuai.

## Format laporan akhir

Jawab ringkas dalam Bahasa Indonesia. Sebutkan hasil dan file yang berubah, pemeriksaan yang benar-benar dijalankan beserta hasilnya, pemeriksaan yang tidak dijalankan, serta risiko atau keputusan yang masih diperlukan.
