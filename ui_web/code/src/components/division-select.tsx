'use client'

interface DivisionSelectProps {
  value: string
  divisions: string[]
  onChange: (value: string) => void
  id?: string
  required?: boolean
  className?: string
}

export function DivisionSelect({
  value,
  divisions,
  onChange,
  id,
  required,
  className = ''
}: DivisionSelectProps) {
  const is_valid = divisions.includes(value)
  const is_placeholder = !is_valid
  
  return (
    <select
      id={id}
      required={required}
      value={is_valid ? value : ''}
      onChange={(e) => onChange(e.target.value)}
      className={`block w-full rounded-lg border px-4 py-2 focus:outline-none ${
        is_placeholder
          ? 'border-red-300 bg-red-50 text-red-600 focus:border-red-500'
          : 'border-gray-200 text-gray-950 focus:border-gray-950'
      } ${className}`}
    >
      <option value="" disabled className="text-gray-400">Select a division...</option>
      {divisions.map((d) => (
        <option key={d} value={d}>{d}</option>
      ))}
    </select>
  )
}
