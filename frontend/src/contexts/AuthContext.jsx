import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem('medai_token')
    const storedUser = localStorage.getItem('medai_user')
    if (storedToken) setToken(storedToken)
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch {
        localStorage.removeItem('medai_user')
      }
    }
    setLoading(false)
  }, [])

  async function login(email, password) {
    const form = new URLSearchParams()
    form.append('username', email)
    form.append('password', password)
    const tokenResponse = await api.post('/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    const accessToken = tokenResponse.data.access_token
    localStorage.setItem('medai_token', accessToken)
    setToken(accessToken)
    const me = await api.get('/auth/me')
    localStorage.setItem('medai_user', JSON.stringify(me.data))
    setUser(me.data)
    return me.data
  }

  async function changePassword(currentPassword, newPassword) {
    const res = await api.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    })
    return res.data
  }

  function logout() {
    localStorage.removeItem('medai_token')
    localStorage.removeItem('medai_user')
    setToken(null)
    setUser(null)
    navigate('/login')
  }

  const value = useMemo(() => ({
    user,
    token,
    loading,
    login,
    logout,
    changePassword,
    isAuthenticated: Boolean(token),
    role: user?.role
  }), [user, token, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
