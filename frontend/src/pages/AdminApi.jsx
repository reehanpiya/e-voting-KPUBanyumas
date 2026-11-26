import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ADMIN_TOKEN_KEY, adminApi } from '../services/api'
import { STORAGE_KEYS, writeSession } from '../store/store'

const SCHOOL_VIEWS = [
  ['overview', 'Ringkasan', 'fa-gauge-high'],
  ['status', 'Status Pemilihan', 'fa-sliders'],
  ['voters', 'Daftar Pemilih', 'fa-id-card'],
  ['candidates', 'Kandidat', 'fa-users'],
  ['schedule', 'Jadwal', 'fa-calendar-days'],
  ['results', 'Rekapitulasi', 'fa-chart-simple'],
]
const SUPER_VIEWS = [
  ['overview', 'Monitoring', 'fa-gauge-high'],
  ['registrations', 'Pendaftaran Sekolah', 'fa-school'],
  ['cleanup', 'Pembersihan Data', 'fa-broom'],
]
const STATUS_OPTIONS = ['READY', 'PENDING', 'SETUP', 'ACTIVE', 'CLOSED', 'FINALIZED', 'PUBLISHED', 'CLEANUP']

function isPrimary(user) {
  const value = user?.is_primary
  return value === true || value === 1 || value === '1' || (typeof value === 'string' && ['t', 'true'].includes(value.toLowerCase()))
}

function ErrorNotice({ children }) {
  return children ? <div className="alert alert-danger" role="alert" style={{ whiteSpace: 'pre-line' }}>{children}</div> : null
}

function formatApiError(error, fallback) {
  const payload = error.response?.data
  const details = payload?.errors?.details
  if (Array.isArray(details) && details.length) {
    const rows = details.slice(0, 8).map((item) => {
      const messages = item.errors || [item.error || 'Data tidak valid.']
      return `Baris ${item.row}${item.nisn ? ` (NISN ${item.nisn})` : ''}: ${messages.join(' ')}`
    })
    const remaining = details.length > rows.length ? `\nDan ${details.length - rows.length} baris lainnya.` : ''
    return [payload.message, payload.errors.summary, ...rows, remaining].filter(Boolean).join('\n')
  }
  return payload?.message || error.message || fallback
}

async function readableApiError(error, fallback) {
  const payload = error.response?.data
  if (payload instanceof Blob) {
    try {
      const parsed = JSON.parse(await payload.text())
      return parsed?.message || fallback
    } catch { return fallback }
  }
  return formatApiError(error, fallback)
}

function Notice({ children }) {
  return children ? <div className="alert alert-info" role="status">{children}</div> : null
}

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try { await onLogin(username.trim(), password) }
    catch (err) { setError(err.response?.data?.message || err.message || 'Login gagal.') }
    finally { setBusy(false) }
  }
  return (
    <div className="login-wrap"><div className="login-card glass">
      <div className="login-brand"><img src="/logo-kpu-banyumas.png" alt="Logo KPU" width="52" height="52" /><div><strong>KPU Kabupaten Banyumas</strong><small>DASHBOARD PETUGAS</small></div></div>
      <h1>Masuk Petugas</h1><p>Gunakan akun admin yang diterbitkan backend.</p>
      <ErrorNotice>{error}</ErrorNotice>
      <form onSubmit={submit}>
        <div className="field"><label htmlFor="api-admin-username">Nama pengguna</label><div className="input-wrap"><i className="fa-solid fa-user"></i><input id="api-admin-username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required /></div></div>
        <div className="field"><label htmlFor="api-admin-password">Kata sandi</label><div className="input-wrap"><i className="fa-solid fa-key"></i><input id="api-admin-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div></div>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Memeriksa akun...' : 'Masuk ke Dashboard'}</button>
      </form>
      <Link className="login-back" to="/">Kembali ke portal pemilih</Link>
    </div></div>
  )
}

function DataTable({ headers, children }) {
  return <div className="tbl-wrap"><table className="tbl"><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>
}

