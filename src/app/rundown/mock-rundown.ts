// shortcut: data contoh statis dari desain Stitch, ganti dengan hasil Places/Routes + AI saat backend siap.
export type RundownStop = {
  time: string;
  name: string;
  category: string;
  address: string;
  note: string;
  /** Estimasi ke titik berikutnya; kosong pada titik terakhir. */
  toNext?: string;
  /** Ilustrasi AI dari desain; kosong bila belum ada. */
  photo?: string;
};

export type RundownDay = {
  title: string;
  startMarker: { time?: string; place: string; photo?: string; toFirst?: string };
  finishMarker: { time?: string; place: string };
  stops: RundownStop[];
};

const maps = (query: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

export const mapsStopUrl = (stop: RundownStop) => maps(stop.name);

export const mapsRouteUrl = (day: RundownDay) =>
  `https://www.google.com/maps/dir/${[day.startMarker.place, ...day.stops.map((s) => s.name)]
    .map(encodeURIComponent)
    .join("/")}`;

export const MOCK_RUNDOWN: RundownDay[] = [
  {
    title: "Eksplorasi Kota & Cafe",
    startMarker: {
      time: "08:00 WIB",
      place: "Stasiun Malang",
      photo: "/rundown-demo/stasiun.jpg",
      toFirst: "1.5 KM • 8 mnt",
    },
    finishMarker: { time: "20:00 WIB", place: "Hotel / Istirahat" },
    stops: [
      {
        time: "09:00 - 11:00 WIB",
        name: "Toko Oen Heritage",
        category: "Kuliner Legenda",
        address: "Jl. Jenderal Basuki Rahmat No.5, Kauman, Kec. Klojen, Kota Malang",
        note: "Titik sarapan & brunch terbaik setelah tiba di Stasiun Kota Baru Malang (hanya 8 menit). Coba Es Krim Oen Special & Bistik Lidah legendaris.",
        toNext: "1.8 KM • 7 mnt",
        photo: "/rundown-demo/toko-oen.jpg",
      },
      {
        time: "11:30 - 13:30 WIB",
        name: "Kampung Warna-Warni Jodipan",
        category: "Spot Foto & Budaya",
        address: "Gang 1, Jodipan, Kec. Blimbing, Kota Malang",
        note: "Kunjungan jembatan kaca Ngalam. Disarankan mengenakan topi karena paparan cahaya siang cerah sangat memikat untuk hasil foto kontras tinggi.",
        toNext: "2.4 KM • 9 mnt",
        photo: "/rundown-demo/jodipan.jpg",
      },
      {
        time: "14:15 - 16:00 WIB",
        name: "Alun-Alun Tugu & Balai Kota",
        category: "Taman Heritage",
        address: "Jl. Tugu No.1, Kiduldalem, Kec. Klojen, Kota Malang",
        note: "Rute jalan teduh di bawah pepohonan trembesi kuno. Cocok untuk jalan santai meregangkan kaki dengan view bunga teratai dan monumen tugu bersejarah.",
        toNext: "1.2 KM • 5 mnt",
      },
      {
        time: "16:30 - 19:00 WIB",
        name: "Astep Bistro & Sunset View",
        category: "Cafe Hits & Chill",
        address: "Kawasan Klojen, Kota Malang (Zona Kreatif)",
        note: "Golden hour sunset sempurna dengan sajian artisan mocktail & kopi. Lokasi menghindari kemacetan arus pulang kerja kota Malang.",
        photo: "/rundown-demo/astep.jpg",
      },
    ],
  },
  {
    title: "Sunrise Bromo & Batu",
    startMarker: { place: "Hotel / Penginapan" },
    finishMarker: { place: "Hotel / Istirahat" },
    stops: [
      {
        time: "03:00 - 07:30 WIB",
        name: "Sunrise Point Penanjakan Bromo",
        category: "Wisata Alam",
        address: "Taman Nasional Bromo Tengger Semeru",
        note: "Berangkat dini hari dengan Jeep 4x4. Suhu udara 7-12°C, kenakan jaket tebal bertingkat dan sarung tangan untuk kenyamanan maksimal.",
        toNext: "38 KM • 1.2 Jam",
      },
      {
        time: "09:30 - 12:00 WIB",
        name: "Pasir Berbisik & Bukit Teletubbies",
        category: "Panorama Alam",
        address: "Kaldera Tengger, Kab. Probolinggo & Pasuruan",
        note: "Foto eksotis di hamparan savana hijau dan lautan pasir sebelum kembali turun ke arah Kota Batu untuk makan siang.",
        toNext: "45 KM • 1.5 Jam",
      },
      {
        time: "14:30 - 17:30 WIB",
        name: "Flora Wisata San Terra Batu",
        category: "Taman Bunga & Rekreasi",
        address: "Jurangrejo, Pandesari, Kec. Pujon, Malang/Batu",
        note: "Udara pegunungan sejuk di sore hari. Lebih dari 700 jenis bunga segar berpadu dengan arsitektur kastil bergaya Eropa & Korea.",
      },
    ],
  },
  {
    title: "Santai & Oleh-Oleh",
    startMarker: { place: "Hotel / Penginapan" },
    finishMarker: { place: "Stasiun / Bandara" },
    stops: [
      {
        time: "08:30 - 10:30 WIB",
        name: "Piknik Hutan Pinus Coban Rondo",
        category: "Alam & Relaksasi",
        address: "Kec. Pujon, Kab. Malang",
        note: "Menenangkan pikiran di rimbun pohon pinus dan labirin alami. Waktu pagi hari sepi pengunjung dan berhawa segar.",
        toNext: "8.5 KM • 18 mnt",
      },
      {
        time: "11:00 - 13:00 WIB",
        name: "Bakso President Malang Asli",
        category: "Kuliner Khas",
        address: "Jl. Batanghari No.5, Rampal Celaket, Kec. Klojen, Kota Malang",
        note: "Sensasi makan bakso Malang persis di tepi perlintasan rel kereta api aktif. Coba bakso bakar bumbu kecap pedas dan pangsit goreng renyah.",
        toNext: "3.5 KM • 10 mnt",
      },
      {
        time: "13:30 - 15:30 WIB",
        name: "Sentra Oleh-Oleh Keripik Tempe Sanan",
        category: "Belanja Oleh-Oleh",
        address: "Jl. Sanan No.85, Purwantoro, Kec. Blimbing, Kota Malang",
        note: "Titik perbelanjaan khas Malang sebelum bertolak ke stasiun atau bandara. Pilihan keripik tempe aneka rasa, apel Malang, dan pia mangkok.",
      },
    ],
  },
];
