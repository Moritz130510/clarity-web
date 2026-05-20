'use client'

interface AvatarProps {
  photoUrl?: string | null
  emoji?: string | null
  size?: number
  border?: string
  borderRadius?: number | string
  bgColor?: string
}

export function Avatar({
  photoUrl,
  emoji,
  size = 40,
  border,
  borderRadius = '50%',
  bgColor = '#EDE9FE',
}: AvatarProps) {
  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius,
    backgroundColor: bgColor,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: Math.round(size * 0.5),
    overflow: 'hidden',
    flexShrink: 0,
    border,
  }

  if (photoUrl) {
    return (
      <div style={style}>
        <img
          src={photoUrl}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    )
  }

  return <div style={style}>{emoji ?? '😊'}</div>
}
