# Praja Makmur

Project koperasi digital berbasis Next.js 16, React 19, Prisma, dan PostgreSQL.

## Fitur yang sudah ada

- Login dan proteksi halaman
- Dashboard utama
- Master anggota
- Simpanan pokok, wajib, sukarela
- Pencatatan simpanan wajib bulanan massal

## Teknologi

- Next.js 16
- React 19
- Prisma 7
- PostgreSQL
- NextAuth
- Tailwind CSS 4

## Menjalankan project di PC ini

1. Install dependency

```bash
npm install
```

2. Siapkan file environment

```bash
copy .env.example .env
```

3. Sesuaikan isi `.env`

Minimal yang harus diisi:

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_URL`
- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_BASE_PATH`

Untuk Docker dan seed awal, sebaiknya isi juga:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`

4. Jalankan database PostgreSQL

Jika memakai Docker:

```bash
docker compose up -d
```

5. Sinkronkan Prisma dan data awal

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

6. Jalankan aplikasi

```bash
npm run dev
```

Lalu buka:

[http://localhost:3000/prajamakmur](http://localhost:3000/prajamakmur)

## Pindah ke PC kantor

Supaya project ini bisa dilanjutkan di PC lain, siapkan tiga hal:

- kode project
- file `.env`
- database PostgreSQL

### 1. Kode project

Simpan project ini ke repository Git private, misalnya GitHub atau GitLab.

Di PC kantor nanti cukup:

```bash
git clone <url-repository>
cd praja-makmur
npm install
```

Catatan:

- Di PC ini, `git` belum tersedia di terminal, jadi instal Git dulu sebelum melakukan `git init`, `git add`, `git commit`, dan `git push`.

### 2. File environment

File `.env` tidak ikut disimpan ke repository karena berisi data sensitif.

Yang perlu dilakukan:

1. Salin `.env` dari PC ini ke tempat aman.
2. Pindahkan ke PC kantor.
3. Simpan kembali sebagai `.env` di root project.

Kalau URL lokal di kantor tetap sama, biasanya `AUTH_URL` bisa tetap `http://localhost:3000`.

### 3. Database

Database tidak ikut berpindah hanya dengan memindahkan kode.

Anda punya dua pilihan:

- Pakai satu database bersama di server/cloud.
- Export database dari PC ini lalu import ke PC kantor.

Jika database sekarang lokal, opsi paling mudah untuk pindah sementara adalah export lalu import.

Contoh alurnya:

1. Backup database dari PC ini.
2. Pindahkan file backup ke PC kantor.
3. Buat database tujuan.
4. Restore backup ke database tersebut.
5. Sesuaikan `DATABASE_URL` di `.env` PC kantor.

## Login awal

Seed bawaan membaca akun admin dari environment:

- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`

Jika `SEED_ADMIN_PASSWORD` tidak diisi, sistem akan membuat password acak saat seed dijalankan dan menampilkannya di terminal.

## Perintah penting

```bash
npm run dev
npm run lint
npm run db:generate
npm run db:migrate
npm run db:seed
```

## Catatan keamanan

- Jangan commit file `.env`
- Jangan sebarkan `POSTGRES_PASSWORD` dan `SEED_ADMIN_PASSWORD`
- Gunakan password database dan password admin awal yang berbeda untuk setiap lingkungan