export default function AdminApi() {
  const [user, setUser] = useState(null)
  const [sessionReady, setSessionReady] = useState(false)
  const [view, setView] = useState('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loadedAt, setLoadedAt] = useState(null)
  const [voterSearch, setVoterSearch] = useState('')
  const [csvFile, setCsvFile] = useState(null)
  const [candidateForm, setCandidateForm] = useState(null)
  const [candidateEditorOpen, setCandidateEditorOpen] = useState(false)
  const [scheduleForm, setScheduleForm] = useState({ start_time: '', end_time: '' })
  const [nextStatus, setNextStatus] = useState('')
  const [cleanupCode, setCleanupCode] = useState('')

  const role = user?.role
  const primary = isPrimary(user)
  const views = useMemo(() => role === 'super_admin' ? SUPER_VIEWS : SCHOOL_VIEWS, [role])

  const load = useCallback(async () => {
    if (!user) return
    setBusy(true)
    setError('')
    try {
      let next
      if (role === 'super_admin') {
        if (view === 'registrations') next = await adminApi.registrations()
        else {
          const [progress, registrations] = await Promise.all([
            adminApi.progress(),
            adminApi.registrations(),
          ])
          next = { ...progress, pending_registrations: registrations.total ?? registrations.registrations?.length ?? 0 }
        }
      } else {
        if (view === 'voters') next = await adminApi.voters({ page: 1, per_page: 50, search: voterSearch || undefined })
        else if (view === 'candidates') next = await adminApi.candidates()
        else if (view === 'schedule') next = await adminApi.schedule()
        else if (view === 'results') next = await adminApi.results()
        else next = await adminApi.schoolStatus()
      }
      setData(next)
      setLoadedAt(new Date())
      if (view === 'schedule') {
        setScheduleForm({ start_time: toDatetimeLocal(next.start_time), end_time: toDatetimeLocal(next.end_time) })
      }
      if (view === 'status') setNextStatus(next.status || '')
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Data dashboard gagal dimuat.')
      setData(null)
    } finally { setBusy(false) }
  }, [user, role, view, voterSearch])

  useEffect(() => {
    const token = sessionStorage.getItem(ADMIN_TOKEN_KEY)
    if (!token) { setSessionReady(true); return }
    adminApi.me().then((response) => {
      setUser(response.user)
      writeSession(STORAGE_KEYS.ADMIN_SESSION, {
        username: response.user.username,
        role: response.user.role,
        isPrimary: isPrimary(response.user),
        name: response.user.name,
        roleLabel: response.user.role === 'super_admin' ? 'Super Admin (KPU)' : 'Admin Sekolah',
      })
    }).catch(() => {
      sessionStorage.removeItem(ADMIN_TOKEN_KEY)
      sessionStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION)
    }).finally(() => setSessionReady(true))
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (role !== 'super_admin' || view !== 'overview') return undefined
    const timer = window.setInterval(load, 30_000)
    return () => window.clearInterval(timer)
  }, [role, view, load])

  async function login(username, password) {
    const response = await adminApi.login({ username, password })
    sessionStorage.setItem(ADMIN_TOKEN_KEY, response.token)
    setUser(response.user)
    writeSession(STORAGE_KEYS.ADMIN_SESSION, {
      username: response.user.username,
      role: response.user.role,
      isPrimary: isPrimary(response.user),
      name: response.user.name,
      roleLabel: response.user.role === 'super_admin' ? 'Super Admin (KPU)' : 'Admin Sekolah',
    })
    setView('overview')
  }

  async function logout() {
    try { await adminApi.logout() } catch { /* Clear local session even if API is unreachable. */ }
    sessionStorage.removeItem(ADMIN_TOKEN_KEY)
    sessionStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION)
    setUser(null)
    setData(null)
  }

  async function perform(action, successMessage) {
    setBusy(true)
    setError('')
    setNotice('')
    try { await action(); setNotice(successMessage); await load() }
    catch (err) { setError(await readableApiError(err, 'Aksi gagal diproses.')) }
    finally { setBusy(false) }
  }

  if (!sessionReady) return <div className="login-wrap"><div className="spinner" aria-label="Memulihkan sesi" /></div>
  if (!user) return <LoginScreen onLogin={login} />

  const title = views.find(([id]) => id === view)?.[1] || 'Dashboard'
  return (
    <div className="adm">
      <div className={`scrim${sidebarOpen ? ' show' : ''}`} onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      <aside className={`side${sidebarOpen ? ' open' : ''}`}>
        <Link className="brand" to="/"><img className="brand-logo" src="/logo-kpu-banyumas.png" alt="Logo KPU" width="44" height="44" /><span>KPU Banyumas<small>{role === 'super_admin' ? 'SUPER ADMIN KPU' : primary ? 'ADMIN UTAMA' : 'ADMIN PENDUKUNG'}</small></span></Link>
        <nav className="side-nav" aria-label="Navigasi dashboard">
          <div className="side-label">Menu Dashboard</div>
          {views.map(([id, label, icon]) => <a href="#" key={id} className={view === id ? 'active' : ''} onClick={(event) => { event.preventDefault(); setView(id); setNotice(''); setSidebarOpen(false) }}><i className={`fa-solid ${icon}`}></i>{label}</a>)}
        </nav>
        <div className="side-foot">
          {role === 'admin_sekolah' && <Link to="/booth"><i className="fa-solid fa-check-to-slot"></i>Buka Bilik Suara</Link>}
          <button type="button" onClick={logout}><i className="fa-solid fa-right-from-bracket"></i>Keluar</button>
        </div>
      </aside>
      <div className="content">
        <header className="topbar"><button className="menu-btn" type="button" aria-label={sidebarOpen ? 'Tutup navigasi' : 'Buka navigasi'} aria-expanded={sidebarOpen} onClick={() => setSidebarOpen((open) => !open)}><i className={`fa-solid ${sidebarOpen ? 'fa-xmark' : 'fa-bars'}`} /></button><h1>{title}</h1><div className="who"><div className="txt"><strong>{user.name}</strong><span className="badge tone-info">{role === 'super_admin' ? 'Super Admin KPU' : primary ? 'Admin Utama Sekolah' : 'Admin Pendukung Sekolah'}</span></div><div className="avatar">{String(user.name || 'A').slice(0, 1)}</div></div></header>
        <main className="view">
          <ErrorNotice>{error}</ErrorNotice><Notice>{notice}</Notice>
          {busy && <p role="status">Memuat atau menyimpan data...</p>}
          {role === 'super_admin' && <SuperAdminView view={view} data={data} busy={busy} primary={primary} cleanupCode={cleanupCode} setCleanupCode={setCleanupCode} perform={perform} reload={load} loadedAt={loadedAt} />}
          {role === 'admin_sekolah' && <SchoolAdminView view={view} data={data} busy={busy} primary={primary} voterSearch={voterSearch} setVoterSearch={setVoterSearch} csvFile={csvFile} setCsvFile={setCsvFile} candidateForm={candidateForm} setCandidateForm={setCandidateForm} candidateEditorOpen={candidateEditorOpen} setCandidateEditorOpen={setCandidateEditorOpen} scheduleForm={scheduleForm} setScheduleForm={setScheduleForm} nextStatus={nextStatus} setNextStatus={setNextStatus} perform={perform} reload={load} />}
        </main>
      </div>
    </div>
  )
}

