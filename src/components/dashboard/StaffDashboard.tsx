import { useState } from 'react'
import { User } from '../../App'
import BottomNavigation from '../navigation/BottomNavigation'
import ShiftView from '../shift/ShiftView'
import TimeCardView from '../timecard/TimeCardView'
import ProfileView from '../profile/ProfileView'
import SecurityDashboard from '../security/SecurityDashboard'

interface StaffDashboardProps {
  user: User
  onLogout: () => void
}

export default function StaffDashboard({ user, onLogout }: StaffDashboardProps) {
  const [activeTab, setActiveTab] = useState('timecard')

  const renderContent = () => {
    switch (activeTab) {
      case 'timecard':
        return <TimeCardView user={user} />
      case 'shift':
        return <ShiftView user={user} />
      case 'profile':
        return (
          <div className="space-y-6">
            <ProfileView user={user} isAdmin={false} />
            <SecurityDashboard user={user} />
          </div>
        )
      default:
        return <TimeCardView user={user} />
    }
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">おはようございます</h1>
            <p className="text-sm text-muted-foreground">{user.name}さん</p>
          </div>
          <div className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'short'
            })}
          </div>
        </div>
      </header>

      <main className="p-4">
        {renderContent()}
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