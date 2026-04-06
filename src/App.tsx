import { useState } from 'react'
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

  if (!token) {
    return <LoginPage onLogin={handleLogin} />
  }

  return <TeacherWorkbench onLogout={handleLogout} />
}

export default App
