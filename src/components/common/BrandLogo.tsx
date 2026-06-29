import { useState } from 'react'

type BrandLogoProps = {
  size?: number
  className?: string
  imageClassName?: string
  alt?: string
}

export function BrandLogo({
  size = 40,
  className = '',
  imageClassName = '',
  alt = 'Akashara logo',
}: BrandLogoProps) {
  const [failed, setFailed] = useState(false)

  return (
    <div
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-full bg-white/[0.08] ${className}`}
      style={{ width: size, height: size }}
    >
      {!failed ? (
        <img
          src="/logo.png"
          alt={alt}
          className={`h-full w-full object-contain ${imageClassName}`}
          loading="eager"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="font-heading text-lg italic text-white">a</span>
      )}
    </div>
  )
}
