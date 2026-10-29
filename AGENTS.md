# Panduan Agent — Plesir

Instruksi ini berlaku untuk seluruh repository. Ikuti permintaan pengguna dan instruksi agent yang lebih spesifik terlebih dahulu; jangan memperluas scope tanpa alasan.

## Konteks project

- Plesir adalah aplikasi web berbahasa Indonesia untuk menyusun rencana perjalanan, dengan rekomendasi tempat dan rundown yang bersumber serta dapat dibuka di Google Maps.
- `prd.md` menjelaskan kebutuhan produk; `architecture.md` menjelaskan rancangan teknis. Keduanya masih berstatus draft. Gunakan sebagai konteks utama, tetapi jangan menganggap semua keputusan sudah diterapkan atau final.
- Sebelum memilih teknologi, pola, atau perintah, periksa isi repository dan konfigurasi aktual. Dokumen mengusulkan Next.js, TypeScript, Firebase, Gemini, Places, dan Routes; verifikasi dulu sebelum mengandalkannya.
- Jika PRD, dokumen arsitektur, kode yang ada, dan permintaan terbaru pengguna bertentangan, jangan menyelesaikannya diam-diam. Jelaskan konflik dan minta keputusan bila konflik itu menghalangi pekerjaan.

## Skills yang wajib dipakai

### Ponytail — semua pekerjaan coding

Untuk menulis, memperbaiki, merefaktor, atau meninjau kode, wajib gunakan skill **Ponytail** yang dipasang di `.agents/skills/ponytail/SKILL.md`. Sumber: [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail). Jika runtime tidak memuat skill otomatis, baca file tersebut dan ikuti instruksinya; jangan mengaku telah memuat skill bila belum membacanya.

- Baca kode dan alur yang terdampak sebelum mengedit; cari pemanggil, test, fixture, konfigurasi, dan ekspor terkait.
- Pilih perubahan terkecil yang menyelesaikan seluruh permintaan. Utamakan pola atau helper yang sudah ada, fitur platform, dan dependensi yang sudah terpasang. Jangan menambah abstraksi, opsi, atau dependensi tanpa kebutuhan yang jelas.
- Jangan memangkas validasi di trust boundary, penanganan error yang mencegah kehilangan data, keamanan, aksesibilitas, atau test yang diperlukan demi membuat diff lebih kecil.
- Untuk logika baru yang nontrivial—misalnya kondisi, loop, parser, uang, atau keamanan—tambahkan test kecil atau self-check yang sesuai.
- Jangan melakukan perubahan di luar scope. Jika ada shortcut dengan batas yang diketahui, dokumentasikan batas dan kapan perlu ditingkatkan dengan komentar `shortcut: <batas>, <kapan ditingkatkan>`.
- Ringkasan akhir harus menyebutkan pemeriksaan yang dilewati/tidak dijalankan dan risiko yang masih ada.

### Taste Skill — semua pekerjaan UI/frontend

Saat membuat, mendesain ulang, merapikan, atau meninjau halaman publik maupun layar aplikasi, wajib gunakan skill **`design-taste-frontend`** yang dipasang di `.agents/skills/design-taste-frontend/SKILL.md`. Sumber: [Leonxlnx/taste-skill](https://github.com/leonxlnx/taste-skill). Baca skill tersebut sebelum mulai dan ikuti panduan lengkapnya yang relevan; jangan mengandalkan ringkasan ini sebagai pengganti skill.

- Tentukan apakah pekerjaan berupa halaman yang dibaca/discroll atau layar aplikasi yang dipakai untuk bekerja; gunakan alur Taste Skill yang sesuai. Aturan halaman marketing tidak otomatis berlaku untuk dashboard atau layar aplikasi.
- Baca UI dan desain yang sudah ada. Pertahankan stack, perilaku, konten, brand, dan bagian yang berfungsi; jangan migrasi framework atau styling library sebagai bagian dari pekerjaan visual.
- Hindari hasil generik/template. Dasarkan komposisi dan visual pada produk Plesir serta kebutuhan pengguna, bukan dekorasi yang tidak punya alasan.
- Gunakan aset yang benar-benar tersedia atau dapat digunakan secara sah. Cantumkan atribusi untuk gambar eksternal dan jangan mengarang testimoni, ulasan, metrik, atau bukti produk.
- Periksa hasil pada ukuran layar yang relevan dan state penting. Jalankan lint/inspector/screenshot workflow milik skill jika tool dan dependensinya tersedia. Jangan mengklaim pemeriksaan visual yang tidak dilakukan; laporkan blocker bila tidak dapat dijalankan.

Kedua skill berjalan bersama: Ponytail mengarahkan scope dan implementasi, Taste Skill mengarahkan kualitas visual UI.

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
4. Jalankan pemeriksaan yang memang dikonfigurasi repository—misalnya lint, typecheck, test, build, atau emulator. Temukan perintah dari manifest/config yang ada; jangan menebak atau mengklaim perintah berhasil bila tidak dijalankan.
5. Tinjau diff akhir untuk perubahan tak terkait, secret, error handling, dan hasil verifikasi.

Jangan menjalankan perintah destruktif atau membuang perubahan yang sudah ada. Jangan memasang dependensi, mengubah infrastruktur, atau menggunakan layanan/API berbiaya tanpa kebutuhan yang jelas dan persetujuan yang sesuai.

## Format laporan akhir

Jawab ringkas dalam Bahasa Indonesia. Sebutkan hasil dan file yang berubah, pemeriksaan yang benar-benar dijalankan beserta hasilnya, pemeriksaan yang tidak dijalankan, serta risiko atau keputusan yang masih diperlukan.
