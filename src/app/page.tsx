'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight,
  ArrowLeftRight,
  Bus,
  Calendar,
  Palmtree,
  CheckCircle2,
  Users,
  TrendingUp,
  Search,
  ChevronRight,
} from 'lucide-react'
import SwapCard from '@/components/SwapCard'
import { getSwaps } from '@/lib/data'
import { SwapPost, CATEGORY_LABELS } from '@/lib/types'

const CATEGORY_INFO = [
  {
    key: 'work_day' as const,
    icon: <ArrowLeftRight className="w-8 h-8" />,
    title: 'Switch Work Day',
    description: 'Swap your scheduled work day with a fellow operator. Great for appointments, events, or personal matters.',
    color: 'from-blue-500 to-blue-700',
    bg: 'bg-blue-50',
    iconBg: 'bg-blue-500',
    link: '/browse?category=work_day',
  },
  {
    key: 'day_off' as const,
    icon: <Calendar className="w-8 h-8" />,
    title: 'Switch Day Off',
    description: 'Trade your day off with a colleague who needs yours. Keep your schedule flexible.',
    color: 'from-teal-400 to-teal-600',
    bg: 'bg-teal-50',
    iconBg: 'bg-teal',
    link: '/browse?category=day_off',
  },
  {
    key: 'vacation_week' as const,
    icon: <Palmtree className="w-8 h-8" />,
    title: 'Switch Vacation Week',
    description: 'Exchange your vacation week with another operator. Perfect for school breaks and family travel.',
    color: 'from-purple-500 to-purple-700',
    bg: 'bg-purple-50',
    iconBg: 'bg-purple-500',
    link: '/browse?category=vacation_week',
  },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Post Your Swap',
    description: 'List the shift, day off, or vacation week you want to swap. Include your badge number, route, and what you\'re looking for.',
    icon: <ArrowLeftRight className="w-6 h-6" />,
  },
  {
    step: '02',
    title: 'Find a Match',
    description: 'Browse listings from operators across all divisions. Filter by category, division, or date to find the right match.',
    icon: <Search className="w-6 h-6" />,
  },
  {
    step: '03',
    title: 'Connect & Confirm',
    description: 'Contact the operator directly using the info provided. Confirm the swap and handle it through your depot per standard procedures.',
    icon: <CheckCircle2 className="w-6 h-6" />,
  },
]

