import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { formatPercent, candidatePhoto } from '../store/store'
import { electionApi, normalizeCandidate } from '../services/api'

function CandidateModal({ candidate, candidates, onClose }) {
  const index = candidates.findIndex(c => c.number === candidate.number)
  const next = candidates[(index + 1) % candidates.length]
  const [current, setCurrent] = useState(candidate)

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="modal-backdrop open" aria-hidden="false" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <button className="modal-close" type="button" aria-label="Tutup detail kandidat" onClick={onClose}>
          <i className="fa-solid fa-xmark"></i>
        </button>
        <div className="modal-top">
          <img src={current.photo_url || candidatePhoto(current)} alt={`Foto paslon ${current.number}`} width="400" height="400" />
          <div>
            <span className="badge tone-info">Nomor Urut {String(current.number).padStart(2, '0')}</span>
            <h2 id="modalTitle" style={{ margin: '10px 36px 6px 0' }}>{current.chair} &amp; {current.viceChair}</h2>
            <p className="muted" style={{ fontSize: '14px' }}>
              Ketua: {current.chair} ({current.chairClass})<br />
              Wakil: {current.viceChair} ({current.viceClass})
            </p>
          </div>
        </div>
        <div className="modal-section">
          <h3><i className="fa-solid fa-eye"></i> Visi</h3>
          <p>{current.vision}</p>
        </div>
        <div className="modal-section">
          <h3><i className="fa-solid fa-bullseye"></i> Misi</h3>
          <ol>{current.missions.map((m, i) => <li key={i}>{m}</li>)}</ol>
        </div>
        <div className="modal-section">
          <h3><i className="fa-solid fa-list-check"></i> Program Kerja Unggulan</h3>
          <div className="chips">{(current.programs || []).map((p, i) => <span key={i} className="chip">{p}</span>)}</div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            <i className="fa-solid fa-arrow-left"></i> Kembali ke daftar
          </button>
          {candidates.length > 1 && (
            <button className="btn btn-primary" type="button" onClick={() => {
              const idx = candidates.findIndex(c => c.number === current.number)
              setCurrent(candidates[(idx + 1) % candidates.length])
            }}>
              Paslon {String(next.number).padStart(2, '0')} <i className="fa-solid fa-arrow-right"></i>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Kandidat() {
  const [candidates, setCandidates] = useState([])
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [totalVotes, setTotalVotes] = useState(0)
  const [hasOfficialResults, setHasOfficialResults] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([electionApi.candidates()]).then(async ([list]) => {
      if (!active) return
      setCandidates(list.map(normalizeCandidate))
      try {
        const result = await electionApi.results()
        if (active) {
          setTotalVotes(Number(result.total_valid_votes) || 0)
          setHasOfficialResults(true)
          setCandidates(list.map((candidate) => {
            const row = result.candidates?.find((item) => Number(item.id) === Number(candidate.id))
            return normalizeCandidate({ ...candidate, votes: row?.votes || 0 })
          }))
        }
      } catch { /* Hasil tidak tersedia untuk publik. */ }
    }).catch(() => { if (active) setError('Data kandidat belum dapat dimuat dari server.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const profileCandidates = candidates

  return (
    <Layout>
      <nav className="container crumbs" aria-label="Posisi halaman">
        <Link to="/"><i className="fa-solid fa-arrow-left"></i> Beranda</Link>
        <span className="sep">/</span>
        <span aria-current="page">Profil Paslon</span>
      </nav>
      <section className="container page-head reveal">
        <div className="eyebrow"><i className="fa-solid fa-users"></i> Profil Pasangan Calon</div>
        <h1>Kenali Pasangan Calon Ketua &amp; Wakil Ketua OSIS</h1>
        <p>Pelajari visi, misi, dan program kerja setiap pasangan calon sebelum menggunakan hak pilih Anda di Bilik Suara.</p>
      </section>

      <section className="container section" style={{ paddingTop: '12px' }}>
        {loading && <p role="status">Memuat data kandidat...</p>}
        {error && <p className="alert alert-info" role="status">{error}</p>}
        {!loading && !error && candidates.length === 0 && <div className="empty-state"><h2>Belum ada kandidat</h2><p>Pasangan calon belum didaftarkan untuk pemilihan ini.</p></div>}
        {candidates.length > 0 && <p className="results-note">
          <><i className="fa-solid fa-circle-info"></i><span>Profil dan program kerja pasangan calon untuk membantu pemilih mengenal kandidat.</span></>
        </p>}

        <div className="cand-grid">
          {candidates.map((c) => {
            const v = Number(c.votes) || 0
            return (
              <article key={c.number} className="cand-card glass reveal in">
                <div className="cand-photo">
                  <img src={c.photo_url || candidatePhoto(c)} alt={`Foto paslon ${c.number}: ${c.chair} dan ${c.viceChair}`} width="400" height="400" loading="lazy" />
                  <span className="cand-no" aria-label={`Nomor urut ${c.number}`}>{String(c.number).padStart(2, '0')}</span>
                </div>
                <div className="cand-body">
                  <div className="cand-pair">
                    <div>
                      <div className="cand-role">Calon Ketua</div>
                      <div className="cand-name">{c.chair}</div>
                      <div className="cand-class">Kelas {c.chairClass}</div>
                    </div>
                    <div>
                      <div className="cand-role">Calon Wakil Ketua</div>
                      <div className="cand-name">{c.viceChair}</div>
                      <div className="cand-class">Kelas {c.viceClass}</div>
                    </div>
                  </div>
                  <button className="btn btn-primary btn-block" type="button" onClick={() => setSelectedCandidate(c)}>
                    <i className="fa-solid fa-eye"></i> Lihat Profil &amp; Visi
                  </button>
                  {hasOfficialResults && (
                    <span className="badge tone-success vote-chip">
                      <i className="fa-solid fa-chart-simple"></i>{v.toLocaleString('id-ID')} suara · {formatPercent(v, totalVotes)}
                    </span>
                  )}
                </div>
              </article>
            )
          })}
        </div>

        <div className="page-end">
          <p>Sudah mengenal para kandidat? Pastikan Anda terdaftar di DPT dan gunakan hak suara Anda.</p>
          <div className="state-actions">
            <Link className="btn btn-ghost" to="/cek-dpt"><i className="fa-solid fa-id-card"></i> Cek DPT</Link>
          </div>
        </div>
      </section>

      {selectedCandidate && (
        <CandidateModal
          candidate={selectedCandidate}
          candidates={profileCandidates}
          onClose={() => setSelectedCandidate(null)}
        />
      )}
    </Layout>
  )
}
