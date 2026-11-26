import { Navigate, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '../components/Toast'
import Beranda from '../pages/Beranda'
import Kandidat from '../pages/Kandidat'
import Jadwal from '../pages/Jadwal'
import CekDpt from '../pages/CekDpt'
import Registrasi from '../pages/Registrasi'
import Verifikasi from '../pages/Verifikasi'
import BilikSuara from '../pages/BilikSuara'
import Admin from '../pages/AdminApi'
import { readSession, STORAGE_KEYS } from '../store/store'

function BoothAccess() {
  const session = readSession(STORAGE_KEYS.ADMIN_SESSION, null)
  if (session?.role !== 'admin_sekolah') {
    return (
      <main className="container section" style={{ minHeight: '70vh', display: 'grid', placeItems: 'center' }}>
        <div className="form-card glass" role="alert">
          <h1>Akses petugas diperlukan</h1>
          <p>Bilik suara hanya dapat dibuka dari sesi petugas sekolah yang sudah masuk.</p>
          <a className="btn btn-primary" href="/admin">Masuk sebagai petugas</a>
        </div>
      </main>
    )
  }
  return <BilikSuara />
}

function NotFoundPage() {
  return (
    <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', color: 'var(--navy)' }}>Halaman tidak ditemukan</h1>
        <a href="/" style={{ color: 'var(--primary)', fontWeight: '600', marginTop: '12px', display: 'block' }}>← Kembali ke Beranda</a>
      </div>
    </main>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<Beranda />} />
        <Route path="/kandidat" element={<Kandidat />} />
        <Route path="/jadwal" element={<Jadwal />} />
        <Route path="/cek-dpt" element={<CekDpt />} />
        <Route path="/registrasi" element={<Registrasi />} />
        <Route path="/verifikasi" element={<Verifikasi />} />
        <Route path="/booth" element={<BoothAccess />} />
        <Route path="/bilik-suara" element={<Navigate to="/booth" replace />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ToastProvider>
  )
}
