import { Route, Routes } from 'react-router-dom'

function ScaffoldPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center px-6">
      <div>
        <p className="font-medium text-indigo-600">Platform E-Voting Sekolah</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-800">
          Scaffold frontend siap dikembangkan
        </h1>
      </div>
    </main>
  )
}

function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center px-6">
      <h1 className="text-2xl font-semibold text-slate-800">Halaman tidak ditemukan</h1>
    </main>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ScaffoldPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
