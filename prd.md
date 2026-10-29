# PRD — Plesir (plesir.app)

Versi 1.2 (Draft untuk review) · Diperbarui 29 Oktober 2026 · Status: Draft · Pemilik: Product Owner

## 1. Ringkasan Eksekutif

Plesir (plesir.app) adalah aplikasi web berbahasa Indonesia berbasis AI yang membantu orang merencanakan perjalanan ke suatu daerah tanpa riset manual. Aplikasi ini gratis sepenuhnya dan tanpa fitur berbayar, dan pengguna dapat login untuk menyimpan riwayat destinasi. Pengguna cukup memasukkan dua hal, yaitu kota tujuan dan lama perjalanan (hari). AI lalu meriset dan menyusun rencana secara otomatis berupa rekomendasi hotel atau penginapan, tempat makan, kafe/kopi, dan tempat wisata, yang dirangkai menjadi rundown harian lengkap dengan jarak (km), perkiraan waktu tempuh, alasan pemilihan, sumber informasi, dan tautan Google Maps untuk navigasi.

**Hipotesis produk:** jika pengguna cukup memasukkan kota tujuan dan lama perjalanan lalu menerima rundown yang berbasis data terverifikasi, transparan soal sumbernya, dan bisa langsung dibuka di Google Maps, maka waktu riset turun drastis dan keyakinan memilih tempat meningkat dibanding mencari manual di banyak aplikasi.

**Fokus validasi MVP:** satu kawasan pilot (usulan: Malang Raya, yaitu Kota Malang, Kota Batu, dan sebagian Kabupaten Malang) agar kualitas data bisa diaudit sebelum diperluas.

**Prinsip produk (v1.1):**

- **Gratis:** seluruh fitur tersedia tanpa pembayaran, langganan, atau fitur berbayar.
- **AI sebagai perancang:** AI meriset dan menyusun rundown destinasi secara otomatis.
- **Input minimal:** pengguna cukup memasukkan kota tujuan dan lama perjalanan (hari); input lain bersifat opsional dan diisi AI dengan default yang transparan.
- **Login untuk menyimpan:** pengguna dapat login untuk menyimpan riwayat destinasi dan membukanya kembali; membuat rencana tidak mewajibkan login.

## 2. Latar Belakang dan Problem Statement

### 2.1 Masalah

Saat akan bepergian ke daerah yang belum dikenal, misalnya Malang, pengguna harus:

- Mencari penginapan di beberapa aplikasi dan membandingkan lokasinya terhadap tempat yang ingin dikunjungi.
- Mencari tempat makan, kafe, dan kopi yang sedang ramai dibicarakan, lewat media sosial, blog, dan Google Maps.
- Menilai tempat wisata mana yang layak dan masih ramai dikunjungi.
- Menyusun urutan kunjungan sendiri sambil menebak jarak dan waktu tempuh antarlokasi.

**Pernyataan masalah:** Pelancong merasa direpotkan karena riset perjalanan tersebar di banyak sumber, memakan waktu, dan sulit dipastikan kualitas serta kemutakhirannya, sehingga keputusan memilih tempat dan menyusun rute menjadi lambat dan tidak yakin.

### 2.2 Peluang

AI dapat menggabungkan riset, pemilihan, dan penyusunan jadwal dalam satu percakapan atau form singkat. Nilai utamanya ada pada tiga hal: **keringkasan** (satu hasil, bukan puluhan tab), **kedekatan lokasi** (jarak dan urutan masuk akal), dan **kepercayaan** (sumber dan alasan terlihat).

## 3. Tujuan, Non-Tujuan, dan Metrik

### 3.1 Tujuan Produk

- Mempercepat riset perjalanan dari hitungan jam menjadi hitungan menit, cukup dengan memasukkan kota tujuan dan lama perjalanan (hari).
- Membiarkan AI merancang rundown dan memilih hotel, tempat makan, kafe/kopi, dan tempat wisata secara otomatis.
- Menyajikan rekomendasi relevan beserta alasan dan sumbernya.
- Menyusun rundown harian yang realistis berdasarkan lokasi, jarak, dan jam buka, dengan preferensi opsional bila pengguna mengisinya.
- Memudahkan pengguna melanjutkan ke Google Maps tanpa menyalin alamat manual.
- Memungkinkan pengguna login dan menyimpan riwayat destinasi agar rencana dapat dibuka kembali, diubah, dan dipakai ulang.
- Menyediakan seluruh manfaat ini gratis, tanpa biaya, langganan, atau fitur berbayar.

### 3.2 Non-Tujuan MVP

- Pemesanan hotel, tiket, atau restoran di dalam produk.
- Menggantikan Google Maps sebagai aplikasi navigasi.
- Menjamin keramaian real-time atau ketersediaan kamar.
- Perencanaan multi-kota dan lintas negara.
- Pembayaran, langganan, atau fitur berbayar apa pun; aplikasi gratis sepenuhnya bagi pengguna.
- Mewajibkan login untuk membuat rencana; login hanya diperlukan untuk menyimpan riwayat.

### 3.3 Metrik Keberhasilan

**North Star Metric:** jumlah *rencana terpakai*, yaitu rencana yang minimal satu lokasinya dibuka di Google Maps atau yang disimpan/dibagikan.

Semua angka di bawah adalah **hipotesis awal** untuk uji pilot. Target final ditetapkan setelah data baseline terkumpul.