export default function HomePage() {
  const [recentSwaps, setRecentSwaps] = useState<SwapPost[]>([])
  const [counts, setCounts] = useState({ total: 0, work_day: 0, day_off: 0, vacation_week: 0 })

  useEffect(() => {
    const swaps = getSwaps()
    const openSwaps = swaps.filter((s) => s.status === 'open')
    setRecentSwaps(openSwaps.slice(0, 6))
    setCounts({
      total: openSwaps.length,
      work_day: openSwaps.filter((s) => s.category === 'work_day').length,
      day_off: openSwaps.filter((s) => s.category === 'day_off').length,
      vacation_week: openSwaps.filter((s) => s.category === 'vacation_week').length,
    })
  }, [])

  return (
    <div className="pt-16 md:pt-20">
      {/* HERO */}
      <section className="relative bg-hero-gradient nyc-grid overflow-hidden min-h-[90vh] flex items-center">
        {/* Background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-teal/10 blur-[120px] pointer-events-none" />

        {/* Decorative transit line */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-teal via-mta-blue via-mta-red to-purple-500" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            {/* Text */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-teal-300 text-sm font-semibold mb-6">
                <span className="w-2 h-2 rounded-full bg-teal-300 pulse-dot" />
                {counts.total} Active Swaps Available
              </div>

              <h1 className="font-display font-black text-white text-5xl md:text-6xl xl:text-7xl uppercase tracking-tight leading-none mb-6">
                Shift Swap
                <br />
                <span className="text-teal-300">Made Easy</span>
              </h1>

              <p className="text-gray-300 text-lg md:text-xl leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">
                The dedicated platform for MTA bus operators to post and find shift swaps.
                Switch work days, days off, or vacation weeks — all in one place.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  href="/browse"
                  className="btn-primary text-base px-8 py-4 shadow-glow"
                >
                  <Search className="w-5 h-5" />
                  Browse Swaps
                </Link>
                <Link
                  href="/post"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-all duration-200 border border-white/20 text-base"
                >
                  <ArrowLeftRight className="w-5 h-5" />
                  Post a Swap
                </Link>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6 mt-10 justify-center lg:justify-start flex-wrap">
                <div className="text-center">
                  <p className="font-display font-black text-3xl text-white">{counts.work_day}</p>
                  <p className="text-gray-400 text-xs uppercase tracking-wide">Work Day</p>
                </div>
                <div className="w-px h-10 bg-white/20" />
                <div className="text-center">
                  <p className="font-display font-black text-3xl text-teal-300">{counts.day_off}</p>
                  <p className="text-gray-400 text-xs uppercase tracking-wide">Day Off</p>
                </div>
                <div className="w-px h-10 bg-white/20" />
                <div className="text-center">
                  <p className="font-display font-black text-3xl text-purple-400">{counts.vacation_week}</p>
                  <p className="text-gray-400 text-xs uppercase tracking-wide">Vacation</p>
                </div>
              </div>
            </div>

            {/* Logo */}
            <div className="flex-shrink-0 flex flex-col items-center">
              <div className="relative w-72 h-72 md:w-96 md:h-96 rounded-3xl overflow-hidden bg-white shadow-2xl">
                <Image
                  src="/logo.png"
                  alt="We Move New York"
                  fill
                  className="object-contain p-4"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-teal font-semibold text-sm uppercase tracking-widest mb-2">
              Swap Categories
            </p>
            <h2 className="section-heading text-4xl md:text-5xl">Three Ways to Swap</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {CATEGORY_INFO.map((cat) => (
              <Link
                key={cat.key}
                href={cat.link}
                className="group card p-6 hover:scale-[1.02] transition-all duration-300"
              >
                <div className={`w-14 h-14 rounded-2xl ${cat.iconBg} text-white flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  {cat.icon}
                </div>
                <h3 className="font-display font-bold text-xl text-navy mb-2">{cat.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-4">{cat.description}</p>
                <div className="flex items-center gap-1 text-teal font-semibold text-sm group-hover:gap-2 transition-all">
                  Browse {CATEGORY_LABELS[cat.key]} swaps
                  <ChevronRight className="w-4 h-4" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 bg-navy text-white relative overflow-hidden nyc-grid">
        <div className="absolute inset-0 bg-navy/90" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-14">
            <p className="text-teal-300 font-semibold text-sm uppercase tracking-widest mb-2">
              Simple Process
            </p>
            <h2 className="font-display font-black text-4xl md:text-5xl uppercase text-white">
              How It Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} className="relative">
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+3rem)] w-[calc(100%-6rem)] h-px bg-white/10" />
                )}
                <div className="text-center px-4">
                  <div className="relative inline-flex mb-5">
                    <div className="w-16 h-16 rounded-2xl bg-teal/20 border border-teal/30 flex items-center justify-center text-teal-300">
                      {step.icon}
                    </div>
                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-teal flex items-center justify-center text-white text-xs font-black">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-xl text-white mb-3">{step.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/post"
              className="btn-primary text-base px-10 py-4 shadow-glow"
            >
              Post Your First Swap
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* RECENT SWAPS */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
            <div>
              <p className="text-teal font-semibold text-sm uppercase tracking-widest mb-2">
                Latest Listings
              </p>
              <h2 className="section-heading text-4xl md:text-5xl">Recent Swaps</h2>
            </div>
            <Link
              href="/browse"
              className="flex items-center gap-2 text-teal font-semibold hover:gap-3 transition-all"
            >
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {recentSwaps.length === 0 ? (
            <div className="text-center py-20">
              <Bus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium">No swaps posted yet</p>
              <Link href="/post" className="btn-primary mt-4 inline-flex">
                Be the first to post
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentSwaps.map((swap) => (
                <SwapCard key={swap.id} swap={swap} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="py-16 bg-gradient-to-r from-teal to-mta-blue text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display font-black text-3xl md:text-4xl uppercase text-white mb-4">
            Need a Swap?
          </h2>
          <p className="text-white/80 text-lg mb-8">
            Post your swap in under 2 minutes. Connect with operators across all five boroughs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/post"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-teal font-bold text-base rounded-xl hover:bg-gray-50 transition-all duration-200 shadow-lg"
            >
              <ArrowLeftRight className="w-5 h-5" />
              Post a Swap Now
            </Link>
            <Link
              href="/browse"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white/20 text-white font-bold text-base rounded-xl hover:bg-white/30 transition-all duration-200 border border-white/30"
            >
              <Search className="w-5 h-5" />
              Browse All Swaps
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
