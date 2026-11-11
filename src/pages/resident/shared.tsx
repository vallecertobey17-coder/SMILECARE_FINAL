import { ShieldAlert, Clock } from 'lucide-react'
import { useResident } from './context'

/** Shown to residents who are not yet verified: resident-only services stay locked. */
export function VerificationBanner({ compact }: { compact?: boolean }) {
  const { resident, go } = useResident()
  if (resident.status === 'APPROVED') return null
  const pending = resident.status === 'PENDING'
  return (
    <div className={`verify-banner ${pending ? 'is-pending' : 'is-rejected'} ${compact ? 'compact' : ''}`} role="status">
      {pending ? <Clock size={22} /> : <ShieldAlert size={22} />}
      <div className="grow">
        <b>{pending ? 'Your residency verification is in progress' : 'Your verification was not approved'}</b>
        <small>
          {pending
            ? 'The Municipal Health Office is reviewing your documents. Booking, medicine requests and E-Pila unlock once you are verified.'
            : resident.remarks || 'Please upload a clearer valid ID or barangay certificate from your profile.'}
        </small>
      </div>
      {!pending && (
        <button className="btn btn-white sm" onClick={() => go('my-profile')}>
          Update documents
        </button>
      )}
    </div>
  )
}
