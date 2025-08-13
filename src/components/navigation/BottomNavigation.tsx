import { Calendar, Clock, User, LogOut, Shield, Plus } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

interface BottomNavigationProps {
  activeTab: string
  onTabChange: (tab: string) => void
  userRole: 'staff' | 'creator' | 'admin'
  onLogout: () => void
}

export default function BottomNavigation({ activeTab, onTabChange, userRole, onLogout }: BottomNavigationProps) {
  const tabs = [
    { id: 'shift', label: 'シフト', icon: Calendar },
    { id: 'timecard', label: '勤怠', icon: Clock },
    { id: 'profile', label: 'プロフィール', icon: User },
  ]

  // 管理者・作成者には追加のタブを表示
  if (userRole === 'admin') {
    tabs.splice(2, 0, { id: 'admin', label: '管理', icon: Shield })
  } else if (userRole === 'creator') {
    tabs.splice(2, 0, { id: 'create', label: '作成', icon: Plus })
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
      <div className="flex justify-around items-center px-2 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          
          return (
            <Button
              key={tab.id}
              variant="ghost"
              className={`flex-1 flex flex-col items-center justify-center h-12 ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
              onClick={() => onTabChange(tab.id)}
            >
              <Icon size={20} weight={isActive ? 'fill' : 'regular'} />
              <span className="text-xs mt-1">{tab.label}</span>
            </Button>
          )
        })}
        
        <Button
          variant="ghost"
          className="flex-1 flex flex-col items-center justify-center h-12 text-muted-foreground"
          onClick={onLogout}
        >
          <LogOut size={20} />
          <span className="text-xs mt-1">ログアウト</span>
        </Button>
      </div>
    </div>
  )
}