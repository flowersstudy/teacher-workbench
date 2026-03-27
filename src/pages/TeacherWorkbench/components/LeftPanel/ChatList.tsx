import { contactsByTab } from '../../mock/workbenchMock'
import { useWorkbenchStore } from '../../store/workbenchStore'
import { ChatListItem } from './ChatListItem'

export function ChatList() {
  const tab = useWorkbenchStore((s) => s.leftMessageTab)
  const selectedContactId = useWorkbenchStore((s) => s.selectedContactId)
  const selectContact = useWorkbenchStore((s) => s.selectContact)

  const contacts = contactsByTab[tab]

  return (
    <div className="mt-2 flex-1 overflow-auto px-2 pb-3">
      <div className="space-y-1 px-2">
        {contacts.map((c) => (
          <ChatListItem
            key={c.id}
            item={c}
            selected={c.id === selectedContactId}
            onClick={() => selectContact(c.id)}
          />
        ))}
      </div>
    </div>
  )
}