| Metrik | Definisi | Hipotesis target pilot |
| --- | --- | --- |
| Activation rate | Sesi yang mengirim kota dan jumlah hari lalu berhasil menampilkan rundown | ≥ 70% |
| Form completion | Pengguna yang mulai mengisi lalu mengirim form dua kolom | ≥ 85% |
| Time to first rundown | Dari klik “Buat Rencana” sampai rundown tampil (P90) | ≤ 60 detik |
| Maps open rate | Rencana dengan ≥ 1 klik tautan Google Maps | ≥ 50% |
| Engagement rekomendasi | Rekomendasi yang dibuka, disimpan, atau dipilih | Baseline dulu |
| Edit/regenerate rate | Rencana yang diedit atau diminta revisi | Pita sehat 30–60% (rencana awal memakai default sehingga revisi wajar; terlalu rendah berarti tidak dipakai, terlalu tinggi berarti hasil awal kurang pas) |
| Kepuasan relevansi | Thumbs-up terhadap rekomendasi dan rundown | ≥ 75% |
| Akurasi fakta tempat | Hasil audit sampel: nama, alamat, dan status tempat valid | ≥ 95% |
| Biaya per rencana | Total biaya model AI, data tempat, dan rute per rencana | Batas ditetapkan di Fase 0 dan harus muat dalam anggaran operasional bulanan |
| Login rate | Pengguna yang membuat rencana lalu login | Baseline dulu |
| Retensi riwayat | Pengguna login yang membuka kembali rencana tersimpan dalam 30 hari | ≥ 20% |

## 4. Target Pengguna

### 4.1 Segmen Awal (Usulan, Perlu Validasi)

Wisatawan domestik Indonesia berusia sekitar 20–40 tahun yang merencanakan perjalanan 1–4 hari ke satu kota atau kawasan, bepergian sendiri, berpasangan, bersama keluarga kecil, atau dengan teman (2–6 orang), dan terbiasa memakai Google Maps.

### 4.2 Persona Ringkas

| Persona | Konteks | Kebutuhan utama |
| --- | --- | --- |
| Raka, 27, karyawan | Akhir pekan ke Malang bersama 3 teman, naik kereta lalu sewa mobil | Tempat makan, kopi, dan wisata yang sedang ramai, urutan efisien, jarak jelas |
| Dina, 34, ibu dua anak | Liburan keluarga 3 hari, menginap dekat tempat wisata anak | Penginapan nyaman dan dekat, tempo santai, tempat makan ramah keluarga |

### 4.3 Job to be Done

Saat saya akan pergi ke kota yang belum saya kenal, saya ingin cukup menyebut kota dan lama perjalanan lalu langsung mendapat rencana perjalanan yang terpercaya, lengkap dengan tempat menginap, makan, kopi, dan wisata beserta jaraknya, agar saya tidak perlu mengecek banyak sumber dan bisa langsung berangkat dengan rute di Google Maps.

## 5. Ruang Lingkup MVP (MoSCoW)

| Prioritas | Fitur |
| --- | --- |
| Must | Input minimal: hanya kota tujuan dan lama perjalanan (hari); AI merancang rundown otomatis dengan default yang transparan; rekomendasi hotel atau penginapan, tempat makan, kafe/kopi, dan tempat wisata beserta alasan; rundown harian dengan jarak (km) dan estimasi waktu; tautan Google Maps (lokasi dan rute); sumber dan waktu pemeriksaan; pengeditan dasar (ganti, hapus, susun ulang); penafian estimasi; seluruh fitur gratis; membuat rencana sebagai tamu tanpa login; login dan penyimpanan riwayat destinasi; kontrol biaya (batas penggunaan wajar, cache) |
| Should | Panel “Sesuaikan rencana” untuk input opsional (tanggal, titik awal, jumlah orang, preferensi wisata dan makanan, tempo, moda, level harga); sinyal popularitas berlabel dan bersumber; bagikan rencana lewat tautan; tandai tempat favorit; revisi bahasa natural; umpan balik per rekomendasi |
| Could | Peta mini di dalam aplikasi; ekspor PDF atau cetak; opsi tambah hari; mode bahasa Inggris |
| Won’t (MVP) | Pemesanan; multi-kota; login wajib untuk membuat rencana; pembayaran, langganan, atau fitur berbayar; aplikasi native; data keramaian real-time; kolaborasi multi-pengguna |

## 6. Alur Pengguna Utama

1. Pengguna membuka plesir.app dan mengisi dua kolom: kota tujuan (misal: Malang) dan lama perjalanan dalam hari. Login tidak diperlukan, dan tidak ada pembayaran.
2. Pengguna menekan “Buat Rencana”.
3. Sistem menampilkan progres riset (misal: “Mencari tempat, memeriksa jam buka, menghitung jarak”).
4. AI otomatis meriset dan memilih area serta hotel/penginapan sebagai basis, lalu tempat wisata, tempat makan, dan kafe/kopi di sekitarnya, kemudian merancang rundown per hari dengan jarak dan waktu tempuh. Bagian yang tidak diisi pengguna memakai default (lihat FR-1).
5. Sistem menampilkan hasil: ringkasan rencana beserta asumsi yang dipakai, rekomendasi per kategori, dan rundown per hari.
6. Opsional: pengguna menyesuaikan lewat panel “Sesuaikan rencana” (tanggal, titik awal, jumlah orang, preferensi, moda, level harga), meminta revisi dengan kalimat bebas (“cari yang lebih hemat”, “kurangi tempat ramai”), atau mengganti dan menghapus lokasi.
7. Pengguna membuka lokasi atau rute di Google Maps. Jika sudah login, rencana otomatis masuk ke Riwayat; jika belum, sistem menawarkan login agar rencana tersimpan.
8. Di kunjungan berikutnya, pengguna yang login membuka Riwayat untuk melihat, mengubah, menduplikat, atau menghapus rencana lama.

