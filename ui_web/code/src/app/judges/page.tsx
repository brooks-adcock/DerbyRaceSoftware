'use client'

import { useState, useEffect } from 'react'
import { Container } from '@/components/container'
import { Heading, Subheading } from '@/components/text'
import { Button } from '@/components/button'
import { Breadcrumb } from '@/components/breadcrumb'
import { Judge, RaceSettings } from '@/lib/storage'
import { XMarkIcon, PlusIcon, QrCodeIcon } from '@heroicons/react/20/solid'
import QRCode from 'qrcode'

interface QRModalProps {
  judge: Judge
  local_ip: string
  onClose: () => void
}

function QRModal({ judge, local_ip, onClose }: QRModalProps) {
  const [qr_url, set_qr_url] = useState<string>('')
  const judge_url = local_ip ? `http://${local_ip}/judging?judge=${judge.id}` : ''

  useEffect(() => {
    if (judge_url) {
      QRCode.toDataURL(judge_url, {
        width: 400,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      }).then(set_qr_url)
    }
  }, [judge_url])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div 
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-950">{judge.name}</h2>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100">
            <XMarkIcon className="size-5 text-gray-500" />
          </button>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">Scan to open judging page</p>
        
        {qr_url && (
          <img src={qr_url} alt="QR Code" className="mx-auto rounded-lg" />
        )}
        
        <p className="mt-4 text-xs text-gray-400 break-all">{judge_url}</p>
      </div>
    </div>
  )
}

interface EditModalProps {
  judge: Judge | null
  divisions: string[]
  onSave: (judge: Judge) => void
  onClose: () => void
  onDelete?: (id: string) => void
}

function EditModal({ judge, divisions, onSave, onClose, onDelete }: EditModalProps) {
  const [name, set_name] = useState(judge?.name || '')
  const [allowed_divisions, set_allowed_divisions] = useState<string[]>(judge?.allowed_divisions || [])

  const toggleDivision = (div: string) => {
    if (allowed_divisions.includes(div)) {
      set_allowed_divisions(allowed_divisions.filter(d => d !== div))
    } else {
      set_allowed_divisions([...allowed_divisions, div])
    }
  }

  const handleSave = () => {
    if (!name.trim()) return
    onSave({
      id: judge?.id || '',
      name: name.trim(),
      allowed_divisions,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div 
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-950">
            {judge ? 'Edit Judge' : 'Add Judge'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100">
            <XMarkIcon className="size-5 text-gray-500" />
          </button>
        </div>

        <div className="mt-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-950">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => set_name(e.target.value)}
              placeholder="Judge name"
              className="mt-2 block w-full rounded-lg border border-gray-200 px-4 py-3 text-gray-950 focus:border-gray-950 focus:outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-950 mb-3">
              Allowed Divisions
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Leave all unchecked to allow judging all divisions.
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {divisions.map((div) => (
                <label key={div} className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={allowed_divisions.includes(div)}
                    onChange={() => toggleDivision(div)}
                    className="size-4 rounded border-gray-300 text-gray-950 focus:ring-gray-950"
                  />
                  <span className="text-sm text-gray-700">{div}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          {judge && onDelete && (
            <Button
              color="red"
              onClick={() => onDelete(judge.id)}
              className="mr-auto"
            >
              Delete
            </Button>
          )}
          <Button color="white" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {judge ? 'Save' : 'Add Judge'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function JudgesPage() {
  const [judges, set_judges] = useState<Judge[]>([])
  const [settings, set_settings] = useState<RaceSettings | null>(null)
  const [is_loading, set_is_loading] = useState(true)
  const [editing_judge, set_editing_judge] = useState<Judge | null | 'new'>(null)
  const [qr_judge, set_qr_judge] = useState<Judge | null>(null)
  const [local_ip, set_local_ip] = useState<string>('')

  useEffect(() => {
    Promise.all([
      fetch('/api/judges').then(res => res.json()),
      fetch('/api/settings').then(res => res.json()),
      fetch('/api/race').then(res => res.json())
    ]).then(([judges_data, settings_data, race_data]) => {
      set_judges(judges_data)
      set_settings(settings_data)
      set_local_ip(race_data.local_ip || '')
      set_is_loading(false)
    })
  }, [])

  const handleSave = async (judge: Judge) => {
    try {
      if (editing_judge === 'new') {
        const response = await fetch('/api/judges', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(judge),
        })
        const new_judge = await response.json()
        set_judges([...judges, new_judge])
      } else {
        const response = await fetch(`/api/judges/${judge.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(judge),
        })
        const updated_judge = await response.json()
        set_judges(judges.map(j => j.id === judge.id ? updated_judge : j))
      }
      set_editing_judge(null)
    } catch (error) {
      console.error(error)
      alert('Failed to save judge')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this judge?')) return
    try {
      await fetch(`/api/judges/${id}`, { method: 'DELETE' })
      set_judges(judges.filter(j => j.id !== id))
      set_editing_judge(null)
    } catch (error) {
      console.error(error)
      alert('Failed to delete judge')
    }
  }

  return (
    <Container className="py-24">
      <Breadcrumb />
      <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Subheading>Admin</Subheading>
          <Heading className="mt-2">Judges</Heading>
        </div>
        <Button onClick={() => set_editing_judge('new')}>
          <PlusIcon className="size-5 mr-2" />
          Add Judge
        </Button>
      </div>

      <div className="mt-12">
        {is_loading ? (
          <p className="text-gray-500">Loading judges...</p>
        ) : judges.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-500">No judges added yet.</p>
            <Button onClick={() => set_editing_judge('new')} className="mt-4">
              Add Your First Judge
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="pb-4 pr-4 font-bold uppercase tracking-widest text-[10px]">Name</th>
                  <th className="pb-4 pr-4 font-bold uppercase tracking-widest text-[10px]">Divisions</th>
                  <th className="pb-4 pr-4 font-bold uppercase tracking-widest text-[10px]">QR Code</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {judges.map((judge) => (
                  <tr 
                    key={judge.id} 
                    className="group cursor-pointer hover:bg-gray-50"
                    onClick={() => set_editing_judge(judge)}
                  >
                    <td className="py-4 pr-4">
                      <span className="font-bold text-gray-950">{judge.name}</span>
                    </td>
                    <td className="py-4 pr-4">
                      <span className="text-gray-600">
                        {judge.allowed_divisions.length === 0 
                          ? 'All divisions' 
                          : judge.allowed_divisions.join(', ')}
                      </span>
                    </td>
                    <td className="py-4 pr-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          set_qr_judge(judge)
                        }}
                        className="rounded-lg bg-gray-100 p-2 hover:bg-gray-200 transition-colors"
                        title="Show QR Code"
                      >
                        <QrCodeIcon className="size-5 text-gray-600" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing_judge && (
        <EditModal
          judge={editing_judge === 'new' ? null : editing_judge}
          divisions={settings?.divisions || []}
          onSave={handleSave}
          onClose={() => set_editing_judge(null)}
          onDelete={editing_judge !== 'new' ? handleDelete : undefined}
        />
      )}

      {qr_judge && (
        <QRModal
          judge={qr_judge}
          local_ip={local_ip}
          onClose={() => set_qr_judge(null)}
        />
      )}
    </Container>
  )
}
