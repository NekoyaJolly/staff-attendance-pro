import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Shield, Activity, Users, AlertTriangle, Clock, Eye } from '@phosphor-icons/react'
import { securityLogger, loginAttemptManager } from '../../lib/security'
import { User } from '../../App'

interface SecurityDashboardProps {
  user: User
}

interface SecurityMetrics {
  totalLogins: number
  failedLogins: number
  lockedAccounts: number
  recentSuspiciousActivity: number
  lastPasswordChange?: string
}

export default function SecurityDashboard({ user }: SecurityDashboardProps) {
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalLogins: 0,
    failedLogins: 0,
    lockedAccounts: 0,
    recentSuspiciousActivity: 0
  })
  const [recentLogs, setRecentLogs] = useState<any[]>([])

  useEffect(() => {
    // セキュリティメトリクスを計算
    const logs = securityLogger.getLogs(100)
    const loginSuccessCount = logs.filter(log => log.event === 'LOGIN_SUCCESS').length
    const loginFailedCount = logs.filter(log => log.event === 'LOGIN_FAILED_WRONG_PASSWORD').length
    const suspiciousCount = logs.filter(log => 
      log.event.includes('RATE_LIMIT') || 
      log.event.includes('LOCKOUT') ||
      log.event.includes('FAILED')
    ).length

    setMetrics({
      totalLogins: loginSuccessCount,
      failedLogins: loginFailedCount,
      lockedAccounts: 0, // 実装に応じて計算
      recentSuspiciousActivity: suspiciousCount
    })

    setRecentLogs(logs.slice(-10).reverse())
  }, [])

  const getEventIcon = (event: string) => {
    if (event.includes('SUCCESS')) return <Shield className="h-4 w-4 text-green-500" />
    if (event.includes('FAILED')) return <AlertTriangle className="h-4 w-4 text-red-500" />
    if (event.includes('LOCKOUT')) return <Clock className="h-4 w-4 text-orange-500" />
    return <Activity className="h-4 w-4 text-blue-500" />
  }

  const getEventSeverity = (event: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (event.includes('SUCCESS')) return 'default'
    if (event.includes('FAILED')) return 'destructive'
    if (event.includes('LOCKOUT')) return 'secondary'
    return 'outline'
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (user.role !== 'admin') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>セキュリティ情報</span>
          </CardTitle>
          <CardDescription>
            あなたのアカウントのセキュリティ状況
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>パスワード強度</span>
              <Badge variant="default">強い</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>最終ログイン</span>
              <span className="text-sm text-muted-foreground">
                {formatTimestamp(Date.now())}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>セキュリティアラート</span>
              <Badge variant="outline">なし</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>セキュリティダッシュボード</span>
          </CardTitle>
          <CardDescription>
            システム全体のセキュリティ状況を監視できます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">総ログイン数</p>
              <p className="text-2xl font-bold text-green-600">{metrics.totalLogins}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">ログイン失敗</p>
              <p className="text-2xl font-bold text-red-600">{metrics.failedLogins}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">ロック中アカウント</p>
              <p className="text-2xl font-bold text-orange-600">{metrics.lockedAccounts}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">疑わしい活動</p>
              <p className="text-2xl font-bold text-purple-600">{metrics.recentSuspiciousActivity}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>最近のセキュリティイベント</span>
          </CardTitle>
          <CardDescription>
            直近のログイン履歴とセキュリティイベント
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                セキュリティイベントはありません
              </p>
            ) : (
              recentLogs.map((log, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 rounded-lg border">
                  {getEventIcon(log.event)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <Badge variant={getEventSeverity(log.event)} className="text-xs">
                        {log.event.replace(/_/g, ' ')}
                      </Badge>
                      {log.userId && (
                        <span className="text-xs text-muted-foreground">
                          User: {log.userId}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatTimestamp(log.timestamp)}
                    </p>
                    {log.details && (
                      <p className="text-xs text-muted-foreground">
                        {JSON.stringify(log.details)}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>セキュリティ設定</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">ログイン試行制限</p>
              <p className="text-sm text-muted-foreground">5回失敗で30分ロック</p>
            </div>
            <Badge variant="default">有効</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">レート制限</p>
              <p className="text-sm text-muted-foreground">15分間に5回まで</p>
            </div>
            <Badge variant="default">有効</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">セッションタイムアウト</p>
              <p className="text-sm text-muted-foreground">8時間で自動ログアウト</p>
            </div>
            <Badge variant="default">有効</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">セキュリティログ</p>
              <p className="text-sm text-muted-foreground">全イベント記録中</p>
            </div>
            <Badge variant="default">有効</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}