**Kondisi khusus:** nama kota ambigu atau tidak dikenali (sistem menawarkan pilihan kota), durasi di luar 1–5 hari (sistem menjelaskan batas), data tempat tidak cukup (sistem menyatakannya dan menawarkan alternatif), terjadi galat (pengguna dapat mencoba lagi tanpa mengisi ulang form).

## 7. Kebutuhan Fungsional

### FR-1 Input Minimal: Kota dan Lama Perjalanan (Must)

- **FR-1.1** Hanya dua kolom wajib: kota tujuan (dengan autocomplete) dan lama perjalanan 1–5 hari. Tidak ada kolom wajib lain.
- **FR-1.2** Semua input lain opsional dan disimpan di panel “Sesuaikan rencana”: tanggal perjalanan, titik awal, jumlah orang dan komposisi, preferensi wisata (alam, kuliner, budaya dan sejarah, keluarga, spot foto, belanja), preferensi makanan (lokal, halal, vegetarian, kafe dan kopi), tempo (santai atau padat), moda transportasi, jam mulai dan selesai harian, level harga, dan catatan bebas. Pengguna dapat mengisinya sebelum atau sesudah rencana dibuat.
- **FR-1.3** Jika input opsional kosong, AI memakai default pada tabel di bawah dan menyebutkan asumsi yang dipakai di ringkasan rencana.
- **FR-1.4** Titik awal opsional. Jika kosong, rute hari pertama dimulai dari hotel atau penginapan rekomendasi utama. Jika diisi (stasiun, bandara, hotel, atau alamat lain), titik itu menjadi awal hari pertama dan akhir hari terakhir.
- **FR-1.5** Anggaran tidak diminta. Level harga bersifat opsional; bila kosong, sistem tidak menyaring berdasarkan harga.

**Acceptance criteria:**

- Given pengguna belum mengisi kota tujuan atau lama perjalanan, when menekan “Buat Rencana”, then sistem menampilkan pesan validasi pada kolom yang kurang dan tidak memulai proses.
- Given kota tujuan dan lama perjalanan terisi dan semua kolom lain kosong, when menekan “Buat Rencana”, then rencana lengkap dihasilkan tanpa pertanyaan tambahan dan ringkasan menyebut asumsi default yang dipakai.
- Given nama kota ambigu, when menekan “Buat Rencana”, then sistem menawarkan pilihan kota yang dimaksud sebelum memproses.
- Given proses dimulai, then indikator progres tampil dalam 2 detik.

**Default AI saat input opsional kosong:**

| Input kosong | Perilaku default |
| --- | --- |
| Tanggal perjalanan | Tidak ditentukan; jam buka diperiksa untuk hari kerja dan akhir pekan, tempat dengan hari tutup tertentu diberi catatan |
| Titik awal | Hotel atau penginapan rekomendasi utama; rute hari pertama dimulai dari sana |
| Jumlah orang | 2 dewasa |
| Preferensi wisata | Campuran destinasi populer: alam, kuliner, budaya dan sejarah, ramah keluarga |
| Preferensi makanan | Kuliner khas daerah dan tempat populer, ditambah kafe dan kopi; label diet hanya bila datanya diketahui |
| Tempo | Santai (4–5 aktivitas per hari) |
| Moda transportasi | Mobil (pribadi, sewa, atau taksi/ojek online); jarak dan waktu dihitung untuk mobil |
| Jam aktivitas | 08:00–21:00 |
| Level harga | Menengah, dengan variasi opsi hemat |

### FR-2 Riset dan Rekomendasi (Must)

- **FR-2.1** Dari input minimal, AI otomatis menghasilkan empat kategori tanpa pengguna memilih apa pun: hotel atau penginapan, tempat makan, kafe dan kopi, dan tempat wisata. Kategori tambahan (misal oleh-oleh) dapat ditambahkan AI bila relevan dengan kota.
- **FR-2.2** Setiap kartu rekomendasi memuat: nama, kategori, alasan singkat (1–2 kalimat yang menyebut preferensi pengguna, atau alasan umum seperti kedekatan dan kualitas bila preferensi tidak diisi), alamat, jarak dari titik awal atau dari penginapan (km), kisaran harga jika tersedia, jam buka jika tersedia, sinyal popularitas (lihat FR-3), tautan sumber, dan tautan Google Maps.
- **FR-2.3** Rekomendasi hotel atau penginapan menyertakan area menginap yang disarankan beserta alasannya, misalnya kedekatan dengan klaster wisata yang dipilih AI. AI memilih satu penginapan utama sebagai basis rundown. Sistem hanya menyarankan, tidak menyediakan pemesanan, dan menyatakan bahwa ketersediaan kamar tidak dijamin.
- **FR-2.4** Setiap kategori menampilkan 3–5 opsi, dengan opsi utama ditandai.
- **FR-2.5** Jika data suatu rekomendasi tidak lengkap (misal harga), kolom tersebut ditulis “Tidak tersedia” dan tidak diisi tebakan.

### FR-3 Sinyal Popularitas (Should)

Sistem membedakan tiga label dan masing-masing wajib menampilkan dasar atau sumbernya.

| Label | Makna | Contoh dasar yang ditampilkan |
| --- | --- | --- |
| Ulasan baik | Rating tinggi dengan jumlah ulasan memadai | “4,6 dari 2.300 ulasan Google (diperiksa 29 Okt 2026)” |
| Banyak dibicarakan | Muncul berulang di artikel, blog, atau media dalam periode terbaru | “Dibahas di 5 artikel dalam 90 hari terakhir” beserta tautan |
| Ramai dikunjungi | Pola kepadatan kunjungan umum (misal jam atau hari tersibuk) | “Biasanya ramai Sabtu siang” hanya jika ada sumber datanya |

