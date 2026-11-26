import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useToast } from '../components/Toast'
import { formatDate } from '../store/store'
import { registrationApi } from '../services/api'

const PHONE_PATTERN = /^(?:\+62|62|0)8[1-9]\d{6,10}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function validateField(id, value) {
  switch (id) {
    case 'schoolName':
      if (!value) return 'Nama sekolah wajib diisi.'
      return value.length < 5 ? 'Nama sekolah minimal 5 karakter.' : ''
    case 'npsn':
      if (!value) return 'NPSN wajib diisi.'
      if (!/^\d+$/.test(value)) return 'NPSN hanya boleh berisi angka.'
      if (value.length !== 8) return 'NPSN harus terdiri dari 8 digit.'
      return ''
    case 'picName':
      if (!value) return 'Nama penanggung jawab wajib diisi.'
      if (value.length < 3) return 'Nama minimal 3 karakter.'
      return /^[\p{L}\s.,'-]+$/u.test(value) ? '' : 'Nama hanya boleh berisi huruf dan tanda baca.'
    case 'phone':
      if (!value) return 'Nomor telepon wajib diisi.'
      return PHONE_PATTERN.test(value.replace(/[\s-]/g, '')) ? '' : 'Gunakan nomor seluler Indonesia yang valid.'
    case 'email':
      if (!value) return 'Email wajib diisi.'
      return EMAIL_PATTERN.test(value) ? '' : 'Format email tidak valid.'
    default: return ''
  }
}

export default function Registrasi() {
  const showToast = useToast()
  const [form, setForm] = useState({ schoolName: '', npsn: '', picName: '', phone: '', email: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(null)
  const [checkInput, setCheckInput] = useState('')
  const [checkResult, setCheckResult] = useState(null)
  const [regOpen, setRegOpen] = useState(false)
  const [configLoaded, setConfigLoaded] = useState(false)

  useEffect(() => {
    registrationApi.config()
      .then((config) => setRegOpen(config.is_open === true))
      .catch(() => showToast('Status pendaftaran gagal dimuat dari server.', 'error'))
      .finally(() => setConfigLoaded(true))
  }, [showToast])

  function handleChange(e) {
    const { name, value } = e.target
    let v = value
    if (name === 'npsn') v = value.replace(/\D/g, '').slice(0, 8)
    if (name === 'phone') v = value.replace(/[^\d+\s-]/g, '')
    setForm(prev => ({ ...prev, [name]: v }))
  }

  function handleBlur(e) {
    const { name, value } = e.target
    if (value) setErrors(prev => ({ ...prev, [name]: validateField(name, value.trim()) }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!regOpen || !configLoaded) return
    const newErrors = {}
    let allValid = true
    for (const field of ['schoolName', 'npsn', 'picName', 'phone', 'email']) {
      const err = validateField(field, form[field].trim())
      newErrors[field] = err
      if (err) allValid = false
    }
    setErrors(newErrors)
    if (!allValid) { showToast('Periksa kembali kolom isian yang belum sesuai.', 'warning'); return }

    setLoading(true)
    try {
      const result = await registrationApi.submit({
        school_name: form.schoolName.trim(),
        npsn: form.npsn.trim(),
        contact_name: form.picName.trim(),
        contact_phone: form.phone.trim(),
        contact_email: form.email.trim(),
      })
      const item = {
        id: `REG-${new Date().getFullYear()}-${String(result.id).padStart(5, '0')}`,
        schoolName: result.school_name,
        npsn: result.npsn,
        picName: result.contact_name,
        phone: result.contact_phone,
        email: result.contact_email,
        status: 'pending',
        submittedAt: result.submitted_at,
      }
      showToast('Pengajuan sekolah berhasil dikirim ke server.', 'success')
      setSubmitted(item)
      setCheckResult({ ...item })
    } catch (error) {
      showToast(error.response?.data?.message || error.message || 'Pengajuan sekolah gagal dikirim.', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleCheck() {
    const q = checkInput.trim()
    if (!q) { setCheckResult('empty'); return }
    try {
      const result = await registrationApi.check(q)
      setCheckResult({
        id: `REG-${new Date().getFullYear()}-${String(result.id).padStart(5, '0')}`,
        schoolName: result.school_name,
        npsn: result.npsn,
        status: result.status,
        submittedAt: result.submitted_at,
      })
    } catch (error) {
      setCheckResult(error.response?.status === 404 ? 'not_found' : 'error')
      if (error.response?.status !== 404) showToast(error.response?.data?.message || 'Status pengajuan gagal diperiksa.', 'error')
    }
  }

  const statusMeta = {
    pending: { label: 'Menunggu Persetujuan', tone: 'warning', icon: 'fa-hourglass-half' },
    approved: { label: 'Disetujui KPU', tone: 'success', icon: 'fa-circle-check' },
    rejected: { label: 'Ditolak', tone: 'danger', icon: 'fa-circle-xmark' }
  }

  return (
    <Layout>
      <nav className="container crumbs" aria-label="Posisi halaman">
        <Link to="/"><i className="fa-solid fa-arrow-left"></i> Beranda</Link>
        <span className="sep">/</span>
        <span aria-current="page">Registrasi Sekolah</span>
      </nav>
      <section className="container page-head reveal">
        <div className="eyebrow"><i className="fa-solid fa-school"></i> Registrasi Sekolah</div>
        <h1>Daftarkan Sekolah Anda</h1>
        <p>Ajukan sekolah Anda sebagai peserta pemilihan Ketua OSIS digital. Pengajuan akan ditinjau dan disetujui oleh KPU Kabupaten Banyumas.</p>
      </section>

      <section className="container section" style={{ paddingTop: '12px' }}>
        <div className="two-col">
          <div className="reveal in">
            {!submitted ? (
              <div className="form-card glass">
                <h2>Formulir Pengajuan</h2>
                <p>Semua kolom wajib diisi dengan data valid sekolah Anda.</p>

                {!regOpen && (
                  <div className="state-panel tone-warning" style={{ padding: '0 0 18px' }}>
                    <div className="state-icon"><i className="fa-solid fa-lock"></i></div>
                    <div>
                      <h3>Periode pendaftaran ditutup</h3>
                      <p>Pendaftaran sekolah saat ini ditutup oleh KPU Kabupaten Banyumas.</p>
                      <div className="state-actions">
                        <Link className="btn btn-ghost btn-sm" to="/jadwal"><i className="fa-regular fa-calendar-days"></i> Lihat jadwal</Link>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                  <fieldset disabled={!regOpen} style={{ border: 0, minWidth: 0 }}>
                    {[
                      { id: 'schoolName', label: 'Nama Sekolah', type: 'text', placeholder: 'Contoh: SMA Negeri 1 Purwokerto', icon: 'fa-school', maxLength: 100 },
                      { id: 'npsn', label: 'NPSN', type: 'text', inputMode: 'numeric', placeholder: '8 digit NPSN', icon: 'fa-hashtag', maxLength: 8 },
                      { id: 'picName', label: 'Nama Penanggung Jawab / Pembina OSIS', type: 'text', placeholder: 'Nama lengkap dan gelar', icon: 'fa-user', maxLength: 80 },
                      { id: 'phone', label: 'Nomor WhatsApp / Seluler', type: 'tel', inputMode: 'tel', placeholder: '08xxxxxxxxxx', icon: 'fa-phone', maxLength: 16 },
                      { id: 'email', label: 'Email Resmi Sekolah', type: 'email', inputMode: 'email', placeholder: 'admin@sekolah.sch.id', icon: 'fa-envelope', maxLength: 100 },
                    ].map(f => (
                      <div key={f.id} className="field">
                        <label htmlFor={f.id}>{f.label}</label>
                        <div className="input-wrap">
                          <i className={`fa-solid ${f.icon}`}></i>
                          <input
                            id={f.id} name={f.id} type={f.type} inputMode={f.inputMode}
                            maxLength={f.maxLength} placeholder={f.placeholder}
                            value={form[f.id]} onChange={handleChange} onBlur={handleBlur}
                            className={errors[f.id] ? 'invalid' : ''}
                          />
                        </div>
                        {errors[f.id] && <p className="field-error show" role="alert">{errors[f.id]}</p>}
                      </div>
                    ))}
                    <button className="btn btn-primary btn-block" type="submit" disabled={loading || !configLoaded}>
                      {loading ? <><span className="spinner"></span> <span>Mengirim...</span></> : <><i className="fa-solid fa-paper-plane"></i> <span>Ajukan Pendaftaran Sekolah</span></>}
                    </button>
                  </fieldset>
                </form>
              </div>
            ) : (
              <div className="summary glass" style={{ padding: '28px' }}>
                <div className="tick"><i className="fa-solid fa-circle-check"></i></div>
                <h2>Pengajuan Berhasil Dikirim</h2>
                <p>Pengajuan sekolah Anda telah tersimpan dan dapat ditinjau oleh KPU Kabupaten Banyumas melalui Dashboard Petugas.</p>
                <div className="result-list">
                  <div><span>No. Pengajuan</span><strong style={{ fontFamily: 'monospace' }}>{submitted.id}</strong></div>
                  <div><span>Sekolah</span><strong>{submitted.schoolName}</strong></div>
                  <div><span>NPSN</span><strong>{submitted.npsn}</strong></div>
                  <div><span>Penanggung Jawab</span><strong>{submitted.picName}</strong></div>
                  <div><span>Status</span><strong><span className="badge tone-warning">Menunggu persetujuan</span></strong></div>
                </div>
                <div className="btn-row" style={{ flexDirection: 'column', gap: '10px' }}>
                  <Link className="btn btn-primary btn-block" to="/"><i className="fa-solid fa-house"></i> Kembali ke Beranda</Link>
                  <button className="btn btn-ghost btn-block" type="button" onClick={() => { setSubmitted(null); setForm({ schoolName: '', npsn: '', picName: '', phone: '', email: '' }) }}>
                    <i className="fa-solid fa-plus"></i> Ajukan Sekolah Lain
                  </button>
                </div>
              </div>
            )}

            {/* Cek Status Pengajuan */}
            <div className="check-reg-box glass" style={{ marginTop: '20px' }}>
              <h3><i className="fa-solid fa-magnifying-glass"></i> Cek Status Pengajuan Sekolah</h3>
              <p className="muted" style={{ fontSize: '13.5px', marginBottom: '12px' }}>Masukkan No. Pengajuan atau NPSN.</p>
              <div className="input-wrap" style={{ marginBottom: '10px' }}>
                <i className="fa-solid fa-receipt"></i>
                <input type="text" placeholder="Nomor Pengajuan atau NPSN" value={checkInput}
                  onChange={e => setCheckInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCheck() } }}
                />
              </div>
              <button className="btn btn-ghost btn-block btn-sm" type="button" onClick={handleCheck}>Cek Status Pengajuan</button>
              {checkResult && checkResult !== 'empty' && (
                <div style={{ marginTop: '12px' }}>
                  {checkResult === 'not_found' ? (
                    <div className="alert alert-warning" style={{ fontSize: '13px' }}>
                      <i className="fa-solid fa-circle-exclamation"></i>
                      <span>Pengajuan tidak ditemukan.</span>
                    </div>
                  ) : checkResult === 'error' ? (
                    <div className="alert alert-danger" style={{ fontSize: '13px' }}>Status pengajuan belum dapat dimuat. Coba lagi.</div>
                  ) : (
                    <div style={{ padding: '14px', borderRadius: '14px', background: 'rgba(255,255,255,.9)', border: '1px solid rgba(61,8,8,.1)', fontSize: '13.5px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <strong style={{ fontFamily: 'monospace' }}>{checkResult.id}</strong>
                        {(() => {
                          const st = statusMeta[checkResult.status || 'pending']
                          return <span className={`badge tone-${st.tone}`}><i className={`fa-solid ${st.icon}`}></i> {st.label}</span>
                        })()}
                      </div>
                      <div><strong>{checkResult.schoolName}</strong> (NPSN: {checkResult.npsn})</div>
                      <div className="muted" style={{ fontSize: '12px', marginTop: '4px' }}>Diajukan: {formatDate(checkResult.submittedAt)}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <aside className="reveal in" style={{ order: -1 }}>
            <div className="reg-status glass">
              <span className={`badge tone-${regOpen ? 'success' : 'danger'}`}>
                <i className={`fa-solid ${regOpen ? 'fa-lock-open' : 'fa-lock'}`}></i> {regOpen ? 'Pendaftaran Dibuka' : 'Pendaftaran Ditutup'}
              </span>
              <h3 style={{ marginTop: '10px', marginBottom: '6px' }}>{regOpen ? 'Sekolah dapat mengajukan pendaftaran' : 'Pendaftaran ditutup oleh KPU'}</h3>
              <p>{regOpen ? 'KPU Kabupaten Banyumas sedang menerima pengajuan sekolah.' : 'Panitia KPU dapat membukanya kembali melalui Dashboard Petugas.'}</p>
              <Link className="btn btn-ghost btn-block" to="/jadwal" style={{ marginTop: '16px' }}>
                <i className="fa-regular fa-calendar-days"></i> Lihat Jadwal Pemilihan
              </Link>
            </div>
            <div className="history glass" style={{ marginTop: '18px', padding: '22px' }}>
              <div className="history-head"><h3>Alur Pendaftaran Sekolah</h3></div>
              <ol className="reg-steps">
                <li><strong>Isi formulir</strong><span>Lengkapi data identitas sekolah dan kontak penanggung jawab.</span></li>
                <li><strong>Ditinjau KPU</strong><span>KPU Kabupaten Banyumas memeriksa dan menyetujui pengajuan di Dashboard Petugas.</span></li>
                <li><strong>Persiapan Pemilihan</strong><span>Panitia sekolah mengunci DPT, memfinalisasi paslon, dan membuka bilik suara.</span></li>
              </ol>
            </div>
          </aside>
        </div>
      </section>
    </Layout>
  )
}
