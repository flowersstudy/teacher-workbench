import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useWorkbenchStore } from '../../store/workbenchStore'

type ReplayCategory = '诊断课' | '卡点课'

export function UploadReplayModal() {
  const item = useWorkbenchStore((s) => s.replayUploadItem)
  const close = useWorkbenchStore((s) => s.closeReplayUpload)
  const [category, setCategory] = useState<ReplayCategory>('卡点课')
  const [link, setLink] = useState('')
  const [submitted, setSubmitted] = useState(false)

  if (!item) return null

  function handleSubmit() {
    if (!link.trim()) return
    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      setLink('')
      close()
    }, 1200)
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      onClick={close}
    >
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative w-[380px] rounded-[var(--radius-card)] bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <div className="text-sm font-semibold text-[var(--color-text-primary)]">上传课程回放</div>
          <button
            type="button"
            onClick={close}
            className="rounded px-2 py-1 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-primary-light)]"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="rounded-lg bg-[var(--color-bg-left)] px-3 py-2">
            <div className="text-xs text-[var(--color-text-secondary)]">课次</div>
            <div className="mt-0.5 text-sm font-medium text-[var(--color-text-primary)]">{item.name}</div>
          </div>

          {/* 课程分类 */}
          <div>
            <div className="mb-1.5 text-xs font-medium text-[var(--color-text-secondary)]">回放类型</div>
            <div className="flex overflow-hidden rounded-lg border border-[var(--color-border)]">
              {(['诊断课', '卡点课'] as ReplayCategory[]).map((c) => (
                <button key={c} type="button" onClick={() => setCategory(c)}
                  className={[
                    'flex-1 py-1.5 text-xs font-medium transition-colors',
                    category === c
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-white text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-left)]',
                  ].join(' ')}>
                  {c}回放
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1.5 text-xs font-medium text-[var(--color-text-secondary)]">
              第一步：前往腾讯会议云录制，复制回放链接
            </div>
            <a
              href="https://meeting.tencent.com/user-center/record"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-lg bg-[#1677FF] py-2.5 text-sm font-semibold text-white hover:bg-[#0e6ae0] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polygon points="10 8 16 12 10 16 10 8" />
              </svg>
              打开云录制
            </a>
          </div>

          <div>
            <div className="mb-1.5 text-xs font-medium text-[var(--color-text-secondary)]">
              第二步：将回放链接粘贴到此处，发给学生
            </div>
            <input
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="粘贴回放链接…"
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs outline-none focus:border-[var(--color-primary)] transition-colors"
            />
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!link.trim() || submitted}
            className={[
              'w-full rounded-lg py-2 text-sm font-semibold transition-colors',
              submitted
                ? 'bg-green-500 text-white'
                : link.trim()
                  ? 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)]'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed',
            ].join(' ')}
          >
            {submitted ? '上传成功 ✓' : '确认上传'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