Aturan: sistem tidak boleh menyatakan suatu tempat “sedang ramai sekarang” tanpa sumber data real-time. Jika tidak ada sumber untuk suatu label, label itu tidak ditampilkan. Ambang “jumlah ulasan memadai” dan periode “terbaru” ditetapkan di tahap desain dan dicatat di dokumen terpisah.

### FR-4 Rundown Harian (Must)

- **FR-4.1** AI merancang seluruh rundown secara otomatis dari kota dan durasi tanpa pengguna menyusun apa pun. Rundown berisi urutan kunjungan per hari dengan jam perkiraan, durasi kunjungan, waktu tempuh antarlokasi, dan jarak (km) antarlokasi.
- **FR-4.2** Aturan penyusunan default:
  - Aktivitas dimulai sekitar 08:00 dan berakhir sebelum 21:00, kecuali diatur pengguna.
  - Maksimal 4–5 aktivitas utama per hari pada tempo santai dan 6 pada tempo padat.
  - Slot makan siang sekitar 11:30–13:30 dan makan malam sekitar 18:00–20:00; kafe/kopi diletakkan sebagai jeda sore atau pagi.
  - Lokasi dikelompokkan berdasarkan kedekatan geografis agar tidak bolak-balik.
  - Jam buka dan hari tutup dipertimbangkan jika datanya tersedia; jika tidak, ditandai “jam buka belum terverifikasi”.
  - Ada waktu cadangan (buffer) sekitar 15 menit antarlokasi.
- **FR-4.3** Hari pertama dan terakhir memperhitungkan titik awal dan waktu tiba/pulang bila diisi pengguna.
- **FR-4.4** Jarak dan waktu tempuh dihitung dari layanan rute sesuai moda, bukan sekadar jarak garis lurus. Bila yang tersedia hanya jarak garis lurus, tampilkan “perkiraan” dan jelaskan.
- **FR-4.5** Setiap hari menampilkan total jarak dan total waktu perjalanan.

**Acceptance criteria:**

- Given rundown ditampilkan, when pengguna membaca satu hari, then setiap pasangan lokasi berurutan menampilkan jarak (km) dan estimasi waktu tempuh.
- Given sebuah tempat diketahui tutup pada hari kunjungan, when rundown disusun, then tempat itu tidak dijadwalkan pada hari tersebut.

### FR-5 Integrasi Google Maps (Must)

- **FR-5.1** Setiap lokasi memiliki tautan “Buka di Google Maps”.
- **FR-5.2** Setiap hari memiliki tautan “Rute hari ini” yang berisi titik awal (penginapan rekomendasi bila pengguna tidak mengisi titik awal), titik singgah berurutan, dan tujuan akhir, dengan moda perjalanan sesuai pilihan pengguna (default mobil).
- **FR-5.3** Tautan dibuat dengan format URL resmi Google Maps (Maps URLs) agar bisa membuka aplikasi atau web Google Maps tanpa pengguna menyalin alamat.
- **FR-5.4** Jika jumlah titik singgah melebihi batas satu tautan, rute dipecah menjadi beberapa segmen bertanda “Bagian 1”, “Bagian 2”, dan seterusnya. Batas tepatnya diverifikasi dari dokumentasi Google saat implementasi.
- **FR-5.5** Integrasi yang lebih dalam (peta tertanam, sinkronisasi daftar tersimpan) dipertimbangkan setelah MVP tervalidasi.

### FR-6 Penyuntingan dan Revisi (Must/Should)

- **FR-6.1** Pengguna dapat mengganti satu lokasi (sistem menawarkan 2–3 alternatif sekategori yang berdekatan), menghapus lokasi, dan mengubah urutan.
- **FR-6.2** Pengguna dapat mengunci (pin) lokasi agar tidak berubah saat rundown disusun ulang.
- **FR-6.3** Pengguna dapat menyesuaikan rencana setelah jadi lewat panel “Sesuaikan rencana” atau permintaan bahasa natural (misal “cari yang lebih hemat”), dan sistem menyusun ulang hanya bagian yang terdampak, bukan seluruh rencana.
- **FR-6.4** Jarak, waktu, dan jadwal dihitung ulang otomatis setiap ada perubahan.
- **FR-6.5** Tersedia undo untuk perubahan terakhir.

### FR-7 Login dan Riwayat Destinasi (Must)

- **FR-7.1** Login bersifat opsional. Pengguna tamu dapat membuat dan melihat rencana tanpa login. Login diperlukan untuk menyimpan riwayat dan mengaksesnya dari berbagai perangkat.
- **FR-7.2** Metode login MVP (usulan): login dengan akun Google dan tautan masuk lewat email tanpa kata sandi. Keputusan final ada di Pertanyaan Terbuka. Pengguna dapat keluar dan menghapus akunnya sendiri.
- **FR-7.3** Bagi pengguna yang login, setiap rencana yang berhasil dibuat otomatis masuk ke Riwayat (kota, jumlah hari, tanggal dibuat, ringkasan). Pengguna tamu ditawari login setelah rencana tampil, dan rencana yang baru dibuat langsung tersimpan ke akun begitu login berhasil.
- **FR-7.4** Halaman Riwayat menampilkan rencana terbaru di atas, dengan filter per kota. Aksi per rencana: buka, ganti nama, duplikat (misal untuk durasi berbeda), dan hapus.
- **FR-7.5** Rencana tersimpan memuat rundown terakhir beserta penyesuaian pengguna (lokasi yang diganti, dihapus, atau dikunci) dan waktu pembuatan. Saat dibuka kembali, sistem menampilkan “Terakhir diperiksa” dan menawarkan “Segarkan informasi” untuk memeriksa ulang jam buka, status, dan harga, dengan tunduk pada batas penggunaan.
- **FR-7.6** Sistem hanya menyimpan yang diperlukan: identitas tempat, urutan, dan catatan pengguna. Detail konten dari penyedia data diambil ulang sesuai syarat penggunaan penyedia, bukan disalin permanen.
- **FR-7.7** Pengguna dapat menghapus satu rencana, seluruh riwayat, atau akunnya. Penghapusan berlaku permanen setelah masa pemulihan singkat (usulan 30 hari untuk cadangan sistem).
- **FR-7.8** (Should) Rencana dapat dibagikan lewat tautan unik yang tidak dapat ditebak; pemilik dapat mencabut tautan kapan saja.
- **FR-7.9** (Should) Pengguna login dapat menandai tempat favorit dari rekomendasi, dan tempat itu muncul di Riwayat.

