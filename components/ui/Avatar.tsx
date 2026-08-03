import Image from 'next/image'
import styles from './Avatar.module.css'

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

interface AvatarProps {
  src?:         string | null
  alt?:         string
  displayName?: string | null
  username?:    string | null
  size?:        AvatarSize
  className?:   string
  online?:      boolean
}

const sizeMap: Record<AvatarSize, number> = {
  xs:    24,
  sm:    32,
  md:    40,
  lg:    56,
  xl:    80,
  '2xl': 112,
}

function getInitials(displayName?: string | null, username?: string | null) {
  const name = displayName ?? username ?? '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function getColor(name?: string | null) {
  const colors = [
    '#c084fc', '#38bdf8', '#fb923c', '#4ade80',
    '#f472b6', '#a78bfa', '#34d399', '#fbbf24',
  ]
  const idx = (name?.charCodeAt(0) ?? 0) % colors.length
  return colors[idx]
}

export function Avatar({
  src,
  alt,
  displayName,
  username,
  size = 'md',
  className = '',
  online,
}: AvatarProps) {
  const px       = sizeMap[size]
  const initials = getInitials(displayName, username)
  const color    = getColor(displayName ?? username)
  // CSS module classes can't start with a digit — map '2xl' → 'size2xl'
  const sizeClass = size === '2xl' ? styles.size2xl : styles[size as Exclude<AvatarSize, '2xl'>]

  return (
    <span
      className={[styles.root, sizeClass, className].join(' ')}
      style={{ '--avatar-color': color } as React.CSSProperties}
    >
      {src ? (
        <Image
          src={src}
          alt={alt ?? displayName ?? username ?? 'Avatar'}
          width={px}
          height={px}
          className={styles.img}
        />
      ) : (
        <span className={styles.initials} aria-label={alt ?? initials}>
          {initials}
        </span>
      )}
      {online !== undefined && (
        <span className={[styles.badge, online ? styles.online : styles.offline].join(' ')} />
      )}
    </span>
  )
}
