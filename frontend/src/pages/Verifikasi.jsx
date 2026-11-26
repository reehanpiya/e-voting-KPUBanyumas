import { useState } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import Layout from '../components/Layout'
import { useToast } from '../components/Toast'
import { electionApi } from '../services/api'
import { validateNisn, validateDob } from '../store/store'

function VerifyResult({ session, onReset }) {
  const showToast = useToast()

  async function copyToken() {
    try {
      await navigator.clipboard.writeText(session.token)
      showToast('Token disalin ke clipboard.', 'success')
    } catch {
      showToast('Gagal menyalin. Silakan catat dari layar.', 'error')
    }
  }

  return (
    <div className="v-result glass v-success">
      <div className="tick"><i className="fa-solid fa-check"></i></div>
      <h2>Verifikasi Berhasil</h2>
      <div className="who">{session.name}</div>
      <div className="cls">Kelas {session.classLabel}</div>
      <div className="qr-frame">
        <div role="img" aria-label="QR Code pemilihan" style={{ display: 'flex', justifyContent: 'center' }}>
          <QRCodeSVG
            value={session.token}
            size={Math.min(260, Math.max(200, window.innerWidth - 120))}
            fgColor="#3D0808"
            level="H"
          />
        </div>
      </div>
      <div className="token-box">
        <small>Token Pemilihan Anda</small>
        <strong style={{ fontFamily: 'ui-monospace,monospace', fontSize: 'clamp(24px,8vw,32px)', letterSpacing: '.12em', color: 'var(--navy)', wordBreak: 'break-all' }}>{session.token}</strong>
      </div>
      <div className="v-actions" style={{ marginBottom: '12px' }}>
        <button className="btn btn-primary" type="button" onClick={copyToken}>
          <i className="fa-regular fa-copy"></i> Salin Token
        </button>
      </div>
      <div className="instructions">
        <h3><i className="fa-solid fa-laptop"></i> Langkah Selanjutnya</h3>
        <ol>
          <li>Tunjukkan QR Code atau token ini kepada petugas di bilik suara resmi.</li>
          <li>Token hanya berlaku <strong>satu kali</strong> pemungutan suara.</li>
        </ol>
      </div>
      <div className="sim-note"><i className="fa-solid fa-shield-halved"></i><span>Token diterbitkan backend dan otomatis tidak berlaku setelah digunakan memilih.</span></div>
      <button className="btn btn-ghost btn-block" type="button" style={{ marginTop: '14px' }} onClick={onReset}>
        <i className="fa-solid fa-rotate-left"></i> Verifikasi Siswa Lain
      </button>
    </div>
  )
}

export default function Verifikasi() {
  const showToast = useToast()
  const [nisn, setNisn] = useState('')
  const [dob, setDob] = useState('')
  const [nisnError, setNisnError] = useState('')
  const [dobError, setDobError] = useState('')
  const [loading, setLoading] = useState(false)
  const [formAlert, setFormAlert] = useState('')
  const [verifySession, setVerifySession] = useState(null)

  function handleNisnInput(e) {
    setNisn(e.target.value.replace(/\D/g, '').slice(0, 10))
  }

  function handleDobInput(e) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 8)
    const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean)
    setDob(parts.join('/'))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormAlert('')

    const ne = validateNisn(nisn)
    const de = validateDob(dob)
    setNisnError(ne)
    setDobError(de)
    if (ne || de) { showToast('Periksa kembali isian formulir.', 'warning'); return }

    setLoading(true)
    try {
      const data = await electionApi.verifyVoter(nisn, dob)
      const session = { name: data.voter.name, classLabel: data.voter.class, token: data.token }
      setVerifySession(session)
      showToast('Verifikasi berhasil! Token aktif telah diterbitkan.', 'success')
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Verifikasi gagal. Periksa kembali data Anda.'
      setFormAlert(/sesi pemungutan suara/i.test(message) ? 'Layanan verifikasi saat ini tidak tersedia. Silakan ikuti arahan petugas.' : message)
    } finally { setLoading(false) }
  }

  function handleReset() {
    setVerifySession(null)
    setNisn('')
    setDob('')
    setFormAlert('')
  }

  return (
    <Layout>
      <nav className="container crumbs" aria-label="Posisi halaman">
        <Link to="/"><i className="fa-solid fa-arrow-left"></i> Beranda</Link>
        <span className="sep">/</span>
        <span aria-current="page">Verifikasi Siswa</span>
      </nav>
      <section className="container section" style={{ paddingTop: 0 }}>
        <div className="v-wrap">
          <div className="v-head reveal in">
            <div className="eyebrow"><i className="fa-solid fa-qrcode"></i> Verifikasi Mandiri</div>
            <h1>Verifikasi Siswa</h1>
            <p>Dapatkan QR Code pemilihan dengan memverifikasi NISN dan tanggal lahir Anda.</p>
            <div className="v-steps">
              <span><b>1</b> Isi data</span>
              <span><b>2</b> Dapat QR &amp; Token</span>
              <span><b>3</b> Masuk bilik suara</span>
            </div>
          </div>

          {verifySession ? (
            <div className="reveal in">
              <VerifyResult session={verifySession} onReset={handleReset} />
            </div>
          ) : (
            <div className="reveal in">
              <div className="form-card glass">
                {formAlert && (
                  <div className="alert alert-danger" role="alert">
                    <i className="fa-solid fa-circle-exclamation"></i>
                    <span>{formAlert}</span>
                  </div>
                )}
                {
                  <form onSubmit={handleSubmit} noValidate>
                    <div className="field">
                      <label htmlFor="nisn">NISN</label>
                      <div className="input-wrap">
                        <i className="fa-solid fa-hashtag"></i>
                        <input id="nisn" type="text" inputMode="numeric" maxLength="10" autoComplete="off" placeholder="10 digit NISN"
                          value={nisn} onChange={handleNisnInput}
                          onBlur={() => setNisnError(nisn ? validateNisn(nisn) : '')}
                          className={nisnError ? 'invalid' : ''} aria-invalid={nisnError ? 'true' : 'false'}
                        />
                      </div>
                      {nisnError && <p className="field-error show" role="alert">{nisnError}</p>}
                    </div>
                    <div className="field">
                      <label htmlFor="dob">Tanggal Lahir</label>
                      <div className="input-wrap">
                        <i className="fa-regular fa-calendar"></i>
                        <input id="dob" type="text" inputMode="numeric" maxLength="10" autoComplete="off" placeholder="DD/MM/YYYY"
                          value={dob} onChange={handleDobInput}
                          onBlur={() => setDobError(dob ? validateDob(dob) : '')}
                          className={dobError ? 'invalid' : ''} aria-invalid={dobError ? 'true' : 'false'}
                        />
                      </div>
                      {dobError && <p className="field-error show" role="alert">{dobError}</p>}
                    </div>
                    <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
                      {loading ? <><span className="spinner"></span> <span>Memverifikasi...</span></> : <><i className="fa-solid fa-shield-halved"></i> <span>Verifikasi &amp; Buat QR</span></>}
                    </button>
                  </form>
                }
              </div>
            </div>
          )}
        </div>
      </section>
    </Layout>
  )
}
