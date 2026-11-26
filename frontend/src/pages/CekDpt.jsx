import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useToast } from '../components/Toast'
import { electionApi } from '../services/api'
import {
  validateNisn, validateDob,
  getLockRemainingSeconds, registerFailedAttempt, resetAttempts,
  formatDate, maskNisn
} from '../store/store'

export default function CekDpt() {
  const showToast = useToast()
  const [nisn, setNisn] = useState('')
  const [dob, setDob] = useState('')
  const [nisnError, setNisnError] = useState('')
  const [dobError, setDobError] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(undefined)
  const [lockRemaining, setLockRemaining] = useState(0)
  const lockTimerRef = useRef(null)
  const [totalVoters, setTotalVoters] = useState(0)

  useEffect(() => {
    checkLock()
    Promise.allSettled([electionApi.turnout()]).then(([turnout]) => {
      if (turnout.status === 'fulfilled') setTotalVoters(Number(turnout.value.total_dpt) || 0)
    })
    return () => clearInterval(lockTimerRef.current)
  }, [])

  function checkLock() {
    const remaining = getLockRemainingSeconds()
    setLockRemaining(remaining)
    clearInterval(lockTimerRef.current)
    if (remaining > 0) {
      lockTimerRef.current = setInterval(() => {
        const r = getLockRemainingSeconds()
        setLockRemaining(r)
        if (r <= 0) clearInterval(lockTimerRef.current)
      }, 1000)
    }
  }

  function handleNisnInput(e) {
    const v = e.target.value.replace(/\D/g, '').slice(0, 10)
    setNisn(v)
  }

  function handleDobInput(e) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 8)
    const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean)
    setDob(parts.join('/'))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (lockRemaining > 0) return

    const ne = validateNisn(nisn)
    const de = validateDob(dob)
    setNisnError(ne)
    setDobError(de)
    if (ne || de) { showToast('Periksa kembali isian formulir.', 'warning'); return }

    setLoading(true)
    setResult(undefined)
    setResult(null)
    try {
      const response = await electionApi.checkDpt(nisn, dob)
      resetAttempts()
      setResult({ name: response.voter.name, nisn, classLabel: response.voter.class, hasVoted: response.voter.has_voted, votedAt: null })
    } catch (error) {
      registerFailedAttempt()
      setResult(null)
      if (error.response?.status >= 500) showToast('Layanan pengecekan DPT sedang bermasalah. Coba lagi.', 'error')
    }
    setLoading(false)
    checkLock()
  }


  return (
    <Layout>
      <nav className="container crumbs" aria-label="Posisi halaman">
        <Link to="/"><i className="fa-solid fa-arrow-left"></i> Beranda</Link>
        <span className="sep">/</span>
        <span aria-current="page">Cek DPT</span>
      </nav>
      <section className="container page-head reveal">
        <div className="eyebrow"><i className="fa-solid fa-id-card"></i> Daftar Pemilih Tetap</div>
        <h1>Cek Status Anda di DPT</h1>
        <p>Masukkan NISN dan tanggal lahir untuk memastikan Anda terdaftar sebagai pemilih pada pemilihan ini.</p>
      </section>

      <section className="container section" style={{ paddingTop: '12px' }}>
        <div className="two-col">
          <div className="reveal in">
            <div className="form-card glass">
              <h2>Pencarian Pemilih</h2>
              <p>Data hanya dipakai untuk pencocokan dan tidak ditampilkan penuh.</p>
              {lockRemaining > 0 && (
                <div className="alert alert-danger" role="alert">
                  <i className="fa-solid fa-lock"></i>
                  <span>Terlalu banyak percobaan gagal. Coba lagi dalam {lockRemaining} detik.</span>
                </div>
              )}
              <form onSubmit={handleSubmit} noValidate>
                <div className="field">
                  <label htmlFor="nisn">NISN</label>
                  <div className="input-wrap">
                    <i className="fa-solid fa-hashtag"></i>
                    <input
                      id="nisn" type="text" inputMode="numeric" maxLength="10"
                      autoComplete="off" placeholder="10 digit NISN"
                      value={nisn} onChange={handleNisnInput}
                      onBlur={() => setNisnError(nisn ? validateNisn(nisn) : '')}
                      className={nisnError ? 'invalid' : ''}
                      aria-invalid={nisnError ? 'true' : 'false'}
                    />
                  </div>
                  {nisnError && <p className="field-error show" role="alert">{nisnError}</p>}
                </div>
                <div className="field">
                  <label htmlFor="dob">Tanggal Lahir</label>
                  <div className="input-wrap">
                    <i className="fa-regular fa-calendar"></i>
                    <input
                      id="dob" type="text" inputMode="numeric" maxLength="10"
                      autoComplete="off" placeholder="DD/MM/YYYY"
                      value={dob} onChange={handleDobInput}
                      onBlur={() => setDobError(dob ? validateDob(dob) : '')}
                      className={dobError ? 'invalid' : ''}
                      aria-invalid={dobError ? 'true' : 'false'}
                    />
                  </div>
                  {dobError && <p className="field-error show" role="alert">{dobError}</p>}
                </div>
                <button className="btn btn-primary btn-block" type="submit" disabled={loading || lockRemaining > 0}>
                  {loading ? <><span className="spinner"></span> <span>Memeriksa...</span></> : <><i className="fa-solid fa-magnifying-glass"></i> <span>Cek Status</span></>}
                </button>
              </form>
            </div>

            {result !== undefined && result !== null && (
              <div className="result-card glass" style={{ marginTop: '18px' }}>
                <div className={`result-icon ${result.hasVoted ? 'voted' : 'ok'}`}>
                  <i className={`fa-solid ${result.hasVoted ? 'fa-check-double' : 'fa-circle-check'}`}></i>
                </div>
                <h3>{result.hasVoted ? 'Sudah Menggunakan Hak Pilih' : 'Terdaftar sebagai Pemilih Tetap'}</h3>
                <p>{result.hasVoted ? 'Hak suara Anda telah tersimpan di kotak suara digital.' : 'Anda terdaftar di DPT dan berhak memberikan suara.'}</p>
                <div className="result-list">
                  <div><span>Nama</span><strong>{result.name}</strong></div>
                  <div><span>NISN</span><strong>{maskNisn(result.nisn)}</strong></div>
                  <div><span>Kelas</span><strong>{result.classLabel}</strong></div>
                  <div><span>Status DPT</span><strong><span className="badge tone-success">Terdaftar</span></strong></div>
                  <div><span>Hak Pilih</span><strong><span className={`badge tone-${result.hasVoted ? 'info' : 'success'}`}>{result.hasVoted ? 'Sudah memilih' : 'Belum memilih'}</span></strong></div>
                  {result.votedAt && <div><span>Waktu Memilih</span><strong>{formatDate(result.votedAt)}</strong></div>}
                </div>
                {result.hasVoted ? (
                  <div className="alert alert-info" style={{ textAlign: 'left', marginBottom: '12px' }}>
                    <i className="fa-solid fa-circle-check"></i>
                    <span>Anda telah menggunakan hak pilih pada <strong>{formatDate(result.votedAt)}</strong>. Terima kasih!</span>
                  </div>
                ) : (
                  <div className="alert alert-info" style={{ textAlign: 'left', marginBottom: '10px' }}>
                    <i className="fa-solid fa-circle-info"></i>
                    <span>Untuk menggunakan hak pilih, lanjutkan verifikasi dan ikuti arahan petugas sekolah. <Link to="/verifikasi" style={{ fontWeight: '700', textDecoration: 'underline' }}>Verifikasi siswa</Link></span>
                  </div>
                )}
                <button className="btn btn-ghost btn-block" type="button" style={{ marginTop: '10px' }} onClick={() => { setResult(undefined); setNisn(''); setDob('') }}>
                  <i className="fa-solid fa-rotate-left"></i> Cek Data Lain
                </button>
              </div>
            )}

            {result === null && (
              <div className="result-card glass" style={{ marginTop: '18px' }}>
                <div className="result-icon no"><i className="fa-solid fa-user-slash"></i></div>
                <h3>Data Tidak Ditemukan</h3>
                <p>Kami tidak menemukan data pemilih dengan kombinasi NISN dan tanggal lahir tersebut dalam DPT. Periksa kembali atau hubungi panitia.</p>
                <button className="btn btn-ghost btn-block" type="button" style={{ marginTop: '20px' }} onClick={() => { setResult(undefined); setNisn(''); setDob('') }}>
                  <i className="fa-solid fa-rotate-left"></i> Cek Data Lain
                </button>
              </div>
            )}
          </div>

          <aside className="side-card glass reveal in">
            <h3>Informasi DPT</h3>
            <ul>
              <li><i className="fa-solid fa-shield-halved"></i><span>Hanya nama, kelas, NISN tersamar, dan status hak pilih yang ditampilkan.</span></li>
              <li><i className="fa-solid fa-users"></i><span>DPT saat ini menampung <strong>{totalVoters} siswa</strong> terdaftar.</span></li>
              <li><i className="fa-solid fa-lock"></i><span>Demi keamanan, pencarian dikunci sementara setelah 5 kali percobaan tidak cocok.</span></li>
              <li><i className="fa-solid fa-circle-question"></i><span>Data tidak ditemukan? Hubungi panitia sekolah atau kelola DPT melalui Dashboard Petugas.</span></li>
            </ul>
            <Link className="btn btn-ghost btn-block" to="/jadwal" style={{ marginTop: '18px' }}>
              <i className="fa-regular fa-calendar-days"></i> Lihat Jadwal Pemilihan
            </Link>
          </aside>
        </div>
      </section>
    </Layout>
  )
}
