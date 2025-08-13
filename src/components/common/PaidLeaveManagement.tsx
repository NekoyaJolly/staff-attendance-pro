import React, { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { User, PayrollInfo, PaidLeaveAlert } from '../../App'
import { PaidLeaveService } from '../../services/paidLeaveService'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import { 
  CalendarDots, 
  Warning, 
  CheckCircle, 
  Gift, 
  Clock,
  TrendUp
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface PaidLeaveManagementProps {
  user: User
  isAdmin?: boolean
  children?: React.ReactNode
}

/**
 * 有給休暇管理パネル
 */
export default function PaidLeaveManagement({ user, isAdmin = false, children }: PaidLeaveManagementProps) {
  const [payrollInfo, setPayrollInfo] = useKV<PayrollInfo>(`payroll_${user.id}`, {
    hourlyRate: 1000,
    transportationAllowance: 0,
    remainingPaidLeave: 10,
    totalPaidLeave: 10,
    usedPaidLeave: 0,
    paidLeaveExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 2).toISOString().split('T')[0],
    lastGrantDate: new Date().toISOString().split('T')[0],
    workStartDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  })
  
  const [alerts, setAlerts] = useKV<PaidLeaveAlert[]>('paidLeaveAlerts', [])
  const [allStaff, setAllStaff] = useKV<User[]>('users', [])

  useEffect(() => {
    // 定期的にアラートをチェック
    const checkAlerts = () => {
      const newAlerts = PaidLeaveService.generateAlerts(user, payrollInfo)
      if (newAlerts.length > 0) {
        setAlerts(currentAlerts => {
          const existingIds = new Set(currentAlerts.map(a => a.id))
          const uniqueNewAlerts = newAlerts.filter(alert => !existingIds.has(alert.id))
          return [...currentAlerts, ...uniqueNewAlerts]
        })
      }
    }

    checkAlerts()
    const interval = setInterval(checkAlerts, 60000) // 1分ごと
    return () => clearInterval(interval)
  }, [payrollInfo, user, setAlerts])

  // 新規付与処理
  const handleGrantPaidLeave = async () => {
    if (PaidLeaveService.shouldGrantPaidLeave(payrollInfo)) {
      const updatedInfo = PaidLeaveService.grantPaidLeave(payrollInfo)
      setPayrollInfo(updatedInfo)
      toast.success('有給休暇を付与しました')
    }
  }

  // 期限切れ有給の削除
  const handleRemoveExpiredLeave = async () => {
    const updatedInfo = PaidLeaveService.removeExpiredPaidLeave(payrollInfo)
    if (updatedInfo.remainingPaidLeave !== payrollInfo.remainingPaidLeave) {
      setPayrollInfo(updatedInfo)
      toast.warning('期限切れの有給休暇を削除しました')
    }
  }

  // 全スタッフの月次メンテナンス（管理者のみ）
  const handleMonthlyMaintenance = async () => {
    if (!isAdmin) return

    try {
      toast.info('有給休暇の月次メンテナンスを開始します...')
      
      await PaidLeaveService.runMonthlyMaintenance(
        allStaff,
        async (staffId) => {
          // この実装では簡略化していますが、実際はAPIから取得
          return payrollInfo
        },
        async (staffId, info) => {
          if (staffId === user.id) {
            setPayrollInfo(info)
          }
        },
        async (alert) => {
          setAlerts(current => [...current, alert])
        }
      )
      
      toast.success('月次メンテナンスが完了しました')
    } catch (error) {
      toast.error('月次メンテナンスでエラーが発生しました')
      console.error(error)
    }
  }

  const usagePercentage = payrollInfo.totalPaidLeave > 0 
    ? (payrollInfo.usedPaidLeave / payrollInfo.totalPaidLeave) * 100 
    : 0

  const daysUntilExpiry = Math.floor(
    (new Date(payrollInfo.paidLeaveExpiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  )

  const canGrantLeave = PaidLeaveService.shouldGrantPaidLeave(payrollInfo)

  return (
    <div className="space-y-6">
      {/* 概要カード */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CalendarDots className="h-5 w-5 text-primary" />
            <span>有給休暇の状況</span>
            {daysUntilExpiry <= 30 && payrollInfo.remainingPaidLeave > 0 && (
              <Badge variant={daysUntilExpiry <= 7 ? "destructive" : "secondary"}>
                {daysUntilExpiry <= 7 ? "緊急" : "注意"}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <motion.div 
              className="text-center p-3 bg-primary/10 rounded-lg"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-xl font-bold text-primary">
                {payrollInfo.remainingPaidLeave}
              </div>
              <div className="text-xs text-muted-foreground">残日数</div>
            </motion.div>
            
            <motion.div 
              className="text-center p-3 bg-accent/10 rounded-lg"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-xl font-bold text-accent-foreground">
                {payrollInfo.usedPaidLeave}
              </div>
              <div className="text-xs text-muted-foreground">使用済み</div>
            </motion.div>
            
            <motion.div 
              className="text-center p-3 bg-secondary rounded-lg"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-xl font-bold text-secondary-foreground">
                {payrollInfo.totalPaidLeave}
              </div>
              <div className="text-xs text-muted-foreground">年間付与</div>
            </motion.div>
            
            <motion.div 
              className="text-center p-3 bg-muted rounded-lg"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-xl font-bold text-foreground">
                {daysUntilExpiry}
              </div>
              <div className="text-xs text-muted-foreground">期限まで(日)</div>
            </motion.div>
          </div>
        </CardContent>
        
        {/* 子要素を追加 */}
        {children && (
          <CardContent className="pt-0">
            {children}
          </CardContent>
        )}
      </Card>

      {/* アクションボタン */}
      {(isAdmin || canGrantLeave) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendUp className="h-5 w-5 text-primary" />
              <span>管理操作</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {canGrantLeave && (
                <Button
                  onClick={handleGrantPaidLeave}
                  className="flex items-center space-x-2"
                >
                  <Gift className="h-4 w-4" />
                  <span>有給付与</span>
                </Button>
              )}
              
              <Button
                variant="outline"
                onClick={handleRemoveExpiredLeave}
                className="flex items-center space-x-2"
              >
                <Clock className="h-4 w-4" />
                <span>期限切れ削除</span>
              </Button>

              {isAdmin && (
                <Button
                  variant="secondary"
                  onClick={handleMonthlyMaintenance}
                  className="flex items-center space-x-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>月次メンテナンス</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  )
}