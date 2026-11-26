import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="brand" style={{ marginBottom: '12px' }}>
              <img className="brand-logo" src="/logo-kpu-banyumas.png" alt="Logo KPU Kabupaten Banyumas" width="44" height="44" />
              <span>KPU Kabupaten Banyumas<small>E-VOTING OSIS</small></span>
            </div>
            <p>Platform pemilihan Ketua dan Wakil Ketua OSIS secara digital yang jujur, transparan, dan menjaga kerahasiaan pilihan.</p>
          </div>
          <div>
            <h4>Navigasi</h4>
            <ul>
              <li><Link to="/">Beranda</Link></li>
              <li><Link to="/kandidat">Profil Paslon</Link></li>
              <li><Link to="/jadwal">Jadwal Pemilihan</Link></li>
              <li><Link to="/cek-dpt">Cek DPT</Link></li>
              <li><Link to="/registrasi">Registrasi Sekolah</Link></li>
              <li><Link to="/admin">Dashboard Petugas</Link></li>
            </ul>
          </div>
          <div>
            <h4>Informasi</h4>
            <ul>
              <li><i className="fa-solid fa-location-dot"></i><span>Jl. H.M. Bachroen, Berkoh, Kecamatan Purwokerto Selatan, Kabupaten Banyumas, Jawa Tengah 53146</span></li>
              <li><i className="fa-solid fa-envelope"></i><a href="mailto:kpubanyumas@gmail.com">kpubanyumas@gmail.com</a></li>
              <li><i className="fa-solid fa-phone"></i><a href="tel:0895353323000">0895-3533-23000</a></li>
              <li><i className="fa-regular fa-clock"></i><span>Layanan KPU: Senin–Jumat, 08.00–16.00 WIB</span></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} KPU Kabupaten Banyumas.</span>
          <span>Penyimpanan data berbasis LocalStorage peramban.</span>
        </div>
      </div>
    </footer>
  )
}
