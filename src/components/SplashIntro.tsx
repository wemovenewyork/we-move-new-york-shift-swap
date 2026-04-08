'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Search, MapPin, ChevronRight, Bus, ArrowRight } from 'lucide-react'
import { DEPOTS, Depot, BOROUGH_COLORS, saveDepot, getSavedDepot, hasSeenIntro } from '@/lib/depots'
import clsx from 'clsx'

interface SplashIntroProps {
  onComplete: (depot: Depot) => void
}

type Phase = 'logo' | 'tagline' | 'cta' | 'depot' | 'done'

const BOROUGH_ORDER = ['Bronx', 'Brooklyn', 'Manhattan', 'Queens', 'Staten Island']

export default function SplashIntro({ onComplete }: SplashIntroProps) {
  const [phase, setPhase] = useState<Phase>('logo')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBorough, setSelectedBorough] = useState<string>('All')
  const [selectedDepot, setSelectedDepot] = useState<Depot | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Auto-advance animation phases
    const t1 = setTimeout(() => setPhase('tagline'), 1200)
    const t2 = setTimeout(() => setPhase('cta'), 2400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  useEffect(() => {
    if (phase === 'depot' && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 400)
    }
  }, [phase])

  const filteredDepots = DEPOTS.filter((d) => {
    const matchesBorough = selectedBorough === 'All' || d.borough === selectedBorough
    const matchesSearch = !searchQuery ||
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.routes.some((r) => r.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesBorough && matchesSearch
  }).sort((a, b) => a.name.localeCompare(b.name))

  const handleSelectDepot = (depot: Depot) => {
    setSelectedDepot(depot)
    setTimeout(() => {
      saveDepot(depot.id)
      setPhase('done')
      setTimeout(() => onComplete(depot), 600)
    }, 300)
  }

  return (
    <div
      className={clsx(
        'fixed inset-0 z-[100] flex flex-col transition-all duration-700',
        phase === 'done' ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100'
      )}
    >
      {/* PHASE 1–3: Animated intro */}
      {phase !== 'depot' && (
        <div className="absolute inset-0 bg-navy flex flex-col items-center justify-center overflow-hidden">
          {/* Background animated grid */}
          <div className="absolute inset-0 nyc-grid opacity-30" />

          {/* Animated transit lines */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal via-blue-500 via-mta-red to-purple-500 animate-gradient" />
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 via-mta-red via-blue-500 to-teal animate-gradient" style={{ animationDirection: 'reverse' }} />

          {/* Glow effect */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[700px] h-[700px] rounded-full bg-teal/10 blur-[120px]" />
          </div>

          <div className="relative z-10 flex flex-col items-center text-center px-6">
            {/* Logo */}
            <div
              className={clsx(
                'relative mb-8 transition-all duration-1000 ease-out',
                phase === 'logo' ? 'opacity-0 scale-75 translate-y-4' : 'opacity-100 scale-100 translate-y-0'
              )}
              style={{ transitionDelay: phase === 'logo' ? '0ms' : '0ms' }}
            >
              <div className="absolute inset-0 rounded-full blur-3xl bg-teal/20 scale-125" />
              <div
                className="absolute inset-0 animate-[spin_20s_linear_infinite] opacity-10"
                style={{ backgroundImage: 'repeating-conic-gradient(rgba(27,153,139,0.1) 0% 10%, transparent 10% 20%)' }}
              />
              <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-3xl overflow-hidden bg-white shadow-2xl">
                <Image
                  src="/logo.png"
                  alt="We Move New York"
                  fill
                  className="object-contain p-3"
                  priority
                />
              </div>
            </div>

            {/* Title */}
            <div
              className={clsx(
                'transition-all duration-700 ease-out',
                phase === 'logo' ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'
              )}
            >
              <p className="font-display font-black text-5xl md:text-7xl uppercase text-white tracking-tight leading-none mb-2">
                We Move
              </p>
              <p className="font-display font-black text-5xl md:text-7xl uppercase leading-none mb-4">
                <span className="text-teal">New York</span>
              </p>
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="h-px flex-1 max-w-[80px] bg-white/20" />
                <p className="font-display font-bold text-xl uppercase tracking-[0.3em] text-white/60">
                  Shift Swap
                </p>
                <div className="h-px flex-1 max-w-[80px] bg-white/20" />
              </div>
            </div>

            {/* CTA */}
            <div
              className={clsx(
                'transition-all duration-700 ease-out',
                phase === 'cta' || phase === 'tagline'
                  ? phase === 'cta' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  : 'opacity-0 translate-y-4'
              )}
            >
              <p className="text-gray-400 mb-6 text-lg">
                Connect with operators across all five boroughs
              </p>
              <button
                onClick={() => setPhase('depot')}
                className="group inline-flex items-center gap-3 px-10 py-4 bg-teal text-white font-black text-lg rounded-2xl hover:bg-teal-400 transition-all duration-200 shadow-glow hover:shadow-xl hover:scale-105"
              >
                <Bus className="w-5 h-5" />
                Select Your Depot
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHASE 4: Depot Selection */}
      <div
        className={clsx(
          'absolute inset-0 flex flex-col bg-gray-50 transition-all duration-500',
          phase === 'depot' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full pointer-events-none'
        )}
      >
        {/* Header */}
        <div className="bg-navy text-white px-4 py-6 md:py-8 flex-shrink-0">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative w-12 h-12 flex-shrink-0 rounded-xl overflow-hidden bg-white p-0.5">
                <Image src="/logo.png" alt="We Move New York" fill className="object-contain" />
              </div>
              <div>
                <p className="font-display font-black text-xl md:text-2xl uppercase text-white leading-tight">
                  We Move New York
                </p>
                <p className="text-teal-300 text-xs font-semibold uppercase tracking-widest">
                  Shift Swap
                </p>
              </div>
            </div>
            <h1 className="font-display font-black text-3xl md:text-4xl uppercase text-white mb-1">
              Choose Your Depot
            </h1>
            <p className="text-gray-400 text-sm">Select your home depot to get started</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
          <div className="max-w-5xl mx-auto space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search depot name or route..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10 py-2.5 text-sm"
              />
            </div>

            {/* Borough Filter */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
              {['All', ...BOROUGH_ORDER].map((b) => (
                <button
                  key={b}
                  onClick={() => setSelectedBorough(b)}
                  className={clsx(
                    'flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200',
                    selectedBorough === b
                      ? b === 'All'
                        ? 'bg-navy text-white'
                        : clsx(BOROUGH_COLORS[b]?.bg || 'bg-gray-600', 'text-white')
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Depot Grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 py-4">
            {filteredDepots.length === 0 ? (
              <div className="text-center py-16">
                <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No depots match your search</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredDepots.map((depot) => (
                  <DepotCard
                    key={depot.id}
                    depot={depot}
                    selected={selectedDepot?.id === depot.id}
                    onSelect={() => handleSelectDepot(depot)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function DepotCard({ depot, selected, onSelect }: { depot: Depot; selected: boolean; onSelect: () => void }) {
  const boroughColors = BOROUGH_COLORS[depot.borough]

  return (
    <button
      onClick={onSelect}
      className={clsx(
        'w-full text-left rounded-2xl border-2 overflow-hidden transition-all duration-200 group hover:scale-[1.02] hover:shadow-card-hover',
        selected
          ? 'border-teal shadow-glow scale-[1.02]'
          : 'border-gray-200 bg-white hover:border-gray-300'
      )}
    >
      {/* Top color bar */}
      <div
        className="h-2 w-full"
        style={{ background: `linear-gradient(90deg, ${depot.color}, ${depot.color}88)` }}
      />

      <div className="p-4 bg-white">
        <div className="flex items-start gap-3 mb-3">
          {/* Depot Icon */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-white text-sm flex-shrink-0 shadow-sm"
            style={{ backgroundColor: depot.color }}
          >
            {depot.code}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-bold text-navy text-sm leading-tight">{depot.name}</p>
            <span
              className={clsx(
                'inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold',
                `${boroughColors?.bg || 'bg-gray-500'} text-white`
              )}
            >
              {depot.borough}
            </span>
          </div>

          <ChevronRight className={clsx(
            'w-4 h-4 flex-shrink-0 mt-1 transition-all',
            selected ? 'text-teal translate-x-1' : 'text-gray-300 group-hover:text-gray-400'
          )} />
        </div>

        {/* Routes */}
        <div className="flex flex-wrap gap-1">
          {depot.routes.slice(0, 6).map((route) => (
            <span
              key={route}
              className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white"
              style={{ backgroundColor: depot.color + 'CC' }}
            >
              {route}
            </span>
          ))}
          {depot.routes.length > 6 && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-500">
              +{depot.routes.length - 6}
            </span>
          )}
        </div>

        {/* Division badge */}
        <p className="text-xs text-gray-400 mt-2 font-medium">{depot.division}</p>
      </div>
    </button>
  )
}
