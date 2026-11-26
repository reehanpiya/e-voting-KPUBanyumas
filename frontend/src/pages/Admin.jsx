import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../components/Toast'
import {
  STORAGE_KEYS, STATUS_META, STATUS_ORDER, statusRank,
  readSession, writeSession, getAccounts, getElectionStatus, setElectionStatus,
  getCandidates, saveCandidates, getDpt, getTotalVoters, getTotalVotes,
  getTokens, getRegistrations, saveRegistrations, updateRegistrationStatus,
  generateSchoolAccounts, getSchedule, saveSchedule, getVotes, getAuditLogs,
  logAudit, isDptLocked, setDptLocked, isCandidatesLocked, setCandidatesLocked,
  addVoter, deleteVoter, updateVoterStatus, importDptBatch, findVoterByNisn,
  addCandidate, updateCandidate, deleteCandidate, isRegistrationOpen,
  setRegistrationOpen, executeDataCleanup, resetVotesAndTokensOnly,
  simulateRandomVotes, formatDate, formatPercent, maskNisn, validateNisn,
  validateDob, saveAccounts, saveTokens, saveVotes, saveDpt, candidatePhoto
} from '../store/store'

const ROLES_META = {
  super_admin: { label: 'Super Admin (KPU)', tone: 'danger', icon: 'fa-shield' },
  admin_sekolah_primary: { label: 'Admin Utama Sekolah', tone: 'warning', icon: 'fa-star' },
  admin_sekolah_support: { label: 'Admin Pendukung Sekolah', tone: 'neutral', icon: 'fa-user-gear' }
}

const VIEWS = {
  ringkasan: { title: 'Dashboard Utama', icon: 'fa-gauge-high', roles: ['super_admin', 'admin_sekolah'], group: 'Utama' },
  pengajuan: { title: 'Pengajuan Sekolah', icon: 'fa-school', roles: ['super_admin'], group: 'Pengawasan KPU' },
  monitoring: { title: 'Monitoring Tahapan KPU', icon: 'fa-chart-pie', roles: ['super_admin'], group: 'Pengawasan KPU' },
  tahapan: { title: 'Kontrol Tahapan', icon: 'fa-sliders', roles: ['admin_sekolah'], group: 'Manajemen Pemilu' },
  dpt: { title: 'Daftar Pemilih (DPT)', icon: 'fa-id-card', roles: ['admin_sekolah'], group: 'Manajemen Pemilu' },
  kandidat: { title: 'Kelola Kandidat', icon: 'fa-users-gear', roles: ['admin_sekolah'], group: 'Manajemen Pemilu' },
  jadwal: { title: 'Jadwal Pemilihan', icon: 'fa-calendar-days', roles: ['admin_sekolah'], group: 'Manajemen Pemilu' },
  rekap: { title: 'Rekapitulasi Suara', icon: 'fa-chart-simple', roles: ['admin_sekolah'], group: 'Hasil & Pelaporan' },
  akun_sekolah: { title: 'Akun Panitia Sekolah', icon: 'fa-users-line', roles: ['super_admin', 'admin_sekolah'], group: 'Akses & Akun' },
  pengaturan: { title: 'Sistem & Cleanup', icon: 'fa-database', roles: ['super_admin', 'admin_sekolah'], group: 'Sistem' }
}

function ConfirmDialog({ title, text, confirmLabel = 'Ya, lanjutkan', danger = false, onConfirm, onCancel }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onCancel])
  return (
    <div className="dlg-back" onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="dlg" role="alertdialog" aria-modal="true">
        <h3>{title}</h3>
        <p>{text}</p>
        <div className="btn-row">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Batal</button>
          <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status, showCode = false }) {
  const meta = STATUS_META[status] || STATUS_META.READY
  return <span className={`badge tone-${meta.tone}`}><i className={`fa-solid ${meta.icon}`}></i>{showCode ? `${status} · ${meta.label}` : meta.label}</span>
}

