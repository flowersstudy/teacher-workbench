import { create } from 'zustand'
import type { MessageTabKey, RightTabKey, TaskKey } from '../types'

interface WorkbenchState {
  leftMessageTab: MessageTabKey
  rightTab: RightTabKey
  selectedContactId: string | null
  openTaskKey: TaskKey | null

  setLeftMessageTab: (tab: MessageTabKey) => void
  setRightTab: (tab: RightTabKey) => void
  selectContact: (contactId: string) => void
  openTaskModal: (taskKey: TaskKey) => void
  closeTaskModal: () => void
}

export const useWorkbenchStore = create<WorkbenchState>((set) => ({
  leftMessageTab: 'todayMessages',
  rightTab: 'schedule',
  selectedContactId: null,
  openTaskKey: null,

  setLeftMessageTab: (tab) => set({ leftMessageTab: tab }),
  setRightTab: (tab) => set({ rightTab: tab }),
  selectContact: (contactId) =>
    set({ selectedContactId: contactId, rightTab: 'chat' }),
  openTaskModal: (taskKey) => set({ openTaskKey: taskKey }),
  closeTaskModal: () => set({ openTaskKey: null }),
}))

