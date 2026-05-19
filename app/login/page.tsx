'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (tab === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        router.push('/')
        router.refresh()
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: name } },
      })
      if (error) {
        setError(error.message)
      } else if (data.user && !data.session) {
        setMessage('Bestätigungs-E-Mail gesendet! Überprüfe dein Postfach.')
      } else {
        router.push('/')
        router.refresh()
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">✦</div>
          <h1 className="text-2xl font-bold tracking-tight">Clarity</h1>
          <p className="text-gray-500 text-sm mt-1">Communities</p>
        </div>

        <div className="flex rounded-xl bg-gray-900 p-1 mb-6">
          <button
            onClick={() => setTab('login')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'login' ? 'bg-purple-600 text-white' : 'text-gray-400'
            }`}
          >
            Anmelden
          </button>
          <button
            onClick={() => setTab('signup')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'signup' ? 'bg-purple-600 text-white' : 'text-gray-400'
            }`}
          >
            Registrieren
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {tab === 'signup' && (
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          )}
          <input
            type="email"
            placeholder="E-Mail"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
          <input
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />

          {error && <p className="text-red-400 text-sm px-1">{error}</p>}
          {message && <p className="text-green-400 text-sm px-1">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {loading ? '...' : tab === 'login' ? 'Anmelden' : 'Konto erstellen'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-600 mt-6">
          Gleiche Zugangsdaten wie in der Clarity App
        </p>
      </div>
    </div>
  )
}
