import { useState } from 'react'
import { User } from '../../App'
import BottomNavigation from '../navigation/BottomNavigation'
import ShiftView from '../shift/ShiftView'
import TimeCardView from '../timecard/TimeCardView'
import ProfileView from '../profile/ProfileView'
import ShiftCreator from '../shift/ShiftCreator'

interface CreatorDashboardProps {
  user: User
  onLogout: () => void
}

export default function CreatorDashboard({ user, onLogout }: CreatorDashboardProps) {
  const [activeTab, setActiveTab] = useState('shift')

  const renderContent = () => {
    switch (activeTab) {
      case 'shift':
        return <ShiftView user={user} />
      case 'timecard':
        return <TimeCardView user={user} />
      case 'create':
        return <ShiftCreator user={user} />
      case 'profile':
        return <ProfileView user={user} />
      default:
        return <ShiftView user={user} />
    }
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">作成者ダッシュボード</h1>
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