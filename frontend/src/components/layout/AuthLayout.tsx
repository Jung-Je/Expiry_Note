import type { ReactNode } from 'react'

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden w-[42%] flex-col justify-between bg-sidebar p-12 text-white lg:flex">
        <div>
          <p className="text-lg font-bold">만료노트</p>
          <p className="text-[11px] tracking-wide text-slate-500">BEFORE PAY</p>
        </div>

        <div className="flex justify-center">
          <div className="flex h-[300px] w-[347px] items-start justify-center rounded-[32px] bg-sidebar-active pt-[48px]">
            <div className="flex h-[183px] w-[183px] items-center justify-center rounded-[42px] bg-brand">
              <div className="flex h-[108px] w-[108px] flex-col items-center justify-center rounded-[20px] bg-white text-slate-900 shadow-xl">
                <span className="text-3xl font-bold text-brand">24</span>
                <span className="mt-1 text-[10px] text-slate-500">결제 3일 전</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold leading-snug">
            결제 전에,
            <br />
            만료되기 전에
          </h2>
          <p className="mt-3 text-sm text-slate-400">
            구독과 계약 일정을 한곳에서 관리하고 놓치기 전에 알림을 받아보세요.
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  )
}