function SuperAdminView({ view, data, busy, cleanupCode, setCleanupCode, perform, reload, loadedAt }) {
  const [issuedAccounts, setIssuedAccounts] = useState([])
  if (view === 'registrations') return <><section className="panel glass"><div className="toolbar"><h2>Permohonan Sekolah</h2><button className="btn btn-ghost btn-sm" onClick={reload}>Muat ulang</button></div><p className="sub">{data?.total ?? 0} permohonan menunggu proses.</p><DataTable headers={['Sekolah', 'NPSN', 'Email Kontak', 'Aksi']}>
    {(data?.registrations || []).map((item) => <tr key={item.id}><td>{item.school_name || '-'}</td><td>{item.npsn || '-'}</td><td>{item.contact_email || '-'}</td><td><button className="btn btn-primary btn-sm" disabled={busy} onClick={() => perform(async () => { const result = await adminApi.approveRegistration(item.id); setIssuedAccounts(result.accounts || []) }, 'Sekolah disetujui dan akun admin dibuat.')}>Setujui</button></td></tr>)}
    {!data?.registrations?.length && <tr><td colSpan="4">Tidak ada permohonan menunggu.</td></tr>}
  </DataTable></section>{issuedAccounts.length > 0 && <section className="panel glass"><h2>Akun Sekolah Baru</h2><p className="sub">Simpan informasi ini dan serahkan secara aman. Kata sandi hanya ditampilkan pada respons persetujuan ini.</p><DataTable headers={['Nama', 'Peran', 'Username', 'Password']}>
    {issuedAccounts.map((account) => <tr key={account.username}><td>{account.name}</td><td>{account.is_primary ? 'Admin Utama' : 'Admin Pendukung'}</td><td><code>{account.username}</code></td><td><code>{account.plain_password}</code></td></tr>)}
  </DataTable></section>}</>
  if (view === 'cleanup') return <section className="panel glass"><h2>Pembersihan Data Operasional</h2><p className="sub">Aksi ini menghapus data pemilu aktif. Jalankan hanya setelah laporan resmi diunduh.</p><div className="field"><label htmlFor="cleanup-code">Ketik HAPUS DATA untuk konfirmasi</label><input className="cleanup-input" id="cleanup-code" type="text" autoComplete="off" placeholder="HAPUS DATA" value={cleanupCode} onChange={(e) => setCleanupCode(e.target.value)} /></div><button className="btn btn-danger" disabled={busy || cleanupCode !== 'HAPUS DATA'} onClick={() => perform(() => adminApi.cleanup(cleanupCode), 'Data operasional telah dibersihkan.')}>Bersihkan Data</button></section>
  return <><div className="view-head toolbar"><div><h2>Monitoring Pemilu</h2><p>Data status dan pendaftaran diperbarui langsung dari backend.</p><p className="sub">{loadedAt ? `Pembaruan terakhir ${loadedAt.toLocaleTimeString('id-ID')}. Otomatis setiap 30 detik.` : 'Menunggu data backend...'}</p></div><button className="btn btn-ghost btn-sm" disabled={busy} onClick={reload}>Muat ulang</button></div><div className="grid-stats"><Stat label="Tahapan" value={data?.phase_name || 'Memuat'} /><Stat label="Status" value={data?.status || '-'} /><Stat label="Progres tahapan" value={`${Number(data?.percentage) || 0}%`} /><Stat label="Permohonan menunggu" value={data?.pending_registrations ?? '-'} /></div><section className="panel glass"><h2>{data?.school_name || 'Belum ada sekolah aktif'}</h2><p className="sub">Pendaftaran sekolah {data?.is_registration_open ? 'dibuka' : 'ditutup'}.</p><p className="sub">DPT: {data?.dpt_locked ? 'terkunci' : 'belum terkunci'} · Kandidat: {data?.candidates_locked ? 'terkunci' : 'belum terkunci'} · Laporan resmi: {data?.report_downloaded ? 'sudah diunduh' : 'belum diunduh'}</p><button className="btn btn-primary" disabled={busy || data?.status !== 'READY'} onClick={() => perform(() => adminApi.toggleRegistration(!data?.is_registration_open), 'Pengaturan pendaftaran berhasil diperbarui.')}>{data?.is_registration_open ? 'Tutup Pendaftaran' : 'Buka Pendaftaran'}</button>{data?.status && data.status !== 'READY' && <p className="sub">Pengaturan pendaftaran hanya tersedia saat status READY.</p>}</section>{data?.election_id && data?.school_name && !['READY', 'PENDING'].includes(data.status) && <section className="panel glass"><h2>Kredensial Admin Sekolah</h2><p className="sub">Terbitkan password baru jika kredensial sebelumnya hilang. Password lama langsung tidak berlaku dan kredensial hanya ditampilkan sekali.</p><button className="btn btn-ghost" disabled={busy} onClick={() => { if (window.confirm(`Terbitkan ulang password semua akun admin untuk ${data.school_name}? Password lama tidak berlaku lagi.`)) perform(async () => { const result = await adminApi.reissueCredentials(data.election_id); setIssuedAccounts(result.accounts || []) }, 'Kredensial baru berhasil diterbitkan.') }}>Terbitkan Ulang Kredensial</button></section>}{issuedAccounts.length > 0 && <section className="panel glass"><h2>Kredensial Baru — Catat Sekarang</h2><p className="sub">Kata sandi ini hanya ditampilkan pada respons penerbitan ulang ini.</p><DataTable headers={['Nama', 'Peran', 'Username', 'Password']}>{issuedAccounts.map((account) => <tr key={account.username}><td>{account.name}</td><td>{account.is_primary ? 'Admin Utama' : 'Admin Pendukung'}</td><td><code>{account.username}</code></td><td><code>{account.plain_password}</code></td></tr>)}</DataTable></section>}</>
}

