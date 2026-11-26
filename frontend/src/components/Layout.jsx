import { useEffect } from 'react'
import Navbar from './Navbar'
import Footer from './Footer'

export default function Layout({ children }) {
  useEffect(() => {
    const targets = document.querySelectorAll('.reveal:not(.in)')

    if (!('IntersectionObserver' in window)) {
      targets.forEach((element) => element.classList.add('in'))
      return undefined
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.12 })

    targets.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <Navbar />
      <main style={{ flex: 1 }}>
        {children}
      </main>
      <Footer />
    </>
  )
}