**Acceptance criteria:**

- Given pengguna sudah login, when rencana berhasil dibuat, then rencana muncul di Riwayat tanpa langkah tambahan.
- Given pengguna tamu membuat rencana lalu login, when login berhasil, then rencana itu tersimpan ke akunnya.
- Given pengguna menghapus rencana dari Riwayat, when penghapusan dikonfirmasi, then rencana tidak lagi tampil dan tautan bagikannya tidak dapat dibuka.

### FR-8 Transparansi dan Kepercayaan (Must)

- **FR-8.1** Setiap rekomendasi menampilkan sumber dan “terakhir diperiksa” bila tersedia.
- **FR-8.2** Halaman hasil menampilkan penafian yang jelas bahwa jarak dan waktu adalah estimasi, serta jam buka, harga, ulasan, dan status tempat dapat berubah.
- **FR-8.3** Jika informasi tidak tersedia atau kurang meyakinkan, sistem menyatakan hal itu secara eksplisit, misalnya “Jam buka belum terverifikasi, cek ulang sebelum berangkat”.
- **FR-8.4** Sistem menandai rekomendasi dengan keyakinan rendah secara visual.

### FR-9 Umpan Balik (Should)

- **FR-9.1** Thumbs-up/down per rekomendasi dan untuk rundown, dengan alasan singkat opsional (tidak relevan, sudah tutup, terlalu jauh, terlalu mahal).
- **FR-9.2** Tombol “Laporkan informasi salah” pada setiap kartu.

### FR-10 Gratis dan Kontrol Biaya (Must)

- **FR-10.1** Seluruh fitur gratis: tanpa pembayaran, langganan, paywall, atau fitur premium. Login juga gratis dan tidak membuka fitur berbayar.
- **FR-10.2** Karena biaya penggunaan ditanggung pengelola, sistem menerapkan batas penggunaan wajar per akun (bila login), perangkat, atau alamat IP per hari, dengan batas pengguna tamu lebih ketat daripada pengguna login. Angkanya ditetapkan di Fase 0 dari model biaya. Saat batas tercapai, sistem menjelaskan dengan jelas dan memberi tahu kapan pengguna bisa mencoba lagi.
- **FR-10.3** Hasil untuk kombinasi kota dan durasi yang sering diminta disimpan sementara (cache) sejauh diizinkan syarat penyedia data, untuk menekan biaya dan mempercepat respons.
- **FR-10.4** Anggaran operasional bulanan memiliki ambang peringatan. Bila terlampaui, sistem beralih ke mode hemat (misal cache lebih lama dan pembatasan lebih ketat) sebelum layanan dihentikan.
- **FR-10.5** Peringkat rekomendasi tidak dipengaruhi pembayaran atau sponsor. Sumber pembiayaan operasional dicatat sebagai pertanyaan terbuka (bagian 16).

## 8. Logika AI dan Prinsip Rancangan

### 8.1 Prinsip Utama

Model bahasa **tidak boleh menjadi sumber fakta tempat**. Nama, alamat, koordinat, jam buka, rating, harga, dan jarak harus berasal dari penyedia data atau sumber web yang bisa ditelusuri. AI berperan untuk menafsirkan preferensi, memilih dan menyusun, serta menjelaskan alasan. Pendekatan ini menekan risiko informasi karangan (halusinasi) dan membuat setiap klaim bisa diaudit.

### 8.2 Alur Pemrosesan (Konseptual)

1. **Pahami permintaan:** ubah kota dan durasi (serta input opsional bila ada) menjadi kriteria terstruktur, lalu isi bagian yang kosong dengan default pada FR-1.
2. **Kumpulkan kandidat** dari penyedia data tempat untuk tiap kategori di sekitar tujuan.
3. **Perkaya dan verifikasi:** ambil rating, jumlah ulasan, jam buka, status operasional, dan sinyal popularitas; buang tempat yang tutup permanen.
4. **Beri peringkat** sesuai faktor di 8.3.
5. **Hitung jarak dan waktu** antarkandidat dan dari titik awal sesuai moda.
6. **Susun rundown** dengan aturan FR-4.
7. **Validasi aturan:** pemeriksa otomatis memastikan tidak ada tempat tutup yang dijadwalkan, tidak melampaui jam aktivitas, dan setiap tempat punya sumber.
8. **Tulis penjelasan** dan tampilkan hasil dengan label keyakinan.

**Pemilihan basis menginap:** AI menentukan klaster wisata utama lebih dulu, lalu memilih area dan hotel yang meminimalkan total jarak tempuh harian ke klaster tersebut. Hotel ini menjadi titik awal default rundown bila pengguna tidak mengisi titik awal.

