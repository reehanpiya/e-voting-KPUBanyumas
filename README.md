# Platform E-Voting Sekolah (Single-Tenant Sequential)

Sistem pemilihan *e-voting* mandiri untuk sekolah dengan kerahasiaan suara, verifikasi siswa via smartphone, serta bilik suara digital.

## Dokumen Acuan

- [PRD & Blueprint Teknis](./PRD%20Platform%20E-Voting%20Sekolah%20(Blueprint%20Teknis).md)
- [Backlog & Standar Coding](./TASKS.md)

## Struktur Repositori

- `frontend/`: React, Vite, dan Tailwind CSS.
- `backend/`: REST API CodeIgniter 4 dan PostgreSQL.

## Local Development

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

### Backend

Gunakan PHP 8.2+ dengan ekstensi `intl`, `mbstring`, dan `pgsql`, serta Composer.

1. Masuk ke `backend` dan install dependensi:

   ```powershell
   cd backend
   composer install
   ```

2. Salin `.env.example` sebagai `.env`, lalu isi koneksi PostgreSQL dan kredensial admin awal:

   ```text
   database.default.hostname = ...
   database.default.database = ...
   database.default.username = ...
   database.default.password = ...
   database.default.port = 5432
   SUPER_ADMIN_USERNAME = ...
   SUPER_ADMIN_EMAIL = ...
   SUPER_ADMIN_PASSWORD = ...
   ```

   Jangan commit `.env` atau kredensial.

3. Jalankan migrasi, seeder, dan server:

   ```powershell
   php spark migrate
   php spark db:seed DatabaseSeeder
   php spark serve --port 8000
   ```

4. Cek `http://localhost:8000/api/health`.

Backend membaca konfigurasi PostgreSQL CodeIgniter di atas dan kompatibel dengan `DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`, dan `DB_PORT` bila variabel tersebut sudah dipakai lingkungan lokal.

## Deployment

- Frontend: Vercel, root directory `frontend`.
- Backend: Render atau layanan PHP lain, root directory `backend`.
- Database: Neon PostgreSQL.
