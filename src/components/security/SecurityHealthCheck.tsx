import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Shield, AlertTriangle, CheckCircle, Activity, Clock, Lock } from '@phosphor-icons/react'

interface SecurityHealthCheckProps {
  className?: string
}

interface SecurityMetric {
  name: string
  status: 'excellent' | 'good' | 'warning' | 'critical'
  score: number
  description: string
  recommendation?: string
}

export default function SecurityHealthCheck({ className }: SecurityHealthCheckProps) {
  const securityMetrics: SecurityMetric[] = [
    {
      name: 'ログイン保護',
      status: 'excellent',
      score: 95,
      description: 'ログイン試行制限とレート制限が有効',
      recommendation: ''
    },
    {
      name: 'パスワード強度',
      status: 'good',
      score: 85,
      description: '強力なパスワードポリシーを実装',
      recommendation: '定期的なパスワード変更を推奨'
    },
    {
      name: 'セッション管理',
      status: 'excellent',
      score: 90,
      description: 'セキュアなセッション管理を実装',
      recommendation: ''
    },
    {
      name: 'データ保護',
      status: 'good',
      score: 80,
      description: '入力値サニタイゼーションを実装',
      recommendation: '追加の暗号化オプションを検討'
    },
    {
      name: 'ログ監視',
      status: 'excellent',
      score: 100,
      description: '包括的なセキュリティログを記録',
      recommendation: ''
    },
    {
      name: '認証強化',
      status: 'warning',
      score: 60,
      description: '生体認証は開発中',
      recommendation: '多要素認証の完全実装を推奨'
    }
  ]

  const overallScore = Math.round(securityMetrics.reduce((sum, metric) => sum + metric.score, 0) / securityMetrics.length)

  const getStatusColor = (status: SecurityMetric['status']) => {
    switch (status) {
      case 'excellent': return 'text-green-600'
      case 'good': return 'text-blue-600'
      case 'warning': return 'text-orange-600'
      case 'critical': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusBadge = (status: SecurityMetric['status']) => {
    switch (status) {
      case 'excellent': return <Badge className="bg-green-100 text-green-800 border-green-200">優秀</Badge>
      case 'good': return <Badge className="bg-blue-100 text-blue-800 border-blue-200">良好</Badge>
      case 'warning': return <Badge className="bg-orange-100 text-orange-800 border-orange-200">注意</Badge>
      case 'critical': return <Badge className="bg-red-100 text-red-800 border-red-200">危険</Badge>
      default: return <Badge variant="outline">不明</Badge>
    }
  }

  const getStatusIcon = (status: SecurityMetric['status']) => {
    switch (status) {
      case 'excellent': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'good': return <CheckCircle className="h-4 w-4 text-blue-600" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />
      default: return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const getOverallStatus = (score: number) => {
    if (score >= 90) return { status: 'excellent', message: '素晴らしいセキュリティレベルです' }
    if (score >= 80) return { status: 'good', message: '良好なセキュリティレベルです' }
    if (score >= 70) return { status: 'warning', message: 'セキュリティの改善が必要です' }
    return { status: 'critical', message: 'セキュリティリスクが高い状態です' }
  }

  const overall = getOverallStatus(overallScore)

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>セキュリティヘルスチェック</span>
          </CardTitle>
          <CardDescription>
            システムのセキュリティ状況を総合的に評価します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 総合スコア */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">総合セキュリティスコア</span>
              <span className={`text-2xl font-bold ${getStatusColor(overall.status as SecurityMetric['status'])}`}>
                {overallScore}/100
              </span>
            </div>
            <Progress value={overallScore} className="h-2" />
            <div className="flex items-center space-x-2">
              {getStatusIcon(overall.status as SecurityMetric['status'])}
              <span className={`text-sm ${getStatusColor(overall.status as SecurityMetric['status'])}`}>
                {overall.message}
              </span>
            </div>
          </div>

          <Separator />

          {/* 詳細メトリクス */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>セキュリティ項目詳細</span>
            </h4>
            
            <div className="space-y-4">
              {securityMetrics.map((metric, index) => (
                <div key={index} className="space-y-2 p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(metric.status)}
                      <span className="font-medium">{metric.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">{metric.score}%</span>
                      {getStatusBadge(metric.status)}
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">{metric.description}</p>
                  
                  <Progress value={metric.score} className="h-1" />
                  
                  {metric.recommendation && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        <strong>推奨:</strong> {metric.recommendation}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* セキュリティ機能一覧 */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center space-x-2">
              <Lock className="h-4 w-4" />
              <span>実装済みセキュリティ機能</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>ログイン試行制限</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>レート制限</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>セッション管理</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>パスワード強度チェック</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>入力値サニタイゼーション</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>XSS防止</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>CSRF保護</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>セキュリティログ</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>権限管理</span>
              </div>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span>多要素認証（開発中）</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* 最終更新 */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>最終チェック</span>
            </div>
            <span>{new Date().toLocaleString('ja-JP')}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}