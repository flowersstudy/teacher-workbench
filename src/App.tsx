import { useEffect, useState } from 'react'
import { TeacherWorkbench } from './pages/TeacherWorkbench/TeacherWorkbench'
import { LoginPage } from './pages/Login/LoginPage'
import { api } from './lib/api'
import { normalizeTeacherIdentity } from './lib/teacherRoles'
import { TeacherIdentityModal, type TeacherProfile } from './pages/Login/TeacherIdentityModal'

function buildFallbackTeacherProfile(token: string): TeacherProfile {
  let name = ''

  try {
    const payload = JSON.parse(atob(token.split('.')[1] || '')) as { name?: string }
    name = typeof payload.name === 'string' ? payload.name : ''
  } catch {
    name = ''
  }

  return {
    id: '',
    name: name || '老师',
    email: '',
    title: '',
    teamRole: '',
    teamRoleConfigured: true,
    teamRoleLabel: '点击设置身份',
  }
}

function App() {
  const [token, setToken] = useState<string>(() => localStorage.getItem('teacher_token') ?? '')
  const [profile, setProfile] = useState<TeacherProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [identityModalOpen, setIdentityModalOpen] = useState(false)

  function handleLogin(t: string) {
    setToken(t)
    setProfile(null)
    setIdentityModalOpen(false)
  }

  function handleLogout() {
    localStorage.removeItem('teacher_token')
    setToken('')
    setProfile(null)
    setIdentityModalOpen(false)
  }

  useEffect(() => {
    function handleAuthExpired() {
      setToken('')
      setProfile(null)
      setIdentityModalOpen(false)
    }

    window.addEventListener('teacher-auth-expired', handleAuthExpired)
    return () => window.removeEventListener('teacher-auth-expired', handleAuthExpired)
  }, [])

  async function loadTeacherProfile() {
    setProfileLoading(true)

    try {
      const result = await api.get<TeacherProfile>('/api/auth/teacher/profile')
      const nextProfile = {
        ...result,
        teamRole: normalizeTeacherIdentity(result.teamRole),
      }
      setProfile(nextProfile)
      return nextProfile
    } catch {
      setProfile(null)
      return null
    } finally {
      setProfileLoading(false)
    }
  }

  useEffect(() => {
    if (!token) {
      setProfile(null)
      setProfileLoading(false)
      return
    }

    let cancelled = false
    void loadTeacherProfile().then((nextProfile) => {
      if (cancelled) return
      if (!nextProfile) return
      setIdentityModalOpen(false)
    })

    return () => {
      cancelled = true
    }
  }, [token])

  function handleIdentitySaved(nextProfile: TeacherProfile) {
    setProfile(nextProfile)
    setIdentityModalOpen(false)
  }

  async function handleOpenIdentitySettings() {
    if (profile) {
      setIdentityModalOpen(true)
      return
    }

    setIdentityModalOpen(true)
    await loadTeacherProfile()
  }

  const modalProfile = profile ?? (identityModalOpen ? buildFallbackTeacherProfile(token) : null)

  if (!token) {
    return <LoginPage onLogin={handleLogin} />
  }

  if (profileLoading && !profile) {
    return <div className="flex min-h-screen items-center justify-center bg-[var(--color-page-bg)] text-sm text-[var(--color-text-secondary)]">正在加载老师信息...</div>
  }

  return (
    <>
      <TeacherWorkbench
        onLogout={handleLogout}
        onOpenIdentitySettings={() => void handleOpenIdentitySettings()}
        teacherRoleLabel={profile?.teamRoleLabel || (profileLoading ? '身份加载中...' : '点击设置身份')}
      />
      {modalProfile && (!profile || !profile.teamRoleConfigured || identityModalOpen) ? (
        <TeacherIdentityModal
          profile={modalProfile}
          onSaved={handleIdentitySaved}
          onClose={profile?.teamRoleConfigured !== false ? () => setIdentityModalOpen(false) : undefined}
        />
      ) : null}
    </>
  )
}

export default App
