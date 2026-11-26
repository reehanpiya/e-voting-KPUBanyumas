/* ===== Store terpusat: data, penyimpanan, status pemilu, UI util =====
   Port dari shared.js — berjalan dengan LocalStorage & SessionStorage di sisi klien. */

export const STORAGE_KEYS = {
  STATUS: 'evoting.demo.status',
  REG_OPEN: 'evoting.demo.regOpen',
  REGISTRATIONS: 'evoting.demo.registrations',
  VERIFY_SESSION: 'evoting.demo.verifySession',
  ATTEMPTS: 'evoting.demo.attempts',
  ADMIN_SESSION: 'evoting.admin.session',
  DPT: 'evoting.demo.dpt',
  CANDIDATES: 'evoting.demo.candidates',
  TOKENS: 'evoting.demo.tokens',
  VOTES: 'evoting.demo.votes',
  ACCOUNTS: 'evoting.demo.accounts',
  DPT_LOCKED: 'evoting.demo.dptLocked',
  CANDIDATES_LOCKED: 'evoting.demo.candidatesLocked',
  SCHEDULE: 'evoting.demo.schedule',
  AUDIT_LOGS: 'evoting.demo.auditLogs'
};

export const STATUS_ORDER = ['READY', 'PENDING', 'SETUP', 'ACTIVE', 'CLOSED', 'FINALIZED', 'PUBLISHED', 'CLEANUP'];
export const DEFAULT_STATUS = 'ACTIVE';

export const STATUS_META = {
  READY: { label: 'Siap', tone: 'neutral', icon: 'fa-circle-pause', desc: 'Platform siap digunakan. Pendaftaran sekolah dan jadwal pemilihan belum dimulai.', hint: 'Pantau halaman ini untuk informasi tahapan berikutnya.' },
  PENDING: { label: 'Menunggu Persetujuan', tone: 'warning', icon: 'fa-hourglass-half', desc: 'Pengajuan sekolah sedang ditinjau oleh KPU Kabupaten Banyumas sebelum pemilihan disiapkan.', hint: 'Sekolah dapat memantau status pengajuan melalui panitia.' },
  SETUP: { label: 'Persiapan', tone: 'warning', icon: 'fa-screwdriver-wrench', desc: 'Panitia sekolah menyiapkan Daftar Pemilih Tetap, data kandidat, dan jadwal pemungutan suara.', hint: 'Periksa lebih awal apakah Anda sudah terdaftar di DPT.' },
  ACTIVE: { label: 'Pemungutan Berlangsung', tone: 'success', icon: 'fa-bolt', desc: 'Pemungutan suara sedang berlangsung. Verifikasi diri melalui ponsel, lalu gunakan hak pilih Anda di bilik suara digital.', hint: 'Siapkan NISN dan tanggal lahir untuk verifikasi mandiri.' },
  CLOSED: { label: 'Pemungutan Ditutup', tone: 'warning', icon: 'fa-lock', desc: 'Pemungutan suara telah ditutup. Panitia sedang memproses rekapitulasi suara.', hint: 'Hasil dapat dilihat setelah dipublikasikan secara resmi.' },
  FINALIZED: { label: 'Hasil Difinalisasi', tone: 'info', icon: 'fa-clipboard-check', desc: 'Rekapitulasi telah difinalisasi oleh panitia dan menunggu publikasi resmi.', hint: 'Hasil dapat dilihat setelah dipublikasikan secara resmi.' },
  PUBLISHED: { label: 'Hasil Dipublikasikan', tone: 'success', icon: 'fa-bullhorn', desc: 'Hasil resmi pemilihan Ketua dan Wakil Ketua OSIS telah diumumkan. Terima kasih atas partisipasi Anda.', hint: 'Lihat perolehan suara pada bagian hasil di bawah.' },
  CLEANUP: { label: 'Pengarsipan Data', tone: 'neutral', icon: 'fa-broom', desc: 'Data operasional pemilihan sedang diarsipkan dan dibersihkan setelah laporan selesai.', hint: 'Siklus pemilihan berikutnya akan diumumkan oleh KPU.' }
};

