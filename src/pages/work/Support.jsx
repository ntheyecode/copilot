// Support page (/work/support). Previously the "support" tab inside the Home
// dashboard; now its own route in the shared shell. Ticket emails that link to
// /work?tab=support are redirected here by WorkAppLayout.
import SupportTickets from '../../components/SupportTickets.jsx'

export default function Support() {
  return <SupportTickets mode="user" />
}