function SchoolAdminView({ view, data, busy, primary, voterSearch, setVoterSearch, csvFile, setCsvFile, candidateForm, setCandidateForm, candidateEditorOpen, setCandidateEditorOpen, scheduleForm, setScheduleForm, nextStatus, setNextStatus, perform, reload }) {
  const dptLocked = truthy(data?.election?.is_locked)
  const dptDisabledReason = !primary
    ? 'Hanya Admin Utama yang dapat mengimpor atau mengunci DPT.'
    : dptLocked
      ? 'DPT sudah dikunci dan tidak dapat diubah.'
      : data?.election?.status !== 'SETUP'
        ? 'Impor DPT hanya tersedia saat status pemilihan SETUP.'
        : ''

  if (view === 'voters') return <section className="panel glass"><div className="toolbar"><div><h2>Daftar Pemilih Tetap</h2><p className="sub">Total {data?.total ?? 0} pemilih. {dptLocked ? 'DPT terkunci.' : 'DPT terbuka.'}</p></div><button className="btn btn-ghost btn-sm" onClick={reload}>Muat ulang</button></div><div className="dpt-toolbar"><input className="dpt-search" aria-label="Cari pemilih" placeholder="Cari nama, NISN, atau kelas" value={voterSearch} onChange={(e) => setVoterSearch(e.target.value)} /><div className="dpt-import"><div className="file-picker"><input className="file-picker-native" id="dpt-csv-file" aria-label="Pilih file CSV DPT" type="file" accept=".csv,text/csv" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} /><label className="file-picker-label" htmlFor="dpt-csv-file"><i className="fa-solid fa-file-arrow-up" /><span>{csvFile?.name || 'Pilih File CSV'}</span></label></div><button className="btn btn-primary btn-sm" disabled={!csvFile || busy || Boolean(dptDisabledReason)} onClick={() => perform(() => adminApi.importVoters(csvFile), 'Impor DPT berhasil.')}>Impor CSV</button><button className="btn btn-danger btn-sm" disabled={busy || Boolean(dptDisabledReason)} onClick={() => perform(() => adminApi.lockVoters(), 'DPT berhasil dikunci.')}>Kunci DPT</button></div></div><p className="field-hint dpt-hint">Urutan kolom: NISN, nama, kelas, tanggal lahir (DDMMYYYY atau DD/MM/YYYY). Pemisah koma dan titik koma didukung.</p>{dptDisabledReason ? <p className="alert alert-warning dpt-hint" role="status">{dptDisabledReason}</p> : !csvFile && <p className="field-hint dpt-hint">Pilih file CSV terlebih dahulu untuk mengaktifkan impor.</p>}<DataTable headers={['Nama', 'NISN', 'Kelas', 'Hak Pilih']}>
    {(data?.voters || []).map((voter) => <tr key={voter.id}><td>{voter.name}</td><td>{voter.nisn}</td><td>{voter.class}</td><td>{truthy(voter.has_voted) ? 'Sudah memilih' : 'Belum memilih'}</td></tr>)}
    {!data?.voters?.length && <tr><td colSpan="4">Belum ada data pemilih.</td></tr>}
  </DataTable></section>

  if (view === 'candidates') return <><section className="panel glass"><div className="toolbar"><div><h2>Kandidat</h2><p className="sub">{data?.election?.is_locked ? 'Data kandidat terkunci.' : 'Kelola data pasangan calon.'}</p></div><div className="btn-row"><button className="btn btn-primary btn-sm" disabled={busy || data?.election?.is_locked} onClick={() => { setCandidateForm(null); setCandidateEditorOpen(true) }}><i className="fa-solid fa-plus" /> Tambah Kandidat</button><button className="btn btn-danger btn-sm" disabled={busy || !primary || data?.election?.is_locked} onClick={() => perform(() => adminApi.lockCandidates(), 'Kandidat berhasil dikunci.')}>Kunci Kandidat</button></div></div><DataTable headers={['Foto', 'Nomor', 'Nama', 'Visi', 'Aksi']}>
    {(data?.candidates || []).map((candidate) => <tr key={candidate.id}><td>{candidate.photo_url ? <img className="candidate-thumb" src={candidate.photo_url} alt={`Foto ${candidate.name}`} /> : <span className="candidate-thumb-empty"><i className="fa-solid fa-image" /></span>}</td><td>{candidate.number}</td><td>{candidate.name}</td><td>{candidate.vision || '-'}</td><td><button className="btn btn-ghost btn-xs" disabled={busy || data?.election?.is_locked} onClick={() => { setCandidateForm(candidate); setCandidateEditorOpen(true) }}>Ubah</button> <button className="btn btn-danger btn-xs" disabled={busy || data?.election?.is_locked} onClick={() => perform(() => adminApi.deleteCandidate(candidate.id), 'Kandidat dihapus.')}>Hapus</button></td></tr>)}
    {!data?.candidates?.length && <tr><td colSpan="5">Belum ada kandidat.</td></tr>}
  </DataTable></section>{candidateEditorOpen && <CandidateEditor initial={candidateForm} busy={busy || data?.election?.is_locked} onCancel={() => { setCandidateForm(null); setCandidateEditorOpen(false) }} onSave={(values) => perform(async () => { if (candidateForm?.id) await adminApi.updateCandidate(candidateForm.id, values); else await adminApi.createCandidate(values); setCandidateForm(null); setCandidateEditorOpen(false) }, 'Data kandidat berhasil disimpan.')} />}</>

  if (view === 'schedule') return <section className="panel glass"><h2>Jadwal Pemungutan</h2><p className="sub">Waktu mulai dan selesai dari backend.</p><form onSubmit={(event) => { event.preventDefault(); perform(() => adminApi.saveSchedule({ start_time: scheduleForm.start_time, end_time: scheduleForm.end_time }), 'Jadwal berhasil disimpan.') }}><div className="two"><div className="field"><label htmlFor="start-time">Mulai</label><input id="start-time" type="datetime-local" value={scheduleForm.start_time} onChange={(e) => setScheduleForm({ ...scheduleForm, start_time: e.target.value })} required /></div><div className="field"><label htmlFor="end-time">Selesai</label><input id="end-time" type="datetime-local" value={scheduleForm.end_time} onChange={(e) => setScheduleForm({ ...scheduleForm, end_time: e.target.value })} required /></div></div><button className="btn btn-primary" disabled={busy || !primary}>Simpan Jadwal</button>{!primary && <p className="sub">Hanya Admin Utama yang dapat mengubah jadwal.</p>}</form></section>

  if (view === 'results') {
    const reportReady = data?.election?.status === 'PUBLISHED'
    const downloadReport = (format) => perform(async () => {
      const response = await adminApi.downloadReport(format)
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = `laporan-pemilu.${format}`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    }, `Laporan ${format.toUpperCase()} berhasil diunduh.`)
    return <><div className="grid-stats"><Stat label="Total DPT" value={data?.results?.total_dpt ?? '-'} /><Stat label="Suara Sah" value={data?.results?.total_valid_votes ?? '-'} /><Stat label="Partisipasi" value={`${Number(data?.results?.turnout_percentage) || 0}%`} /></div><section className="panel glass"><div className="toolbar"><div><h2>Rekapitulasi dan Integritas</h2><p className="sub">Unduh laporan resmi untuk arsip panitia dan memenuhi syarat pembersihan data.</p></div><div className="btn-row"><button className="btn btn-ghost btn-sm" disabled={busy || !reportReady} onClick={() => downloadReport('csv')}>Unduh CSV</button><button className="btn btn-primary btn-sm" disabled={busy || !reportReady} onClick={() => downloadReport('pdf')}>Unduh PDF Resmi</button></div></div>{!reportReady && <p className="sub">Laporan resmi dapat diunduh setelah hasil berstatus PUBLISHED.</p>}<p className="sub">{data?.integrity?.message || 'Rekap belum tersedia.'}</p><DataTable headers={['Nomor', 'Pasangan Calon', 'Suara', 'Persentase']}>
    {(data?.results?.candidates || []).map((candidate) => <tr key={candidate.id}><td>{candidate.number}</td><td>{candidate.name}</td><td>{candidate.votes}</td><td>{candidate.percentage}%</td></tr>)}
  </DataTable></section></>
  }

  if (view === 'status') return <section className="panel glass"><h2>Status Tahapan Pemilihan</h2><p className="sub">Status ini hanya tersedia di dashboard admin sekolah.</p><div className="grid-stats"><Stat label="Tahapan saat ini" value={data?.status || '-'} /><Stat label="Sekolah" value={data?.school_name || '-'} /></div><div className="field"><label htmlFor="election-status">Ubah status</label><select id="election-status" value={nextStatus} onChange={(e) => setNextStatus(e.target.value)}>{STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}</select></div><button className="btn btn-primary" disabled={busy || !primary || nextStatus === data?.status} onClick={() => perform(() => adminApi.updateStatus(nextStatus), 'Status pemilihan berhasil diperbarui.')}>Simpan Status</button>{!primary && <p className="sub">Hanya Admin Utama yang dapat mengubah tahapan.</p>}</section>

  return <><div className="view-head"><h2>Dashboard Admin Sekolah</h2><p>Status pemilihan dan data operasional dimuat dari backend.</p></div><div className="grid-stats"><Stat label="Status" value={data?.status || 'Memuat'} /><Stat label="Sekolah" value={data?.school_name || '-'} /><Stat label="NPSN" value={data?.npsn || '-'} /></div><section className="panel glass"><h2>Ringkasan Operasional</h2><p className="sub">Gunakan menu di samping untuk mengelola DPT, kandidat, jadwal, dan rekap.</p></section></>
}

