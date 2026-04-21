'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

// types
type WallType = { id: string, title: string, description: string, password?: string, admin_password?: string, profile_image_url?: string, bgm_url?: string, created_at: string }
type PostitType = { id: string, title: string, nickname?: string, content: string, color: string, created_at: string }

export default function WallPage() {
  const params = useParams()
  const wallId = params.id as string
  const router = useRouter()

  const [wall, setWall] = useState<WallType | null>(null)
  const [postits, setPostits] = useState<PostitType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Entrance Lock States
  const [isLocked, setIsLocked] = useState(false)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [entrancePassword, setEntrancePassword] = useState('')

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  
  const [newTitle, setNewTitle] = useState('')
  const [newNickname, setNewNickname] = useState('') // 과거 호환을 위해 유지 (선택사항)
  const [newContent, setNewContent] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newColor, setNewColor] = useState('yellow')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Profile Edit Modal States
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [profileBgmUrl, setProfileBgmUrl] = useState('')
  const [profileAdminPassword, setProfileAdminPassword] = useState('')
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false)

  // Fetch wall and postits
  useEffect(() => {
    if (!wallId) return

    const fetchWallData = async () => {
      const { data: wallData } = await supabase.from('walls').select('*').eq('id', wallId).single()
      if (wallData) {
        setWall(wallData)
        if (wallData.password) {
          setIsLocked(true)
        } else {
          setIsUnlocked(true)
        }
      }

      const { data: postitData } = await supabase
        .from('postits')
        .select('id, title, nickname, content, color, created_at')
        .eq('wall_id', wallId)
        .order('created_at', { ascending: false })
      
      if (postitData) setPostits(postitData)

      setIsLoading(false)
    }

    fetchWallData()
    
    // Realtime subscription
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'postits',
          filter: `wall_id=eq.${wallId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setPostits((prev) => {
              if (prev.some(p => p.id === payload.new.id)) return prev;
              const newPostit = payload.new as PostitType;
              return [newPostit, ...prev].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            })
          } else if (payload.eventType === 'DELETE') {
            setPostits((prev) => prev.filter((p) => p.id !== payload.old.id))
          } else if (payload.eventType === 'UPDATE') {
            setPostits((prev) => prev.map((p) => p.id === payload.new.id ? (payload.new as PostitType) : p))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [wallId])

  const filteredPostits = useMemo(() => {
    if (!searchQuery) return postits;
    const lowerQuery = searchQuery.toLowerCase();
    return postits.filter(p => 
      p.title?.toLowerCase().includes(lowerQuery) || 
      p.content?.toLowerCase().includes(lowerQuery) ||
      p.nickname?.toLowerCase().includes(lowerQuery)
    );
  }, [postits, searchQuery]);

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'yellow': return 'bg-[#fff59d] text-[#614a19] border-[#fbc02d]'
      case 'pink': return 'bg-[#ffccbc] text-[#794b3e] border-[#ff8a65]'
      case 'blue': return 'bg-[#bbdefb] text-[#2c5378] border-[#64b5f6]'
      case 'green': return 'bg-[#c8e6c9] text-[#336336] border-[#81c784]'
      default: return 'bg-[#fff59d] text-[#614a19] border-[#fbc02d]'
    }
  }

  const getRotation = (index: number) => {
    const rotations = ['-rotate-2', 'rotate-1', '-rotate-1', 'rotate-2', 'rotate-3', '-rotate-3']
    return rotations[index % rotations.length]
  }

  const getYouTubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  const handleOpenCreateModal = () => {
    setIsEditMode(false)
    setEditingPostId(null)
    setNewTitle('')
    setNewNickname('')
    setNewContent('')
    setNewPassword('')
    setNewColor('yellow')
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (p: PostitType) => {
    setIsEditMode(true)
    setEditingPostId(p.id)
    setNewTitle(p.title || '')
    setNewNickname(p.nickname || '')
    setNewContent(p.content)
    setNewPassword('')
    setNewColor(p.color || 'yellow')
    setIsModalOpen(true)
  }

  const handleCreateOrUpdatePostit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle || !newContent || !newPassword) return
    setIsSubmitting(true)

    if (isEditMode && editingPostId) {
      const { data, error } = await supabase
        .from('postits')
        .update({
          title: newTitle,
          nickname: newNickname || '익명',
          content: newContent,
          color: newColor
        })
        .eq('id', editingPostId)
        .eq('password', newPassword)
        .select()
        
      if (error || !data || data.length === 0) {
        alert('비밀번호가 일치하지 않거나 수정에 실패했습니다.')
      } else {
        setIsModalOpen(false)
      }
    } else {
      const { error } = await supabase
        .from('postits')
        .insert([{
          wall_id: wallId,
          title: newTitle,
          nickname: newNickname || '익명',
          content: newContent,
          password: newPassword,
          color: newColor
        }])

      if (error) {
        alert('작성에 실패했습니다.')
      } else {
        setIsModalOpen(false)
      }
    }
    setIsSubmitting(false)
  }

  const handleDeletePostit = async (postitId: string) => {
    const pwd = prompt('메모를 지우시려면 작성 시 비밀번호를 입력해주세요.')
    if (!pwd) return
    
    const { data, error } = await supabase
      .from('postits')
      .delete()
      .eq('id', postitId)
      .eq('password', pwd)
      .select()

    if (error || !data || data.length === 0) {
      alert('비밀번호가 일치하지 않거나 삭제에 실패했습니다.')
    } else {
      alert('메모가 깔끔하게 지워졌습니다! ✨')
    }
  }

  const handleDeleteWall = async () => {
    if (!wall) return;
    const pwd = prompt('홈피를 완전히 삭제하시겠습니까? 방장 비밀번호를 입력해주세요.');
    if (!pwd) return;

    if (wall.admin_password && wall.admin_password !== pwd) {
      alert('방장 비밀번호가 일치하지 않습니다.');
      return;
    }

    const { error } = await supabase.from('walls').delete().eq('id', wallId);

    if (error) {
      alert('홈피 삭제에 실패했습니다.');
    } else {
      alert('홈피가 성공적으로 철거되었습니다. 메인 화면으로 돌아갑니다.');
      router.push('/');
    }
  }

  const handleUpdateProfileImage = async (e: React.FormEvent, isDelete: boolean = false) => {
    e.preventDefault()
    if (!wall) return
    if (!profileAdminPassword) {
      alert('방장 비밀번호를 입력해주세요.')
      return
    }

    if (wall.admin_password && wall.admin_password !== profileAdminPassword) {
      alert('방장 비밀번호가 일치하지 않습니다.')
      return
    }

    setIsProfileSubmitting(true)

    let newProfileUrl = wall.profile_image_url || null

    if (isDelete) {
      newProfileUrl = null
    } else if (profileImageFile) {
      const fileExt = profileImageFile.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `profile_${Date.now()}_${fileName}`

      const { error: uploadError } = await supabase.storage.from('walls').upload(filePath, profileImageFile)
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('walls').getPublicUrl(filePath)
        newProfileUrl = publicUrl
      } else {
        alert('이미지 업로드에 실패했습니다.')
        setIsProfileSubmitting(false)
        return
      }
    }

    const { data, error } = await supabase
      .from('walls')
      .update({ profile_image_url: newProfileUrl, bgm_url: profileBgmUrl || null })
      .eq('id', wallId)
      .select()
      
    if (error || !data || data.length === 0) {
      alert('프로필 변경에 실패했습니다. DB 접근 권한(RLS) 설정을 확인해주세요!')
    } else {
      setWall({ ...wall, profile_image_url: newProfileUrl, bgm_url: profileBgmUrl || '' })
      setIsProfileModalOpen(false)
      setProfileImageFile(null)
      setProfileAdminPassword('')
      alert(isDelete ? '프로필 사진이 삭제되었습니다! 🐣' : '홈피 설정이 멋지게 변경되었습니다! 📸')
    }
    
    setIsProfileSubmitting(false)
  }

  if (isLoading) return <div className="min-h-screen bg-[#FDF8F5] flex items-center justify-center font-bold text-xl text-[#8C7A6B]">홈피 찾는 중...</div>
  if (!wall) return <div className="min-h-screen bg-[#FDF8F5] flex items-center justify-center font-bold text-xl text-[#8C7A6B]">홈피를 찾을 수 없습니다.</div>

  // 잠금 화면 렌더링
  if (isLocked && !isUnlocked) {
    const handleUnlock = (e: React.FormEvent) => {
      e.preventDefault();
      if (entrancePassword === wall.password) {
        setIsUnlocked(true);
      } else {
        alert('비밀번호가 일치하지 않습니다. 다시 시도해주세요!');
        setEntrancePassword('');
      }
    };

    return (
      <div className="min-h-screen bg-[#FDF8F5] flex items-center justify-center p-4 relative overflow-hidden font-sans">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#5C4D43 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
        <div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-sm border-2 border-[#E8D9C8] text-center w-full max-w-md relative z-10 hover:shadow-md transition-shadow">
          <div className="text-5xl mb-6">🔒</div>
          <h2 className="text-2xl font-black text-[#D96B4D] mb-2">{wall.title}</h2>
          <p className="text-[#8C7A6B] font-medium mb-8 text-sm leading-relaxed">
            이 홈피는 비밀번호로 보호되어 있습니다.<br/>입장하시려면 비밀번호를 입력해주세요.
          </p>
          <form onSubmit={handleUnlock} className="space-y-4">
            <input 
              type="password"
              placeholder="비밀번호 입력"
              value={entrancePassword}
              onChange={(e) => setEntrancePassword(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl border-2 border-[#FADCC8] focus:border-[#E87A5D] focus:ring-0 bg-white placeholder-[#C4B2A3] text-[#5C4D43] transition-colors font-bold text-center tracking-widest"
            />
            <button
              type="submit"
              className="w-full py-4 bg-[#E87A5D] hover:bg-[#D96B4D] text-white font-extrabold rounded-xl transition-all shadow-sm hover:-translate-y-0.5 active:translate-y-0"
            >
              노크하기 🚪
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDF8F5] p-4 md:p-8 flex flex-col font-sans relative overflow-hidden">
      {/* 배경 패턴 */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#5C4D43 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
      <div className="relative z-10 w-full flex-1 flex flex-col max-w-6xl mx-auto">
        <header className="mb-8 xl:mb-12 bg-white p-6 md:p-8 rounded-[2rem] w-full max-w-5xl mx-auto flex flex-col gap-6 shadow-sm border border-[#F3E2D5]">
        <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
          <div className="flex items-start sm:items-center gap-5 flex-1">
            {/* 방장 프로필 사진 (레트로 미니홈피 액자 스타일) */}
            <div className="shrink-0 relative mt-2 sm:mt-0">
              {wall.profile_image_url ? (
                <div className="w-20 h-20 md:w-24 md:h-24 bg-white p-1.5 shadow-md border border-[#F3E2D5] rounded-xl rotate-[-2deg] hover:rotate-0 transition-transform cursor-pointer relative group">
                  <div className="w-full h-full relative overflow-hidden rounded-lg">
                    <img src={wall.profile_image_url} alt="Profile" className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-[#E87A5D] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">방장 찰칵! 📸</div>
                </div>
              ) : (
                <div className="w-20 h-20 md:w-24 md:h-24 bg-white p-1.5 shadow-md border border-[#F3E2D5] rounded-xl rotate-[-2deg] flex items-center justify-center">
                  <div className="w-full h-full bg-[#FFF5F0] rounded-lg border-2 border-dashed border-[#FADCC8] flex items-center justify-center text-3xl">🐣</div>
                </div>
              )}
              {/* Photo & BGM Edit Button */}
              <button 
                onClick={() => {
                  setProfileAdminPassword('')
                  setProfileImageFile(null)
                  setProfileBgmUrl(wall.bgm_url || '')
                  setIsProfileModalOpen(true)
                }}
                className="absolute -top-3 -right-3 bg-white border border-[#E8D9C8] text-[10px] sm:text-xs rounded-full p-1.5 sm:px-3 sm:py-1 shadow-sm hover:bg-[#FFF5F0] hover:text-[#E87A5D] transition-colors z-20 font-bold flex items-center justify-center opacity-80 hover:opacity-100"
                title="설정 변경"
              >
                ✏️
              </button>
            </div>
            
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl md:text-4xl font-extrabold text-[#5C4D43] tracking-tight">{wall.title}</h1>
                {wall.bgm_url && getYouTubeId(wall.bgm_url) ? (
                  <div className="hidden sm:flex items-center bg-[#FFF5F0] border border-[#FADCC8] px-3 py-1 rounded-full shadow-sm gap-2">
                    <span className="text-sm font-bold text-[#D96B4D] animate-pulse">🎵 BGM</span>
                    <iframe 
                      title="bgm"
                      width="120" 
                      height="30" 
                      src={`https://www.youtube.com/embed/${getYouTubeId(wall.bgm_url)}?autoplay=1&loop=1&playlist=${getYouTubeId(wall.bgm_url)}`} 
                      frameBorder="0" 
                      allow="autoplay; encrypted-media" 
                      className="rounded-md opacity-80 hover:opacity-100 transition-opacity"
                    />
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      setProfileAdminPassword('')
                      setProfileImageFile(null)
                      setProfileBgmUrl(wall.bgm_url || '')
                      setIsProfileModalOpen(true)
                    }}
                    className="text-xs sm:text-sm font-bold text-[#A69383] border-2 border-dashed border-[#E8D9C8] rounded-full px-3 py-1.5 hover:text-[#D96B4D] hover:border-[#FADCC8] hover:bg-[#FFF5F0] transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    🎵 음악 추가하기
                  </button>
                )}
                <button 
                  onClick={handleDeleteWall}
                  className="text-xs text-[#A69383] hover:text-red-500 transition-colors bg-[#FFFBF9] hover:bg-red-50 px-2 py-1 rounded-md border border-[#E8D9C8] hover:border-red-200"
                  title="홈피 폐쇄하기"
                >
                  🗑️ 폐쇄
                </button>
              </div>
              {wall.description && <p className="text-sm md:text-base text-[#8C7A6B] max-w-2xl font-medium leading-relaxed">{wall.description}</p>}
              <div className="mt-2 text-sm font-bold text-[#D96B4D] bg-[#FFF5F0] border border-[#FADCC8] inline-block px-3 py-1 rounded-xl shadow-sm">
                총 {postits.length}개의 귀여운 메모가 있어요 💌
              </div>
            </div>
          </div>
          
          <button 
            onClick={handleOpenCreateModal}
            className="shrink-0 px-6 py-4 bg-[#E87A5D] hover:bg-[#D96B4D] text-white rounded-2xl shadow-sm font-bold transition-all hover:shadow-md hover:-translate-y-1 active:translate-y-0 text-lg flex items-center gap-2"
          >
            <span>✏️</span> 새 메모 남기기
          </button>
        </div>

        {/* Search Bar */}
        <div className="w-full relative max-w-xl mx-auto mt-4">
          <input 
            type="text" 
            placeholder="제목이나 내용으로 메모 검색하기..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-[#FADCC8] focus:border-[#E87A5D] focus:ring-0 bg-white placeholder-[#C4B2A3] text-[#5C4D43] transition-colors shadow-sm font-medium"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50">🔍</div>
        </div>
      </header>

      <main className="flex-1 w-full pb-24 relative">
        {filteredPostits.length === 0 ? (
          <div className="text-center text-[#A69383] font-medium py-20 bg-white rounded-[2rem] border-2 border-dashed border-[#F3E2D5] max-w-2xl mx-auto shadow-sm">
            {searchQuery ? '검색 결과가 없습니다.' : <><br/>아직 작성된 내용이 없어요.<br/><br/>가장 먼저 이 홈피에 글을 남겨보세요!</>}
          </div>
        ) : (
          <div className="flex flex-wrap gap-8 justify-center items-start pt-4">
            {filteredPostits.map((p, i) => (
              <div 
                key={p.id} 
                className={`w-64 min-h-[16rem] p-6 rounded-br-3xl rounded-sm shadow-[0_8px_20px_rgba(0,0,0,0.1)] hover:shadow-[0_15px_30px_rgba(0,0,0,0.15)] transition-all border-t-[12px] border-r border-b border-l border-black/5 flex flex-col ${getColorClasses(p.color)} ${getRotation(i)} relative group`}
              >
                {/* 과거 데이터는 제목이 '무제'일 수 있으므로 유연하게 표시 */}
                {p.title && p.title !== '무제' && (
                  <div className="font-extrabold text-xl mb-3 border-b border-current/20 pb-2 break-words">
                    {p.title}
                  </div>
                )}
                <div className="text-base font-medium whitespace-pre-wrap flex-1 leading-relaxed opacity-90 break-words">
                  {p.content}
                </div>
                
                {/* 닉네임이 있다면 표시 (과거 데이터 호환 및 유지) */}
                {p.nickname && (
                  <div className="mt-4 text-sm font-bold opacity-70 text-right">- {p.nickname}</div>
                )}
                
                {/* Actions: Edit & Delete */}
                <div className="absolute -top-3 -right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      handleOpenEditModal(p)
                    }}
                    className="w-10 h-10 flex items-center justify-center bg-white shadow-md text-gray-700 rounded-full hover:bg-gray-100 hover:scale-110 active:scale-95 transition-all"
                    title="메모 수정하기"
                  >
                    ✏️
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeletePostit(p.id)
                    }}
                    className="w-10 h-10 flex items-center justify-center bg-white shadow-md text-red-600 rounded-full hover:bg-red-50 hover:scale-110 active:scale-95 transition-all text-xl"
                    title="메모 삭제하기"
                  >
                    ✖
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Floating Action Button (Mobile Friendly) */}
      <button 
        onClick={handleOpenCreateModal}
        className="fixed bottom-8 right-8 w-16 h-16 bg-[#E87A5D] text-white rounded-full shadow-lg flex items-center justify-center text-3xl font-bold hover:bg-[#D96B4D] hover:scale-110 active:scale-95 transition-all z-40 sm:hidden border-4 border-[#FDF8F5]"
      >
        +
      </button>

      {/* Write / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm transition-opacity">
          <div className="bg-white w-full max-w-md rounded-[2rem] p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 border-2 border-[#E8D9C8]">
            <h2 className="text-2xl font-black mb-6 dark:text-white">
              {isEditMode ? '메모 수정하기' : '새 메모 남기기'}
            </h2>
            <form onSubmit={handleCreateOrUpdatePostit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-sm font-bold mb-1.5 block text-gray-700 dark:text-gray-300">제목 *</label>
                  <input
                    required
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-gray-400 font-medium"
                    placeholder="메모의 제목을 적어주세요."
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold mb-1.5 block text-gray-700 dark:text-gray-300">내용 *</label>
                <textarea
                  required
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 h-32 resize-none transition-all placeholder:text-gray-400 font-medium"
                  placeholder="따뜻한 마음이나 재미있는 이야기를 남겨주세요."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold mb-1.5 block text-gray-700 dark:text-gray-300">작성자 (선택)</label>
                  <input
                    type="text"
                    value={newNickname}
                    onChange={(e) => setNewNickname(e.target.value)}
                    className="w-full p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                    placeholder="익명"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold mb-1.5 block text-gray-700 dark:text-gray-300">비밀번호 *</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                    placeholder="수정/삭제 시 필요"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold mb-2.5 block text-gray-700 dark:text-gray-300">포스트잇 색상</label>
                <div className="flex gap-4">
                  {['yellow', 'pink', 'blue', 'green'].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewColor(color)}
                      className={`w-12 h-12 rounded-full border-[3px] transition-all overflow-hidden relative cursor-pointer ${
                        newColor === color ? 'border-gray-800 dark:border-gray-200 scale-110 shadow-lg' : 'border-transparent hover:scale-105'
                      }`}
                    >
                      <div className={`absolute inset-0 ${getColorClasses(color).split(' ')[0]}`} />
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-8 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3.5 rounded-2xl font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3.5 rounded-xl font-extrabold bg-[#E87A5D] hover:bg-[#D96B4D] text-white shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                >
                  {isSubmitting ? '처리 중...' : (isEditMode ? '수정 완료' : '등록하기')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile Edit Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm transition-opacity">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 border-2 border-[#E8D9C8]">
            <h2 className="text-xl font-black mb-6 text-[#5C4D43]">
              📸 방장 프로필 설정
            </h2>
            <form className="space-y-4">
              <div>
                <label className="text-sm font-bold mb-1.5 block text-gray-700">새 사진 선택 (선택)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProfileImageFile(e.target.files?.[0] || null)}
                  className="w-full px-2 py-2 rounded-xl border-2 border-dashed border-[#FADCC8] focus:border-[#E87A5D] focus:ring-0 bg-white placeholder-[#C4B2A3] text-[#5C4D43] transition-colors font-medium text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#FFF5F0] file:text-[#E87A5D] hover:file:bg-[#FADCC8] hover:border-[#E87A5D] cursor-pointer"
                />
              </div>
              <div>
                <label className="text-sm font-bold mb-1.5 block text-gray-700">BGM 링크 (유튜브)</label>
                <input
                  type="text"
                  value={profileBgmUrl}
                  onChange={(e) => setProfileBgmUrl(e.target.value)}
                  className="w-full p-3.5 rounded-2xl border border-gray-200 bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500/50 transition-all font-medium text-sm"
                  placeholder="예: https://youtu.be/..."
                />
              </div>
              <div>
                <label className="text-sm font-bold mb-1.5 block text-gray-700">방장 비밀번호 *</label>
                <input
                  type="password"
                  required
                  value={profileAdminPassword}
                  onChange={(e) => setProfileAdminPassword(e.target.value)}
                  className="w-full p-3.5 rounded-2xl border border-gray-200 bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500/50 transition-all font-medium text-sm"
                  placeholder="방장 확인을 위해 입력"
                />
              </div>
              
              <div className="flex flex-col gap-2 mt-8 pt-4">
                <button
                  type="button"
                  onClick={(e) => handleUpdateProfileImage(e, false)}
                  disabled={isProfileSubmitting || !profileAdminPassword}
                  className="w-full py-3.5 rounded-xl font-extrabold bg-[#E87A5D] hover:bg-[#D96B4D] text-white shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                >
                  {isProfileSubmitting ? '처리 중...' : '설정 저장하기'}
                </button>
                {wall?.profile_image_url && (
                  <button
                    type="button"
                    onClick={(e) => handleUpdateProfileImage(e, true)}
                    disabled={isProfileSubmitting || !profileAdminPassword}
                    className="w-full py-3.5 rounded-xl font-bold bg-white border border-red-200 text-red-500 hover:bg-red-50 transition-all active:scale-95 disabled:opacity-50"
                  >
                    사진 삭제하기
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="w-full py-3.5 rounded-xl font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all active:scale-95"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

