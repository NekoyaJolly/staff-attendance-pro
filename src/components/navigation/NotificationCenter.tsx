import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bell, Check, Clock, AlertTriangle, Info, X } from '@phosphor-icons/react'
import { useNotifications, Notification } from '../../hooks/useNotifications'
import { User } from '../../App'

interface NotificationCenterProps {
  user: User
}

export default function NotificationCenter({ user }: NotificationCenterProps) {
  const { notifications, unreadNotifications, markAsRead } = useNotifications(user.staffId)
  const [isOpen, setIsOpen] = useState(false)

  const getNotificationIcon = (type: Notification['type'], priority: Notification['priority']) => {
    const iconSize = 16
    const iconClass = priority === 'high' ? 'text-red-500' : 
                      priority === 'medium' ? 'text-yellow-500' : 'text-blue-500'

    switch (type) {
      case 'shift_update':
        return <Clock size={iconSize} className={iconClass} />
      case 'attendance_approval':
        return <Check size={iconSize} className={iconClass} />
      case 'schedule_change':
        return <AlertTriangle size={iconSize} className={iconClass} />
      case 'system_message':
        return <Info size={iconSize} className={iconClass} />
      default:
        return <Bell size={iconSize} className={iconClass} />
    }
  }

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'high':
        return 'destructive'
      case 'medium':
        return 'default'
      case 'low':
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'たった今'
    if (diffMins < 60) return `${diffMins}分前`
    if (diffHours < 24) return `${diffHours}時間前`
    if (diffDays < 7) return `${diffDays}日前`
    
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id)
    }
  }

  const markAllAsRead = () => {
    unreadNotifications.forEach(notification => {
      markAsRead(notification.id)
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell size={20} />
          {unreadNotifications.length > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={20} />
              通知
            </div>
            {unreadNotifications.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllAsRead}
                className="text-xs"
              >
                すべて既読
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell size={48} className="mx-auto mb-4 opacity-50" />
                <p>通知はありません</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <Card 
                  key={notification.id}
                  className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                    !notification.read ? 'border-primary/50 bg-primary/5' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type, notification.priority)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium text-sm leading-tight">
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <div className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-1" />
                          )}
                        </div>
                        
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <Badge 
                            variant={getPriorityColor(notification.priority)} 
                            className="text-xs"
                          >
                            {notification.priority === 'high' ? '重要' : 
                             notification.priority === 'medium' ? '普通' : '情報'}
                          </Badge>
                          
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(notification.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>

        {notifications.length > 5 && (
          <div className="text-center pt-2">
            <p className="text-xs text-muted-foreground">
              最新の{notifications.length}件の通知を表示
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}