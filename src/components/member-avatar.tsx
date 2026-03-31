"use client"

import { useState } from "react"
import { User } from "lucide-react"

const sizes = {
  sm: { dims: "h-9 w-9", icon: "h-4 w-4", ring: "ring-1" },
  md: { dims: "h-10 w-10", icon: "h-4 w-4", ring: "ring-1" },
  lg: { dims: "h-20 w-20", icon: "h-8 w-8", ring: "ring-2" },
} as const

export function MemberAvatar({ src, alt, size = "md" }: { readonly src: string | null; readonly alt: string; readonly size?: keyof typeof sizes }) {
  const [failed, setFailed] = useState(false)
  const { dims, icon, ring } = sizes[size]

  if (!src || failed) {
    return (
      <div className={`flex ${dims} items-center justify-center rounded-full bg-muted ${ring} ring-border`}>
        <User className={`${icon} text-muted-foreground`} />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`${dims} rounded-full object-cover ${ring} ring-border`}
      onError={() => setFailed(true)}
    />
  )
}
