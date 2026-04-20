'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

type WallType = {
  id: string;
  title: string;
  description: string;
  created_at: string;
}

export default function Home() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [password, setPassword] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [recentWalls, setRecentWalls] = useState<WallType[]>([])
  const router = useRouter()

  useEffect(() => {
    const fetchRecentWalls = async () => {
      const { data } = await supabase
        .from('walls')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10) // 좀 더 큼지막하게 많이 보여주기 위해 10개로 증가
      
      if (data) setRecentWalls(data)
    }
    fetchRecentWalls()
  }, [])

  const handleCreateWall = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !adminPassword) {
      alert("홈피 이름과 방장 비밀번호(삭제용)는 필수입니다.")
      return
    }
    setIsLoading(true)

    const { data, error } = await supabase
      .from('walls')
      .insert([{ 
        title, 
        description, 
        password: password || null, // 선택이므로 입력 안 하면 null
        admin_password: adminPassword
      }])
      .select()
      .single()

    if (error) {
      console.error(error)
      alert("홈피 생성에 실패했습니다.")
      setIsLoading(false)
      return
    }

    if (data) {
      router.push(`/wall/${data.id}`)
    }
  }

  return (
    <main className="min-h-screen bg-[#FDF8F5] text-[#5C4D43] font-sans p-6 md:p-12 relative overflow-hidden flex flex-col">
      {/* 장식용 도트 패턴 배경 (싸이월드 다이어리 감성) */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#5C4D43 1px, transparent 1px)', backgroundSize: '16px 16px' }} />

      <div className="max-w-6xl mx-auto w-full flex flex-col md:flex-row gap-8 relative z-10 flex-1">
        
        {/* Main Content: 목록 등 큼지막한 요소 배치 */}
        <div className="flex-1 space-y-8 order-2 md:order-1 flex flex-col">
          <header className="space-y-3 mb-4 mt-2">
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-[#E87A5D]">
              Talk Talk
            </h1>
            <p className="text-base text-[#8C7A6B] font-medium flex items-center gap-2">
              <span className="text-xl">📻</span> 따뜻한 마음을 나누는 우리들의 홈피
            </p>
          </header>

          <div className="bg-white rounded-[2rem] p-6 sm:p-10 shadow-sm border border-[#F3E2D5] flex-1">
            <h2 className="text-xl font-bold text-[#D96B4D] mb-6 flex items-center gap-2 border-b-2 border-dashed border-[#F3E2D5] pb-4">
              💌 모두의 톡톡 홈피
            </h2>
            
            {recentWalls.length === 0 ? (
              <div className="py-20 text-center text-[#A69383] font-medium">
                아직 만들어진 홈피가 없어요. 첫 번째 방을 만들어볼까요?
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {recentWalls.map((w) => (
                  <Link key={w.id} href={`/wall/${w.id}`}>
                    <div className="flex flex-col h-40 p-5 rounded-2xl bg-[#FFFBF9] border-2 border-dashed border-[#E8D9C8] hover:border-[#E87A5D] hover:bg-[#FFF5F0] hover:-translate-y-1 transition-all cursor-pointer group shadow-sm">
                      <h3 className="font-extrabold text-[#5C4D43] text-lg truncate group-hover:text-[#E87A5D] tracking-tight">{w.title}</h3>
                      <p className="text-sm text-[#A69383] mt-2 line-clamp-3 leading-relaxed flex-1">
                        {w.description || "이 홈피에는 어떤 이야기들이 숨어있을까요?"}
                      </p>
                      <div className="text-xs text-[#C4B2A3] mt-auto font-bold tracking-wide group-hover:text-[#E87A5D] transition-colors">
                        놀러가기 ➜
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: 우측 상단 새 놀이터 생성 폼 (작게 배치) */}
        <div className="w-full md:w-80 shrink-0 order-1 md:order-2">
          <div className="bg-[#FFF5F0] rounded-[2rem] p-6 border-2 border-[#FADCC8] sticky top-8 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <span className="bg-[#E87A5D] text-white text-xs px-2 py-1 rounded-md font-bold">NEW</span>
              <h3 className="text-base font-extrabold text-[#D96B4D]">✨ 새 홈피 만들기</h3>
            </div>
            
            <form onSubmit={handleCreateWall} className="space-y-4">
              <div>
                <input
                  type="text"
                  required
                  placeholder="홈피 이름 (예: A반 자유게시판)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-[#FADCC8] focus:border-[#E87A5D] focus:ring-0 bg-white placeholder-[#C4B2A3] text-[#5C4D43] transition-colors font-medium text-sm"
                />
              </div>
              <div>
                <textarea
                  placeholder="다정한 인사말이나 주제를 적어주세요!"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-[#FADCC8] focus:border-[#E87A5D] focus:ring-0 bg-white placeholder-[#C4B2A3] text-[#5C4D43] transition-colors h-24 resize-none font-medium text-sm"
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="입장 비밀번호 (선택사항)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-[#FADCC8] focus:border-[#E87A5D] focus:ring-0 bg-white placeholder-[#C4B2A3] text-[#5C4D43] transition-colors font-medium text-sm"
                />
              </div>
              <div className="pt-2 border-t border-[#FADCC8]/50">
                <input
                  type="password"
                  required
                  placeholder="방장 비밀번호 (삭제용, 필수)"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-[#E87A5D]/40 focus:border-[#E87A5D] focus:ring-0 bg-[#FFFBF9] placeholder-[#D96B4D]/70 text-[#5C4D43] transition-colors font-bold text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-[#E87A5D] hover:bg-[#D96B4D] text-white font-extrabold rounded-xl transition-all shadow-sm hover:shadow-md disabled:opacity-50 text-sm"
              >
                {isLoading ? '뚝딱뚝딱...' : '만들기'}
              </button>
            </form>
          </div>
        </div>

      </div>
    </main>
  )
}
