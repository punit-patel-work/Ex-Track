import React from 'react'
import * as LucideIcons from 'lucide-react'

interface CategoryIconProps {
  name: string
  className?: string
  size?: number
}

export default function CategoryIcon({ name, className = '', size = 16 }: CategoryIconProps) {
  // Fallback to HelpCircle if icon name is invalid or not found
  const IconComponent = (LucideIcons as any)[name] || LucideIcons.HelpCircle

  return <IconComponent className={className} size={size} />
}
