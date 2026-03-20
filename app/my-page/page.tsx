'use client'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'

export default function MyPage() {
  const router = useRouter()

  return (
    <div className="flex-1 flex flex-col">
      <header className="bg-white border-b border-slate-100 px-4 pt-10 pb-4">
        <h1 className="text-xl font-bold text-slate-800">My Page</h1>
      </header>

      <main className="flex-1 overflow-auto pb-28">
        <div className="mt-4 bg-white border-t border-b border-slate-100">
          <button
            onClick={() => router.push('/settings')}
            className="w-full flex items-center justify-between px-4 py-4 border-b border-slate-100 active:bg-slate-50 transition-colors"
          >
            <span className="text-slate-800 font-medium">設定変更</span>
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div className="flex items-center justify-between px-4 py-4">
            <span className="text-slate-300 font-medium">Coming soon...</span>
          </div>
        </div>
      </main>

      <BottomNav current="mypage" />
    </div>
  )
}