export const STATE_META = {
  done: { label: 'Selesai', tone: 'success', icon: 'fa-check' },
  ongoing: { label: 'Sedang berlangsung', tone: 'warning', icon: 'fa-bolt' },
  upcoming: { label: 'Akan datang', tone: 'neutral', icon: 'fa-clock' }
};

export const PHASES = [
  {
    title: 'Tahap Pra-Pemungutan',
    icon: 'fa-clipboard-list',
    stages: [
      { name: 'Pendaftaran Sekolah', date: '10 – 14 November 2026', time: '08.00 – 16.00 WIB', desc: 'Sekolah mengajukan pendaftaran dan KPU meninjau kelayakan pengajuan.', startRank: 1, endRank: 1 },
      { name: 'Penyusunan & Penguncian DPT', date: '16 – 18 November 2026', time: '08.00 – 16.00 WIB', desc: 'Panitia sekolah mengimpor, memvalidasi, lalu mengunci Daftar Pemilih Tetap.', startRank: 2, endRank: 2 },
      { name: 'Penetapan Kandidat', date: '19 – 20 November 2026', time: '08.00 – 15.00 WIB', desc: 'Profil pasangan calon ditetapkan dan data kandidat dikunci.', startRank: 2, endRank: 2 }
    ]
  },
  {
    title: 'Tahap Pemungutan',
    icon: 'fa-check-to-slot',
    stages: [
      { name: 'Pemungutan Suara Digital', date: '25 November 2026', time: '07.30 – 12.00 WIB', desc: 'Pemilih memverifikasi diri, memindai QR Code, dan memberikan suara di bilik suara digital.', startRank: 3, endRank: 3 },
      { name: 'Penutupan Pemungutan', date: '25 November 2026', time: '12.00 WIB', desc: 'Pemungutan ditutup. Token yang belum digunakan tidak berlaku lagi.', startRank: 4, endRank: 4 }
    ]
  },
  {
    title: 'Tahap Pasca-Pemungutan',
    icon: 'fa-chart-pie',
    stages: [
      { name: 'Rekapitulasi & Finalisasi Hasil', date: '25 November 2026', time: '13.00 – 15.00 WIB', desc: 'Panitia merekap suara dan memfinalisasi hasil pemilihan.', startRank: 5, endRank: 5 },
      { name: 'Publikasi Hasil', date: '26 November 2026', time: '09.00 WIB', desc: 'Hasil resmi diumumkan kepada seluruh warga sekolah.', startRank: 6, endRank: 6 },
      { name: 'Pengarsipan & Pembersihan Data', date: '28 November 2026', time: '08.00 WIB', desc: 'Laporan diarsipkan, kemudian data operasional dibersihkan.', startRank: 7, endRank: 7 }
    ]
  }
];

export const DEFAULT_CANDIDATES = [
  {
    number: 1, chair: 'Ahmad Fauzi', viceChair: 'Siti Nurhaliza',
    chairClass: 'XI IPA 2', viceClass: 'X IPS 1', hue: 212, votes: 0,
    vision: 'Mewujudkan OSIS yang inklusif, kolaboratif, dan berprestasi untuk seluruh siswa.',
    missions: ['Membuka kanal aspirasi siswa yang terbuka dan ditindaklanjuti setiap bulan.', 'Memperkuat kolaborasi antar ekstrakurikuler melalui proyek bersama.', 'Mengadakan pelatihan kepemimpinan dan literasi digital bagi anggota OSIS.'],
    programs: ['Kotak Aspirasi Digital', 'Pekan Kolaborasi Ekskul', 'Kelas Kepemimpinan Siswa']
  },
  {
    number: 2, chair: 'Budi Santoso', viceChair: 'Rina Maharani',
    chairClass: 'XI IPS 3', viceClass: 'X IPA 4', hue: 28, votes: 0,
    vision: 'OSIS yang kreatif, peduli lingkungan, dan menjadi teladan kegiatan positif di sekolah.',
    missions: ['Menggiatkan program sekolah hijau dan pengelolaan sampah mandiri.', 'Menyelenggarakan festival seni dan kewirausahaan siswa setiap semester.', 'Menjalin kerja sama dengan komunitas pemuda di Banyumas.'],
    programs: ['Gerakan Sekolah Hijau', 'Festival Kreasi Siswa', 'Bazar Wirausaha Muda']
  },
  {
    number: 3, chair: 'Dimas Prasetyo', viceChair: 'Aulia Putri',
    chairClass: 'XI IPA 1', viceClass: 'X IPA 2', hue: 152, votes: 0,
    vision: 'OSIS yang transparan, tanggap, dan menumbuhkan budaya literasi serta olahraga.',
    missions: ['Mempublikasikan laporan kegiatan dan anggaran OSIS secara berkala.', 'Membangun sudut baca dan klub diskusi di lingkungan sekolah.', 'Menyelenggarakan turnamen olahraga antar kelas yang sportif.'],
    programs: ['Laporan OSIS Terbuka', 'Sudut Baca Siswa', 'Liga Olahraga Antar Kelas']
  }
];

