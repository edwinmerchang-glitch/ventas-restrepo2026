import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadUserData = async (sess) => {
    if (!sess?.user) {
      setProfile(null)
      setEmployee(null)
      return
    }
    const [{ data: prof }, { data: emp }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', sess.user.id).single(),
      supabase.from('employees').select('*').eq('user_id', sess.user.id).maybeSingle(),
    ])
    setProfile(prof ?? null)
    setEmployee(emp ?? null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      await loadUserData(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        await loadUserData(session)
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  const value = {
    session,
    profile,
    employee,
    loading,
    isAdmin: profile?.role === 'admin',
    refreshEmployee: () => loadUserData(session),
    signOut: () => supabase.auth.signOut(),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
