'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, X, Bus, ArrowLeftRight, MapPin } from 'lucide-react'
import clsx from 'clsx'
import { getSavedDepot, Depot, DEPOT_STORAGE_KEY, INTRO_SEEN_KEY } from '@/lib/depots'

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/browse', label: 'Browse Swaps' },
  { href: '/post', label: 'Post a Swap' },
  { href: '/my-swaps', label: 'My Swaps' },
]

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [depot, setDepot] = useState<Depot | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    setDepot(getSavedDepot())
    const handleStorage = () => setDepot(getSavedDepot())
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const handleChangeDepot = () => {
    localStorage.removeItem(DEPOT_STORAGE_KEY)
    localStorage.removeItem(INTRO_SEEN_KEY)
    window.location.reload()
  }

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  return (
    <nav
      className={clsx(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-100'
          : 'bg-navy'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 flex-shrink-0">
            <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-xl overflow-hidden bg-white p-0.5 shadow-sm flex-shrink-0">
              <Image
                src="/logo.png"
                alt="We Move New York Logo"
                fill
                className="object-contain"
                priority
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                }}
              />
              {/* Fallback icon */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 has-[img[style*='display: none']]:opacity-100">
                <Bus className="w-8 h-8 text-teal" />
              </div>
            </div>
            <div className="flex flex-col leading-tight">
              <span
                className={clsx(
                  'font-display font-black text-sm md:text-base uppercase tracking-wider leading-none',
                  scrolled ? 'text-navy' : 'text-white'
                )}
              >
                We Move New York
              </span>
              <span
                className={clsx(
                  'font-display font-semibold text-xs uppercase tracking-widest',
                  scrolled ? 'text-teal' : 'text-teal-300'
                )}
              >
                Shift Swap
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  'px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200',
                  pathname === link.href
                    ? scrolled
                      ? 'bg-teal text-white'
                      : 'bg-white/20 text-white'
                    : scrolled
                    ? 'text-navy hover:bg-gray-100'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                )}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/post"
              className="ml-3 inline-flex items-center gap-2 px-5 py-2.5 bg-teal text-white font-bold text-sm rounded-xl hover:bg-teal-500 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <ArrowLeftRight className="w-4 h-4" />
              Post Swap
            </Link>
            {depot && (
              <button
                onClick={handleChangeDepot}
                title={`Depot: ${depot.name} — Click to change`}
                className={clsx(
                  'ml-2 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 border',
                  scrolled
                    ? 'bg-gray-50 border-gray-200 text-navy hover:bg-gray-100'
                    : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                )}
              >
                <MapPin className="w-3.5 h-3.5" />
                {depot.code}
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={clsx(
              'md:hidden p-2 rounded-lg transition-colors',
              scrolled ? 'text-navy hover:bg-gray-100' : 'text-white hover:bg-white/10'
            )}
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={clsx(
          'md:hidden overflow-hidden transition-all duration-300',
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className={clsx('px-4 pb-4 pt-2 space-y-1', scrolled ? 'bg-white' : 'bg-navy')}>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                'block px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200',
                pathname === link.href
                  ? 'bg-teal text-white'
                  : scrolled
                  ? 'text-navy hover:bg-gray-50'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              )}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/post"
            className="flex items-center justify-center gap-2 px-4 py-3 bg-teal text-white font-bold text-sm rounded-xl mt-2"
          >
            <ArrowLeftRight className="w-4 h-4" />
            Post a Swap
          </Link>
        </div>
      </div>
    </nav>
  )
}
