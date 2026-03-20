'use client'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'

export default function MyPage() {
  const router = useRouter()

  return (
    <div className="flex-1 flex flex-col bg-[#f0f4f8]">
      <header className="bg-white border-b border-[#eef1f4] px-4 pt-10 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-[#0a1628]">My Page</h1>
      </header>

      <main className="flex-1 overflow-auto pb-28">
        <div className="mt-4 mx-4 bg-white rounded-xl border border-[#eef1f4] overflow-hidden">
          <button
            onClick={() => router.push('/settings')}
            className="w-full flex items-center justify-between px-4 py-4 border-b border-[#eef1f4] active:bg-[#f0f4f8] transition-colors"
          >
            <span className="text-[#0a1628] font-medium">設定変更</span>
            <svg className="w-4 h-4 text-[#8899aa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div className="flex items-center px-4 py-4">
            <span className="text-[#8899aa] font-medium text-sm">Coming soon...</span>
          </div>
        </div>
      </main>

      <BottomNav current="mypage" />
    </div>
  )
}
