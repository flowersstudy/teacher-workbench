import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useWorkbenchStore } from '../../store/workbenchStore'

export function UploadLinkModal() {
  const item = useWorkbenchStore((s) => s.linkUploadItem)
  const close = useWorkbenchStore((s) => s.closeLinkUpload)
  const setEventLink = useWorkbenchStore((s) => s.setEventLink)
  const calendarEvents = useWorkbenchStore((s) => s.calendarEvents)
  const [link, setLink] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!item) return null

  const event = item.eventId ? calendarEvents.find((e) => e.id === item.eventId) : null
  const timeText = event ? `${event.date} ${event.startTime}–${event.endTime}` : item.name

  function openMeeting() {
    window.location.href = 'wemeet://'
    setTimeout(() => {
      if (!document.hidden) window.open('https://meeting.tencent.com', '_blank')
    }, 1500)
  }

  function handleCopy() {
    void navigator.clipboard.writeText(timeText)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function handleSubmit() {
    if (!link.trim() || !item) return
    if (item.eventId) setEventLink(item.eventId, link.trim())
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
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <div className="text-sm font-semibold text-[var(--color-text-primary)]">上传链接</div>
          <button
            type="button"
            onClick={close}
            className="rounded px-2 py-1 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-primary-light)]"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Lesson info + copy time */}
          <div className="rounded-lg bg-[var(--color-bg-left)] px-3 py-2.5">
            <div className="text-xs text-[var(--color-text-secondary)]">课次</div>
            <div className="mt-0.5 text-sm font-semibold text-[var(--color-text-primary)]">{item.name}</div>
            {event && (
              <div className="mt-2 flex items-center justify-between">
                <div className="text-xs text-[var(--color-text-secondary)]">
                  上课时间：<span className="font-medium text-[var(--color-text-primary)]">{timeText}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={[
                    'rounded px-2 py-0.5 text-[10px] font-medium transition-colors',
                    copied
                      ? 'bg-green-100 text-green-600'
                      : 'bg-white border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]',
                  ].join(' ')}
                >
                  {copied ? '已复制 ✓' : '复制时间'}
                </button>
              </div>
            )}
          </div>

          {/* Step 1: Go to Tencent Meeting */}
          <div>
            <div className="mb-1.5 text-xs font-medium text-[var(--color-text-secondary)]">
              第一步：前往腾讯会议预约本次课程，复制入会链接
            </div>
            <button
              type="button"
              onClick={openMeeting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1677FF] py-2.5 text-sm font-semibold text-white hover:bg-[#0e6ae0] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              打开腾讯会议 App
            </button>
          </div>

          {/* Step 2: Paste link */}
          <div>
            <div className="mb-1.5 text-xs font-medium text-[var(--color-text-secondary)]">
              第二步：将入会链接粘贴到此处，发给学生
            </div>
            <input
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="粘贴腾讯会议入会链接…"
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs outline-none focus:border-[var(--color-primary)] transition-colors"
            />
          </div>

          {/* Submit */}
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
