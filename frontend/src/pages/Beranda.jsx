import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { electionApi, normalizeCandidate } from '../services/api'
import { formatDate } from '../store/store'

export default function Beranda() {
  const [schedule, setSchedule] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [totalVoters, setTotalVoters] = useState(0)
  const [turnout, setTurnout] = useState(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let active = true
    const load = async () => {
      const [calendar, candidateList, turnout] = await Promise.allSettled([
        electionApi.schedule(), electionApi.candidates(), electionApi.turnout(),
      ])
      if (!active) return
      if (calendar.status === 'fulfilled') setSchedule(calendar.value)
      if (candidateList.status === 'fulfilled') setCandidates(candidateList.value.map(normalizeCandidate))
      if (turnout.status === 'fulfilled') {
        setTotalVoters(Number(turnout.value.total_dpt) || 0)
        setTurnout(turnout.value)
      } else {
        setTurnout(null)
      }
      setLoadError([calendar, candidateList].some((item) => item.status === 'rejected'))
    }
    load()
    const timer = setInterval(load, 30000)
    return () => { active = false; clearInterval(timer) }
  }, [])

  const startTime = schedule?.start_time
  const endTime = schedule?.end_time
  const votesCast = Math.max(0, Number(turnout?.total_votes_in) || 0)
  const turnoutTotal = Math.max(0, Number(turnout?.total_dpt) || 0)
  const turnoutPercent = Math.min(100, Math.max(0, Number(turnout?.turnout_percentage) || 0))
  return (
    <Layout>
      <section className="container hero" id="beranda">
        <div className="hero-copy reveal">
          <h1>Pemilihan <span className="grad-text">Ketua OSIS</span> yang Jujur dan Transparan</h1>
          <p className="hero-desc">Portal informasi pemilihan Ketua dan Wakil Ketua OSIS.</p>
          <div className="hero-cta">
            <Link className="btn btn-primary" to="/cek-dpt"><i className="fa-solid fa-id-card"></i> Cek Daftar Pemilih</Link>
            <Link className="btn btn-gold" to="/kandidat"><i className="fa-solid fa-users"></i> Lihat Kandidat</Link>
          </div>
          <p className="hero-hint"><i className="fa-solid fa-circle-info"></i><span>Periksa daftar pemilih dan profil pasangan calon melalui menu yang tersedia.</span></p>
        </div>
        <div className="hero-visual reveal" aria-hidden="true">
          <div className="ballot glass">
            <div className="ballot-head"><i className="fa-solid fa-check-to-slot"></i> Pasangan Calon</div>
            {candidates.slice(0, 3).map((candidate) => <div className="ballot-row" key={candidate.id || candidate.number}><b>{String(candidate.number).padStart(2, '0')}</b><span>{candidate.chair}{candidate.viceChair ? ` & ${candidate.viceChair}` : ''}</span><i className="fa-regular fa-circle"></i></div>)}
            {candidates.length === 0 && <div className="ballot-row"><span>Belum ada pasangan calon</span></div>}
            <div className="ballot-foot"><i className="fa-solid fa-lock"></i> Pilihan Anda bersifat rahasia (LUBER JURDIL)</div>
          </div>
          <div className="float-chip glass c1"><i className="fa-solid fa-shield-halved"></i> Satu token, satu suara</div>
          <div className="float-chip glass c2"><i className="fa-solid fa-qrcode"></i> Verifikasi mandiri QR</div>
        </div>
      </section>

      {turnout?.available && <section className="container turnout-section" aria-label="Partisipasi pemilih real-time"><div className="live-panel glass"><div className="live-head"><h2>Partisipasi Pemilih Real-time</h2><span className="turnout-updated">Diperbarui {formatDate(turnout.last_updated)}</span></div><div className="big-num">{turnoutPercent.toLocaleString('id-ID')}%</div><div className="turnout-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={turnoutPercent} aria-label="Partisipasi pemilih"><div style={{ width: `${turnoutPercent}%` }} /></div><p className="turnout-count">{votesCast.toLocaleString('id-ID')} dari {turnoutTotal.toLocaleString('id-ID')} pemilih telah memberikan suara.</p></div></section>}

      <section className="container section" id="informasi">
        <div className="section-head reveal"><h2>Informasi Pemilihan</h2><p>Informasi umum pelaksanaan pemilihan Ketua dan Wakil Ketua OSIS.</p></div>
        {loadError && <p className="alert alert-info" role="status">Sebagian informasi belum dapat dimuat dari server.</p>}
        <div className="info-grid">
          <article className="info-card glass in"><div className="info-icon"><i className="fa-solid fa-calendar-days"></i></div><div className="label">Jadwal Pemungutan</div><div className="value">{startTime ? formatDate(startTime) : 'Belum ditetapkan'}</div><div className="sub">{endTime ? `Sampai ${formatDate(endTime)}` : 'Waktu selesai belum ditetapkan'}</div></article>
          <article className="info-card glass in"><div className="info-icon"><i className="fa-solid fa-users"></i></div><div className="label">Jumlah Kandidat</div><div className="value">{candidates.length} Pasangan Calon</div><div className="sub">Ketua &amp; Wakil Ketua OSIS</div></article>
          <article className="info-card glass in"><div className="info-icon"><i className="fa-solid fa-id-card"></i></div><div className="label">Total Pemilih (DPT)</div><div className="value">{totalVoters.toLocaleString('id-ID')} Siswa</div><div className="sub">Terdaftar di DPT pemilihan</div></article>
        </div>
      </section>

      <section className="container section" id="alur">
        <div className="section-head reveal"><h2>Alur Pemilih</h2><p>Siapkan data Anda dan ikuti arahan petugas di sekolah.</p></div>
        <div className="flow">
          <article className="flow-item glass reveal"><div className="info-icon"><i className="fa-solid fa-id-card"></i></div><h3>Cek Daftar Pemilih</h3><p>Pastikan nama Anda terdaftar dalam DPT dengan memasukkan NISN dan tanggal lahir.</p><Link className="flow-link" to="/cek-dpt">Cek DPT <i className="fa-solid fa-arrow-right"></i></Link></article>
          <article className="flow-item glass reveal"><div className="info-icon"><i className="fa-solid fa-qrcode"></i></div><h3>Verifikasi Siswa</h3><p>Verifikasi identitas untuk mendapatkan token pemilihan.</p><Link className="flow-link" to="/verifikasi">Verifikasi Siswa <i className="fa-solid fa-arrow-right"></i></Link></article>
          <article className="flow-item glass reveal"><div className="info-icon"><i className="fa-solid fa-check-to-slot"></i></div><h3>Gunakan Hak Pilih</h3><p>Tunjukkan token atau QR Code kepada petugas di bilik suara resmi.</p></article>
        </div>
      </section>

      <section className="container section" id="edukasi">
        <div className="section-head reveal"><h2>Edukasi Demokrasi</h2><p>Asas pemilihan yang kita junjung bersama di lingkungan sekolah.</p></div>
        <div className="principles reveal">{[['L','Langsung'],['U','Umum'],['B','Bebas'],['E','Rahasia'],['J','Jujur'],['A','Adil']].map(([letter, label]) => <div key={letter} className="principle"><b>{letter}</b><span>{label}</span></div>)}</div>
      </section>
    </Layout>
  )
}
