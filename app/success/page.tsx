export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <div className="text-6xl mb-6">🎉</div>
        <h1 className="text-3xl font-bold mb-4">Willkommen!</h1>
        <p className="text-gray-400 mb-8 leading-relaxed">
          Deine Zahlung war erfolgreich. Öffne die <strong className="text-white">Clarity App</strong> — du hast automatisch Zugang zur Community.
        </p>
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 text-sm text-gray-400">
          <p>Noch keine App?</p>
          <p className="mt-1">Suche <span className="text-purple-400 font-semibold">„Clarity"</span> im App Store.</p>
        </div>
      </div>
    </div>
  )
}
