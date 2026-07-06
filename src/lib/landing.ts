export type LandingData = {
  badge: string;
  heroTitle: string;
  heroText: string;
  primaryLabel: string;
  primaryUrl: string;
  secondaryLabel: string;
  secondaryUrl: string;
  featureTitle: string;
  featureText: string;
  feature1Title: string;
  feature1Text: string;
  feature2Title: string;
  feature2Text: string;
  feature3Title: string;
  feature3Text: string;
  stat1Value: string;
  stat1Label: string;
  stat2Value: string;
  stat2Label: string;
  stat3Value: string;
  stat3Label: string;
  ctaTitle: string;
  ctaText: string;
  heroImage: string;
  showcaseImage1: string;
  showcaseImage2: string;
  ctaImage: string;
  feature1Image: string;
  feature2Image: string;
  feature3Image: string;
};
export const landingDefaults: LandingData = {
  badge: "Koperasi digital yang transparan",
  heroTitle: "Tumbuh bersama, sejahtera bersama Praja Makmur",
  heroText:
    "Kelola simpanan, ajukan pinjaman, dan pantau perkembangan keuangan koperasi dalam satu layanan yang aman dan mudah digunakan.",
  primaryLabel: "Masuk sebagai anggota",
  primaryUrl: "/login",
  secondaryLabel: "Pelajari layanan",
  secondaryUrl: "#layanan",
  featureTitle: "Semua kebutuhan koperasi dalam satu tempat",
  featureText:
    "Teknologi yang memudahkan anggota dan pengurus bekerja lebih cepat, akurat, dan transparan.",
  feature1Title: "Simpanan transparan",
  feature1Text:
    "Pantau simpanan pokok, wajib, dan sukarela beserta seluruh riwayat transaksi.",
  feature2Title: "Pinjaman terukur",
  feature2Text:
    "Simulasi anuitas, pengajuan berjenjang, dan status persetujuan yang dapat dipantau.",
  feature3Title: "Keuangan akuntabel",
  feature3Text:
    "Arus kas, hasil usaha, dan pembukuan tercatat otomatis untuk mendukung audit.",
  stat1Value: "10%",
  stat1Label: "Bunga jasa per tahun",
  stat2Value: "20 bulan",
  stat2Label: "Tenor maksimal",
  stat3Value: "100%",
  stat3Label: "Transaksi tercatat",
  ctaTitle: "Mulai gunakan layanan koperasi hari ini",
  ctaText:
    "Masuk untuk melihat simpanan, limit pinjaman, kewajiban, dan riwayat transaksi Anda.",
  heroImage: "",
  showcaseImage1: "",
  showcaseImage2: "",
  ctaImage: "",
  feature1Image: "",
  feature2Image: "",
  feature3Image: "",
};
export function landingData(value: unknown): LandingData {
  return {
    ...landingDefaults,
    ...(value && typeof value === "object" ? value : {}),
  };
}
export function mediaUrl(value: string) {
  return value.startsWith("/uploads/") ? `/prajamakmur${value}` : value;
}
