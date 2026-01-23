import { Link } from '@/components/link'
import { ChevronLeftIcon } from '@heroicons/react/20/solid'

interface BreadcrumbProps {
  href?: string
  label?: string
}

export function Breadcrumb({ href = '/admin', label = 'Dashboard' }: BreadcrumbProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-950 mb-4"
    >
      <ChevronLeftIcon className="size-4" />
      {label}
    </Link>
  )
}