function StatusStepper({ status, admStyle = false }) {
  const currentRank = statusRank(status)
  return (
    <div className={`stepper${admStyle ? ' adm-steps' : ''}`} role="list">
      {STATUS_ORDER.map((s, i) => {
        const state = i < currentRank ? 'done' : i === currentRank ? 'current' : ''
        const marker = state === 'done' ? <i className="fa-solid fa-check"></i> : i + 1
        const cap = state === 'done' ? 'Selesai' : state === 'current' ? 'Sedang berlangsung' : 'Akan datang'
        return (
          <div key={s} className={`step ${state}`} role="listitem" aria-current={state === 'current' ? 'step' : undefined}>
            <div className="step-no">{marker}</div>
            <small>{s}</small>
            <strong>{STATUS_META[s].label}</strong>
            <span className="step-state">{cap}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function Admin() {
  const showToast = useToast()
  const [session, setSession] = useState(null)
  const [view, setView] = useState('ringkasan')
  const [sideOpen, setSideOpen] = useState(false)
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [genAccounts, setGenAccounts] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const saved = readSession(STORAGE_KEYS.ADMIN_SESSION, null)
    if (saved) {
      const accounts = getAccounts()
      const acc = accounts[saved.username]
      if (acc && acc.role === saved.role) setSession(saved)
    }
  }, [])

  function getRoleMeta(s) {
    if (s.role === 'super_admin') return ROLES_META.super_admin
    return s.isPrimary ? ROLES_META.admin_sekolah_primary : ROLES_META.admin_sekolah_support
  }

  function can(viewKey) {
    if (!session) return false
    const v = VIEWS[viewKey]
    if (!v) return false
    if (session.role === 'super_admin') return v.roles.includes('super_admin')
    return v.roles.includes('admin_sekolah')
  }

  function handleLogin(e) {
    e.preventDefault()
    const username = loginUsername.trim().toLowerCase()
    const password = loginPassword
    const accounts = getAccounts()
    const account = accounts[username]
    if (!username || !password) { setLoginError('Nama pengguna dan kata sandi wajib diisi.'); return }
    if (!account || account.password !== password) { setLoginError('Nama pengguna atau kata sandi tidak sesuai.'); setLoginPassword(''); return }
    const sess = { username: account.username, role: account.role, isPrimary: Boolean(account.isPrimary), name: account.name, roleLabel: account.roleLabel, schoolName: account.schoolName || null, schoolNpsn: account.schoolNpsn || null }
    writeSession(STORAGE_KEYS.ADMIN_SESSION, sess)
    setSession(sess)
    setLoginError('')
    showToast(`Masuk berhasil sebagai ${account.roleLabel}.`, 'success')
  }

  function logout() {
    try { sessionStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION) } catch { }
    setSession(null)
    setView('ringkasan')
    setSideOpen(false)
  }

  function navigate(viewKey) {
    setView(viewKey)
    setSideOpen(false)
    setRefreshKey(k => k + 1)
  }

  async function triggerStatusTransition(target) {
    const status = getElectionStatus()
    if (target === status) { showToast('Status pemilu sudah pada tahapan ini.', 'info'); return }
    if (session.role !== 'admin_sekolah' || !session.isPrimary) { showToast('Akses Ditolak (403): Hanya Admin Utama Sekolah.', 'error'); return }

    if (target === 'CLOSED') {
      setConfirm({
        title: 'Konfirmasi Kritis: Tutup Pemungutan',
        text: 'Menutup pemungutan suara akan langsung mengunci bilik suara digital. Ketik TUTUP SESI PEMUNGUTAN untuk konfirmasi.',
        confirmLabel: 'Konfirmasi & Tutup Sesi',
        danger: true,
        requireText: 'TUTUP SESI PEMUNGUTAN',
        onConfirm: () => {
          setElectionStatus('CLOSED')
          logAudit('CLOSE_VOTING', 'Admin Utama menutup sesi pemungutan suara.')
          showToast('Sesi pemungutan suara resmi DITUTUP.', 'success')
          setConfirm(null)
          setRefreshKey(k => k + 1)
        }
      })
      return
    }

    setConfirm({
      title: `Ubah status tahapan ke ${target}?`,
      text: `Status akan beralih dari ${status} ke ${target} (${STATUS_META[target].label}).`,
      confirmLabel: `Terapkan ${target}`,
      onConfirm: () => {
        setElectionStatus(target)
        logAudit('STATUS_CHANGE', `Admin Utama mengubah status pemilu dari ${status} ke ${target}.`)
        showToast(`Status pemilu berhasil diubah ke ${target}.`, 'success')
        setConfirm(null)
        setRefreshKey(k => k + 1)
      }
    })
  }

  function quickFill(u, p) {
    setLoginUsername(u)
    setLoginPassword(p)
    showToast(`Kredensial ${u} dipilih. Klik Masuk.`, 'info')
  }

  if (!session) {
    return (
      <div className="login-wrap">
        <div className="login-card glass">
          <div className="login-brand">
            <img src="/logo-kpu-banyumas.png" alt="Logo KPU" width="52" height="52" />
            <div>
              <strong style={{ display: 'block', color: 'var(--navy)', fontSize: '17px', lineHeight: '1.2' }}>KPU Kabupaten Banyumas</strong>
              <small style={{ color: 'var(--muted)', fontWeight: '600', letterSpacing: '.06em', fontSize: '11px' }}>DASHBOARD PETUGAS</small>
            </div>
          </div>
          <h1>Masuk Petugas</h1>
          <p style={{ color: 'var(--muted)', fontSize: '14.5px', marginBottom: '20px' }}>Sistem E-Voting Pilketos Berbasis Peran (RBAC).</p>
          {loginError && <div className="alert alert-danger" role="alert"><i className="fa-solid fa-circle-exclamation"></i><span>{loginError}</span></div>}
          <form onSubmit={handleLogin} noValidate>
            <div className="field">
              <label htmlFor="username">Nama pengguna</label>
              <div className="input-wrap"><i className="fa-solid fa-user"></i><input id="username" type="text" autoComplete="username" placeholder="Nama pengguna" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} required /></div>
            </div>
            <div className="field">
              <label htmlFor="password">Kata sandi</label>
              <div className="input-wrap">
                <i className="fa-solid fa-key"></i>
                <input id="password" type={showPw ? 'text' : 'password'} autoComplete="current-password" placeholder="Kata sandi" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required style={{ paddingRight: '48px' }} />
                <button className="pw-toggle" type="button" aria-label={showPw ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'} onClick={() => setShowPw(!showPw)}>
                  <i className={`fa-regular ${showPw ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>
            <button className="btn btn-primary btn-block" type="submit"><i className="fa-solid fa-right-to-bracket"></i> <span>Masuk ke Dashboard</span></button>
          </form>

          <details className="hint-box" open style={{ marginTop: '20px' }}>
            <summary><i className="fa-solid fa-id-badge"></i> Kredensial Uji Coba Sesuai Peran (RBAC)</summary>
            <table style={{ width: '100%', marginTop: '10px', fontSize: '12.5px', borderCollapse: 'collapse' }}>
              <thead><tr style={{ textAlign: 'left', borderBottom: '1.5px solid rgba(201,162,74,.4)', color: 'var(--navy)' }}><th style={{ padding: '6px 4px' }}>Peran</th><th style={{ padding: '6px 4px' }}>Username</th><th style={{ padding: '6px 4px' }}>Password</th><th style={{ padding: '6px 4px', textAlign: 'right' }}>Aksi</th></tr></thead>
              <tbody>
                {[['Super Admin (KPU)', 'admin.kpu', 'KPU@2026'], ['Admin Utama Sekolah', 'admin.utama', 'Utama@2026'], ['Admin Pendukung', 'admin.pendukung', 'Pendukung@2026']].map(([role, u, p]) => (
                  <tr key={u} style={{ borderBottom: '1px solid rgba(201,162,74,.2)' }}>
                    <td style={{ padding: '8px 4px' }}><strong>{role}</strong></td>
                    <td style={{ padding: '8px 4px' }}><code>{u}</code></td>
                    <td style={{ padding: '8px 4px' }}><code>{p}</code></td>
                    <td style={{ padding: '8px 4px', textAlign: 'right' }}><button type="button" className="btn btn-ghost btn-xs" onClick={() => quickFill(u, p)}>Pilih</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
          <Link className="login-back" to="/"><i className="fa-solid fa-arrow-left"></i> Kembali ke portal pemilih</Link>
        </div>
      </div>
    )
  }

  const rMeta = getRoleMeta(session)

  return (
    <div className="adm">
      <aside className={`side${sideOpen ? ' open' : ''}`} id="side" aria-label="Menu dashboard">
        <Link className="brand" to="#" onClick={() => navigate('ringkasan')}>
          <img className="brand-logo" src="/logo-kpu-banyumas.png" alt="Logo KPU" width="44" height="44" />
          <span>KPU Banyumas<small style={{ color: 'var(--gold)' }}>{session.role === 'super_admin' ? 'SUPER ADMIN KPU' : session.isPrimary ? 'ADMIN UTAMA' : 'ADMIN PENDUKUNG'}</small></span>
        </Link>
        <SideNav view={view} session={session} can={can} onNavigate={navigate} />
        <div className="side-foot">
          <Link to="/booth"><i className="fa-solid fa-check-to-slot"></i> Buka Bilik Suara</Link>
          <a href="/" target="_blank" rel="noopener"><i className="fa-solid fa-arrow-up-right-from-square"></i> Portal Pemilih</a>
          <button type="button" onClick={() => setConfirm({ title: 'Keluar dari dashboard?', text: 'Anda perlu masuk kembali untuk membuka dashboard petugas.', confirmLabel: 'Keluar', onConfirm: () => { logout(); setConfirm(null) } })}>
            <i className="fa-solid fa-right-from-bracket"></i> Keluar
          </button>
        </div>
      </aside>
      <div className={`scrim${sideOpen ? ' show' : ''}`} onClick={() => setSideOpen(false)}></div>
      <div className="content">
        <header className="topbar">
          <div className="btn-row" style={{ flexWrap: 'nowrap', minWidth: 0 }}>
            <button className="menu-btn" type="button" aria-label="Buka menu" aria-expanded={sideOpen} aria-controls="side" onClick={() => setSideOpen(!sideOpen)}>
              <i className="fa-solid fa-bars"></i>
            </button>
            <h1>{VIEWS[view]?.title || 'Dashboard'}</h1>
          </div>
          <div className="who">
            <div className="txt">
              <strong>{session.name}</strong>
              <div><span className={`badge tone-${rMeta.tone}`} style={{ fontSize: '11px' }}><i className={`fa-solid ${rMeta.icon}`}></i> {rMeta.label}</span></div>
            </div>
            <div className="avatar" aria-hidden="true">{session.name.charAt(0)}</div>
          </div>
        </header>
        <main className="view" tabIndex="-1">
          <ViewContent
            key={refreshKey}
            view={view}
            session={session}
            can={can}
            onNavigate={navigate}
            onTriggerStatus={triggerStatusTransition}
            onConfirm={setConfirm}
            onGenAccounts={setGenAccounts}
            showToast={showToast}
            onRefresh={() => setRefreshKey(k => k + 1)}
          />
        </main>
      </div>

      {/* Modals */}
      {confirm && (
        <ConfirmModal data={confirm} onClose={() => setConfirm(null)} showToast={showToast} />
      )}
      {genAccounts && (
        <GenAccountsModal data={genAccounts} onClose={() => setGenAccounts(null)} showToast={showToast} />
      )}
    </div>
  )
}

function SideNav({ view, session, can, onNavigate }) {
  let lastGroup = ''
  const items = []
  for (const [key, v] of Object.entries(VIEWS)) {
    if (!can(key)) continue
    if (v.group !== lastGroup) {
      items.push(<li key={`label-${v.group}`} className="side-label" aria-hidden="true">{v.group}</li>)
      lastGroup = v.group
    }
    items.push(
      <li key={key}>
        <a href={`#${key}`} data-view={key} className={view === key ? 'active' : ''} aria-current={view === key ? 'page' : undefined}
          onClick={(e) => { e.preventDefault(); onNavigate(key) }}>
          <i className={`fa-solid ${v.icon}`}></i>{v.title}
        </a>
      </li>
    )
  }
  return <ul className="side-nav">{items}</ul>
}

function ConfirmModal({ data, onClose, showToast }) {
  const [inputVal, setInputVal] = useState('')
  const needsText = Boolean(data.requireText)
  const canConfirm = !needsText || inputVal.trim() === data.requireText

  return (
    <div className="dlg-back" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="dlg" role="alertdialog" aria-modal="true" style={data.danger ? { borderTop: '4px solid var(--danger)' } : {}}>
        <h3 style={data.danger ? { color: 'var(--danger)' } : {}}>{data.title}</h3>
        <p>{data.text}</p>
        {needsText && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: '800', color: 'var(--danger)', marginBottom: '8px', letterSpacing: '1.5px' }}>{data.requireText}</div>
            <input type="text" style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--danger)', borderRadius: '10px', fontWeight: '700', fontSize: '14px' }}
              placeholder={`Ketik ${data.requireText}`} autoComplete="off" value={inputVal} onChange={e => setInputVal(e.target.value)} />
          </div>
        )}
        <div className="btn-row">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
          <button type="button" className={`btn ${data.danger ? 'btn-danger' : 'btn-primary'}`} disabled={!canConfirm} onClick={data.onConfirm}>{data.confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

function GenAccountsModal({ data, onClose, showToast }) {
  return (
    <div className="dlg-back" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="dlg" style={{ maxWidth: '640px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(36,122,82,.12)', color: 'var(--success)', display: 'grid', placeItems: 'center', fontSize: '24px', flex: 'none' }}>
            <i className="fa-solid fa-shield-cat"></i>
          </div>
          <div>
            <h3 style={{ margin: 0 }}>5 Akun Panitia Sekolah Diterbitkan</h3>
            <p className="muted" style={{ margin: 0, fontSize: '12.5px' }}>Sekolah: {data.schoolName}</p>
          </div>
        </div>
        <div className="tbl-wrap" style={{ maxHeight: '280px', overflowY: 'auto', marginBottom: '16px' }}>
          <table className="tbl" style={{ fontSize: '13px' }}>
            <thead><tr><th>Peran</th><th>Nama</th><th>Username</th><th>Password</th></tr></thead>
            <tbody>
              {data.accounts.map((a, i) => (
                <tr key={i}>
                  <td>{a.isPrimary ? <span className="badge tone-warning"><i className="fa-solid fa-star"></i> Admin Utama</span> : <span className="badge tone-neutral"><i className="fa-solid fa-user-gear"></i> Pendukung</span>}</td>
                  <td><strong>{a.name}</strong></td>
                  <td className="mono"><code>{a.username}</code></td>
                  <td className="mono"><code>{a.password}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="btn-row" style={{ justifyContent: 'space-between' }}>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => {
            const text = data.accounts.map(a => `${a.isPrimary ? '[Admin Utama]' : '[Admin Pendukung]'} ${a.name} | Username: ${a.username} | Password: ${a.password}`).join('\n')
            navigator.clipboard.writeText(text)
            showToast('Seluruh kredensial akun berhasil disalin ke clipboard!', 'success')
          }}><i className="fa-solid fa-copy"></i> Salin Seluruh Akun</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Tutup</button>
        </div>
      </div>
    </div>
  )
}

function ViewContent({ view, session, can, onNavigate, onTriggerStatus, onConfirm, onGenAccounts, showToast, onRefresh }) {
  const isKpu = session.role === 'super_admin'
  const isPrimary = session.isPrimary === true
  const status = getElectionStatus()

  // HTTP 403 guard
  if (isKpu && ['dpt', 'kandidat', 'rekap'].includes(view)) {
    return (
      <div className="panel glass denied" style={{ borderTop: '4px solid var(--danger)', maxWidth: '680px', margin: '30px auto', textAlign: 'center', padding: '36px 28px' }}>
        <div style={{ width: '68px', height: '68px', borderRadius: '20px', background: 'rgba(184,59,59,.12)', color: 'var(--danger)', display: 'grid', placeItems: 'center', fontSize: '32px', margin: '0 auto 16px' }}>
          <i className="fa-solid fa-ban"></i>
        </div>
        <span className="badge tone-danger" style={{ fontSize: '12px', letterSpacing: '.08em', marginBottom: '12px' }}>HTTP 403 · ACCESS FORBIDDEN</span>
        <h2 style={{ fontSize: '22px', color: 'var(--navy)', marginBottom: '10px' }}>Akses Ditolak: Batasan Kritis Super Admin (KPU)</h2>
        <p style={{ fontSize: '14.5px', lineHeight: '1.6', color: 'var(--text)', marginBottom: '16px' }}>
          Sesuai regulasi <strong>RBAC</strong>, peran <strong>Super Admin (KPU)</strong> <span style={{ color: 'var(--danger)', fontWeight: '700' }}>DILARANG KERAS</span> mengakses data operasional pemilu sekolah (DPT, kandidat, dan rincian hasil pemilu).
        </p>
        <div className="btn-row" style={{ justifyContent: 'center' }}>
          <button className="btn btn-primary" type="button" onClick={() => onNavigate('ringkasan')}><i className="fa-solid fa-gauge-high"></i> Dashboard Utama KPU</button>
        </div>
      </div>
    )
  }

  if (!can(view)) {
    return (
      <div className="panel glass denied" style={{ maxWidth: '680px', margin: '30px auto', textAlign: 'center', padding: '36px 28px' }}>
        <i className="fa-solid fa-user-lock" style={{ fontSize: '30px', color: '#cbbfb8', marginBottom: '10px', display: 'block' }}></i>
        <h2>Akses tidak tersedia</h2>
        <p>Menu ini tidak termasuk dalam hak akses peran Anda.</p>
        <button className="btn btn-primary" style={{ marginTop: '16px' }} type="button" onClick={() => onNavigate('ringkasan')}><i className="fa-solid fa-arrow-left"></i> Dashboard Utama</button>
      </div>
    )
  }

  const handlers = { onTriggerStatus, onConfirm, onGenAccounts, showToast, onRefresh, session, isKpu, isPrimary, status }

  switch (view) {
    case 'ringkasan': return <ViewRingkasan {...handlers} />
    case 'pengajuan': return <ViewPengajuan {...handlers} />
    case 'monitoring': return <ViewMonitoring {...handlers} />
    case 'tahapan': return <ViewTahapan {...handlers} />
    case 'dpt': return <ViewDpt {...handlers} />
    case 'kandidat': return <ViewKandidat {...handlers} />
    case 'jadwal': return <ViewJadwal {...handlers} />
    case 'rekap': return <ViewRekap {...handlers} />
    case 'akun_sekolah': return <ViewAkunSekolah {...handlers} />
    case 'pengaturan': return <ViewPengaturan {...handlers} />
    default: return null
  }
}

/* ======== Semua sub-view admin ======== */

function ViewRingkasan({ isKpu, isPrimary, status, onTriggerStatus, onConfirm, onGenAccounts, showToast, onRefresh, session }) {

  const regs = getRegistrations()
  const accounts = getAccounts()
  const votes = getTotalVotes()
  const totalDpt = getTotalVoters()
  const candidates = getCandidates()
  const tokens = getTokens()
  const dptLocked = isDptLocked()
  const candLocked = isCandidatesLocked()
  const [localRegOpen, setLocalRegOpen] = useState(isRegistrationOpen())

  if (isKpu) {
    const totalAccounts = Object.keys(accounts).length
    const regOpen = isRegistrationOpen()
    const approvedRegs = regs.filter(r => r.status === 'approved')
    const pendingRegs = regs.filter(r => !r.status || r.status === 'pending')
    return (
      <div>
        <div className="view-head">
          <h2>Dashboard Pengawasan &amp; Regulasi KPU</h2>
          <p>Pengelolaan pendaftaran sekolah, penerbitan akun panitia, dan pengawasan siklus pemilu OSIS.</p>
        </div>
        <div className="grid-stats">
          {[
            { k: 'fa-door-open', label: 'Pendaftaran Sekolah', v: localRegOpen ? 'Dibuka' : 'Ditutup', s: 'Status formulir publik' },
            { k: 'fa-school', label: 'Total Pengajuan', v: regs.length, s: `${pendingRegs.length} menunggu review` },
            { k: 'fa-circle-check', label: 'Sekolah Disetujui', v: approvedRegs.length, s: 'Telah menerima akun' },
            { k: 'fa-users-line', label: 'Total Akun Panitia', v: totalAccounts, s: '5 akun per sekolah disetujui' }
          ].map(s => (
            <div key={s.label} className="stat glass">
              <div className="k"><i className={`fa-solid ${s.k}`}></i> {s.label}</div>
              <div className="v">{s.v}</div>
              <div className="s">{s.s}</div>
            </div>
          ))}
        </div>
        <section className="panel glass">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
            <div><h2>Kontrol Cepat Pengawasan KPU</h2></div>
            <div className="switch-row" style={{ background: '#fff', padding: '8px 14px', borderRadius: '12px', border: '1px solid rgba(61,8,8,.1)' }}>
              <span style={{ fontSize: '13.5px' }}>Formulir Pendaftaran: <strong>{localRegOpen ? 'DIBUKA' : 'DITUTUP'}</strong></span>
              <label className="switch">
                <input type="checkbox" checked={localRegOpen} onChange={e => { setRegistrationOpen(e.target.checked); setLocalRegOpen(e.target.checked); showToast(`Formulir pendaftaran ${e.target.checked ? 'DIBUKA' : 'DITUTUP'}.`, 'success') }} />
                <span className="track"></span>
              </label>
            </div>
          </div>
          <div className="btn-row">
            <button className="btn btn-danger btn-sm" type="button" onClick={() => onConfirm({
              title: 'Eksekusi Data Cleanup KPU?',
              text: 'Data operasional bilik suara dan token akan diarsipkan dan dibersihkan.',
              confirmLabel: 'Ya, Eksekusi Cleanup', danger: true,
              onConfirm: () => { executeDataCleanup(); showToast('Data cleanup berhasil dieksekusi.', 'success'); onRefresh(); onConfirm(null) }
            })}>
              <i className="fa-solid fa-broom"></i> Eksekusi Data Cleanup
            </button>
          </div>
        </section>
        <section className="panel glass">
          <h2>Pengajuan Pendaftaran Sekolah Terbaru</h2>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>ID</th><th>Nama Sekolah</th><th>NPSN</th><th>Status</th><th>Aksi KPU</th></tr></thead>
              <tbody>
                {regs.length ? regs.slice(0, 5).map(r => {
                  const st = r.status || 'pending'
                  const stM = { pending: { label: 'Menunggu', tone: 'warning' }, approved: { label: 'Disetujui', tone: 'success' }, rejected: { label: 'Ditolak', tone: 'danger' } }[st]
                  return (
                    <tr key={r.id}>
                      <td className="mono"><strong>{r.id}</strong></td>
                      <td><strong>{r.schoolName}</strong></td>
                      <td className="mono">{r.npsn}</td>
                      <td><span className={`badge tone-${stM.tone}`}>{stM.label}</span></td>
                      <td>
                        {st !== 'approved' ? (
                          <button className="btn btn-success btn-xs" type="button" onClick={() => {
                            updateRegistrationStatus(r.id, 'approved')
                            const accs = generateSchoolAccounts(r)
                            onGenAccounts({ schoolName: r.schoolName, accounts: accs })
                            showToast(`${r.schoolName} disetujui & 5 akun diterbitkan!`, 'success')
                            onRefresh()
                          }}><i className="fa-solid fa-check"></i> Setujui &amp; Buat 5 Akun</button>
                        ) : <span className="muted" style={{ fontSize: '12px' }}><i className="fa-solid fa-circle-check" style={{ color: 'var(--success)' }}></i> 5 Akun aktif</span>}
                      </td>
                    </tr>
                  )
                }) : <tr><td colSpan="5" className="empty">Belum ada pengajuan.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    )
  }

  // Admin Sekolah
  const rank = statusRank(status)
  const next = STATUS_ORDER[rank + 1]
  const prev = STATUS_ORDER[rank - 1]
  return (
    <div>
      <div className="view-head">
        <h2>Dashboard Pemilihan OSIS</h2>
        <p>{session.schoolName || 'Panitia Pemilihan Sekolah'} · Pantau data pemilih, kandidat, dan suara masuk.</p>
      </div>
      <div className="grid-stats">
        {[
          { k: 'fa-id-card', label: 'Total DPT', v: totalDpt.toLocaleString('id-ID'), s: dptLocked ? '🔒 DPT Terkunci' : '🔓 Terbuka' },
          { k: 'fa-check-to-slot', label: 'Suara Masuk', v: votes.toLocaleString('id-ID'), s: formatPercent(votes, totalDpt) + ' partisipasi' },
          { k: 'fa-users', label: 'Pasangan Calon', v: candidates.length, s: candLocked ? '🔒 Paslon Terkunci' : '🔓 Terbuka' },
          { k: 'fa-ticket', label: 'Token Pemilih', v: tokens.length, s: tokens.filter(t => t.isUsed).length + ' telah dicoblos' }
        ].map(s => (
          <div key={s.label} className="stat glass">
            <div className="k"><i className={`fa-solid ${s.k}`}></i> {s.label}</div>
            <div className="v">{s.v}</div>
            <div className="s">{s.s}</div>
          </div>
        ))}
      </div>
      <section className="panel glass">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div><h2>Status &amp; Kontrol Tahapan Pemilu</h2></div>
          {!isPrimary && <span className="badge tone-warning"><i className="fa-solid fa-lock"></i> Transisi Status: Hanya Admin Utama</span>}
        </div>
        <div className="status-hero">
          <div className="state-icon"><i className={`fa-solid ${STATUS_META[status].icon}`}></i></div>
          <div className="txt">
            <StatusBadge status={status} showCode />
            <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '6px' }}>{STATUS_META[status].desc}</p>
          </div>
        </div>
        {isPrimary && (
          <div className="btn-row" style={{ marginTop: '18px' }}>
            {status === 'SETUP' && <button className="btn btn-primary" type="button" onClick={() => onTriggerStatus('ACTIVE')}><i className="fa-solid fa-bolt"></i> Mulai Pemungutan Suara</button>}
            {status === 'ACTIVE' && <button className="btn btn-danger" type="button" onClick={() => onTriggerStatus('CLOSED')}><i className="fa-solid fa-lock"></i> Tutup Sesi Pemungutan</button>}
            {status === 'CLOSED' && <button className="btn btn-primary" type="button" onClick={() => onTriggerStatus('FINALIZED')}><i className="fa-solid fa-clipboard-check"></i> Finalisasi Hasil</button>}
            {status === 'FINALIZED' && <button className="btn btn-primary" type="button" onClick={() => onTriggerStatus('PUBLISHED')}><i className="fa-solid fa-bullhorn"></i> Publikasikan Hasil</button>}
          </div>
        )}
      </section>
      <section className="panel glass">
        <h2>Alur Tahapan Pemilihan</h2>
        <StatusStepper status={status} admStyle />
      </section>
    </div>
  )
}

function ViewPengajuan({ onGenAccounts, showToast, onRefresh }) {
  const [items, setItems] = useState(() => getRegistrations())
  const open = isRegistrationOpen()
  const [regOpen, setRegOpenLocal] = useState(open)

  function refresh() { setItems(getRegistrations()) }

  return (
    <div>
      <div className="view-head"><h2>Pengajuan Pendaftaran Sekolah</h2><p>Daftar sekolah yang mengajukan partisipasi.</p></div>
      <div className="toolbar">
        <div className="switch-row" style={{ background: '#fff', padding: '8px 14px', borderRadius: '12px', border: '1px solid rgba(61,8,8,.1)' }}>
          <span>Pendaftaran: <strong>{regOpen ? 'DIBUKA' : 'DITUTUP'}</strong></span>
          <label className="switch">
            <input type="checkbox" checked={regOpen} onChange={e => { setRegistrationOpen(e.target.checked); setRegOpenLocal(e.target.checked); showToast(e.target.checked ? 'Pendaftaran DIBUKA.' : 'Pendaftaran DITUTUP.', 'success') }} />
            <span className="track"></span>
          </label>
        </div>
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>No. Pengajuan</th><th>Sekolah</th><th>NPSN</th><th>Penanggung Jawab</th><th>Status</th><th>Aksi KPU</th></tr></thead>
          <tbody>
            {items.length ? items.map((r) => {
              const st = r.status || 'pending'
              const stM = { pending: { label: 'Menunggu', tone: 'warning' }, approved: { label: 'Disetujui', tone: 'success' }, rejected: { label: 'Ditolak', tone: 'danger' } }[st]
              return (
                <tr key={r.id}>
                  <td className="mono"><strong>{r.id}</strong></td>
                  <td><strong>{r.schoolName}</strong><br /><small>{formatDate(r.submittedAt)}</small></td>
                  <td className="mono">{r.npsn}</td>
                  <td>{r.picName}</td>
                  <td><span className={`badge tone-${stM.tone}`}>{stM.label}</span></td>
                  <td>
                    <div className="btn-row" style={{ flexWrap: 'nowrap' }}>
                      {st !== 'approved' && <button className="btn btn-success btn-xs" type="button" onClick={() => {
                        updateRegistrationStatus(r.id, 'approved')
                        const accs = generateSchoolAccounts(r)
                        onGenAccounts({ schoolName: r.schoolName, accounts: accs })
                        showToast(`${r.schoolName} disetujui!`, 'success')
                        refresh()
                      }}><i className="fa-solid fa-check"></i> Setujui &amp; 5 Akun</button>}
                      {st !== 'rejected' && <button className="btn btn-ghost btn-xs" type="button" onClick={() => { updateRegistrationStatus(r.id, 'rejected'); showToast('Pengajuan ditolak.', 'info'); refresh() }}><i className="fa-solid fa-xmark" style={{ color: 'var(--danger)' }}></i> Tolak</button>}
                    </div>
                  </td>
                </tr>
              )
            }) : <tr><td colSpan="6"><div className="empty"><i className="fa-solid fa-inbox"></i><strong>Belum ada pengajuan sekolah</strong></div></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ViewMonitoring({ status, showToast }) {
  const logs = getAuditLogs()
  return (
    <div>
      <div className="view-head"><h2>Monitoring Tahapan Pemilu KPU</h2><p>Supervisi tahapan makro pemilihan.</p></div>
      <section className="panel glass">
        <h2>Status Siklus Pemilihan</h2>
        <div className="status-hero">
          <div className="state-icon"><i className={`fa-solid ${STATUS_META[status].icon}`}></i></div>
          <div className="txt"><StatusBadge status={status} showCode /><p style={{ color: 'var(--muted)', marginTop: '6px' }}>{STATUS_META[status].desc}</p></div>
        </div>
      </section>
      <section className="panel glass">
        <h2>Alur Tahapan Pemilu</h2>
        <StatusStepper status={status} admStyle />
      </section>
      <section className="panel glass">
        <h2>Log Audit (Terbaru)</h2>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Waktu</th><th>Aksi</th><th>Keterangan</th></tr></thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '12.5px' }}>{formatDate(l.timestamp)}</td>
                  <td><span className="badge tone-info">{l.action}</span></td>
                  <td>{l.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function ViewTahapan({ isPrimary, status, onTriggerStatus, onRefresh }) {
  const rank = statusRank(status)
  const next = STATUS_ORDER[rank + 1]
  const prev = STATUS_ORDER[rank - 1]
  const [selectStatus, setSelectStatus] = useState(status)

  const STATUS_EFFECT = {
    READY: ['Beranda menampilkan "Siap"; pemilihan belum dimulai.', 'Verifikasi siswa & bilik suara belum dibuka.'],
    PENDING: ['Beranda menampilkan "Menunggu Persetujuan".'],
    SETUP: ['Beranda menampilkan "Persiapan".', 'Panitia dapat mengelola DPT dan kandidat.'],
    ACTIVE: ['Verifikasi siswa & Bilik Suara Digital DIBUKA PENUH.', 'Pemilih dapat memberikan suara.'],
    CLOSED: ['Verifikasi dan Bilik Suara DITUTUP.'],
    FINALIZED: ['Rekapitulasi final; menunggu publikasi resmi.'],
    PUBLISHED: ['Hasil resmi dan perolehan suara tampil di portal publik.'],
    CLEANUP: ['Pemilihan selesai; seluruh tahapan telah dilalui.']
  }

  return (
    <div>
      <div className="view-head"><h2>Kontrol Tahapan Pemilihan</h2></div>
      {!isPrimary && (
        <div className="notice"><i className="fa-solid fa-lock"></i><span><strong>Batasan Kritis:</strong> Anda Admin Pendukung. Transisi status dinonaktifkan.</span></div>
      )}
      <section className="panel glass">
        <h2>Status Pemilu Saat Ini</h2>
        <div className="status-hero">
          <div className="state-icon"><i className={`fa-solid ${STATUS_META[status].icon}`}></i></div>
          <div className="txt"><StatusBadge status={status} showCode /><p style={{ color: 'var(--muted)', marginTop: '6px' }}>{STATUS_META[status].desc}</p></div>
        </div>
        <div className="btn-row" style={{ marginTop: '18px' }}>
          <button className="btn btn-ghost" type="button" disabled={!isPrimary || !prev} onClick={() => onTriggerStatus(prev)}>
            <i className="fa-solid fa-arrow-left"></i> {prev ? `Kembali ke ${prev}` : 'Tahap awal'}
          </button>
          <button className="btn btn-primary" type="button" disabled={!isPrimary || !next} onClick={() => onTriggerStatus(next)}>
            {next ? `Lanjut ke ${next} · ${STATUS_META[next]?.label}` : 'Tahap akhir'} <i className="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      </section>
      <div className="two">
        <section className="panel glass">
          <h2>Dampak Status {status}</h2>
          <ul className="effect">
            {(STATUS_EFFECT[status] || []).map((t, i) => <li key={i}><i className="fa-solid fa-circle-check"></i><span>{t}</span></li>)}
          </ul>
        </section>
        <section className="panel glass">
          <h2>Transisi Langsung (Admin Utama)</h2>
          <div className="field">
            <label htmlFor="statusSelect">Tahapan Pemilu</label>
            <select id="statusSelect" disabled={!isPrimary} value={selectStatus} onChange={e => setSelectStatus(e.target.value)}>
              {STATUS_ORDER.map(s => <option key={s} value={s}>{s} — {STATUS_META[s].label}</option>)}
            </select>
          </div>
          <button className="btn btn-primary btn-block" type="button" disabled={!isPrimary} onClick={() => onTriggerStatus(selectStatus)}>
            <i className="fa-solid fa-check"></i> Terapkan Perubahan
          </button>
        </section>
      </div>
      <section className="panel glass">
        <h2>Alur Tahapan Pemilu</h2>
        <StatusStepper status={status} admStyle />
      </section>
    </div>
  )
}

function ViewDpt({ isPrimary, onConfirm, showToast, onRefresh }) {
  const [dptList, setDptList] = useState(() => getDpt())
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const dptLocked = isDptLocked()

  // Form tambah pemilih
  const [addForm, setAddForm] = useState(null)
  const [addData, setAddData] = useState({ name: '', nisn: '', dob: '', classLabel: '' })
  const [addError, setAddError] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [importCsv, setImportCsv] = useState('')
  const [importError, setImportError] = useState('')

  function refresh() { setDptList(getDpt()) }

  const filtered = dptList.filter(v => {
    const q = search.toLowerCase()
    const matchQ = !q || [v.name, v.nisn, v.classLabel].some(x => String(x).toLowerCase().includes(q))
    const matchStatus = filterStatus === 'all' ? true : filterStatus === 'voted' ? v.hasVoted : !v.hasVoted
    return matchQ && matchStatus
  })

  return (
    <div>
      <div className="view-head">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2>Daftar Pemilih Tetap (DPT)</h2>
            <p>Manajemen siswa yang memiliki hak suara.</p>
          </div>
          <div className="btn-row">
            {dptLocked ? <span className="badge tone-success"><i className="fa-solid fa-lock"></i> DPT Terkunci</span> : <span className="badge tone-warning"><i className="fa-solid fa-lock-open"></i> DPT Terbuka</span>}
            {isPrimary && <button className="btn btn-ghost btn-sm" type="button" onClick={() => onConfirm({
              title: dptLocked ? 'Buka Kunci DPT?' : 'Kunci DPT?',
              text: dptLocked ? 'Kunci DPT dibuka kembali.' : 'Setelah dikunci, penambahan atau penghapusan pemilih dinonaktifkan.',
              confirmLabel: dptLocked ? 'Buka Kunci' : 'Kunci Sekarang',
              onConfirm: () => { setDptLocked(!dptLocked); showToast(dptLocked ? 'Kunci DPT dibuka.' : 'DPT dikunci.', 'success'); onRefresh(); onConfirm(null) }
            })}>
              <i className={`fa-solid fa-${dptLocked ? 'lock-open' : 'lock'}`}></i> {dptLocked ? 'Buka Kunci' : 'Kunci DPT'}
            </button>}
            <button className="btn btn-primary btn-sm" type="button" disabled={dptLocked} onClick={() => setAddForm(true)}>
              <i className="fa-solid fa-user-plus"></i> Tambah Pemilih
            </button>
            {isPrimary && <button className="btn btn-ghost btn-sm" type="button" disabled={dptLocked} onClick={() => setImportOpen(true)}><i className="fa-solid fa-file-import"></i> Impor DPT</button>}
          </div>
        </div>
      </div>
      <div className="toolbar">
        <div className="input-wrap" style={{ flex: 1, minWidth: '220px', maxWidth: '360px' }}>
          <i className="fa-solid fa-magnifying-glass"></i>
          <input type="search" placeholder="Cari nama, NISN, atau kelas..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="btn-row" style={{ flex: 'none' }}>
          <select style={{ padding: '8px 12px', borderRadius: '12px', border: '1.5px solid rgba(37,35,35,.14)', background: '#fff', font: 'inherit', fontSize: '14px' }}
            value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">Semua Status</option>
            <option value="unvoted">Belum Memilih</option>
            <option value="voted">Sudah Memilih</option>
          </select>
          <span className="muted" style={{ fontSize: '13.5px' }}>{filtered.length} dari {dptList.length} data</span>
        </div>
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Nama Lengkap</th><th>NISN</th><th>Tanggal Lahir</th><th>Kelas</th><th>Hak Pilih</th><th>Aksi</th></tr></thead>
          <tbody>
            {filtered.length ? filtered.map(v => (
              <tr key={v.nisn}>
                <td><strong>{v.name}</strong></td>
                <td className="mono">{v.nisn}</td>
                <td className="mono">{v.dob}</td>
                <td>{v.classLabel}</td>
                <td><span className={`badge tone-${v.hasVoted ? 'info' : 'success'}`}>{v.hasVoted ? 'Sudah memilih' : 'Belum memilih'}</span></td>
                <td>
                  <div className="btn-row" style={{ flexWrap: 'nowrap' }}>
                    {v.hasVoted && isPrimary && <button className="btn btn-ghost btn-xs" type="button" onClick={() => { updateVoterStatus(v.nisn, false); showToast('Status direset.', 'success'); refresh() }}><i className="fa-solid fa-arrow-rotate-left"></i> Reset</button>}
                    {!dptLocked && isPrimary && <button className="btn btn-ghost btn-xs" type="button" onClick={() => onConfirm({
                      title: 'Hapus pemilih?', text: `Data ${v.name} akan dihapus dari DPT.`, confirmLabel: 'Hapus', danger: true,
                      onConfirm: () => { deleteVoter(v.nisn); showToast('Pemilih dihapus.', 'success'); refresh(); onConfirm(null) }
                    })}><i className="fa-solid fa-trash" style={{ color: 'var(--danger)' }}></i></button>}
                  </div>
                </td>
              </tr>
            )) : <tr><td colSpan="6"><div className="empty"><i className="fa-solid fa-user-slash"></i><strong>Data tidak ditemukan</strong></div></td></tr>}
          </tbody>
        </table>
      </div>

      {/* Modal Tambah Pemilih */}
      {addForm && (
        <div className="dlg-back" onClick={(e) => { if (e.target === e.currentTarget) setAddForm(null) }}>
          <div className="dlg" style={{ maxWidth: '480px' }}>
            <h3><i className="fa-solid fa-user-plus"></i> Tambah Pemilih Baru (DPT)</h3>
            {addError && <div className="alert alert-warning">{addError}</div>}
            <form onSubmit={e => {
              e.preventDefault()
              if (!addData.name || addData.name.length < 3) { setAddError('Nama minimal 3 karakter.'); return }
              const ne = validateNisn(addData.nisn)
              if (ne) { setAddError(ne); return }
              const de = validateDob(addData.dob)
              if (de) { setAddError(de); return }
              if (!addData.classLabel) { setAddError('Kelas wajib diisi.'); return }
              const res = addVoter(addData)
              if (!res.success) { setAddError(res.message); return }
              setAddForm(null)
              showToast(`Pemilih ${addData.name} ditambahkan ke DPT.`, 'success')
              setAddData({ name: '', nisn: '', dob: '', classLabel: '' })
              refresh()
            }}>
              {[['name', 'Nama Lengkap Siswa', 'text', 'fa-user'], ['nisn', 'NISN (10 Digit)', 'text', 'fa-hashtag'], ['dob', 'Tanggal Lahir (DD/MM/YYYY)', 'text', 'fa-calendar'], ['classLabel', 'Kelas', 'text', 'fa-chalkboard']].map(([field, label, type, icon]) => (
                <div key={field} className="field">
                  <label>{label}</label>
                  <div className="input-wrap"><i className={`fa-solid ${icon}`}></i><input type={type} value={addData[field]} onChange={e => setAddData(prev => ({ ...prev, [field]: e.target.value }))} required /></div>
                </div>
              ))}
              <div className="btn-row" style={{ marginTop: '20px' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setAddForm(null)}>Batal</button>
                <button type="submit" className="btn btn-primary"><i className="fa-solid fa-save"></i> Simpan ke DPT</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Impor DPT */}
      {importOpen && (
        <div className="dlg-back" onClick={(e) => { if (e.target === e.currentTarget) setImportOpen(false) }}>
          <div className="dlg" style={{ maxWidth: '580px' }}>
            <h3><i className="fa-solid fa-file-import"></i> Impor Data Siswa (DPT)</h3>
            {importError && <div className="alert alert-danger">{importError}</div>}
            <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--muted)' }}>Satu baris per siswa: Nama, NISN, DD/MM/YYYY, Kelas</span>
              <button type="button" className="btn btn-ghost btn-xs" onClick={() => setImportCsv('Farhan Ramadhan, 0098765421, 10/05/2009, X IPA 1\nNabila Aurelia, 0098765422, 18/08/2009, X IPA 2')}>
                <i className="fa-solid fa-wand-magic-sparkles"></i> Muat Sampel
              </button>
            </div>
            <textarea rows="7" style={{ width: '100%', fontFamily: 'monospace', fontSize: '13px', padding: '10px', borderRadius: '12px', border: '1.5px solid rgba(37,35,35,.14)' }}
              placeholder="Contoh:&#10;Andi Saputra, 0098765401, 12/03/2009, X IPA 1" value={importCsv} onChange={e => setImportCsv(e.target.value)}></textarea>
            <div className="btn-row" style={{ marginTop: '16px' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setImportOpen(false)}>Batal</button>
              <button type="button" className="btn btn-primary" onClick={() => {
                const lines = importCsv.trim().split('\n').map(l => l.trim()).filter(Boolean)
                const items = lines.map(line => { const p = line.split(',').map(x => x.trim()); return { name: p[0], nisn: p[1], dob: p[2], classLabel: p[3] || 'Umum' } })
                if (!items.length) { setImportError('Format tidak valid.'); return }
                const res = importDptBatch(items)
                if (!res.success) { setImportError(res.message); return }
                setImportOpen(false)
                showToast(`Impor selesai: ${res.added} siswa ditambahkan!`, 'success')
                refresh()
              }}><i className="fa-solid fa-upload"></i> Proses Impor</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ViewKandidat({ isPrimary, onConfirm, showToast, onRefresh }) {
  const [candidates, setCandidates] = useState(() => getCandidates())
  const candLocked = isCandidatesLocked()
  const [candForm, setCandForm] = useState(null) // null | { editing: number|null, data: {...} }
  const [candAlert, setCandAlert] = useState('')

  function refresh() { setCandidates(getCandidates()) }

  function openAdd() {
    setCandForm({ editing: null, data: { chair: '', chairClass: '', viceChair: '', viceClass: '', vision: '', missions: '', programs: '' } })
    setCandAlert('')
  }

  function openEdit(c) {
    setCandForm({ editing: c.number, data: { chair: c.chair, chairClass: c.chairClass, viceChair: c.viceChair, viceClass: c.viceClass, vision: c.vision, missions: (c.missions || []).join('\n'), programs: (c.programs || []).join(', ') } })
    setCandAlert('')
  }

  function handleSave(e) {
    e.preventDefault()
    const { editing, data } = candForm
    if (!data.chair || !data.viceChair || !data.vision || !data.missions) { setCandAlert('Seluruh data wajib diisi.'); return }
    if (editing !== null) {
      const res = updateCandidate(editing, data)
      if (!res.success) { setCandAlert(res.message); return }
      showToast(`Data paslon nomor urut ${editing} diperbarui.`, 'success')
    } else {
      const res = addCandidate(data)
      if (!res.success) { setCandAlert(res.message); return }
      showToast(`Paslon nomor urut ${res.candidate.number} ditambahkan!`, 'success')
    }
    setCandForm(null)
    refresh()
  }

  return (
    <div>
      <div className="view-head">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div><h2>Manajemen Pasangan Calon (Kandidat)</h2></div>
          <div className="btn-row">
            {candLocked ? <span className="badge tone-success"><i className="fa-solid fa-lock"></i> Paslon Terkunci</span> : <span className="badge tone-warning"><i className="fa-solid fa-lock-open"></i> Paslon Terbuka</span>}
            {isPrimary && <button className="btn btn-ghost btn-sm" type="button" onClick={() => onConfirm({
              title: candLocked ? 'Buka Kunci Kandidat?' : 'Kunci Data Pasangan Calon?',
              confirmLabel: candLocked ? 'Buka Kunci' : 'Kunci Sekarang',
              text: candLocked ? 'Kunci kandidat dibuka kembali.' : 'Data pasangan calon tidak dapat disunting setelah dikunci.',
              onConfirm: () => { setCandidatesLocked(!candLocked); showToast(candLocked ? 'Kunci kandidat dibuka.' : 'Data kandidat dikunci.', 'success'); onRefresh(); onConfirm(null) }
            })}>
              <i className={`fa-solid fa-${candLocked ? 'lock-open' : 'lock'}`}></i> {candLocked ? 'Buka Kunci' : 'Kunci Kandidat'}
            </button>}
            <button className="btn btn-primary btn-sm" type="button" disabled={candLocked} onClick={openAdd}><i className="fa-solid fa-user-plus"></i> Tambah Paslon</button>
          </div>
        </div>
      </div>
      <div className="candidate-grid">
        {candidates.map(c => (
          <div key={c.number} className="candidate-card glass">
            <div className="candidate-card-head">
              <div className="candidate-card-num">{String(c.number).padStart(2, '0')}</div>
              <div className="candidate-card-names">
                <h4>{c.chair} &amp; {c.viceChair}</h4>
                <small>{c.chairClass} · {c.viceClass}</small>
              </div>
            </div>
            <div className="candidate-card-body">
              <strong>Visi:</strong>
              <p style={{ marginTop: '4px', fontStyle: 'italic' }}>"{c.vision}"</p>
              <strong style={{ display: 'block', marginTop: '8px' }}>Misi:</strong>
              <ul style={{ paddingLeft: '16px', marginTop: '4px' }}>
                {(c.missions || []).slice(0, 3).map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </div>
            <div className="btn-row" style={{ justifyContent: 'space-between', borderTop: '1px solid rgba(61,8,8,.08)', paddingTop: '12px' }}>
              <span className="muted" style={{ fontSize: '12.5px' }}><i className="fa-solid fa-check-to-slot"></i> {Number(c.votes || 0).toLocaleString('id-ID')} suara</span>
              <div className="btn-row">
                <button className="btn btn-ghost btn-xs" type="button" disabled={candLocked} onClick={() => openEdit(c)}><i className="fa-solid fa-pen-to-square"></i> Edit</button>
                {isPrimary && <button className="btn btn-ghost btn-xs" type="button" disabled={candLocked} style={{ color: 'var(--danger)' }} onClick={() => onConfirm({
                  title: `Hapus Paslon No. ${c.number}?`, text: 'Data pasangan calon ini akan dihapus secara permanen.', confirmLabel: 'Hapus Paslon', danger: true,
                  onConfirm: () => { deleteCandidate(c.number); showToast(`Paslon nomor ${c.number} dihapus.`, 'success'); refresh(); onConfirm(null) }
                })}><i className="fa-solid fa-trash"></i> Hapus</button>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {candForm && (
        <div className="dlg-back" onClick={(e) => { if (e.target === e.currentTarget) setCandForm(null) }}>
          <div className="dlg" style={{ maxWidth: '580px' }}>
            <h3>{candForm.editing !== null ? `Edit Paslon No. ${candForm.editing}` : 'Tambah Pasangan Calon'}</h3>
            {candAlert && <div className="alert alert-warning">{candAlert}</div>}
            <form onSubmit={handleSave}>
              <div className="two">
                <div className="field"><label>Nama Calon Ketua</label><div className="input-wrap"><i className="fa-solid fa-user"></i><input type="text" value={candForm.data.chair} onChange={e => setCandForm(p => ({ ...p, data: { ...p.data, chair: e.target.value } }))} required /></div></div>
                <div className="field"><label>Kelas Ketua</label><div className="input-wrap"><i className="fa-solid fa-chalkboard"></i><input type="text" value={candForm.data.chairClass} onChange={e => setCandForm(p => ({ ...p, data: { ...p.data, chairClass: e.target.value } }))} required /></div></div>
              </div>
              <div className="two">
                <div className="field"><label>Nama Calon Wakil</label><div className="input-wrap"><i className="fa-solid fa-user-group"></i><input type="text" value={candForm.data.viceChair} onChange={e => setCandForm(p => ({ ...p, data: { ...p.data, viceChair: e.target.value } }))} required /></div></div>
                <div className="field"><label>Kelas Wakil</label><div className="input-wrap"><i className="fa-solid fa-chalkboard"></i><input type="text" value={candForm.data.viceClass} onChange={e => setCandForm(p => ({ ...p, data: { ...p.data, viceClass: e.target.value } }))} required /></div></div>
              </div>
              <div className="field"><label>Visi Pasangan Calon</label><textarea rows="2" style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid rgba(37,35,35,.14)', font: 'inherit', fontSize: '14.5px' }} value={candForm.data.vision} onChange={e => setCandForm(p => ({ ...p, data: { ...p.data, vision: e.target.value } }))} required></textarea></div>
              <div className="field"><label>Misi (Satu baris per misi)</label><textarea rows="3" style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1.5px solid rgba(37,35,35,.14)', font: 'inherit', fontSize: '14.5px' }} value={candForm.data.missions} onChange={e => setCandForm(p => ({ ...p, data: { ...p.data, missions: e.target.value } }))} required></textarea></div>
              <div className="btn-row" style={{ marginTop: '16px' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setCandForm(null)}>Batal</button>
                <button type="submit" className="btn btn-primary"><i className="fa-solid fa-floppy-disk"></i> Simpan Kandidat</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function ViewJadwal({ isPrimary, showToast, onRefresh }) {
  const s = getSchedule()
  const [form, setForm] = useState({ dateLabel: s.dateLabel, openTime: s.openTime || '07:30', closeTime: s.closeTime || '12:00', timeLabel: s.timeLabel })

  function handleSave(e) {
    e.preventDefault()
    saveSchedule(form)
    showToast('Jadwal pemilihan berhasil disimpan.', 'success')
    onRefresh()
  }

  return (
    <div>
      <div className="view-head"><h2>Pengaturan Jadwal Pemilihan</h2></div>
      <div className="two">
        <section className="panel glass">
          <h2>Formulir Jadwal Pemungutan Suara</h2>
          <form onSubmit={handleSave}>
            {[
              ['schedDateLabel', 'Label Tanggal Lengkap', 'dateLabel'],
              ['schedOpenTime', 'Jam Mulai', 'openTime'],
              ['schedCloseTime', 'Jam Selesai', 'closeTime'],
              ['schedTimeLabel', 'Label Jam Tampil', 'timeLabel'],
            ].map(([id, label, field]) => (
              <div key={id} className="field">
                <label htmlFor={id}>{label}</label>
                <input type="text" id={id} value={form[field]} disabled={!isPrimary} required onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} />
              </div>
            ))}
            {isPrimary ? (
              <button className="btn btn-primary" type="submit" style={{ marginTop: '18px' }}><i className="fa-solid fa-floppy-disk"></i> Simpan Jadwal</button>
            ) : <p className="muted" style={{ fontSize: '13px', marginTop: '14px' }}><i className="fa-solid fa-lock"></i> Hak Akses Terbatas: Hanya Admin Utama</p>}
          </form>
        </section>
        <section className="panel glass">
          <h2>Pratinjau Jadwal</h2>
          <div style={{ background: 'rgba(255,255,255,.9)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(61,8,8,.1)' }}>
            <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--navy)' }}><i className="fa-solid fa-calendar-day" style={{ color: 'var(--gold)' }}></i> {form.dateLabel}</div>
            <div style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '4px' }}><i className="fa-regular fa-clock"></i> Pukul {form.timeLabel}</div>
          </div>
        </section>
      </div>
    </div>
  )
}

function ViewRekap({ status, showToast }) {
  const votes = getTotalVotes()
  const totalDpt = getTotalVoters()
  const candidates = getCandidates()
  const maxVotes = Math.max(...candidates.map(c => Number(c.votes) || 0), 0)
  const voteLedger = getVotes()

  return (
    <div>
      <div className="view-head"><h2>Rekapitulasi Suara Real-time</h2></div>
      <div className="notice"><i className="fa-solid fa-circle-info"></i><span>Status saat ini: <strong>{status}</strong>. {status === 'PUBLISHED' ? 'Hasil resmi sudah tampil di portal publik.' : 'Hasil ini hanya terlihat oleh panitia.'}</span></div>
      <section className="panel glass">
        <div className="live-head">
          <h2>Perolehan Suara Pasangan Calon</h2>
          <span className={`badge tone-${STATUS_META[status].tone}`}><i className={`fa-solid ${STATUS_META[status].icon}`}></i>{STATUS_META[status].label}</span>
        </div>
        <p className="muted" style={{ marginTop: '6px' }}>Total suara sah: <strong>{votes.toLocaleString('id-ID')}</strong> dari {totalDpt.toLocaleString('id-ID')} pemilih ({formatPercent(votes, totalDpt)} partisipasi).</p>
        {candidates.map(c => {
          const v = Number(c.votes) || 0
          const isWinner = v === maxVotes && maxVotes > 0
          const pct = votes > 0 ? ((v / votes) * 100).toFixed(1) : 0
          return (
            <div key={c.number} className={`result-row${isWinner ? ' winner' : ''}`} style={{ marginTop: '16px' }}>
              <div className="result-top">
                <span><strong>{String(c.number).padStart(2, '0')}</strong> · {c.chair} &amp; {c.viceChair}</span>
                <span><strong>{v.toLocaleString('id-ID')} suara</strong> · {formatPercent(v, votes)}</span>
              </div>
              <div className="result-bar"><div style={{ width: `${pct}%` }}></div></div>
            </div>
          )
        })}
      </section>
      <section className="panel glass">
        <h2>Log Kotak Suara Digital (10 Suara Terakhir)</h2>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>ID Transaksi</th><th>Pilihan Paslon</th><th>Waktu Masuk</th><th>Status Suara</th></tr></thead>
            <tbody>
              {voteLedger.length ? voteLedger.slice(-10).reverse().map(vl => (
                <tr key={vl.id}>
                  <td className="mono">{vl.id}</td>
                  <td><span className="badge tone-info">Paslon {String(vl.candidateNumber).padStart(2, '0')}</span></td>
                  <td>{formatDate(vl.timestamp)}</td>
                  <td><span className="badge tone-success"><i className="fa-solid fa-check"></i> Sah (Anonim)</span></td>
                </tr>
              )) : <tr><td colSpan="4" className="empty">Belum ada suara yang masuk.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function ViewAkunSekolah({ isKpu, session, showToast }) {
  const allAccounts = getAccounts()
  const accList = Object.values(allAccounts)
  const filtered = isKpu ? accList : accList.filter(a => a.schoolNpsn === session.schoolNpsn || a.username === session.username)

  return (
    <div>
      <div className="view-head">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div><h2>Manajemen Akun Panitia (RBAC)</h2><p>{isKpu ? 'Daftar seluruh akun panitia yang diterbitkan KPU.' : 'Daftar 5 akun panitia sekolah Anda.'}</p></div>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => {
            const text = filtered.map(a => `${a.role === 'super_admin' ? '[KPU]' : a.isPrimary ? '[Admin Utama]' : '[Admin Pendukung]'} ${a.name} | User: ${a.username} | Pass: ${a.password}`).join('\n')
            navigator.clipboard.writeText(text)
            showToast('Kredensial akun disalin ke clipboard!', 'success')
          }}><i className="fa-solid fa-copy"></i> Salin Kredensial</button>
        </div>
      </div>
      <div className="notice"><i className="fa-solid fa-shield-halved"></i><span><strong>Struktur Peran:</strong> Admin Utama (is_primary = true) memiliki hak eksklusif transisi status pemilu.</span></div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Peran Sistem</th><th>Nama Pengguna</th><th>Username</th><th>Password</th><th>Sekolah</th><th>Status</th></tr></thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.username}>
                <td>{a.role === 'super_admin' ? <span className="badge tone-danger"><i className="fa-solid fa-shield"></i> Super Admin (KPU)</span> : a.isPrimary ? <span className="badge tone-warning"><i className="fa-solid fa-star"></i> Admin Utama</span> : <span className="badge tone-neutral"><i className="fa-solid fa-user-gear"></i> Admin Pendukung</span>}</td>
                <td><strong>{a.name}</strong><br /><small className="muted">{a.desc || ''}</small></td>
                <td className="mono"><code>{a.username}</code></td>
                <td className="mono"><code>{a.password}</code></td>
                <td>{a.schoolName || 'KPU Banyumas'}</td>
                <td><span className="badge tone-success">Aktif</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ViewPengaturan({ isKpu, onConfirm, showToast, onRefresh }) {
  return (
    <div>
      <div className="view-head"><h2>Pengaturan Sistem &amp; Cleanup</h2></div>
      {isKpu && (
        <section className="panel glass" style={{ borderLeft: '4px solid var(--danger)' }}>
          <h2>Eksekusi Data Cleanup KPU</h2>
          <p className="sub">Mengarsipkan rekaman suara dan token, mengembalikan bilik suara ke status bersih.</p>
          <button className="btn btn-danger" type="button" onClick={() => onConfirm({
            title: 'Eksekusi Data Cleanup KPU?',
            text: 'Data operasional akan diarsipkan dan dibersihkan. Status pemilu ke CLEANUP.',
            confirmLabel: 'Eksekusi Cleanup', danger: true,
            onConfirm: () => { executeDataCleanup(); showToast('Data cleanup dieksekusi.', 'success'); onRefresh(); onConfirm(null) }
          })}><i className="fa-solid fa-broom"></i> Eksekusi Data Cleanup KPU</button>
        </section>
      )}
      <section className="panel glass">
        <h2>Simulasi Suara Cepat</h2>
        <p className="sub">Lakukan simulasi pemungutan suara acak untuk menguji tampilan hasil.</p>
        <button className="btn btn-gold" type="button" onClick={() => {
          if (getElectionStatus() !== 'ACTIVE') {
            setElectionStatus('ACTIVE')
            showToast('Status diubah ke ACTIVE untuk simulasi.', 'info')
          }
          const count = simulateRandomVotes(8)
          showToast(`${count} suara simulasi berhasil dimasukkan!`, 'success')
          onRefresh()
        }}><i className="fa-solid fa-dice"></i> Lakukan Simulasi Suara (Acak)</button>
      </section>
      <section className="panel glass">
        <h2>Reset Perolehan Suara &amp; Token</h2>
        <p className="sub">Mereset suara kandidat ke 0 dan menghapus token pemilihan.</p>
        <button className="btn btn-ghost" type="button" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
          onClick={() => onConfirm({
            title: 'Reset seluruh perolehan suara & token?', text: 'Seluruh perolehan suara jadi 0 dan pemilih dapat memilih kembali.', confirmLabel: 'Reset Suara', danger: true,
            onConfirm: () => { resetVotesAndTokensOnly(); showToast('Suara dan token direset.', 'success'); onRefresh(); onConfirm(null) }
          })}>
          <i className="fa-solid fa-rotate-left"></i> Reset Suara &amp; Token
        </button>
      </section>
      <section className="panel glass">
        <h2>Cadangkan &amp; Pulihkan Data (JSON)</h2>
        <div className="btn-row">
          <button className="btn btn-primary" type="button" onClick={() => {
            const backup = { exportedAt: new Date().toISOString(), status: getElectionStatus(), candidates: getCandidates(), dpt: getDpt(), tokens: getTokens(), votes: getVotes(), registrations: getRegistrations(), accounts: getAccounts(), schedule: getSchedule(), regOpen: isRegistrationOpen() }
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
            const a = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = `evoting-backup-${new Date().toISOString().slice(0, 10)}.json`
            a.click()
            URL.revokeObjectURL(a.href)
            showToast('File data cadangan berhasil diunduh.', 'success')
          }}><i className="fa-solid fa-download"></i> Ekspor Data Cadangan (JSON)</button>
          <label className="btn btn-ghost" style={{ cursor: 'pointer', margin: 0 }}>
            <i className="fa-solid fa-upload"></i> Pulihkan Data (JSON)
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={e => {
              const file = e.target.files && e.target.files[0]
              if (!file) return
              const reader = new FileReader()
              reader.onload = ev => {
                try {
                  const data = JSON.parse(ev.target.result)
                  if (data.status) setElectionStatus(data.status)
                  if (Array.isArray(data.candidates)) saveCandidates(data.candidates)
                  if (Array.isArray(data.dpt)) saveDpt(data.dpt)
                  if (Array.isArray(data.tokens)) saveTokens(data.tokens)
                  if (Array.isArray(data.votes)) saveVotes(data.votes)
                  if (Array.isArray(data.registrations)) saveRegistrations(data.registrations)
                  if (data.accounts) saveAccounts(data.accounts)
                  if (data.schedule) saveSchedule(data.schedule)
                  if (typeof data.regOpen === 'boolean') setRegistrationOpen(data.regOpen)
                  showToast('Data cadangan berhasil dipulihkan.', 'success')
                  onRefresh()
                } catch { showToast('File JSON tidak valid atau rusak.', 'error') }
              }
              reader.readAsText(file)
            }} />
          </label>
        </div>
      </section>
    </div>
  )
}
