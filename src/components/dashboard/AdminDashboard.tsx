import { useState } from 'react'
import { User } from '../../App'
import BottomNavigation from '../navigation/BottomNavigation'
import ShiftView from '../shift/ShiftView'
import TimeCardView from '../timecard/TimeCardView'
import ProfileView from '../profile/ProfileView'
import AdminPanel from '../admin/AdminPanel'
import SecurityDashboard from '../security/SecurityDashboard'
import SecurityHealthCheck from '../security/SecurityHealthCheck'
import SecurityAlert from '../security/SecurityAlert'

interface AdminDashboardProps {
  user: User
  onLogout: () => void
}

export default function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('timecard') // デフォルトを勤怠ページに変更

  const renderContent = () => {
    switch (activeTab) {
      case 'admin':
        return (
          <div className="space-y-6">
            <SecurityAlert />
            <AdminPanel user={user} />
            <SecurityHealthCheck className="mt-6" />
          </div>
        )
      case 'shift':
        return <ShiftView user={user} />
      case 'timecard':
        return <TimeCardView user={user} />
      case 'profile':
        return (
          <div className="space-y-6">
            <ProfileView user={user} isAdmin={true} />
            <SecurityDashboard user={user} />
          </div>
        )
      default:
        return <TimeCardView user={user} />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <header className="bg-card/80 backdrop-blur-sm border-b border-border/50 sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-foreground">
                  管理者ダッシュボード
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">{user.name}さん • ID: {user.staffId}</p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-sm font-medium text-foreground">
                {new Date().toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date().toLocaleDateString('ja-JP', { weekday: 'long' })} • 
                {new Date().toLocaleTimeString('ja-JP', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 pb-20 lg:pb-4">
        <div className="max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>

      <BottomNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userRole={user.role}
        onLogout={onLogout}
      />
    </div>
  )
}