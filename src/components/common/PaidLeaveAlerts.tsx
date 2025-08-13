import React from 'react'
import { useKV } from '@github/spark/hooks'
import { PaidLeaveAlert } from '../../App'
import { Alert, AlertDescription } from '../ui/alert'
import { Button } from '../ui/button'
import { X, AlertTriangle, Info, AlertCircle } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'

interface PaidLeaveAlertsProps {
  staffId: string
}

/**
 * 有給休暇アラート表示コンポーネント
 */
export default function PaidLeaveAlerts({ staffId }: PaidLeaveAlertsProps) {
  const [alerts, setAlerts] = useKV<PaidLeaveAlert[]>('paidLeaveAlerts', [])

  // 該当スタッフの未読アラートをフィルタ
  const staffAlerts = alerts.filter(alert => 
    alert.staffId === staffId && !alert.dismissed
  )

  const dismissAlert = (alertId: string) => {
    setAlerts(currentAlerts => 
      currentAlerts.map(alert => 
        alert.id === alertId 
          ? { ...alert, dismissed: true }
          : alert
      )
    )
  }

  const getIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      default:
        return <Info className="h-4 w-4 text-blue-600" />
    }
  }

  const getAlertVariant = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'destructive'
      case 'warning':
        return 'default'
      default:
        return 'default'
    }
  }

  if (staffAlerts.length === 0) return null

  return (
    <div className="space-y-2 mb-4">
      <AnimatePresence>
        {staffAlerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <Alert 
              variant={getAlertVariant(alert.severity)}
              className={`
                relative border-l-4 
                ${alert.severity === 'error' 
                  ? 'border-l-destructive bg-destructive/10' 
                  : alert.severity === 'warning'
                    ? 'border-l-yellow-500 bg-yellow-50'
                    : 'border-l-blue-500 bg-blue-50'
                }
              `}
            >
              <div className="flex items-start space-x-3">
                {getIcon(alert.severity)}
                <div className="flex-1">
                  <AlertDescription className="text-sm font-medium">
                    {alert.message}
                  </AlertDescription>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(alert.createdAt).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dismissAlert(alert.id)}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </Alert>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}