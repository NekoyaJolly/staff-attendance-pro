import { useKV } from '@github/spark/hooks'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export interface Notification {
  id: string
  type: 'shift_update' | 'attendance_approval' | 'schedule_change' | 'system_message'
  title: string
  message: string
  targetStaffId?: string // 特定のスタッフ向けの場合
  timestamp: string
  read: boolean
  priority: 'low' | 'medium' | 'high'
}

// 通知管理フック
export function useNotifications(currentUserId: string) {
  const [notifications, setNotifications] = useKV<Notification[]>('notifications', [])
  const [lastCheck, setLastCheck] = useKV<number>(`lastNotificationCheck_${currentUserId}`, Date.now())

  // 新しい通知があるかチェック
  const checkForNewNotifications = () => {
    const userNotifications = notifications.filter(notification => 
      !notification.targetStaffId || notification.targetStaffId === currentUserId
    )
    
    const newNotifications = userNotifications.filter(notification => 
      new Date(notification.timestamp).getTime() > lastCheck && !notification.read
    )

    if (newNotifications.length > 0) {
      // 新しい通知をトーストで表示
      newNotifications.forEach(notification => {
        const toastMessage = notification.priority === 'high' ? toast.error : 
                           notification.priority === 'medium' ? toast.warning : toast.info
        
        toastMessage(notification.title, {
          description: notification.message
        })
      })
      
      setLastCheck(Date.now())
    }
  }

  // 定期的に新しい通知をチェック（10秒間隔）
  useEffect(() => {
    const interval = setInterval(checkForNewNotifications, 10000)
    return () => clearInterval(interval)
  }, [notifications, lastCheck, currentUserId])

  // 通知を既読にする
  const markAsRead = (notificationId: string) => {
    setNotifications(current => 
      current.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    )
  }

  // 新しい通知を追加
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      read: false
    }
    
    setNotifications(current => [newNotification, ...current])
    return newNotification
  }

  // ユーザー向けの未読通知を取得
  const getUnreadNotifications = () => {
    return notifications.filter(notification => 
      (!notification.targetStaffId || notification.targetStaffId === currentUserId) && 
      !notification.read
    )
  }

  // ユーザー向けの全通知を取得
  const getUserNotifications = () => {
    return notifications
      .filter(notification => 
        !notification.targetStaffId || notification.targetStaffId === currentUserId
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  return {
    notifications: getUserNotifications(),
    unreadNotifications: getUnreadNotifications(),
    markAsRead,
    addNotification,
    checkForNewNotifications
  }
}

// 通知送信ユーティリティ
export const NotificationService = {
  // シフト更新通知
  sendShiftUpdateNotification: (addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => Notification, targetStaffId?: string) => {
    return addNotification({
      type: 'shift_update',
      title: 'シフトが更新されました',
      message: '新しいシフトスケジュールを確認してください',
      targetStaffId,
      priority: 'medium'
    })
  },

  // 勤怠承認通知
  sendAttendanceApprovalNotification: (addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => Notification, isApproved: boolean, targetStaffId: string) => {
    return addNotification({
      type: 'attendance_approval',
      title: isApproved ? '勤怠記録が承認されました' : '勤怠記録が却下されました',
      message: isApproved ? '手動入力の勤怠記録が承認されました' : '勤怠記録に不備があります。再度確認してください',
      targetStaffId,
      priority: isApproved ? 'low' : 'high'
    })
  },

  // スケジュール変更通知
  sendScheduleChangeNotification: (addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => Notification, targetStaffId?: string) => {
    return addNotification({
      type: 'schedule_change',
      title: '勤務スケジュールが変更されました',
      message: 'シフトに変更があります。最新のスケジュールを確認してください',
      targetStaffId,
      priority: 'high'
    })
  },

  // システムメッセージ
  sendSystemMessage: (addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => Notification, title: string, message: string, priority: 'low' | 'medium' | 'high' = 'medium') => {
    return addNotification({
      type: 'system_message',
      title,
      message,
      priority
    })
  }
}