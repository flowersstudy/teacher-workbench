import { teacher } from '../../mock/workbenchMock'

function Avatar({ name }: { name: string }) {
  const initial = name.trim().slice(0, 1)
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-semibold text-white">
      {initial}
    </div>
  )
}

export function TeacherInfo() {
  return (
    <div className="p-4">
      <div className="flex items-center gap-3">
        <Avatar name={teacher.name} />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
            {teacher.name}
          </div>
          <div className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
            今日带教学员 {teacher.traineeCountToday} 人
          </div>
        </div>
      </div>
    </div>
  )
}