export const DEFAULT_DPT = [
  { nisn: '0091234501', dob: '14/03/2009', name: 'Ahmad Fauzi', classLabel: 'XI IPA 2', hasVoted: false, votedAt: null },
  { nisn: '0091234502', dob: '22/07/2009', name: 'Siti Nurhaliza', classLabel: 'X IPS 1', hasVoted: false, votedAt: null },
  { nisn: '0081234503', dob: '05/11/2008', name: 'Budi Santoso', classLabel: 'XI IPS 3', hasVoted: false, votedAt: null },
  { nisn: '0091234504', dob: '30/01/2010', name: 'Rina Maharani', classLabel: 'X IPA 4', hasVoted: false, votedAt: null },
  { nisn: '0081234505', dob: '18/09/2008', name: 'Dimas Prasetyo', classLabel: 'XI IPA 1', hasVoted: false, votedAt: null },
  { nisn: '0091234506', dob: '09/12/2009', name: 'Aulia Putri', classLabel: 'X IPA 2', hasVoted: false, votedAt: null },
  { nisn: '0091234507', dob: '15/05/2009', name: 'Fajar Hidayat', classLabel: 'XI IPS 2', hasVoted: false, votedAt: null },
  { nisn: '0091234508', dob: '02/08/2009', name: 'Dewi Lestari', classLabel: 'XI IPA 3', hasVoted: false, votedAt: null },
  { nisn: '0081234509', dob: '21/10/2008', name: 'Rizky Pratama', classLabel: 'XII IPA 1', hasVoted: false, votedAt: null },
  { nisn: '0081234510', dob: '11/01/2008', name: 'Anisa Rahmawati', classLabel: 'XII IPS 2', hasVoted: false, votedAt: null },
  { nisn: '0101234511', dob: '17/04/2010', name: 'Bayu Nugroho', classLabel: 'X IPA 1', hasVoted: false, votedAt: null },
  { nisn: '0091234512', dob: '25/06/2009', name: 'Putri Maharani', classLabel: 'XI IPS 1', hasVoted: false, votedAt: null }
];

export const DEFAULT_ACCOUNTS = {
  'admin.kpu': { username: 'admin.kpu', password: 'KPU@2026', role: 'super_admin', isPrimary: false, name: 'Super Admin KPU Banyumas', roleLabel: 'Super Admin (KPU)', desc: 'Pengawas & Regulator KPU' },
  'admin.utama': { username: 'admin.utama', password: 'Utama@2026', role: 'admin_sekolah', isPrimary: true, name: 'Budi Santoso, S.Pd (Ketua Panitia)', roleLabel: 'Admin Utama Sekolah', schoolName: 'SMA Negeri 1 Purwokerto', schoolNpsn: '20301234', desc: 'Admin Utama Sekolah (Hak Eksklusif Transisi Status Pemilu)' },
  'admin.pendukung': { username: 'admin.pendukung', password: 'Pendukung@2026', role: 'admin_sekolah', isPrimary: false, name: 'Rina Maharani, S.Kom (Operator DPT)', roleLabel: 'Admin Pendukung Sekolah', schoolName: 'SMA Negeri 1 Purwokerto', schoolNpsn: '20301234', desc: 'Admin Pendukung Sekolah' }
};