function CandidateEditor({ initial, busy, onCancel, onSave }) {
  const [values, setValues] = useState({ number: '', name: '', vision: '', mission: '', program: '' })
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(initial?.photo_url || '')
  const previewUrlRef = useRef(null)

  useEffect(() => {
    setValues({ number: initial?.number ?? '', name: initial?.name ?? '', vision: initial?.vision ?? '', mission: initial?.mission ?? '', program: initial?.program ?? '' })
    setPhotoFile(null)
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = null
    setPhotoPreview(initial?.photo_url || '')
  }, [initial])
  useEffect(() => () => { if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current) }, [])

  function choosePhoto(event) {
    const file = event.target.files?.[0] || null
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = file ? URL.createObjectURL(file) : null
    setPhotoFile(file)
    setPhotoPreview(previewUrlRef.current || initial?.photo_url || '')
  }

  return <section className="panel glass candidate-editor"><h2>{initial ? 'Ubah Kandidat' : 'Tambah Kandidat'}</h2><form onSubmit={(event) => { event.preventDefault(); onSave({ ...values, number: Number(values.number), photo: photoFile }) }}><div className="two"><div className="field"><label htmlFor="candidate-number">Nomor urut</label><input className="candidate-input candidate-number-input" id="candidate-number" type="number" min="1" step="1" placeholder="Contoh: 1" value={values.number} onChange={(e) => setValues({ ...values, number: e.target.value })} required /></div><div className="field"><label htmlFor="candidate-name">Nama pasangan</label><input className="candidate-input" id="candidate-name" type="text" maxLength="150" placeholder="Nama pasangan calon" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} required /></div></div><div className="field"><label htmlFor="candidate-photo">Foto pasangan calon</label><div className="candidate-photo-control"><input className="candidate-photo-input" id="candidate-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} /><p className="field-hint">JPG, PNG, atau WEBP. Maksimal 1 MB.</p>{photoPreview && <img className="candidate-photo-preview" src={photoPreview} alt="Pratinjau foto kandidat" />}</div></div><div className="field"><label>Visi</label><textarea value={values.vision} onChange={(e) => setValues({ ...values, vision: e.target.value })} /></div><div className="field"><label>Misi (satu per baris)</label><textarea value={values.mission} onChange={(e) => setValues({ ...values, mission: e.target.value })} /></div><div className="field"><label>Program unggulan (satu per baris)</label><textarea value={values.program} onChange={(e) => setValues({ ...values, program: e.target.value })} /></div><button className="btn btn-primary" disabled={busy}>Simpan Kandidat</button>{initial && <button className="btn btn-ghost" type="button" onClick={onCancel}>Batal</button>}</form></section>
}

function Stat({ label, value }) { return <article className="stat glass"><div className="k">{label}</div><div className="v">{value}</div></article> }
function truthy(value) { return value === true || value === 1 || value === '1' || value === 't' || value === 'true' }
function toDatetimeLocal(value) { if (!value) return ''; const date = new Date(value); if (Number.isNaN(date.getTime())) return ''; const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000); return local.toISOString().slice(0, 16) }
