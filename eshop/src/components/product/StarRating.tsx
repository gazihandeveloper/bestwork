// ============================================
// BestWork - Yıldız Değerlendirme
// ============================================

import { Star } from '@/lib/google-icons'

interface StarRatingProps {
  rating: number
  reviewCount?: number
  size?: number
}

export function StarRating({ rating, reviewCount, size = 14 }: StarRatingProps) {
  const fullStars = Math.floor(rating)
  const hasHalf = rating - fullStars >= 0.5
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0)

  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {/* Dolu yıldızlar */}
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star
            key={`full-${i}`}
            size={size}
            className="text-yellow-400 fill-yellow-400"
          />
        ))}
        {/* Yarım yıldız */}
        {hasHalf && (
          <span className="relative">
            <Star size={size} className="text-gray-300" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
              <Star size={size} className="text-yellow-400 fill-yellow-400" />
            </span>
          </span>
        )}
        {/* Boş yıldızlar */}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <Star key={`empty-${i}`} size={size} className="text-gray-300" />
        ))}
      </div>
      {reviewCount !== undefined && (
        <span className="text-xs text-gray-500 ml-1">({reviewCount})</span>
      )}
    </div>
  )
}