### 8.3 Faktor Peringkat

| Faktor | Keterangan |
| --- | --- |
| Kecocokan preferensi | Sesuai tipe wisata, makanan, dan catatan pengguna |
| Kualitas | Rating yang disesuaikan dengan jumlah ulasan agar tempat dengan sedikit ulasan tidak mendominasi |
| Popularitas | Sinyal dari FR-3 yang tersedia |
| Kedekatan | Jarak ke penginapan, titik awal, dan klaster wisata lain |
| Kecocokan harga | Hanya bila pengguna mengisi level harga |
| Keragaman | Menghindari semua pilihan dari satu jenis yang sama |
| Kelayakan waktu | Buka pada jam dan hari kunjungan |

Bobot awal ditetapkan tim dan disetel berdasarkan umpan balik pilot.

## 9. Kebutuhan Data dan Integrasi

| Kebutuhan data | Kandidat sumber | Catatan |
| --- | --- | --- |
| Tempat, alamat, koordinat, rating, jumlah ulasan, jam buka, level harga | Google Places API atau penyedia data tempat setara | Periksa syarat penggunaan: batasan penyimpanan (caching) dan atribusi |
| Jarak dan waktu tempuh per moda | Layanan rute seperti Google Routes API | Biaya per permintaan perlu dimodelkan; hasil rute adalah estimasi |
| Tautan lokasi dan rute | Google Maps URLs | Tidak memerlukan kunci API; ada batas jumlah titik singgah |
| Banyak dibicarakan | Pencarian web terpercaya (artikel, media, blog) | Sumber dan tanggal wajib disimpan |
| Ramai dikunjungi | Data pola kunjungan dari penyedia yang mengizinkan | API resmi mungkin tidak menyediakannya; bila tidak ada, label tidak ditampilkan |
| Konten media sosial (TikTok, Instagram) | Belum ada sumber resmi yang terjamin | Jangan mengambil data tanpa memeriksa ketentuan layanan dan izin |

**Keputusan yang dibutuhkan sebelum pengembangan:** pemilihan penyedia data, izin penggunaan, dan model biaya per rencana (kritis karena aplikasi gratis: seluruh biaya permintaan ditanggung pengelola). Hasil spike teknis harus mengonfirmasi bahwa data jam buka, rating, dan jarak tersedia untuk Malang Raya dengan cakupan memadai.

## 10. Kebutuhan Nonfungsional

| Area | Kebutuhan |
| --- | --- |
| Performa | Indikator progres tampil ≤ 2 detik; rundown lengkap P90 ≤ 60 detik; hasil ditampilkan bertahap bila memungkinkan |
| Ketersediaan | Target 99% selama pilot; degradasi anggun jika satu penyedia data gagal (tampilkan hasil sebagian dengan keterangan) |
| Platform | Web responsif mobile-first di plesir.app; peramban modern versi terbaru (Chrome, Safari, Edge, Firefox) |
| Bahasa | Bahasa Indonesia; bahasa lain setelah MVP |
| Aksesibilitas | Mengacu WCAG 2.1 AA untuk kontras, navigasi keyboard, dan label |
| Privasi | Kumpulkan data minimum; tidak perlu izin lokasi GPS pada MVP; patuhi UU Pelindungan Data Pribadi; sediakan kebijakan privasi, penghapusan rencana, serta penghapusan akun dan riwayat; simpan hanya email dan profil dasar dari penyedia login |
| Keamanan | Pembatasan laju (rate limit), perlindungan dari penyalahgunaan, kunci API tidak terekspos di klien, autentikasi lewat penyedia login tepercaya tanpa menyimpan kata sandi sendiri, sesi aman, dan riwayat hanya dapat diakses pemiliknya |
| Biaya | Karena aplikasi gratis, biaya adalah batasan desain utama: tetapkan batas biaya per rencana (LLM, data tempat, rute) dan anggaran bulanan setelah uji biaya; gunakan cache yang diizinkan, batas penggunaan wajar, dan model AI berbiaya efisien untuk tahap yang sederhana |
| Observabilitas | Catat kegagalan penyedia data, latensi per tahap, dan biaya per rencana |

## 11. Jaminan Kualitas AI dan Guardrails

- **Grounding:** setiap fakta tempat harus terhubung ke sumber; tanpa sumber, fakta tidak ditampilkan.
- **Perlakuan konten web:** isi halaman web yang diambil diperlakukan sebagai data, bukan instruksi, untuk mencegah manipulasi lewat konten (prompt injection).
- **Asumsi terlihat:** ringkasan rencana selalu menyebut default yang dipakai AI (misal “disusun untuk 2 orang, tempo santai, naik mobil”) agar pengguna tahu apa yang bisa diubah.
- **Fallback:** jika kandidat terlalu sedikit, sistem berkata terus terang dan menawarkan memperluas radius atau mengubah preferensi.
- **Evaluasi sebelum rilis:** siapkan “golden set” minimal 30 skenario (berbagai durasi, titik awal, moda, dan preferensi, termasuk kasus input minimal: hanya kota dan hari) di Malang Raya, lalu ukur akurasi fakta, kelayakan jadwal, dan relevansi dengan peninjau manusia.
- **Pemantauan pasca-rilis:** audit sampel mingguan, tinjau laporan “informasi salah”, dan lacak tempat yang sering dilaporkan tutup.
- **Netralitas:** rekomendasi tidak dipengaruhi pembayaran pihak ketiga; tidak ada konten berbayar atau sponsor pada MVP, dan bila kelak ada harus diberi label jelas.

