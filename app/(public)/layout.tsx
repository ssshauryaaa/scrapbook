import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/layout/Navbar'
import { ToastContainer } from '@/components/ui/Toast'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar noSpacer />
      <main style={{ minHeight: 'calc(100vh - 60px)' }}>
        {children}
      </main>
      <ToastContainer />
    </>
  )
}
