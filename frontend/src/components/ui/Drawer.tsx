import { useEffect, type ReactNode } from 'react'

interface DrawerProps {
  onClose: () => void
  children: ReactNode
}

/** 오른쪽에서 슬라이드로 나타나는 패널. ESC나 배경 클릭으로 닫힌다. */
export function Drawer({ onClose, children }: DrawerProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40" onClick={onClose}>
      <div
        onClick={(event) => event.stopPropagation()}
        className="flex h-full w-full max-w-sm flex-col bg-white p-6 shadow-xl"
      >
        {children}
      </div>
    </div>
  )
}
