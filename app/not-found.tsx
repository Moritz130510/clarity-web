import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500 mb-4">Community nicht gefunden</p>
        <Link href="/" className="text-purple-400 hover:text-purple-300 text-sm">
          ← Zurück zur Übersicht
        </Link>
      </div>
    </div>
  )
}
