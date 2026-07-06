-- Kas Umum dipecah menjadi dua tempat uang: Rekening Bank dan Uang Tunai.
-- Akun lama (beserta seluruh riwayat transaksi dan saldonya) menjadi Rekening Bank,
-- karena seluruh transaksi selama ini dilakukan melalui transfer.
UPDATE "cash_accounts"
SET "code" = 'KAS_UMUM_BANK',
    "name" = 'Kas Umum - Rekening Bank',
    "updatedAt" = NOW()
WHERE "code" = 'KAS_UMUM';

INSERT INTO "cash_accounts" ("id", "code", "name", "balance", "updatedAt")
VALUES ('cash-general-tunai', 'KAS_UMUM_TUNAI', 'Kas Umum - Uang Tunai', 0, NOW());
