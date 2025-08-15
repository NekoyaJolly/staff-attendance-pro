import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Shield, 
  Download, 
  Copy, 
  RefreshCw, 
  AlertTriangle, 
  Check, 
  Eye, 
  EyeOff,
  Key,
  Clock,
  Users
} from '@phosphor-icons/react'
import { BackupCodeService, BackupCodeSet } from '@/services/backupCodeService'
import { User } from '@/App'
import { toast } from 'sonner'

interface BackupCodeManagerProps {
  user: User
  onCodesUpdated?: (codes: BackupCodeSet) => void
}

export default function BackupCodeManager({ user, onCodesUpdated }: BackupCodeManagerProps) {
  const [backupCodes, setBackupCodes] = useKV<BackupCodeSet | null>(`backup_codes_${user.id}`, null)
  const [showCodes, setShowCodes] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [testCode, setTestCode] = useState('')
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)

  const stats = backupCodes ? BackupCodeService.getUsageStats(backupCodes) : null
  const needsNewCodes = backupCodes ? BackupCodeService.needsNewCodeSet(backupCodes) : true
  const securityCheck = backupCodes ? BackupCodeService.validateCodeSecurity(backupCodes.codes) : null

  // 新しいバックアップコードを生成
  const generateNewCodes = async () => {
    setIsGenerating(true)
    try {
      // セキュリティ確認のため少し遅延
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const newCodeSet = BackupCodeService.generateBackupCodeSet()
      setBackupCodes(newCodeSet)
      onCodesUpdated?.(newCodeSet)
      setShowCodes(true)
      setShowGenerateDialog(false)
      
      toast.success('新しいバックアップコードが生成されました')
    } catch (error) {
      toast.error('バックアップコードの生成に失敗しました')
    } finally {
      setIsGenerating(false)
    }
  }

  // バックアップコードをテスト
  const testBackupCode = () => {
    if (!backupCodes || !testCode.trim()) {
      toast.error('テストコードを入力してください')
      return
    }

    const result = BackupCodeService.validateAndUseBackupCode(backupCodes, testCode)
    
    if (result.valid) {
      // テスト用なので実際には使用済みにしない
      toast.success('有効なバックアップコードです')
    } else {
      toast.error(result.message || '無効なバックアップコードです')
    }
    
    setTestCode('')
  }

  // コードをクリップボードにコピー
  const copyToClipboard = () => {
    if (!backupCodes) return

    const copyText = BackupCodeService.generateCopyText(backupCodes.codes, {
      name: user.name,
      email: user.email
    })

    navigator.clipboard.writeText(copyText).then(() => {
      toast.success('バックアップコードをクリップボードにコピーしました')
    }).catch(() => {
      toast.error('コピーに失敗しました')
    })
  }

  // コードをダウンロード
  const downloadCodes = () => {
    if (!backupCodes) return

    const copyText = BackupCodeService.generateCopyText(backupCodes.codes, {
      name: user.name,
      email: user.email
    })

    const blob = new Blob([copyText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `backup-codes-${user.email}-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast.success('バックアップコードをダウンロードしました')
  }

  return (
    <div className="space-y-6">
      {/* 概要カード */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            バックアップコード管理
          </CardTitle>
          <CardDescription>
            緊急時にアカウントにアクセスするためのバックアップコードを管理します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {needsNewCodes && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {!backupCodes 
                  ? 'バックアップコードが設定されていません。セキュリティ向上のため設定を推奨します。'
                  : 'バックアップコードの更新が必要です。残りコード数が少ないか期限が近づいています。'
                }
              </AlertDescription>
            </Alert>
          )}

          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{stats.total}</div>
                <div className="text-sm text-muted-foreground">生成済み</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-destructive">{stats.used}</div>
                <div className="text-sm text-muted-foreground">使用済み</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.remaining}</div>
                <div className="text-sm text-muted-foreground">残り</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.usageRate}%</div>
                <div className="text-sm text-muted-foreground">使用率</div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
              <DialogTrigger asChild>
                <Button className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {backupCodes ? '新しいコードを生成' : 'コードを生成'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>バックアップコード生成の確認</DialogTitle>
                  <DialogDescription>
                    新しいバックアップコードを生成します。既存のコードは無効になります。
                    生成されたコードは安全な場所に保管してください。
                  </DialogDescription>
                </DialogHeader>
                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={generateNewCodes} 
                    disabled={isGenerating}
                    className="flex-1"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        生成中...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        確認して生成
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowGenerateDialog(false)}
                    className="flex-1"
                  >
                    キャンセル
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {backupCodes && (
              <>
                <Button 
                  variant="outline" 
                  onClick={copyToClipboard}
                  className="flex-1 sm:flex-none"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  コピー
                </Button>
                <Button 
                  variant="outline" 
                  onClick={downloadCodes}
                  className="flex-1 sm:flex-none"
                >
                  <Download className="h-4 w-4 mr-2" />
                  ダウンロード
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {backupCodes && (
        <Tabs defaultValue="codes" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="codes">コード一覧</TabsTrigger>
            <TabsTrigger value="test">テスト</TabsTrigger>
            <TabsTrigger value="security">セキュリティ</TabsTrigger>
          </TabsList>

          <TabsContent value="codes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  バックアップコード
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCodes(!showCodes)}
                  >
                    {showCodes ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showCodes ? '非表示' : '表示'}
                  </Button>
                </CardTitle>
                <CardDescription>
                  これらのコードは一度だけ使用できます。安全な場所に保管してください。
                </CardDescription>
              </CardHeader>
              <CardContent>
                {showCodes ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-sm">
                    {BackupCodeService.formatCodesForDisplay(backupCodes.codes).map((code, index) => (
                      <div 
                        key={index} 
                        className={`p-2 rounded border ${
                          backupCodes.usedCodes.includes(code.split('. ')[1].replace('-', ''))
                            ? 'bg-muted text-muted-foreground line-through'
                            : 'bg-background'
                        }`}
                      >
                        {code}
                        {backupCodes.usedCodes.includes(code.split('. ')[1].replace('-', '')) && (
                          <Badge variant="secondary" className="ml-2">使用済み</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>セキュリティのためコードを非表示にしています</p>
                    <p className="text-sm">表示ボタンをクリックして確認してください</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="test" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>バックアップコードテスト</CardTitle>
                <CardDescription>
                  バックアップコードが正しく機能するかテストできます（実際には使用されません）
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="test-code">テストコード</Label>
                  <Input
                    id="test-code"
                    value={testCode}
                    onChange={(e) => setTestCode(e.target.value)}
                    placeholder="XXXX-XXXX"
                    className="font-mono"
                  />
                </div>
                <Button onClick={testBackupCode} disabled={!testCode.trim()}>
                  <Check className="h-4 w-4 mr-2" />
                  テスト実行
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>セキュリティ状況</CardTitle>
                <CardDescription>
                  バックアップコードのセキュリティ状況と推奨事項
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {securityCheck && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      {securityCheck.isSecure ? (
                        <>
                          <Check className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-green-600">セキュア</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-5 w-5 text-yellow-600" />
                          <span className="font-medium text-yellow-600">要注意</span>
                        </>
                      )}
                    </div>

                    {securityCheck.issues.length > 0 && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-1">
                            <strong>検出された問題:</strong>
                            <ul className="list-disc list-inside space-y-1">
                              {securityCheck.issues.map((issue, index) => (
                                <li key={index}>{issue}</li>
                              ))}
                            </ul>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    {securityCheck.recommendations.length > 0 && (
                      <Alert>
                        <AlertDescription>
                          <div className="space-y-1">
                            <strong>推奨事項:</strong>
                            <ul className="list-disc list-inside space-y-1">
                              {securityCheck.recommendations.map((rec, index) => (
                                <li key={index}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="font-medium">一般的な推奨事項</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>バックアップコードは印刷して物理的に安全な場所に保管</li>
                    <li>パスワードマネージャーなどのセキュアな場所にデジタル保存</li>
                    <li>定期的に新しいコードを生成（年1回以上）</li>
                    <li>コードを他人と共有しない</li>
                    <li>使用後は残りのコード数を確認</li>
                  </ul>
                </div>

                {stats && (
                  <div className="space-y-2">
                    <h4 className="font-medium">使用統計</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        生成日時: {new Date(backupCodes.createdAt).toLocaleString('ja-JP')}
                      </div>
                      {stats.lastUsed && (
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          最終使用: {new Date(stats.lastUsed).toLocaleString('ja-JP')}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}