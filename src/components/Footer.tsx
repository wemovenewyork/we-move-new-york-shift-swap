import Link from 'next/link'
import Image from 'next/image'
import { Bus, ArrowLeftRight, Heart } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-navy text-white">
      {/* Top strip */}
      <div className="h-1 bg-gradient-to-r from-teal via-mta-blue to-mta-red" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-white p-0.5 flex-shrink-0">
                <Image
                  src="/logo.png"
                  alt="We Move New York"
                  fill
                  className="object-contain"
                />
              </div>
              <div>
                <p className="font-display font-black text-base uppercase tracking-wider leading-tight">
                  We Move New York
                </p>
                <p className="font-display font-semibold text-xs uppercase tracking-widest text-teal-300">
                  Shift Swap
                </p>
              </div>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed">
              The unofficial shift swap platform for MTA bus operators across all five boroughs.
              Built by operators, for operators.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-display font-bold text-sm uppercase tracking-widest text-teal-300 mb-4">
              Quick Links
            </h3>
            <ul className="space-y-2">
              {[
                { href: '/', label: 'Home' },
                { href: '/browse', label: 'Browse Swaps' },
                { href: '/post', label: 'Post a Swap' },
                { href: '/my-swaps', label: 'My Swaps' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-teal-300 text-sm transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Swap Types */}
          <div>
            <h3 className="font-display font-bold text-sm uppercase tracking-widest text-teal-300 mb-4">
              Swap Categories
            </h3>
            <ul className="space-y-2">
              {[
                { label: 'Switch Work Day', color: 'bg-blue-500' },
                { label: 'Switch Day Off', color: 'bg-teal' },
                { label: 'Switch Vacation Week', color: 'bg-purple-500' },
              ].map((item) => (
                <li key={item.label} className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${item.color}`} />
                  <span className="text-gray-400 text-sm">{item.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-xs text-center sm:text-left">
            © {new Date().getFullYear()} We Move New York Shift Swap. Not affiliated with MTA.
          </p>
          <p className="flex items-center gap-1.5 text-gray-500 text-xs">
            Made with <Heart className="w-3.5 h-3.5 text-mta-red fill-mta-red" /> for NYC operators
          </p>
        </div>
      </div>
    </footer>
  )
}
