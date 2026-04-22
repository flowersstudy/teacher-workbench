import { useEffect, useState } from 'react'
import { TeacherWorkbench } from './pages/TeacherWorkbench/TeacherWorkbench'
import { LoginPage } from './pages/Login/LoginPage'

function App() {
  const [token, setToken] = useState<string>(() => localStorage.getItem('teacher_token') ?? '')

  function handleLogin(t: string) {
    setToken(t)
  }

  function handleLogout() {
    localStorage.removeItem('teacher_token')
    setToken('')
  }

  useEffect(() => {
    function handleAuthExpired() {
      setToken('')
    }

    window.addEventListener('teacher-auth-expired', handleAuthExpired)
    return () => window.removeEventListener('teacher-auth-expired', handleAuthExpired)
  }, [])

  if (!token) {
    return <LoginPage onLogin={handleLogin} />
  }

  return <TeacherWorkbench onLogout={handleLogout} />
}

export default App