## 12. Kebutuhan UX Tingkat Tinggi

| Layar | Isi utama |
| --- | --- |
| Beranda dan form | Hanya dua kolom (kota tujuan dan jumlah hari) dengan satu tombol “Buat Rencana”; contoh kota; tautan “Sesuaikan rencana” untuk input opsional; tombol Masuk di header |
| Loading | Progres tahap riset yang jelas dan bisa dibatalkan |
| Hasil | Ringkasan rencana beserta asumsi default yang dipakai AI, tab rekomendasi per kategori, rundown per hari |
| Detail tempat | Alasan, sumber, sinyal popularitas, jam buka, tautan Maps |
| Edit dan revisi | Ganti, hapus, kunci, panel “Sesuaikan rencana”, kolom revisi bahasa natural |
| Bagikan | Tautan, salin, dan tombol hapus rencana |
| Batas penggunaan | Pesan jelas saat batas harian tercapai dan kapan bisa mencoba lagi |
| Login dan akun | Masuk dengan Google atau tautan email, tawaran login setelah rencana tampil, keluar, dan hapus akun |
| Riwayat | Daftar rencana tersimpan dengan filter kota; aksi buka, ganti nama, duplikat, hapus; tombol “Segarkan informasi”; keadaan kosong yang mengajak membuat rencana pertama |

**State yang wajib dirancang:** kosong, memuat, galat, data sebagian, tidak ada hasil, dan offline. Desain prioritas mobile karena penggunaan utama saat bepergian.

## 13. Analitik dan Pelacakan Event

| Event | Properti utama |
| --- | --- |
| form\_started, form\_submitted | kota, jumlah hari, jumlah input opsional yang diisi |
| plan\_generated, plan\_failed | latensi, jumlah rekomendasi, kode galat |
| recommendation\_opened, saved, replaced, removed | kategori, label popularitas |
| revision\_requested | jenis revisi |
| maps\_link\_clicked | jenis (lokasi atau rute), kategori |
| plan\_shared | metode |
| feedback\_submitted, data\_issue\_reported | alasan |
| usage\_limit\_reached | jenis batas, kota |
| login\_started, login\_completed | metode, sumber (header atau setelah rencana) |
| history\_opened, history\_plan\_reopened | jumlah rencana tersimpan, umur rencana |
| plan\_deleted, account\_deleted | jumlah rencana yang dihapus |

Analitik tidak menyimpan data pribadi yang tidak diperlukan, dan pengguna diberi informasi tentang pelacakan.

## 14. Asumsi, Dependensi, dan Risiko

### 14.1 Asumsi

- Pengguna puas dengan rencana berbasis default dari kota dan jumlah hari saja, dan mau menyesuaikannya sesudahnya bila perlu.
- Data tempat di Malang Raya cukup lengkap dari penyedia terpilih.
- Tautan Google Maps cukup sebagai integrasi untuk memvalidasi nilai pada MVP.
- Biaya operasional layanan gratis dapat ditanggung pengelola selama pilot dan beta.
- Sebagian pengguna bersedia login demi riwayat destinasi, sementara sisanya tetap memakai Plesir sebagai tamu.

### 14.2 Dependensi

Penyedia data tempat dan rute, layanan model bahasa, penyedia login, basis data akun dan riwayat, hosting, serta persetujuan penggunaan data sesuai syarat penyedia.

### 14.3 Risiko dan Mitigasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Informasi usang (harga, jam, status tutup) | Pengguna kecewa atau tersasar | Waktu pemeriksaan tampil, validasi status operasional, tombol lapor, penafian |
| Halusinasi AI | Hilangnya kepercayaan | Grounding, validator otomatis, evaluasi golden set |
| “Viral”, “ulasan bagus”, “ramai” dicampur aduk | Klaim menyesatkan | Tiga label terpisah dengan dasar masing-masing |
| Data keramaian real-time tidak tersedia | Janji produk tidak terpenuhi | Tidak menjanjikan real-time; hanya pola umum bila ada sumber |
| Jarak terdekat bukan rute terbaik | Rundown tidak realistis | Hitung dari layanan rute sesuai moda, tambahkan buffer, tampilkan sebagai estimasi |
| Biaya operasional tinggi (aplikasi gratis) | Anggaran habis dan layanan berhenti | Pantau biaya, cache sesuai izin, batas penggunaan wajar per hari, mode hemat, optimalkan tahap AI, tetapkan sumber pembiayaan |
| Batasan syarat penggunaan data | Fitur terhambat atau pelanggaran | Tinjau ketentuan sejak awal, siapkan sumber alternatif |
| Penyalahgunaan (spam permintaan) | Lonjakan biaya | Rate limit, deteksi anomali |
| Cakupan data tidak merata di luar kota besar | Kualitas turun | Mulai dari kawasan pilot, tampilkan label beta untuk wilayah baru |
| Input minimal membuat hasil terlalu generik | Rekomendasi kurang pas dengan selera pengguna | Default cerdas, asumsi terlihat di ringkasan, panel “Sesuaikan rencana”, revisi bahasa natural, uji default di prototipe |
| Data akun dan riwayat (data pribadi) bocor atau disalahgunakan | Pelanggaran privasi dan hilangnya kepercayaan | Data minimum, penyedia login tepercaya tanpa kata sandi sendiri, akses hanya pemilik, fitur hapus akun dan riwayat, kepatuhan UU PDP |
| Penyimpanan riwayat melanggar syarat penyedia data tempat | Fitur riwayat terhambat atau akses data dicabut | Simpan identitas tempat, urutan, dan catatan pengguna; ambil ulang detail dari penyedia; tinjau syarat penggunaan sejak Fase 0 |

