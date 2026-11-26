import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { electionApi } from '../services/api'
import { formatDate } from '../store/store'

export default function Jadwal() {
  const [schedule, setSchedule] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    electionApi.schedule().then(setSchedule).catch(() => setError('Jadwal belum tersedia.'))
  }, [])

  const hasSchedule = Boolean(schedule?.start_time || schedule?.end_time)
  return (
    <Layout>
      <nav className="container crumbs" aria-label="Posisi halaman">
        <Link to="/"><i className="fa-solid fa-arrow-left"></i> Beranda</Link><span className="sep">/</span><span aria-current="page">Jadwal Pemilihan</span>
      </nav>
      <section className="container page-head reveal">
        <div className="eyebrow"><i className="fa-solid fa-calendar-days"></i> Jadwal Pemilihan</div>
        <h1>Jadwal Pemungutan Suara</h1>
        <p>Waktu pemungutan yang ditetapkan panitia sekolah.</p>
      </section>
      <section className="container section" style={{ paddingTop: '12px' }}>
        {error && <p className="alert alert-info" role="status">{error}</p>}
        {hasSchedule ? <div className="phase reveal in"><h2 className="phase-title"><i className="fa-solid fa-calendar-days"></i> Pemungutan Suara</h2><ol className="timeline"><li className="t-item"><span className="t-marker"><i className="fa-regular fa-clock"></i></span><article className="t-card glass"><div className="t-top"><h3>Jadwal pemilihan digital</h3></div><div className="t-meta"><span><i className="fa-regular fa-calendar"></i>{schedule.start_time ? formatDate(schedule.start_time) : 'Waktu mulai belum ditetapkan'}</span><span><i className="fa-regular fa-clock"></i>{schedule.end_time ? `Sampai ${formatDate(schedule.end_time)}` : 'Waktu selesai belum ditetapkan'}</span></div><p>Silakan cek DPT dan ikuti arahan petugas sekolah.</p></article></li></ol></div> : !error && <p className="empty-state">Jadwal pemungutan belum ditetapkan oleh panitia.</p>}
        <div className="page-end"><p>Pastikan Anda terdaftar di DPT sebelum menggunakan hak pilih.</p><div className="state-actions"><Link className="btn btn-ghost" to="/cek-dpt"><i className="fa-solid fa-id-card"></i> Cek DPT</Link></div></div>
      </section>
    </Layout>
  )
}
