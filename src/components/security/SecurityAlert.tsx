import { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, AlertTriangle, CheckCircle, RefreshCw, Activity } from '@phosphor-icons/react'
import { securityLogger, loginAttemptManager, sessionManager } from '../../lib/security'

interface SecurityAlertProps {
  className?: string
}

interface SecurityIssue {
  id: string
  type: 'critical' | 'warning' | 'info'
  title: string
  description: string
  recommendation: string
  timestamp: number
  resolved: boolean
}

export default function SecurityAlert({ className }: SecurityAlertProps) {
  const [issues, setIssues] = useState<SecurityIssue[]>([])
  const [lastCheck, setLastCheck] = useState<number>(Date.now())

  // セキュリティ問題をチェックする関数
  const checkSecurityIssues = () => {
    const newIssues: SecurityIssue[] = []
    const logs = securityLogger.getLogs(50)
    const now = Date.now()
    const oneHour = 60 * 60 * 1000

    // 1. 短時間での大量ログイン失敗をチェック
    const recentFailures = logs.filter(log => 
      log.event.includes('FAILED') && 
      now - log.timestamp < oneHour
    )

    if (recentFailures.length >= 10) {
      newIssues.push({
        id: 'multiple-failures',
        type: 'critical',
        title: '大量のログイン失敗を検出',
        description: `過去1時間で${recentFailures.length}回のログイン失敗が発生しています`,
        recommendation: 'システム管理者に連絡し、不正アクセスの可能性を調査してください',
        timestamp: now,
        resolved: false
      })
    }

    // 2. レート制限エラーをチェック
    const rateLimitErrors = logs.filter(log => 
      log.event.includes('RATE_LIMIT') && 
      now - log.timestamp < oneHour
    )

    if (rateLimitErrors.length >= 5) {
      newIssues.push({
        id: 'rate-limit-exceeded',
        type: 'warning',
        title: 'レート制限の頻繁な発生',
        description: `過去1時間で${rateLimitErrors.length}回のレート制限が発生しています`,
        recommendation: 'アクセスパターンを確認し、必要に応じて制限値を調整してください',
        timestamp: now,
        resolved: false
      })
    }

    // 3. 複数の異なるユーザーでのログイン失敗をチェック
    const uniqueFailedUsers = new Set(
      recentFailures
        .filter(log => log.details?.staffId)
        .map(log => log.details.staffId)
    )

    if (uniqueFailedUsers.size >= 5) {
      newIssues.push({
        id: 'widespread-failures',
        type: 'warning',
        title: '複数アカウントでのログイン失敗',
        description: `${uniqueFailedUsers.size}個の異なるアカウントでログイン失敗が発生しています`,
        recommendation: 'システム障害または組織的攻撃の可能性があります',
        timestamp: now,
        resolved: false
      })
    }

    // 4. セキュリティ設定変更の頻度をチェック
    const settingsChanges = logs.filter(log => 
      (log.event.includes('PASSWORD_CHANGED') || 
       log.event.includes('BIOMETRIC_SETTING') || 
       log.event.includes('NOTIFICATION_SETTINGS')) &&
      now - log.timestamp < 24 * 60 * 60 * 1000 // 24時間
    )

    if (settingsChanges.length >= 20) {
      newIssues.push({
        id: 'frequent-changes',
        type: 'info',
        title: '設定変更が頻繁に発生',
        description: `過去24時間で${settingsChanges.length}回の設定変更が発生しています`,
        recommendation: '通常業務の範囲内か確認してください',
        timestamp: now,
        resolved: false
      })
    }

    // 5. エラーログの増加をチェック
    const errorLogs = logs.filter(log => 
      log.event.includes('ERROR') && 
      now - log.timestamp < oneHour
    )

    if (errorLogs.length >= 10) {
      newIssues.push({
        id: 'system-errors',
        type: 'critical',
        title: 'システムエラーの増加',
        description: `過去1時間で${errorLogs.length}回のシステムエラーが発生しています`,
        recommendation: 'システムの安定性を確認し、必要に応じてメンテナンスを実施してください',
        timestamp: now,
        resolved: false
      })
    }

    setIssues(newIssues)
    setLastCheck(now)
  }

  // 定期的なセキュリティチェック
  useEffect(() => {
    checkSecurityIssues()
    
    const interval = setInterval(() => {
      checkSecurityIssues()
    }, 5 * 60 * 1000) // 5分毎

    return () => clearInterval(interval)
  }, [])

  const resolveIssue = (issueId: string) => {
    setIssues(prev => prev.map(issue => 
      issue.id === issueId ? { ...issue, resolved: true } : issue
    ))
    securityLogger.log('SECURITY_ISSUE_RESOLVED', undefined, { issueId })
  }

  const getIssueIcon = (type: SecurityIssue['type']) => {
    switch (type) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'warning': return <Shield className="h-4 w-4 text-orange-500" />
      case 'info': return <Activity className="h-4 w-4 text-blue-500" />
    }
  }

  const getIssueBadge = (type: SecurityIssue['type']) => {
    switch (type) {
      case 'critical': return <Badge className="bg-red-100 text-red-800 border-red-200">緊急</Badge>
      case 'warning': return <Badge className="bg-orange-100 text-orange-800 border-orange-200">警告</Badge>
      case 'info': return <Badge className="bg-blue-100 text-blue-800 border-blue-200">情報</Badge>
    }
  }

  const activeIssues = issues.filter(issue => !issue.resolved)
  const hasActiveIssues = activeIssues.length > 0

  if (!hasActiveIssues) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span>セキュリティ状況</span>
          </CardTitle>
          <CardDescription>
            現在、セキュリティアラートはありません
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>最終チェック: {new Date(lastCheck).toLocaleTimeString('ja-JP')}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={checkSecurityIssues}
              className="h-8"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              更新
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <span>セキュリティアラート</span>
          <Badge variant="destructive">{activeIssues.length}</Badge>
        </CardTitle>
        <CardDescription>
          システムで検出されたセキュリティ問題
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeIssues.map((issue) => (
          <Alert key={issue.id} className="border-l-4 border-l-orange-500">
            <div className="flex items-start space-x-3">
              {getIssueIcon(issue.type)}
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{issue.title}</h4>
                  {getIssueBadge(issue.type)}
                </div>
                <AlertDescription>
                  <p className="mb-2">{issue.description}</p>
                  <p className="text-sm font-medium">推奨対応:</p>
                  <p className="text-sm">{issue.recommendation}</p>
                </AlertDescription>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(issue.timestamp).toLocaleString('ja-JP')}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resolveIssue(issue.id)}
                    className="h-7 text-xs"
                  >
                    解決済みにする
                  </Button>
                </div>
              </div>
            </div>
          </Alert>
        ))}

        <div className="flex items-center justify-between pt-4 border-t">
          <span className="text-sm text-muted-foreground">
            最終チェック: {new Date(lastCheck).toLocaleTimeString('ja-JP')}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={checkSecurityIssues}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            更新
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}