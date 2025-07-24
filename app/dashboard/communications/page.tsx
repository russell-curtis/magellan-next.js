import CommunicationHub from '@/app/dashboard/_components/communication-hub'

export default function CommunicationsPage() {
  return (
    <div className="p-6">
      <CommunicationHub showClientFilter={true} />
    </div>
  )
}