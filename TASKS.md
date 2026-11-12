# Backlog & Panduan Standar Teknis Tim (Platform E-Voting Sekolah)

Dokumen ini memuat **Daftar Tugas (Backlog)** dan **Aturan Coding Super Ketat (Strict Code Style Guide)** untuk pengembangan Platform E-Voting Sekolah.

Karena proyek ini dikerjakan oleh **tim 5 orang** yang sangat mungkin memanfaatkan **AI Coding Agent** (seperti Claude Code, Cursor, Copilot, Antigravity, dll), aturan di dokumen ini disusun sangat terstruktur dan ketat agar **kode yang dihasilkan manusia maupun AI memiliki standar yang seragam, bersih, mudah dibaca saat QA/Code Review, dan tidak menimbulkan bug integrasi**.

---

## DAFTAR ISI
1. [Aturan Standar Coding Super Ketat (Strict Code Style)](#1-aturan-standar-coding-super-ketat)
   - [A. Prinsip Dasar untuk Developer & AI Agent](#a-prinsip-dasar-untuk-developer--ai-agent)
   - [B. Backend: CodeIgniter 4 & PHP Standard](#b-backend-codeigniter-4--php-standard)
   - [C. Frontend: React.js & Tailwind CSS Standard](#c-frontend-reactjs--tailwind-css-standard)
   - [D. Standar Konvensi Git & Branching](#d-standar-konvensi-git--branching)
2. [Matriks Pembagian 5 Track](#2-matriks-pembagian-5-track)
3. [Daftar Tugas Rinci (Task Backlog)](#3-daftar-tugas-rinci-task-backlog)

---

## 1. ATURAN STANDAR CODING SUPER KETAT

### A. Prinsip Dasar untuk Developer & AI Agent
1. **No Dead Code & No Halusinasi:** Jangan pernah meninggalkan kode *dummy*, variabel yang tidak terpakai, fungsi tiruan (*mock*), atau dependensi fiktif yang tidak ada di `package.json` atau `composer.json`.
2. **Komentar Kode yang Informatif:** Tulis komentar hanya pada logika bisnis yang kompleks (seperti transaksi anti double-vote atau status machine). Hindari komentar trivial seperti `// set name to John`.
3. **Fail-Fast & Explicit Error:** Tangani setiap potensi kegagalan secara eksplisit. Jangan menelan error dengan blok `catch` kosong.
4. **Keamanan Data Mutlak:**
   - Dilarang keras membuat relasi *foreign key* atau kolom referensi pemilih pada tabel `ballots`.
   - Dilarang mencetak NISN, tanggal lahir, password hash, atau token ke dalam log aplikasi.

---

### B. Backend: CodeIgniter 4 & PHP Standard

#### 1. Versi & Arsitektur
- **PHP:** 8.2+ dengan deklarasi tipe ketat di setiap baris pertama file:
  ```php
  <?php

  declare(strict_types=1);
  ```
- **Pola Arsitektur (Separation of Concerns):**
  - **Controller (`app/Controllers/`):** Bertugas HANYA menerima HTTP Request, mendelegasikan ke Service, dan mengembalikan JSON melalui helper response terpusat. **DILARANG meletakkan query database atau *business logic* langsung di Controller.**
  - **Form Request (`app/Requests/`):** Wajib digunakan untuk semua validasi input. Controller tidak boleh melakukan validasi ad hoc.
  - **Service Layer (`app/Services/`):** Tempat seluruh logika bisnis, transaksi DB, dan transisi status pemilu.
  - **API Response (`app/Services/ApiResponse.php`):** Seluruh respon data keluar wajib dibungkus agar format JSON konsisten.
  - **Filters (`app/Filters/`):** Wajib digunakan untuk autentikasi dan pembatasan role/aksi Admin Utama.

#### 2. Konvensi Penamaan (Naming Conventions)
| Elemen | Format | Contoh |
| :--- | :--- | :--- |
| File Class / Controller / Service / Model | `PascalCase` | `ElectionStatusService.php`, `VoterImportRequest.php` |
| Method & Function | `camelCase` | `validateToken()`, `startElectionSession()` |
| Variabel Lokal & Properti | `camelCase` | `$voterRecord`, `$isRegistrationOpen` |
| Kolom Database & Key Request/Response JSON | `snake_case` | `is_registration_open`, `has_voted`, `candidate_id` |
| URL Endpoint API | `kebab-case` | `/api/school/voters/import`, `/api/booth/validate-token` |

#### 3. Standarisasi Format JSON Response (Wajib Seragam)
Semua endpoint API CodeIgniter wajib mengembalikan struktur JSON berikut:
* **Respon Sukses (HTTP 200/201):**
  ```json
  {
    "success": true,
    "message": "Deskripsi sukses yang jelas",
    "data": { ... }
  }
  ```
* **Respon Gagal (HTTP 400/403/404/422/500):**
  ```json
  {
    "success": false,
    "message": "Pesan error manusiawi",
    "errors": {
      "nisn": ["NISN tidak terdaftar dalam DPT."]
    }
  }
  ```

#### 4. Aturan Database & Mutasi Kritis
- Semua aksi yang mengubah status atau memasukkan surat suara **wajib** dibungkus dalam transaksi koneksi CodeIgniter (`transBegin()`/`transCommit()`) dan melakukan `transRollback()` lalu melempar ulang exception jika gagal.
- Pada proses pemilihan bilik, wajib gunakan *Pessimistic Locking* (`SELECT ... FOR UPDATE`) pada baris token di PostgreSQL.
- Migrasi dan seeder CodeIgniter berada di `app/Database/Migrations/` dan `app/Database/Seeds/`.

---

### C. Frontend: React.js & Tailwind CSS Standard

#### 1. Arsitektur Folder & Komponen
- Gunakan struktur berbasis fitur (*Feature-based structure*):
  ```text
  src/
  ├── components/          # Komponen umum reusable (Button, Modal, Input, Badge, Card)
  ├── features/            # Modul spesifik fitur
  │   ├── auth/            # Halaman & komponen login admin
  │   ├── public/          # Beranda, cek DPT, info kandidat, live turnout
  │   ├── voter/           # Verifikasi HP siswa & QR code generator
  │   ├── booth/           # Bilik suara kiosk, webcam scanner, surat suara
  │   ├── school-admin/    # Manajemen DPT, kandidat, jadwal, kontrol sesi
  │   └── super-admin/     # Pendaftaran sekolah, generate akun, cleanup
  ├── hooks/               # Custom React hooks (useElection, useBoothScanner)
  ├── services/            # Axios API client terpusat (api.js)
  └── utils/               # Helper (formatDate.js, tokenValidator.js)
  ```
- **Hanya gunakan Functional Components & React Hooks** (Dilarang menggunakan Class Components).
- Ekspor komponen menggunakan *Named Export* atau *Default Export* yang konsisten:
  ```jsx
  export const VoterCard = ({ candidate, onSelect }) => { ... };
  ```

#### 2. Konvensi Penamaan (Naming Conventions)
| Elemen | Format | Contoh |
| :--- | :--- | :--- |
| File Komponen & Direktori Komponen | `PascalCase` | `QrScannerModal.jsx`, `VoterVerificationForm.jsx` |
| Custom Hook | `camelCase` (diawali `use`) | `useElectionStatus.js`, `useKioskFullscreen.js` |
| File Utility / Helper / Service | `camelCase` | `apiClient.js`, `dateFormatter.js` |
| Variabel Konstanta Global | `UPPER_SNAKE_CASE` | `ELECTION_STATUSES`, `TOKEN_LENGTH` |

#### 3. Standarisasi Styling (Tailwind CSS)
- **100% Menggunakan Tailwind CSS Utility Classes.**
- **Dilarang menggunakan inline style `style={{ ... }}`** kecuali untuk properti koordinat dinamis animasi.
- Gunakan palet warna yang seragam di seluruh aplikasi:
  - **Brand / Primary:** `indigo-600` / `blue-600`
  - **Success / Valid:** `emerald-600`
  - **Warning / Pending:** `amber-500`
  - **Danger / Closed / Locked:** `rose-600`
  - **Neutral / Text:** `slate-800` (gelap), `slate-500` (sekunder), `slate-100` (latar)

#### 4. Standarisasi API Client & Form Handling
- Semua panggilan HTTP wajib melalui instance Axios terpusat di `src/services/api.js` yang sudah dilengkapi `baseURL` dan interceptor Bearer Token.
- **Dilarang memanggil `fetch()` atau `axios` secara bebas langsung di dalam komponen UI.**
- Input Tanggal Lahir siswa wajib menggunakan format bertopeng (*masked input*) `DD/MM/YYYY`.
- Input token manual 6 digit wajib otomatis diubah menjadi huruf besar (*uppercase*) dan di-*trim* dari spasi.

---

### D. Standar Konvensi Git & Branching

- **Branch Naming:**
  - Fitur: `feat/<task-id>-<deskripsi-singkat>` (contoh: `feat/task-be-01-migrations`)
  - Perbaikan Bug: `fix/<task-id>-<deskripsi-singkat>` (contoh: `fix/task-fe-06-scanner-fallback`)
- **Conventional Commit Message:**
  - `feat(be): setup postgresql migration and seeders`
  - `feat(fe): implement mobile qr generator for voter verification`
  - `fix(booth): prevent double click on vote submit button`

---

## 2. MATRIKS PEMBAGIAN 5 TRACK

| Track | Fokus Modul | Rekomendasi Role | Beban Tugas |
| :--- | :--- | :--- | :---: |
| **Track 1** | **Backend Core, Auth & State Machine** | Backend Developer 1 | 4 Task (`BE-01` s.d `BE-04`) |
| **Track 2** | **Backend Voting Engine & Security** | Backend Developer 2 | 4 Task (`BE-05` s.d `BE-08`) |
| **Track 3** | **Frontend Portal Publik & Siswa Mobile** | Frontend Developer 1 | 4 Task (`FE-01` s.d `FE-04`) |
| **Track 4** | **Frontend Bilik Suara Kiosk Mode** | Frontend Developer 2 | 4 Task (`FE-05` s.d `FE-08`) |
| **Track 5** | **Frontend Admin Sekolah & Super Admin** | Frontend Developer 3 / Fullstack | 4 Task (`FE-09` s.d `FE-12`) |

---

## 3. DAFTAR TUGAS RINCI (TASK BACKLOG)

### TRACK 1: Backend Core, Database & Authentication
*Penanggung Jawab: Backend Developer 1*

#### [TASK-BE-01] Setup CodeIgniter API, PostgreSQL Connection & Database Migrations
- **Deskripsi:** Inisialisasi API CodeIgniter 4, koneksi ke Neon PostgreSQL, dan pembuatan migrasi:
  - `elections` (`id`, `status` enum, `is_registration_open` boolean default false, `school_name`, `npsn`, `contact_name`, `contact_phone`, `contact_email`, `start_time`, `end_time`, `dpt_locked_at`, `candidates_locked_at`, `report_downloaded_at`, timestamps).
  - `users` (`id`, `name`, `username`/`email`, `password_hash`, `role` enum, `is_primary` boolean, `election_id` nullable).
  - `voters` (`id`, `nisn` unique per sesi, `name`, `class`, `birth_date`, `has_voted` boolean default false, `voted_at`).
  - `candidates` (`id`, `number` unique, `name`, `photo_url`, `vision`, `mission`, `program`).
  - `voting_tokens` (`id`, `token` unique 6 digit, `voter_id`, `status` enum `unused`/`used`, `created_at`).
  - `ballots` (`id` UUID, `candidate_id` — **wajib tanpa relasi ke pemilih/token**).
  - `audit_logs` (`id`, `user_id` nullable, `action`, `ip_address`, `created_at`).
- **DoD:** Migration & Seeder akun Super Admin KPU berhasil dieksekusi tanpa error.
- **Assignee:** `[ ... ]` | **Status:** `TODO`

#### [TASK-BE-02] Autentikasi Bearer Token & Strict Role-Based Filters
- **Deskripsi:** 
  - Endpoint `POST /api/admin/login` dan `POST /api/admin/logout`.
  - Gunakan token bearer acak, simpan hanya hash token di database, terapkan masa berlaku dan pencabutan token saat logout.
  - Middleware `RoleMiddleware`: Memisahkan hak akses `super_admin` dan `admin_sekolah`.
  - Middleware `PrimaryAdminMiddleware`: Memastikan aksi status (`start`, `close`, `finalize`, `publish`) hanya bisa diakses oleh Admin Utama (`is_primary = true`).
  - Proteksi: Kembalikan HTTP 403 jika Super Admin mengakses DPT, kandidat, suara, atau hasil.
- **DoD:** Test pengujian akses membuktikan Admin Pendukung & Super Admin diblokir pada aksi terlarang.
- **Assignee:** `[ ... ]` | **Status:** `TODO`

#### [TASK-BE-03] Election Finite State Machine & Audit Trail Service
- **Deskripsi:**
  - Buat `ElectionStateService` untuk memvalidasi urutan transisi status:
    `READY` -> `PENDING` -> `SETUP` -> `ACTIVE` -> `CLOSED` -> `FINALIZED` -> `PUBLISHED` -> `CLEANUP` -> `READY`.
  - Validasi bahwa aksi hanya bisa dipicu sesuai status (misal: dilarang ubah DPT saat `ACTIVE`).
  - Catat setiap perubahan status ke tabel `audit_logs`.
- **DoD:** Status tidak bisa loncat atau mundur; log mencatat pelaku dan IP address.
- **Assignee:** `[ ... ]` | **Status:** `TODO`

#### [TASK-BE-04] API Super Admin (Toggle Registrasi, Approve 5 Akun, Monev & Cleanup)
- **Deskripsi:**
  - `POST /api/super/registration-toggle`: Buka/tutup pendaftaran publik di status `READY`.
  - `GET /api/super/registrations`: List permohonan sekolah status `PENDING`.
  - `POST /api/super/registrations/{id}/approve`: Menyetujui sekolah, otomatis men-generate **5 akun unik** (1 Utama + 4 Pendukung), mengubah status ke `SETUP`, dan mengembalikan kredensial dalam respon (untuk dikirim manual via WA/Email).
  - `GET /api/super/progress`: Status tahapan pemilu (hanya persentase tahapan global).
  - `POST /api/super/cleanup`: Hapus data operasional pemilu dan reset ke `READY` (validasi: laporan sudah diunduh & konfirmasi teks `HAPUS DATA`).
- **DoD:** Kredensial 5 akun ter-generate dengan password acak aman; data terhapus bersih saat cleanup.
- **Assignee:** `[ ... ]` | **Status:** `TODO`

---

### TRACK 2: Backend Voting Engine, Security & Reporting
*Penanggung Jawab: Backend Developer 2*

#### [TASK-BE-05] API Admin Sekolah (Manajemen DPT CSV & Profil Kandidat)
- **Deskripsi:**
  - `POST /api/school/voters/import`: Parsing file CSV DPT dengan validasi ganda (format tanggal DDMMYYYY, deteksi duplikasi NISN, reject baris rusak dengan rincian error).
  - `POST /api/school/voters/lock`: Kunci DPT menjadi read-only.
  - CRUD `api/school/candidates`: Input nomor urut, visi-misi, dan upload foto (auto-crop 500x500px, max 1MB).
  - `POST /api/school/candidates/lock`: Kunci kandidat menjadi read-only.
  - `PUT /api/school/schedule`: Setting waktu mulai & selesai pemungutan.
- **DoD:** CSV ribuan baris terproses dengan cepat; validasi file foto ketat.
- **Assignee:** `[ ... ]` | **Status:** `TODO`

#### [TASK-BE-06] API Verifikasi Mandiri Siswa (Token Generator) & Cek DPT Publik
- **Deskripsi:**
  - `POST /api/public/check-dpt`: Cek DPT dengan NISN + Tanggal Lahir (pesan error diseragamkan + rate limit).
  - `POST /api/voter/verify`: Verifikasi mandiri siswa dari smartphone:
    - Validasi NISN + Tanggal Lahir & pastikan `has_voted == false`.
    - **Idempotensi:** Jika siswa sudah punya token `unused`, kembalikan token yang sama.
    - Jika belum, generate token `TKN-XXXXXX` (6 alfanumerik tanpa karakter ambigu O/0/I/1).
- **DoD:** Token hanya bisa digenerate siswa yang berhak; request berulang menghasilkan token yang sama.
- **Assignee:** `[ ... ]` | **Status:** `TODO`

#### [TASK-BE-07] Engine Bilik Suara (Anti Double-Vote & Pessimistic Locking)
- **Deskripsi:**
  - `POST /api/booth/validate-token`: Cek token valid, status `unused`, dan pemilu sedang `ACTIVE`.
  - `POST /api/booth/vote`: Eksekusi pencoblosan dengan Database Transaction ketat:
    1. `VotingToken::where('token', $token)->lockForUpdate()->firstOrFail();`
    2. Cek status token masih `unused`.
    3. Update status token menjadi `used`.
    4. Update voter terkait: `has_voted = true`, `voted_at = now()->toDateString()`.
    5. Insert ke tabel `ballots` (UUID acak dan `candidate_id` saja).
- **DoD:** Simulasi 5 request paralel pada 1 token hanya menghasilkan 1 suara sah.
- **Assignee:** `[ ... ]` | **Status:** `TODO`

#### [TASK-BE-08] API Realcount Partisipasi, Integritas Data & Ekspor Laporan
- **Deskripsi:**
  - `GET /api/public/realcount`: Mengembalikan total DPT dan total suara masuk (persentase) selama status `ACTIVE`.
  - `GET /api/public/results`: Mengembalikan rincian perolehan suara per kandidat **hanya** jika status sudah `PUBLISHED`.
  - `GET /api/school/results`: Rincian perolehan internal + Status Integritas (`count(ballots) == count(voters where has_voted=true)`).
  - `GET /api/school/report`: Ekspor laporan resmi format PDF & CSV (otomatis set `report_downloaded_at`).
- **DoD:** Hasil perolehan kandidat tidak bocor ke publik sebelum status `PUBLISHED`.
- **Assignee:** `[ ... ]` | **Status:** `TODO`

---

### TRACK 3: Frontend Portal Publik & Verifikasi Siswa (Mobile)
*Penanggung Jawab: Frontend Developer 1*

#### [TASK-FE-01] Setup React Project, Global Theme & Routing
- **Deskripsi:** Inisialisasi Vite + React.js, Tailwind CSS, routing (`react-router-dom`), setup instance Axios terpusat (`src/services/api.js`), dan global layout publik.
- **DoD:** Setup berjalan lancar, desain responsif mobile-first, palet warna sesuai standar.
- **Assignee:** `[ ... ]` | **Status:** `TODO`

#### [TASK-FE-02] Halaman Beranda, Profil Paslon & Jadwal Tahapan
- **Deskripsi:**
  - Beranda: Hero dinamis berdasarkan status pemilu, banner informasi & edukasi anti-golput.
  - Halaman Info Paslon: Grid kartu kandidat dengan foto proporsional, modal visi, misi, dan program kerja.
  - Halaman Jadwal: Vertical timeline tahapan pemilu (Pra-pemungutan, Pemungutan, Pasca-pemungutan).
- **DoD:** UI bersih, intuitif diakses siswa lewat smartphone.
- **Assignee:** `[ ... ]` | **Status:** `TODO`

#### [TASK-FE-03] Halaman Cek DPT & Form Pendaftaran Sekolah
- **Deskripsi:**
  - Halaman Cek DPT: Input NISN dan Tanggal Lahir (masked input `DD/MM/YYYY`), kartu status pemilih (Terdaftar / Sudah Memilih).
  - Halaman Registrasi Sekolah: Form registrasi (nama sekolah, NPSN, kontak, email) yang hanya dapat di-submit jika pendaftaran dibuka KPU.
- **DoD:** Validasi form rapi di sisi klien, pesan error informatif dan seragam.
- **Assignee:** `[ ... ]` | **Status:** `TODO`

#### [TASK-FE-04] Halaman Verifikasi Mandiri Siswa (Mobile QR Generator)
- **Deskripsi:**
  - Halaman khusus smartphone: Form verifikasi NISN + Tanggal Lahir.
  - Tampilan setelah verifikasi:
    - **QR Code ukuran besar** (menggunakan library `qrcode.react`).
    - Teks kode cadangan 6 digit (misal: `8F9A2B`) dengan tombol *Copy*.
    - Instruksi jelas: *"Bawa layar HP ini ke bilik suara laptop untuk discan."*
- **DoD:** QR Code mudah terbaca oleh kamera laptop; refresh halaman tidak menghilangkan token (idempoten).
- **Assignee:** `[ ... ]` | **Status:** `TODO`

---

### TRACK 4: Frontend Bilik Suara (Kiosk Mode)
*Penanggung Jawab: Frontend Developer 2*

#### [TASK-FE-05] Wadah Bilik Suara (Fullscreen Kiosk Container)
- **Deskripsi:**
  - Route `/booth`: Tampilan *clean* tanpa navbar, footer, maupun elemen browser yang mengganggu.
  - Tombol masuk mode Fullscreen.
  - Guard status: Hanya bisa diakses saat status pemilu sedang `ACTIVE`.
- **DoD:** Tampilan layar penuh konsisten pada resolusi laptop standar panitia.
- **Assignee:** `[ ... ]` | **Status:** `TODO`

#### [TASK-FE-06] Scanner Webcam QR Code & Fallback Token Manual
- **Deskripsi:**
  - Integrasi kamera laptop menggunakan library scanner (seperti `html5-qrcode`).
  - Scan instan QR Code dari layar smartphone siswa.
  - **Fallback Input Manual:** Modal input 6 karakter token dengan auto-uppercase jika webcam laptop bermasalah.
  - Validasi token ke `/api/booth/validate-token` dengan audio/visual feedback saat valid.
- **DoD:** Transisi dari scan QR ke surat suara berlangsung mulus di bawah 1 detik.
- **Assignee:** `[ ... ]` | **Status:** `TODO`

#### [TASK-FE-07] Surat Suara Digital & Interaksi Pemilihan
- **Deskripsi:**
  - Tampilan surat suara digital: Kartu kandidat dengan nomor urut besar, foto jelas, dan nama kandidat.
  - Interaksi pemilihan satu kandidat dengan indikator visual pilihan yang tegas (border terang / centang besar).
  - Tombol aksi "Lanjut / Konfirmasi Pilihan".
- **DoD:** Tidak ada bug tampilan pada ukuran layar laptop 13–15 inci.
- **Assignee:** `[ ... ]` | **Status:** `TODO`

#### [TASK-FE-08] Modal Konfirmasi Pilihan, Submit & Auto-Reset 5 Detik
- **Deskripsi:**
  - Modal konfirmasi dua tahap: *"Anda memilih Paslon No. X [Nama]. Pilihan tidak dapat diubah setelah dikirim."*
  - Eksekusi vote ke `/api/booth/vote` dengan status loading anti klik ganda.
  - Layar sukses: Pesan terima kasih dan animasi konfirmasi.
  - **Auto-Reset:** Hitung mundur 5 detik, lalu otomatis kembali ke layar awal scanner QR tanpa intervensi panitia.
- **DoD:** Bilik otomatis siap menerima pemilih berikutnya secara kontinu.
- **Assignee:** `[ ... ]` | **Status:** `TODO`

---

### TRACK 5: Frontend Dashboard Admin Sekolah, Super Admin & Realcount
*Penanggung Jawab: Frontend Developer 3 / Fullstack*

#### [TASK-FE-09] Halaman Login Admin & Dashboard Super Admin (KPU)
- **Deskripsi:**
  - Halaman login di `/admin` (route lain menampilkan 404).
  - Dashboard KPU:
    - Toggle Buka/Tutup Pendaftaran publik.
    - Tabel pengajuan sekolah dengan tombol `[Approve & Generate]`.
    - Modal Kredensial 5 Akun (1 Utama + 4 Pendukung) dengan tombol *Copy* untuk dikirim KPU via WhatsApp/Email.
    - Monitoring progres global pemilu (hanya progres bar tahapan).
    - Tombol `Cleanup Data` dengan konfirmasi teks `HAPUS DATA`.
- **DoD:** Super Admin tidak memiliki elemen UI untuk melihat rincian suara atau DPT.
- **Assignee:** `[ ... ]` | **Status:** `TODO`

#### [TASK-FE-10] Panel Admin Sekolah: Manajemen DPT CSV & Profil Paslon
- **Deskripsi:**
  - Komponen upload CSV DPT: Drag-and-drop, preview baris, dan penanda error jika ada baris duplikat/salah format.
  - Tombol **Kunci DPT** dengan modal peringatan read-only.
  - Form CRUD Paslon: input nomor urut, visi, misi, dan preview foto 500x500.
  - Tombol **Kunci Kandidat**.
- **DoD:** Data DPT dan kandidat tidak dapat diedit setelah dikunci.
- **Assignee:** `[ ... ]` | **Status:** `TODO`

#### [TASK-FE-11] Panel Admin Sekolah: Kontrol Status, Integritas & Laporan
- **Deskripsi:**
  - Pengaturan jadwal pemungutan (mulai & selesai WIB).
  - Kontrol tahapan (Hanya aktif untuk Admin Utama, disabled untuk Admin Pendukung):
    - Tombol `Mulai Pemungutan`.
    - Tombol `Tutup Pemungutan` (wajib ketik teks konfirmasi `TUTUP SESI PEMUNGUTAN`).
    - Tombol `Finalisasi Hasil`.
    - Tombol `Publikasikan Hasil`.
  - Widget Status Integritas Data dan tombol `Unduh Laporan` (PDF/CSV).
- **DoD:** Admin Pendukung tidak bisa memicu tombol perubahan status; modal tutup pemungutan bekerja presisi.
- **Assignee:** `[ ... ]` | **Status:** `TODO`

#### [TASK-FE-12] Widget Realcount Partisipasi & Halaman Hasil Publik
- **Deskripsi:**
  - **Widget Realcount Partisipasi (Status `ACTIVE`):** Menampilkan persentase suara masuk vs total DPT (tanpa rincian kandidat) dengan animasi progress bar.
  - **Halaman Hasil Publik (Status `PUBLISHED`):** Grafik batang interaktif (Chart.js / Recharts) perolehan suara masing-masing paslon dan persentase kemenangan.
- **DoD:** Halaman hasil mematuhi status visibilitas secara dinamis.
- **Assignee:** `[ ... ]` | **Status:** `TODO`
