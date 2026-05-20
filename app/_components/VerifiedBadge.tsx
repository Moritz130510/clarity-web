'use client'

export function VerifiedBadge({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ display: 'inline-block', flexShrink: 0 }}
      aria-label="Verified"
    >
      <path
        d="M12 1.5L14.39 3.42L17.45 3.05L18.83 5.82L21.5 7.2L21.13 10.26L23.05 12.65L21.13 15.05L21.5 18.1L18.83 19.48L17.45 22.26L14.39 21.88L12 23.8L9.61 21.88L6.55 22.26L5.17 19.48L2.5 18.1L2.87 15.05L0.95 12.65L2.87 10.26L2.5 7.2L5.17 5.82L6.55 3.05L9.61 3.42L12 1.5Z"
        fill="#1D9BF0"
      />
      <path
        d="M9 12.5L11 14.5L15.5 10"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
