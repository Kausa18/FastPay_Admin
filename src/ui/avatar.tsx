import { useState } from 'react'

export function Avatar({ name, photo, large = false }: { name: string; photo?: string | null; large?: boolean }) {
  const [failed, setFailed] = useState<string | null>(null)
  const safe = photo && /^(https?:\/\/|data:image\/(png|jpeg|webp);base64,)/i.test(photo) && failed !== photo
  return <span className={`profile-avatar${large ? ' large' : ''}`}>
    {safe ? <img src={photo} alt={`${name}'s profile`} onError={() => setFailed(photo)} referrerPolicy="no-referrer" /> : <span aria-label={name}>{name.trim().slice(0, 2).toUpperCase() || '?'}</span>}
  </span>
}