## 15. Rencana Rilis (Indikatif)

| Fase | Kegiatan | Keluaran | Estimasi |
| --- | --- | --- | --- |
| 0. Discovery | Wawancara 8–10 calon pengguna, riset kompetitor, spike data, model biaya, dan sumber pembiayaan layanan gratis | Validasi masalah, keputusan penyedia data | 2–3 minggu |
| 1. Prototipe | Alur form ke rundown untuk Malang Raya, login dan riwayat dasar, evaluasi golden set | Prototipe yang bisa diuji | 4–6 minggu |
| 2. Closed beta | 50–100 pengguna, pengukuran metrik, perbaikan kualitas data | Baseline metrik, daftar perbaikan | 3–4 minggu |
| 3. Rilis MVP | Perbaikan prioritas, penafian dan privasi final | Rilis publik terbatas di Malang Raya | 2–3 minggu |
| 4. Pasca-MVP | Kota baru, peta tertanam, koleksi tempat lintas rencana | Roadmap berdasarkan data | Menyusul |

Estimasi bersifat indikatif dan perlu dikonfirmasi tim engineering.

## 16. Pertanyaan Terbuka dan Rekomendasi

| Pertanyaan | Rekomendasi sementara | Keputusan oleh |
| --- | --- | --- |
| Siapa segmen awal? | Wisatawan domestik 20–40 tahun, trip 1–4 hari, perlu divalidasi lewat wawancara | Product Owner |
| Satu kota atau beberapa kota? | Satu kawasan per perjalanan; pilot Malang Raya; multi-kota pasca-MVP | Product Owner dan Engineering |
| Sumber data rekomendasi, ulasan, popularitas, dan jarak? | Penyedia data tempat dan rute resmi, ditambah pencarian web bersumber; hasil spike menentukan | Engineering dan Legal |
| Metode login apa yang dipakai, dan apakah login wajib? | Login opsional: usulan Google dan tautan masuk lewat email tanpa kata sandi; tamu tetap bisa membuat rencana; seluruh fitur tetap gratis | Product Owner |
| Bagaimana biaya operasional layanan gratis ditanggung? | Tentukan sumber pembiayaan sebelum closed beta; tanpa paywall dan jaga netralitas rekomendasi | Pendiri |
| Berapa batas biaya per rencana dan batas penggunaan harian per pengguna? | Ditentukan setelah uji biaya di Fase 0 | Product Owner dan Engineering |
| Apakah default (2 orang, santai, mobil) paling sesuai saat hanya kota dan hari diisi? | Uji di prototipe, ubah sesuai hasil | Product Owner |
| Berapa lama riwayat disimpan, dan adakah batas jumlah rencana per akun? | Usulan: selama akun aktif; batas jumlah ditetapkan dari model biaya penyimpanan di Fase 0 | Product Owner dan Engineering |

## 17. Lampiran

### 17.1 Contoh Tampilan Kartu Rekomendasi

| Elemen | Contoh isi |
| --- | --- |
| Nama dan kategori | \[Nama Tempat\] · Kafe/Kopi |
| Alasan | Cocok untuk preferensi “kopi dan suasana tenang”, buka sampai malam |
| Jarak | 2,4 km dari penginapan (estimasi, mobil, ±9 menit) |
| Popularitas | Ulasan baik: 4,6 dari 1.800 ulasan (diperiksa 29 Okt 2026) |
| Info lain | Kisaran harga dan jam buka, atau “Tidak tersedia” |
| Aksi | Buka di Google Maps · Ganti · Hapus · Simpan · Laporkan info salah |

### 17.2 Glosarium

- **Plesir:** nama produk (plesir.app); plesir berarti bepergian untuk bersenang-senang.
- **Rundown:** jadwal perjalanan per hari beserta urutan lokasi.
- **Riwayat:** daftar rencana perjalanan yang tersimpan di akun pengguna.
- **Tamu:** pengguna yang memakai Plesir tanpa login.
- **Grounding:** memastikan klaim AI bersumber dari data yang dapat ditelusuri.
- **Golden set:** kumpulan skenario uji tetap untuk mengukur kualitas hasil.
- **Maps URLs:** format tautan resmi Google Maps untuk membuka lokasi atau rute.

### 17.3 Riwayat Perubahan

| Versi | Perubahan |
| --- | --- |
| 0.2 | Draf awal: ringkasan, alur, kebutuhan MVP, risiko, pertanyaan terbuka |
| 1.0 | Menambah problem statement, persona dan JTBD, MoSCoW, user flow rinci, requirement ber-ID dengan acceptance criteria, logika AI dan peringkat, kebutuhan data, NFR, guardrails, analitik, risiko dan mitigasi, rencana rilis, rekomendasi atas pertanyaan terbuka; kategori kafe dan kopi ditambahkan |
| 1.1 | Aplikasi ditetapkan gratis tanpa fitur berbayar; AI sebagai perancang rundown otomatis; input wajib disederhanakan menjadi kota tujuan dan lama perjalanan, input lain opsional dengan default AI; menambah FR-10 (gratis dan kontrol biaya); menyesuaikan metrik, alur, UX, risiko, dan pertanyaan terbuka |
| 1.2 | Nama produk Plesir (plesir.app); login opsional dan penyimpanan riwayat destinasi (FR-7 diganti menjadi Login dan Riwayat Destinasi); pengguna tamu tetap dapat membuat rencana tanpa login; menyesuaikan tujuan, ruang lingkup, alur, UX, metrik, analitik, NFR privasi dan keamanan, risiko, rencana rilis, dan pertanyaan terbuka |
