import { useState } from 'react'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import type { NoticeAudience } from '../../features/admin/api'
import { useAdminLogsQuery, useSendNoticeMutation } from '../../features/admin/hooks'
import { formatDateTime, NOTICE_AUDIENCE_LABELS } from '../../features/admin/labels'
import { extractErrorMessage } from '../../lib/api'

// 백엔드 Notification.title / message 컬럼 길이와 같다.
const TITLE_MAX_LENGTH = 100
const MESSAGE_MAX_LENGTH = 500

const AUDIENCE_VALUES: NoticeAudience[] = ['all', 'free', 'basic', 'pro']

const inputClass =
  'rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand'

export function AdminNoticesPage() {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [audience, setAudience] = useState<NoticeAudience>('all')
  const [isConfirming, setIsConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentMessage, setSentMessage] = useState<string | null>(null)
  const { mutate: sendNotice, isPending } = useSendNoticeMutation()
  // 따로 공지 테이블이 없어서, 보낸 공지는 관리자 작업 기록에서 가져온다.
  const { data: history } = useAdminLogsQuery({ action: 'notice_send' })

  const canSend = title.trim().length > 0 && message.trim().length > 0

  function handleSend() {
    setError(null)
    setSentMessage(null)
    sendNotice(
      { title: title.trim(), message: message.trim(), audience },
      {
        onSuccess: (result) => {
          setIsConfirming(false)
          setSentMessage(`${NOTICE_AUDIENCE_LABELS[audience]} ${result.recipient_count}명에게 보냈습니다.`)
          setTitle('')
          setMessage('')
        },
        onError: (mutationError) => {
          setIsConfirming(false)
          setError(extractErrorMessage(mutationError, '공지를 보내지 못했습니다. 잠시 후 다시 시도해주세요.'))
        },
      },
    )
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">공지 발송</h1>
      <p className="mt-1 text-sm text-slate-500">
        회원의 알림 목록에 공지를 보냅니다. 이메일은 보내지 않으며, 보낸 공지는 되돌릴 수 없습니다.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-200/70">
          <h2 className="text-base font-semibold text-slate-900">새 공지</h2>

          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="notice-audience" className="text-sm font-medium text-slate-700">
                받는 사람
              </label>
              <select
                id="notice-audience"
                value={audience}
                onChange={(e) => setAudience(e.target.value as NoticeAudience)}
                className={inputClass}
              >
                {AUDIENCE_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {NOTICE_AUDIENCE_LABELS[value]}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">비활성화된 계정에는 보내지 않습니다.</p>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="notice-title" className="text-sm font-medium text-slate-700">
                제목
              </label>
              <input
                id="notice-title"
                type="text"
                value={title}
                maxLength={TITLE_MAX_LENGTH}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 서비스 점검 안내"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="notice-message" className="text-sm font-medium text-slate-700">
                내용
              </label>
              <textarea
                id="notice-message"
                rows={6}
                value={message}
                maxLength={MESSAGE_MAX_LENGTH}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="회원이 알림을 눌렀을 때 보게 될 내용을 입력하세요."
                className={inputClass}
              />
              <p className="text-right text-xs text-slate-400">
                {message.length} / {MESSAGE_MAX_LENGTH}
              </p>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {sentMessage && <p className="text-sm text-emerald-700">{sentMessage}</p>}

            <button
              type="button"
              disabled={!canSend || isPending}
              onClick={() => setIsConfirming(true)}
              className="self-start rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-hover disabled:opacity-50"
            >
              공지 보내기
            </button>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-200/70">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold text-slate-900">보낸 공지</h2>
            <span className="text-xs text-slate-400">최근 20건</span>
          </div>
          {history && history.results.length > 0 ? (
            <ul className="mt-3 divide-y divide-slate-100">
              {history.results.map((log) => (
                <li key={log.id} className="py-2 text-sm">
                  <p className="text-slate-900">{log.summary}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {formatDateTime(log.created_at)} · {log.actor_email ?? '삭제된 계정'}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 py-2 text-sm text-slate-500">아직 보낸 공지가 없습니다.</p>
          )}
        </section>
      </div>

      {isConfirming && (
        <ConfirmDialog
          title="공지를 보낼까요?"
          description={`${NOTICE_AUDIENCE_LABELS[audience]}에게 "${title.trim()}" 공지를 보냅니다. 보낸 뒤에는 취소하거나 고칠 수 없습니다.`}
          confirmLabel="보내기"
          isConfirming={isPending}
          onConfirm={handleSend}
          onCancel={() => setIsConfirming(false)}
        />
      )}
    </div>
  )
}
