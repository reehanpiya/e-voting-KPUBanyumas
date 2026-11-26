import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { useToast } from '../components/Toast'
import { electionApi, normalizeCandidate } from '../services/api'
import {
  STATUS_META, statusRank, formatDate, candidatePhoto
} from '../store/store'

export default function BilikSuara() {
  const showToast = useToast()
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState('gate') // gate | auth | ballot | receipt
  const [tokenInput, setTokenInput] = useState('')
  const [authAlert, setAuthAlert] = useState('')
  const [activeToken, setActiveToken] = useState(null)
  const [selectedCand, setSelectedCand] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [receipt, setReceipt] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [candDetailOpen, setCandDetailOpen] = useState(null)
  const scannerRef = useRef(null)
  const readerRef = useRef(null)
  const [status, setStatus] = useState('READY')
  const [schedule, setSchedule] = useState({})
  const [candidates, setCandidates] = useState([])
  const urlToken = searchParams.get('token')

  const validateToken = useCallback((raw) => {
    setAuthAlert('')
    let clean = String(raw || '').trim().toUpperCase()
    if (!clean) { setAuthAlert('Harap masukkan token pemilihan.'); return }
    if (!clean.startsWith('TKN-')) clean = 'TKN-' + clean

    electionApi.validateToken(clean).then((token) => {
      setActiveToken(token)
      setCandidates((token.candidates || []).map(normalizeCandidate))
      stopScanner()
      setStep('ballot')
      showToast('Token terverifikasi. Silakan pilih pasangan calon.', 'success')
    }).catch((error) => setAuthAlert(error.response?.data?.message || error.message || 'Token tidak valid.'))
  }, [showToast])

  useEffect(() => {
    let active = true
    Promise.all([electionApi.status(), electionApi.schedule()]).then(([state, calendar]) => {
      if (!active) return
      setStatus(state.status || 'READY')
      setSchedule(calendar)
      if (state.status === 'ACTIVE') {
        setStep('auth')
        if (urlToken) { setTokenInput(urlToken); validateToken(urlToken) }
      }
    }).catch(() => setAuthAlert('Status pemilihan tidak dapat dimuat dari server.'))
    return () => { active = false }
  }, [urlToken, validateToken])

  useEffect(() => {
    if (!scanning || !readerRef.current) return undefined

    let cancelled = false
    let decoded = false
    let scanner = null
    let startPromise = Promise.resolve()
    const failToStart = () => {
      if (cancelled) return
      scannerRef.current = null
      setScanning(false)
      showToast('Pemindai QR/kamera gagal dimuat. Izinkan akses kamera atau gunakan HTTPS/localhost.', 'warning')
    }

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (cancelled) return
      scanner = new Html5Qrcode(readerRef.current.id)
      scannerRef.current = scanner
      startPromise = scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (cancelled || decoded) return
          decoded = true
          setTokenInput(decodedText)
          setScanning(false)
          validateToken(decodedText)
        },
        () => {},
      ).catch(failToStart)
    }).catch(failToStart)

    return () => {
      cancelled = true
      if (scannerRef.current === scanner) scannerRef.current = null
      if (scanner) {
        startPromise.then(() => scanner.stop().then(() => scanner.clear()).catch(() => {}))
      }
    }
  }, [scanning, showToast, validateToken])

  function handleAuthSubmit(e) {
    e.preventDefault()
    validateToken(tokenInput)
  }

  function promptConfirm(candNumber) {
    setSelectedCand(candNumber)
    setConfirmOpen(true)
  }

  async function executeVote() {
    if (!activeToken || !selectedCand) return
    setConfirmOpen(false)
    try {
      const result = await electionApi.castVote(activeToken.token, selectedCand)
      setStep('receipt')
      setReceipt({ voteId: result.ballot_id || '', timestamp: new Date().toISOString() })
      showToast('Hak suara berhasil dicatat ke kotak suara!', 'success')
    } catch (error) { showToast(error.response?.data?.message || error.message || 'Suara gagal dicatat.', 'error') }
  }

  function resetBooth() {
    setStep('auth')
    setTokenInput('')
    setAuthAlert('')
    setActiveToken(null)
    setSelectedCand(null)
    setReceipt(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function startScanner() {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      showToast('Kamera memerlukan HTTPS atau localhost dan izin kamera.', 'warning')
      return
    }
    setScanning(true)
  }

  function stopScanner() {
    setScanning(false)
  }


  if (status !== 'ACTIVE') {
    const isPast = statusRank(status) > statusRank('ACTIVE')
    return (
      <Layout>
        <nav className="container crumbs" aria-label="Posisi halaman">
          <Link to="/"><i className="fa-solid fa-arrow-left"></i> Beranda</Link>
          <span className="sep">/</span>
          <span aria-current="page">Bilik Suara Digital</span>
        </nav>
        <section className="container section" style={{ paddingTop: '8px' }}>
          <div className="booth-wrap">
            <div className="booth-head reveal in">
              <div className="eyebrow"><i className="fa-solid fa-check-to-slot"></i> Bilik Suara Digital</div>
              <h1>Pemberian Hak Suara</h1>
            </div>
            <div className="state-panel glass" style={{ maxWidth: '680px', margin: '20px auto' }}>
              <div className="state-icon"><i className={`fa-solid ${isPast ? 'fa-lock' : 'fa-hourglass-half'}`}></i></div>
              <div>
                <div style={{ marginBottom: '8px' }}>
                  <span className={`badge tone-${STATUS_META[status].tone}`}><i className={`fa-solid ${STATUS_META[status].icon}`}></i>{STATUS_META[status].label}</span>
                </div>
                <h2>{isPast ? 'Pemungutan Suara Telah Ditutup' : 'Pemungutan Suara Belum Dibuka'}</h2>
                <p>{isPast ? 'Pemungutan suara telah ditutup. Bilik suara tidak lagi menerima surat suara baru.' : `Bilik suara hanya aktif saat tahapan pemungutan suara berlangsung (${schedule.start_time ? formatDate(schedule.start_time) : 'jadwal belum ditetapkan'}).`}</p>
                <div className="state-actions">
                  <Link className="btn btn-primary" to="/jadwal"><i className="fa-regular fa-calendar-days"></i> Lihat Jadwal</Link>
                  <Link className="btn btn-ghost" to="/cek-dpt"><i className="fa-solid fa-id-card"></i> Cek DPT</Link>
                  <Link className="btn btn-ghost" to="/"><i className="fa-solid fa-house"></i> Ke Beranda</Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </Layout>
    )
  }

  return (
    <Layout>
      <nav className="container crumbs" aria-label="Posisi halaman">
        <Link to="/"><i className="fa-solid fa-arrow-left"></i> Beranda</Link>
        <span className="sep">/</span>
        <span aria-current="page">Bilik Suara Digital</span>
      </nav>
      <section className="container section" style={{ paddingTop: '8px' }}>
        <div className="booth-wrap">
          <div className="booth-head reveal in">
            <div className="eyebrow"><i className="fa-solid fa-check-to-slot"></i> Bilik Suara Digital</div>
            <h1>Pemberian Hak Suara</h1>
            <p>Lakukan autentikasi menggunakan token atau QR Code, lalu berikan pilihan Anda secara rahasia.</p>
          </div>

          {/* STEP 1: Auth */}
          {step === 'auth' && (
            <div className="reveal in">
              <div className="auth-box glass">
                <h2>Autentikasi Pemilih</h2>
                <p>Masukkan token pemilihan 6 karakter yang Anda peroleh saat verifikasi mandiri.</p>
                {authAlert && (
                  <div className="alert alert-danger" role="alert">
                    <i className="fa-solid fa-circle-exclamation"></i>
                    <span>{authAlert}</span>
                  </div>
                )}
                <form onSubmit={handleAuthSubmit} noValidate>
                  <div className="field">
                    <label htmlFor="tokenInput">Token Pemilihan</label>
                    <div className="input-wrap">
                      <i className="fa-solid fa-key"></i>
                      <input
                        id="tokenInput" type="text" autoComplete="off"
                        placeholder="TKN-XXXXXX" maxLength="10" spellCheck="false"
                        style={{ textTransform: 'uppercase', fontFamily: 'ui-monospace,monospace', fontWeight: '700', letterSpacing: '0.08em' }}
                        value={tokenInput}
                        onChange={e => setTokenInput(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 10))}
                      />
                    </div>
                    <p className="field-hint">Contoh: TKN-AB2C4D atau cukup ketik 6 karakter kodenya.</p>
                  </div>
                  <button className="btn btn-primary btn-block" type="submit">
                    <i className="fa-solid fa-arrow-right-to-bracket"></i> <span>Buka Surat Suara</span>
                  </button>
                </form>

                <div className="auth-divider"><span>ATAU PINDAI QR CODE</span></div>
                <div className="btn-row" style={{ justifyContent: 'center' }}>
                  <button className="btn btn-ghost btn-block" type="button" onClick={scanning ? stopScanner : startScanner}>
                    <i className="fa-solid fa-camera"></i> <span>{scanning ? 'Tutup Kamera' : 'Pindai dengan Kamera'}</span>
                  </button>
                </div>
                {scanning && (
                  <div className="qr-scanner-box active" style={{ marginTop: '16px' }}>
                    <div id="reader" ref={readerRef}></div>
                  </div>
                )}
                <div style={{ marginTop: '18px', textAlign: 'center' }}>
                  <Link to="/verifikasi" style={{ fontSize: '13.5px', color: 'var(--primary)', fontWeight: '600' }}>
                    <i className="fa-solid fa-circle-question"></i> Belum memiliki token? Lakukan Verifikasi Siswa di sini →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Ballot */}
          {step === 'ballot' && activeToken && (
            <div className="reveal in">
              <div className="ballot-container">
                <div className="ballot-header">
                  <div className="ballot-title">
                    <h2>Surat Suara Elektronik</h2>
                    <p>Pilihlah salah satu Pasangan Calon Ketua &amp; Wakil Ketua OSIS di bawah ini.</p>
                  </div>
                  <div className="voter-badge-chip">
                    <small className="muted">Pemilih Terverifikasi</small>
                    <strong>{activeToken.voterName || 'Pemilih'}</strong>
                    <span className="muted" style={{ fontSize: '12px' }}>Kelas {activeToken.classLabel || '-'}</span>
                  </div>
                </div>
                <div className="ballot-grid">
                  {candidates.map(c => (
                    <article key={c.number} className="ballot-card">
                      <div className="ballot-card-top">
                        <img src={c.photo_url || candidatePhoto(c)} alt={`Foto Paslon ${c.number}`} width="400" height="400" loading="lazy" />
                        <span className="ballot-no">{String(c.number).padStart(2, '0')}</span>
                      </div>
                      <div className="ballot-card-body">
                        <div className="ballot-pair">
                          <div>
                            <span className="ballot-pair-role">Calon Ketua</span>
                            <div className="ballot-pair-name">{c.chair}</div>
                            <div className="ballot-pair-class">Kelas {c.chairClass}</div>
                          </div>
                          <div>
                            <span className="ballot-pair-role">Calon Wakil Ketua</span>
                            <div className="ballot-pair-name">{c.viceChair}</div>
                            <div className="ballot-pair-class">Kelas {c.viceClass}</div>
                          </div>
                        </div>
                        <p className="ballot-vision"><strong>Visi:</strong> {c.vision}</p>
                        <button className="btn btn-ghost btn-sm" type="button" onClick={() => setCandDetailOpen(c)}>
                          <i className="fa-solid fa-file-lines"></i> Visi &amp; Misi Lengkap
                        </button>
                        <button className="btn-vote btn" type="button" onClick={() => promptConfirm(c.id)}>
                          <i className="fa-solid fa-check-to-slot"></i> COBLOS PASLON {String(c.number).padStart(2, '0')}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Receipt */}
          {step === 'receipt' && receipt && (
            <div className="reveal in">
              <div className="receipt-wrap">
                <div className="receipt-card">
                  <div className="receipt-stamp"><i className="fa-solid fa-check-double"></i></div>
                  <h2>Suara Berhasil Diberikan!</h2>
                  <p>Terima kasih atas partisipasi Anda dalam demokrasi sekolah yang jujur dan adil.</p>
                  <div className="receipt-table">
                    <div className="receipt-row"><span>Nomor Bukti (ID)</span><strong style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>{receipt.voteId}</strong></div>
                    <div className="receipt-row"><span>Waktu Pencoblosan</span><strong>{formatDate(receipt.timestamp)}</strong></div>
                    <div className="receipt-row"><span>Status Suara</span><strong style={{ color: 'var(--success)' }}><i className="fa-solid fa-circle-check"></i> Sah &amp; Tersimpan</strong></div>
                    <div className="receipt-row"><span>Metode Pemilihan</span><strong>Bilik Suara Digital KPU</strong></div>
                  </div>
                  <div className="receipt-notice">
                    <i className="fa-solid fa-shield-halved"></i> <strong>Asas Rahasia Terjaga:</strong> Pilihan pasangan calon Anda tidak dicantumkan dalam bukti ini agar kerahasiaan pilihan tetap terjamin.
                  </div>
                  <div className="receipt-actions btn-row" style={{ flexDirection: 'column', gap: '10px' }}>
                    <button className="btn btn-gold btn-block" type="button" onClick={() => window.print()}>
                      <i className="fa-solid fa-print"></i> Cetak / Simpan Bukti Suara
                    </button>
                    <button className="btn btn-primary btn-block" type="button" onClick={resetBooth}>
                      <i className="fa-solid fa-rotate-right"></i> Bilik Suara Baru (Untuk Pemilih Berikutnya)
                    </button>
                    <Link className="btn btn-ghost btn-block" to="/">
                      <i className="fa-solid fa-house"></i> Selesai &amp; Kembali ke Beranda
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Modal Konfirmasi */}
      {confirmOpen && selectedCand && (() => {
        const cand = candidates.find(c => c.id === selectedCand)
        if (!cand) return null
        return (
          <div className="confirm-dlg-back" role="dialog" aria-modal="true" aria-labelledby="confirmTitle">
            <div className="confirm-dlg">
              <span className="c-badge">Pasangan Calon Nomor {String(cand.number).padStart(2, '0')}</span>
              <h3 id="confirmTitle">Konfirmasi Pilihan Anda</h3>
              <p>Apakah Anda yakin ingin memberikan suara kepada pasangan calon ini?</p>
              <div className="confirm-cand-info">
                <small className="muted">Calon yang dipilih:</small>
                <strong>{cand.chair} &amp; {cand.viceChair}</strong>
                <span className="muted" style={{ fontSize: '13px' }}>Ketua: Kelas {cand.chairClass} • Wakil: Kelas {cand.viceClass}</span>
              </div>
              <div className="alert alert-warning" style={{ fontSize: '12.5px', textAlign: 'left', marginBottom: '18px' }}>
                <i className="fa-solid fa-triangle-exclamation"></i>
                <span>Pilihan bersifat <strong>final</strong> dan <strong>tidak dapat diubah atau dibatalkan</strong> setelah dikirim.</span>
              </div>
              <div className="btn-row">
                <button className="btn btn-ghost" type="button" onClick={() => { setConfirmOpen(false); setSelectedCand(null) }}>Batal / Ganti</button>
                <button className="btn btn-primary" type="button" onClick={executeVote}>
                  <i className="fa-solid fa-check-to-slot"></i> Ya, Kirim Suara
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Modal Detail Kandidat */}
      {candDetailOpen && (
        <div className="modal-backdrop open" onClick={(e) => { if (e.target === e.currentTarget) setCandDetailOpen(null) }}>
          <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: '680px', padding: '26px', position: 'relative', maxHeight: '90vh', overflowY: 'auto', borderRadius: '24px', background: '#fff' }}>
            <button style={{ position: 'absolute', top: '14px', right: '14px', width: '38px', height: '38px', borderRadius: '10px', border: '0', background: 'rgba(61,8,8,.08)', cursor: 'pointer' }} onClick={() => setCandDetailOpen(null)}>
              <i className="fa-solid fa-xmark"></i>
            </button>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <span className="badge tone-info" style={{ fontSize: '14px', padding: '6px 14px' }}>Nomor Urut {String(candDetailOpen.number).padStart(2, '0')}</span>
              <h2 style={{ margin: '10px 0 4px', fontSize: '22px' }}>{candDetailOpen.chair} &amp; {candDetailOpen.viceChair}</h2>
              <p className="muted" style={{ fontSize: '14px' }}>Kelas {candDetailOpen.chairClass} &amp; Kelas {candDetailOpen.viceClass}</p>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <h3><i className="fa-solid fa-eye" style={{ color: 'var(--primary)' }}></i> Visi</h3>
              <p style={{ fontSize: '14.5px', color: '#333', marginTop: '4px' }}>{candDetailOpen.vision}</p>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <h3><i className="fa-solid fa-bullseye" style={{ color: 'var(--primary)' }}></i> Misi</h3>
              <ol style={{ marginTop: '6px', paddingLeft: '1.2em', fontSize: '14px', color: '#333' }}>
                {candDetailOpen.missions.map((m, i) => <li key={i} style={{ marginBottom: '5px' }}>{m}</li>)}
              </ol>
            </div>
            <div style={{ marginBottom: '18px' }}>
              <h3><i className="fa-solid fa-list-check" style={{ color: 'var(--primary)' }}></i> Program Unggulan</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                {(candDetailOpen.programs || []).map((p, i) => <span key={i} className="badge tone-warning">{p}</span>)}
              </div>
            </div>
            <button className="btn btn-primary btn-block" type="button" onClick={() => { setCandDetailOpen(null); promptConfirm(candDetailOpen.id) }}>
              <i className="fa-solid fa-check-to-slot"></i> Pilih Pasangan Calon Ini
            </button>
          </div>
        </div>
      )}
    </Layout>
  )
}
