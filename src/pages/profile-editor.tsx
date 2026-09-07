import { useState, type FormEvent } from 'react'
import { api } from '../api'
import { ActionError, Modal, useAsyncAction } from '../components'
import type { AdminUser } from '../types'
import { Avatar } from '../ui/avatar'

async function preparePhoto(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPEG, PNG or WebP image.')
  if (file.size > 10 * 1024 * 1024) throw new Error('Choose an image smaller than 10 MB.')
  const bitmap = await createImageBitmap(file)
  try {
    const canvas = document.createElement('canvas')
    const ratio = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height))
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio))
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio))
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.85)
  } finally { bitmap.close() }
}

export function ProfileEditor({ admin, onClose, onSaved }: { admin: AdminUser; onClose: () => void; onSaved: (admin: AdminUser) => void }) {
  const [name, setName] = useState(admin.fullName || '')
  const [photo, setPhoto] = useState(admin.profilePhoto || null)
  const [photoError, setPhotoError] = useState('')
  const [preparing, setPreparing] = useState(false)
  const action = useAsyncAction()
  const busy = action.busy || preparing
  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (busy || photoError) return
    const result = await action.run(() => api<AdminUser>('/admin/auth/profile', { method: 'PUT', body: JSON.stringify({ fullName: name.trim(), profilePhoto: photo }) }))
    if (result) onSaved(result)
  }
  return <Modal title="Edit your profile" description="Update the name and photo shown on your administrator account." onClose={onClose} busy={busy}>
    <form className="modal-form" onSubmit={save}>
      <div className="profile-photo-editor"><Avatar name={name || admin.email} photo={photo} large />
        <label>Profile picture<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={async event => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (!file) return
          setPreparing(true); setPhotoError('')
          try { setPhoto(await preparePhoto(file)) } catch (error) { setPhotoError(error instanceof Error ? error.message : 'Unable to read this image. Try another photo.') } finally { setPreparing(false) }
        }} /><small>{preparing ? 'Preparing image…' : 'JPEG, PNG or WebP, up to 10 MB. Images are resized before saving.'}</small></label>
      </div>
      {photo && <button type="button" className="button secondary" disabled={busy} onClick={() => { setPhoto(null); setPhotoError('') }}>Remove photo</button>}
      <label>Full name<input name="fullName" value={name} onChange={event => setName(event.target.value)} minLength={2} maxLength={150} required disabled={busy} autoComplete="name" /></label>
      <label>Email<input value={admin.email} readOnly /></label>
      <ActionError message={photoError || action.error} />
      <div className="modal-actions"><button type="button" className="button secondary" disabled={busy} onClick={onClose}>Cancel</button><button className="button primary" disabled={busy || !!photoError || name.trim().length < 2}>{action.busy ? 'Saving…' : 'Save profile'}</button></div>
    </form>
  </Modal>
}

