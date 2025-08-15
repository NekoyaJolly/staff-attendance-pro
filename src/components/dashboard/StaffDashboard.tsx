import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
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
  const [currentUser, setCurrentUser] = useKV<User>('currentUser', user)

  const handleUserUpdate = (updatedUser: User) => {
    setCurrentUser(updatedUser)
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'timecard':
        return <TimeCardView user={currentUser} />
      case 'shift':
        return <ShiftView user={currentUser} />
      case 'profile':
        return (
          <div className="space-y-6">
            <ProfileView user={currentUser} isAdmin={false} onUserUpdate={handleUserUpdate} />
            <SecurityDashboard user={currentUser} />
          </div>
        )
      default:
        return <TimeCardView user={currentUser} />
    }
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">おはようございます</h1>
            <p className="text-sm text-muted-foreground">{currentUser.name}さん</p>
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