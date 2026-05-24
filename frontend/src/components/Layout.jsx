import { useState } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  return (
    <div className="min-h-screen">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Topbar onMenu={() => setSidebarOpen(true)} />
      <main className="px-4 pb-8 pt-[84px] lg:ml-[260px] lg:px-6">
        {children}
      </main>
    </div>
  )
}
