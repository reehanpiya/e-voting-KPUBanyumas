import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const NAV_LINKS = [
  { to: '/', label: 'Beranda', nav: 'index' },
  { to: '/kandidat', label: 'Profil Paslon', nav: 'kandidat' },
  { to: '/jadwal', label: 'Jadwal Pemilihan', nav: 'jadwal' },
  { to: '/cek-dpt', label: 'Cek DPT', nav: 'cek-dpt' },
  { to: '/registrasi', label: 'Registrasi Sekolah', nav: 'registrasi' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link className="brand" to="/" aria-label="KPU Kabupaten Banyumas - Beranda">
          <img className="brand-logo" src="/logo-kpu-banyumas.png" alt="Logo KPU Kabupaten Banyumas" width="44" height="44" />
          <span>KPU Kabupaten Banyumas<small>E-VOTING OSIS</small></span>
        </Link>

        <button
          className="hamburger"
          type="button"
          aria-label={open ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
          aria-expanded={open}
          aria-controls="navLinks"
          onClick={() => setOpen(!open)}
        >
          <i className={`fa-solid ${open ? 'fa-xmark' : 'fa-bars'}`}></i>
        </button>

        <ul className={`nav-links${open ? ' open' : ''}`} id="navLinks">
          {NAV_LINKS.map(link => (
            <li key={link.nav}>
              <Link
                to={link.to}
                className={location.pathname === link.to ? 'active' : ''}
                aria-current={location.pathname === link.to ? 'page' : undefined}
                onClick={() => setOpen(false)}
              >
                {link.icon && <i className={link.icon}></i>}
                {link.label}
              </Link>
            </li>
          ))}
          <li>
            <Link
              className={`cta${location.pathname === '/verifikasi' ? ' active' : ''}`}
              to="/verifikasi"
              onClick={() => setOpen(false)}
            >
              <i className="fa-solid fa-qrcode"></i> Verifikasi Siswa
            </Link>
          </li>
        </ul>
      </div>
    </header>
  )
}
