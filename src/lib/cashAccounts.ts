// Kas Umum terbagi dua tempat uang: Rekening Bank dan Uang Tunai (fisik).
export const KAS_UMUM_BANK = "KAS_UMUM_BANK";
export const KAS_UMUM_TUNAI = "KAS_UMUM_TUNAI";

export type CashChannel = "BANK" | "TUNAI";

export const cashChannelCode = (channel: CashChannel) =>
  channel === "BANK" ? KAS_UMUM_BANK : KAS_UMUM_TUNAI;