/* ===== Penyimpanan aman ===== */
function readStorage(store, key, fallback) {
  try {
    const raw = store.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch { return fallback; }
}

function writeStorage(store, key, value) {
  try { store.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}

export const readStore = (key, fallback) => readStorage(localStorage, key, fallback);
export const writeStore = (key, value) => writeStorage(localStorage, key, value);
export const readSession = (key, fallback) => readStorage(sessionStorage, key, fallback);
export const writeSession = (key, value) => writeStorage(sessionStorage, key, value);

/* ===== Status Pemilu ===== */
export function getElectionStatus() {
  const s = readStore(STORAGE_KEYS.STATUS, DEFAULT_STATUS);
  return STATUS_ORDER.includes(s) ? s : DEFAULT_STATUS;
}

export function setElectionStatus(status) {
  if (STATUS_ORDER.includes(status)) writeStore(STORAGE_KEYS.STATUS, status);
}

export function statusRank(status) { return STATUS_ORDER.indexOf(status); }

export function stateFor(startRank, endRank, currentRank) {
  if (currentRank > endRank) return 'done';
  if (currentRank >= startRank) return 'ongoing';
  return 'upcoming';
}

/* ===== Kandidat ===== */
export function getCandidates() {
  const stored = readStore(STORAGE_KEYS.CANDIDATES, null);
  if (stored && Array.isArray(stored) && stored.length > 0) return stored;
  writeStore(STORAGE_KEYS.CANDIDATES, DEFAULT_CANDIDATES);
  return DEFAULT_CANDIDATES;
}
export function saveCandidates(c) { return writeStore(STORAGE_KEYS.CANDIDATES, c); }
export function getTotalVotes() { return getCandidates().reduce((s, c) => s + (Number(c.votes) || 0), 0); }

export function addCandidate(data) {
  if (isCandidatesLocked()) return { success: false, message: 'Data kandidat sudah dikunci.' };
  const list = getCandidates();
  const nextNum = list.length > 0 ? Math.max(...list.map(c => Number(c.number) || 0)) + 1 : 1;
  const newCand = {
    number: nextNum,
    chair: String(data.chair || '').trim(), viceChair: String(data.viceChair || '').trim(),
    chairClass: String(data.chairClass || '').trim(), viceClass: String(data.viceClass || '').trim(),
    hue: Number(data.hue) || ((nextNum * 85) % 360), votes: 0,
    vision: String(data.vision || '').trim(),
    missions: Array.isArray(data.missions) ? data.missions : String(data.missions || '').split('\n').map(s => s.trim()).filter(Boolean),
    programs: Array.isArray(data.programs) ? data.programs : String(data.programs || '').split(',').map(s => s.trim()).filter(Boolean)
  };
  list.push(newCand);
  saveCandidates(list);
  logAudit('CANDIDATE_ADD', `Paslon nomor urut ${newCand.number} ditambahkan.`);
  return { success: true, candidate: newCand };
}

export function updateCandidate(number, data) {
  if (isCandidatesLocked()) return { success: false, message: 'Data kandidat sudah dikunci.' };
  const list = getCandidates();
  const idx = list.findIndex(c => Number(c.number) === Number(number));
  if (idx === -1) return { success: false, message: 'Kandidat tidak ditemukan.' };
  if (data.chair) list[idx].chair = String(data.chair).trim();
  if (data.viceChair) list[idx].viceChair = String(data.viceChair).trim();
  if (data.chairClass) list[idx].chairClass = String(data.chairClass).trim();
  if (data.viceClass) list[idx].viceClass = String(data.viceClass).trim();
  if (data.vision) list[idx].vision = String(data.vision).trim();
  if (data.missions) list[idx].missions = Array.isArray(data.missions) ? data.missions : String(data.missions).split('\n').map(s => s.trim()).filter(Boolean);
  if (data.programs) list[idx].programs = Array.isArray(data.programs) ? data.programs : String(data.programs).split(',').map(s => s.trim()).filter(Boolean);
  saveCandidates(list);
  return { success: true, candidate: list[idx] };
}

export function deleteCandidate(number) {
  if (isCandidatesLocked()) return { success: false, message: 'Data kandidat sudah dikunci.' };
  const list = getCandidates().filter(c => Number(c.number) !== Number(number));
  list.forEach((c, i) => { c.number = i + 1; });
  saveCandidates(list);
  return { success: true };
}

/* ===== DPT ===== */
export function getDpt() {
  const stored = readStore(STORAGE_KEYS.DPT, null);
  if (stored && Array.isArray(stored) && stored.length > 0) return stored;
  writeStore(STORAGE_KEYS.DPT, DEFAULT_DPT);
  return DEFAULT_DPT;
}
export function saveDpt(d) { return writeStore(STORAGE_KEYS.DPT, d); }
export function getTotalVoters() { return getDpt().length; }
export function findVoter(nisn, dob) { return getDpt().find(v => v.nisn === nisn && v.dob === dob) || null; }
export function findVoterByNisn(nisn) { return getDpt().find(v => v.nisn === nisn) || null; }

export function addVoter(voterData) {
  const list = getDpt();
  if (list.some(v => v.nisn === voterData.nisn)) return { success: false, message: 'NISN sudah terdaftar dalam DPT.' };
  const newVoter = { nisn: String(voterData.nisn).trim(), dob: String(voterData.dob).trim(), name: String(voterData.name).trim(), classLabel: String(voterData.classLabel).trim(), hasVoted: false, votedAt: null };
  list.push(newVoter);
  saveDpt(list);
  return { success: true, voter: newVoter };
}

export function updateVoterStatus(nisn, hasVoted, votedAt = null) {
  const list = getDpt();
  const idx = list.findIndex(v => v.nisn === nisn);
  if (idx !== -1) {
    list[idx].hasVoted = Boolean(hasVoted);
    list[idx].votedAt = hasVoted ? (votedAt || new Date().toISOString()) : null;
    saveDpt(list);
    return true;
  }
  return false;
}

export function deleteVoter(nisn) {
  const list = getDpt();
  const filtered = list.filter(v => v.nisn !== nisn);
  if (filtered.length !== list.length) { saveDpt(filtered); return true; }
  return false;
}

export function resetDpt() { saveDpt(DEFAULT_DPT); return DEFAULT_DPT; }

export function importDptBatch(items) {
  if (isDptLocked()) return { success: false, message: 'DPT sudah dikunci.' };
  const current = getDpt();
  const existingNisns = new Set(current.map(v => v.nisn));
  let added = 0, skipped = 0;
  for (const item of items) {
    const nisn = String(item.nisn || '').trim();
    const name = String(item.name || '').trim();
    const dob = String(item.dob || '').trim();
    if (!nisn || !name || !dob || existingNisns.has(nisn)) { skipped++; continue; }
    current.push({ nisn, name, dob, classLabel: String(item.classLabel || '').trim() || 'Umum', hasVoted: false, votedAt: null });
    existingNisns.add(nisn);
    added++;
  }
  saveDpt(current);
  return { success: true, added, skipped, total: current.length };
}

/* ===== Token ===== */
export function getTokens() { return readStore(STORAGE_KEYS.TOKENS, []); }
export function saveTokens(t) { return writeStore(STORAGE_KEYS.TOKENS, t); }

export function issueTokenForVoter(voter) {
  const tokens = getTokens();
  const existing = tokens.find(t => t.nisn === voter.nisn && !t.isUsed);
  if (existing) return existing;
  const tokenStr = generateTokenString();
  const tokenRecord = { token: tokenStr, nisn: voter.nisn, voterName: voter.name, classLabel: voter.classLabel, createdAt: new Date().toISOString(), isUsed: false, usedAt: null };
  tokens.push(tokenRecord);
  saveTokens(tokens);
  return tokenRecord;
}

export function findToken(tokenStr) {
  if (!tokenStr) return null;
  const clean = String(tokenStr).trim().toUpperCase();
  return getTokens().find(t => t.token === clean) || null;
}

/* ===== Voting ===== */
export function getVotes() { return readStore(STORAGE_KEYS.VOTES, []); }
export function saveVotes(v) { return writeStore(STORAGE_KEYS.VOTES, v); }

export function castVote({ token, candidateNumber }) {
  const status = getElectionStatus();
  if (status !== 'ACTIVE') return { success: false, message: `Pemungutan suara tidak aktif (${STATUS_META[status]?.label || status}).` };
  const cleanToken = String(token || '').trim().toUpperCase();
  const tokens = getTokens();
  const tokenIndex = tokens.findIndex(t => t.token === cleanToken);
  if (tokenIndex === -1) return { success: false, message: 'Token tidak valid.' };
  const tokenObj = tokens[tokenIndex];
  if (tokenObj.isUsed) return { success: false, message: `Token ini sudah digunakan pada ${formatDate(tokenObj.usedAt)}.` };
  const dpt = getDpt();
  const voterIndex = dpt.findIndex(v => v.nisn === tokenObj.nisn);
  if (voterIndex !== -1 && dpt[voterIndex].hasVoted) return { success: false, message: 'Pemilih ini sudah memberikan suara.' };
  const candidates = getCandidates();
  const candIndex = candidates.findIndex(c => c.number === Number(candidateNumber));
  if (candIndex === -1) return { success: false, message: 'Pasangan calon tidak ditemukan.' };
  const nowIso = new Date().toISOString();
  candidates[candIndex].votes = (Number(candidates[candIndex].votes) || 0) + 1;
  saveCandidates(candidates);
  tokens[tokenIndex].isUsed = true;
  tokens[tokenIndex].usedAt = nowIso;
  saveTokens(tokens);
  if (voterIndex !== -1) { dpt[voterIndex].hasVoted = true; dpt[voterIndex].votedAt = nowIso; saveDpt(dpt); }
  const votes = getVotes();
  const voteId = 'EVT-' + Math.floor(100000 + Math.random() * 900000);
  votes.push({ id: voteId, candidateNumber: Number(candidateNumber), timestamp: nowIso });
  saveVotes(votes);
  try {
    const activeSession = readSession(STORAGE_KEYS.VERIFY_SESSION, null);
    if (activeSession && activeSession.token === cleanToken) sessionStorage.removeItem(STORAGE_KEYS.VERIFY_SESSION);
  } catch { }
  return { success: true, voteId, timestamp: nowIso, candidateNumber: Number(candidateNumber) };
}

/* ===== Registrasi Sekolah ===== */
export function getRegistrations() { return readStore(STORAGE_KEYS.REGISTRATIONS, []); }
export function saveRegistrations(r) { return writeStore(STORAGE_KEYS.REGISTRATIONS, r); }
export function isRegistrationOpen() { return readStore(STORAGE_KEYS.REG_OPEN, true) === true; }
export function setRegistrationOpen(open) { return writeStore(STORAGE_KEYS.REG_OPEN, Boolean(open)); }
export function updateRegistrationStatus(regId, newStatus) {
  const regs = getRegistrations();
  const idx = regs.findIndex(r => r.id === regId);
  if (idx !== -1) { regs[idx].status = newStatus; regs[idx].reviewedAt = new Date().toISOString(); saveRegistrations(regs); return true; }
  return false;
}

/* ===== Penguncian DPT & Kandidat ===== */
export function isDptLocked() { return readStore(STORAGE_KEYS.DPT_LOCKED, false) === true; }
export function setDptLocked(locked) { const v = Boolean(locked); writeStore(STORAGE_KEYS.DPT_LOCKED, v); logAudit('DPT_LOCK', v ? 'DPT dikunci.' : 'Kunci DPT dibuka.'); return v; }
export function isCandidatesLocked() { return readStore(STORAGE_KEYS.CANDIDATES_LOCKED, false) === true; }
export function setCandidatesLocked(locked) { const v = Boolean(locked); writeStore(STORAGE_KEYS.CANDIDATES_LOCKED, v); logAudit('CANDIDATES_LOCK', v ? 'Data kandidat dikunci.' : 'Kunci kandidat dibuka.'); return v; }

/* ===== Jadwal ===== */
export function getSchedule() {
  return readStore(STORAGE_KEYS.SCHEDULE, { dateLabel: 'Rabu, 25 November 2026', timeLabel: '07.30 – 12.00 WIB', openTime: '07:30', closeTime: '12:00' });
}
export function saveSchedule(s) { const ok = writeStore(STORAGE_KEYS.SCHEDULE, s); logAudit('SCHEDULE_UPDATE', `Jadwal diperbarui: ${s.dateLabel}`); return ok; }

/* ===== Akun RBAC ===== */
export function getAccounts() {
  const stored = readStore(STORAGE_KEYS.ACCOUNTS, null);
  if (!stored) { writeStore(STORAGE_KEYS.ACCOUNTS, DEFAULT_ACCOUNTS); return { ...DEFAULT_ACCOUNTS }; }
  return { ...DEFAULT_ACCOUNTS, ...stored };
}
export function saveAccounts(a) { return writeStore(STORAGE_KEYS.ACCOUNTS, a); }

export function generateSchoolAccounts(reg) {
  const accounts = getAccounts();
  const cleanNpsn = String(reg.npsn || '20301000').trim();
  const shortCode = cleanNpsn.slice(-4) || '2026';
  const schoolName = reg.schoolName || 'Sekolah';
  const utamaUsername = `utama.${cleanNpsn}`;
  accounts[utamaUsername] = { username: utamaUsername, password: `Utama@${shortCode}`, role: 'admin_sekolah', isPrimary: true, name: `${reg.picName || 'Ketua Panitia'} (Admin Utama)`, roleLabel: 'Admin Utama Sekolah', schoolName, schoolNpsn: cleanNpsn, generatedAt: new Date().toISOString() };
  const staffTemplates = [{ id: '1', title: 'Verifikator DPT' }, { id: '2', title: 'Petugas KPPS 1' }, { id: '3', title: 'Petugas KPPS 2' }, { id: '4', title: 'Teknisi & Monitoring' }];
  const generatedList = [accounts[utamaUsername]];
  staffTemplates.forEach(staff => {
    const uName = `staff${staff.id}.${cleanNpsn}`;
    accounts[uName] = { username: uName, password: `Staff${staff.id}@${shortCode}`, role: 'admin_sekolah', isPrimary: false, name: `${staff.title}`, roleLabel: 'Admin Pendukung Sekolah', schoolName, schoolNpsn: cleanNpsn, generatedAt: new Date().toISOString() };
    generatedList.push(accounts[uName]);
  });
  saveAccounts(accounts);
  logAudit('GENERATE_ACCOUNTS', `5 akun diterbitkan untuk ${schoolName}.`);
  return generatedList;
}

/* ===== Audit Log & Cleanup ===== */
export function logAudit(action, details) {
  const logs = readStore(STORAGE_KEYS.AUDIT_LOGS, []);
  logs.unshift({ id: 'AUD-' + Date.now().toString(36).toUpperCase(), timestamp: new Date().toISOString(), action, details });
  if (logs.length > 60) logs.length = 60;
  writeStore(STORAGE_KEYS.AUDIT_LOGS, logs);
}

export function getAuditLogs() {
  return readStore(STORAGE_KEYS.AUDIT_LOGS, [{ id: 'AUD-001', timestamp: new Date(Date.now() - 7200000).toISOString(), action: 'SISTEM', details: 'Sistem RBAC E-Voting diinisialisasi.' }]);
}

export function executeDataCleanup() {
  const backup = { archiveDate: new Date().toISOString(), status: getElectionStatus(), candidates: getCandidates(), dpt: getDpt(), votes: getVotes(), tokens: getTokens(), registrations: getRegistrations() };
  try { const archives = readStore('evoting.demo.archives', []); archives.push(backup); writeStore('evoting.demo.archives', archives); } catch { }
  setElectionStatus('CLEANUP');
  saveTokens([]);
  saveVotes([]);
  logAudit('CLEANUP', 'Super Admin KPU mengeksekusi pembersihan data.');
  return true;
}

export function resetVotesAndTokensOnly() {
  const candidates = getCandidates();
  candidates.forEach(c => { c.votes = 0; });
  saveCandidates(candidates);
  const dpt = getDpt();
  dpt.forEach(v => { v.hasVoted = false; v.votedAt = null; });
  saveDpt(dpt);
  saveTokens([]);
  saveVotes([]);
  try { sessionStorage.removeItem(STORAGE_KEYS.VERIFY_SESSION); } catch { }
  return true;
}

export function simulateRandomVotes(count = 9) {
  const candidates = getCandidates();
  const dpt = getDpt();
  const unvoted = dpt.filter(v => !v.hasVoted);
  const actualCount = Math.min(count, unvoted.length);
  for (let i = 0; i < actualCount; i++) {
    const voter = unvoted[i];
    const cand = candidates[Math.floor(Math.random() * candidates.length)];
    const token = issueTokenForVoter(voter);
    castVote({ token: token.token, candidateNumber: cand.number });
  }
  return actualCount;
}

/* ===== Validasi ===== */
export const ATTEMPT_LIMIT = 5;
export const LOCK_SECONDS = 30;

export function validateNisn(value) {
  if (!value) return 'NISN wajib diisi.';
  if (!/^\d+$/.test(value)) return 'NISN hanya boleh berisi angka.';
  if (value.length !== 10) return 'NISN harus terdiri dari 10 digit.';
  return '';
}

export function parseDob(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const day = Number(match[1]), month = Number(match[2]), year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  const isReal = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  if (!isReal || date > new Date() || year < 1990) return null;
  return date;
}

export function validateDob(value) {
  if (!value) return 'Tanggal lahir wajib diisi.';
  if (value.length < 10) return 'Gunakan format DD/MM/YYYY, contoh 14/03/2009.';
  return parseDob(value) ? '' : 'Tanggal lahir tidak valid. Gunakan format DD/MM/YYYY.';
}

export function maskNisn(nisn) {
  if (!nisn || nisn.length < 6) return '**********';
  return nisn.slice(0, 2) + '******' + nisn.slice(-2);
}

export function getLockRemainingSeconds() {
  const state = readSession(STORAGE_KEYS.ATTEMPTS, { count: 0, lockedUntil: 0 });
  return Math.max(0, Math.ceil((state.lockedUntil - Date.now()) / 1000));
}

export function registerFailedAttempt() {
  const state = readSession(STORAGE_KEYS.ATTEMPTS, { count: 0, lockedUntil: 0 });
  state.count += 1;
  if (state.count >= ATTEMPT_LIMIT) { state.count = 0; state.lockedUntil = Date.now() + LOCK_SECONDS * 1000; }
  writeSession(STORAGE_KEYS.ATTEMPTS, state);
}

export function resetAttempts() { writeSession(STORAGE_KEYS.ATTEMPTS, { count: 0, lockedUntil: 0 }); }

/* ===== Utilitas ===== */
export const TOKEN_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const TOKEN_LENGTH = 6;

export function generateTokenString() {
  const randomValues = new Uint32Array(TOKEN_LENGTH);
  if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(randomValues);
  else for (let i = 0; i < TOKEN_LENGTH; i++) randomValues[i] = Math.floor(Math.random() * 100000);
  return 'TKN-' + Array.from(randomValues, val => TOKEN_ALPHABET[val % TOKEN_ALPHABET.length]).join('');
}

export function formatPercent(part, total) {
  if (!total) return '0,0%';
  return ((part / total) * 100).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
}

export function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return isNaN(d) ? '-' : d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

export function candidatePhoto(candidate) {
  const colorA = `hsl(${candidate.hue},70%,36%)`;
  const colorB = `hsl(${(candidate.hue + 40) % 360},75%,56%)`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${colorA}"/><stop offset="1" stop-color="${colorB}"/></linearGradient></defs><rect width="400" height="400" fill="url(#g)"/><g fill="#fff"><circle cx="140" cy="190" r="48" fill-opacity=".9"/><path d="M60 360c0-52 36-88 80-88s80 36 80 88z" fill-opacity=".9"/><circle cx="268" cy="206" r="42" fill-opacity=".68"/><path d="M200 360c0-46 30-76 68-76s68 30 68 76z" fill-opacity=".68"/></g></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

export function statusBadgeHtml(status, showCode = false) {
  const meta = STATUS_META[status] || STATUS_META.READY;
  const text = showCode ? `${status} · ${meta.label}` : meta.label;
  return { tone: meta.tone, icon: meta.icon, text };
}
