import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Shield, Smartphone, MessageSquare, Key } from '@phosphor-icons/react'
import { MFAService } from '@/services/mfaService'
import { BackupCodeService, BackupCodeSet } from '@/services/backupCodeService'
import { User } from '@/App'

interface MFAVerificationProps {
  user: User
  onVerificationSuccess: () => void
  onError: (error: string) => void
}

export default function MFAVerification({ user, onVerificationSuccess, onError }: MFAVerificationProps) {
  const [activeTab, setActiveTab] = useState(user.mfaMethod || 'app')
  const [verificationCode, setVerificationCode] = useState('')
  const [smsCode, setSmsCode] = useState('')
  const [backupCode, setBackupCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [smsLoading, setSmsLoading] = useState(false)
  const [backupCodes, setBackupCodes] = useKV<BackupCodeSet | null>(`backup_codes_${user.id}`, null)

  const handleTOTPVerification = async () => {
    if (!verificationCode || !user.totpSecret) {
      onError('認証コードを入力してください')
      return
    }

    setLoading(true)
    
    try {
      const isValid = MFAService.verifyTOTPCode(user.totpSecret, verificationCode)
      
      if (isValid) {
        onVerificationSuccess()
      } else {
        onError('認証コードが正しくありません')
      }
    } catch (err) {
      onError('認証に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const sendSMSCode = async () => {
    if (!user.phone) {
      onError('電話番号が登録されていません')
      return
    }

    setSmsLoading(true)
    
    try {
      const sentCode = await MFAService.sendSMSCode(user.phone)
      // 開発用：SMSコードを自動入力（実際の運用では削除）
      setSmsCode(sentCode)
      // UIフィードバック
      if (user.phone.endsWith('7890')) {
        // 管理者用のデモメッセージ
        console.log(`SMS sent to admin ${user.phone}: ${sentCode}`)
      }
    } catch (err) {
      onError('SMS送信に失敗しました')
    } finally {
      setSmsLoading(false)
    }
  }

  const handleSMSVerification = async () => {
    if (!smsCode || !user.phone) {
      onError('認証コードを入力してください')
      return
    }

    setLoading(true)
    
    try {
      const isValid = MFAService.verifySMSCode(user.phone, smsCode)
      
      if (isValid) {
        onVerificationSuccess()
      } else {
        onError('認証コードが正しくないか、有効期限が切れています')
      }
    } catch (err) {
      onError('認証に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleBackupCodeVerification = async () => {
    if (!backupCode) {
      onError('バックアップコードを入力してください')
      return
    }

    if (!backupCodes) {
      onError('バックアップコードが設定されていません')
      return
    }

    setLoading(true)
    
    try {
      const result = BackupCodeService.validateAndUseBackupCode(backupCodes, backupCode)
      
      if (result.valid) {
        // バックアップコードを更新（使用済みコードをマーク）
        const updatedCodeSet = {
          ...backupCodes,
          usedCodes: result.usedCodes,
          lastUsed: new Date().toISOString()
        }
        setBackupCodes(updatedCodeSet)
        
        onVerificationSuccess()
      } else {
        onError(result.message || 'バックアップコードが正しくありません')
      }
    } catch (err) {
      onError('認証に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <CardTitle>二段階認証</CardTitle>
        <CardDescription>
          セキュリティのため、認証コードを入力してください
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            {user.mfaMethod === 'app' && (
              <TabsTrigger value="app" className="flex items-center space-x-1">
                <Smartphone className="h-4 w-4" />
                <span className="hidden sm:inline">アプリ</span>
              </TabsTrigger>
            )}
            {user.mfaMethod === 'sms' && (
              <TabsTrigger value="sms" className="flex items-center space-x-1">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">SMS</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="backup" className="flex items-center space-x-1">
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">バックアップ</span>
            </TabsTrigger>
          </TabsList>

          {user.mfaMethod === 'app' && (
            <TabsContent value="app" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="totp-code">認証アプリのコード</Label>
                <Input
                  id="totp-code"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  className="text-center text-lg"
                />
              </div>
              <Button 
                onClick={handleTOTPVerification}
                disabled={loading || !verificationCode}
                className="w-full"
              >
                {loading ? '確認中...' : '認証する'}
              </Button>
            </TabsContent>
          )}

          {user.mfaMethod === 'sms' && (
            <TabsContent value="sms" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sms-code">SMS認証コード</Label>
                <Input
                  id="sms-code"
                  type="text"
                  value={smsCode}
                  onChange={(e) => setSmsCode(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  className="text-center text-lg"
                />
              </div>
              <div className="space-y-2">
                <Button 
                  onClick={sendSMSCode}
                  disabled={smsLoading}
                  variant="outline"
                  className="w-full"
                >
                  {smsLoading ? '送信中...' : 'SMS再送信'}
                </Button>
                <Button 
                  onClick={handleSMSVerification}
                  disabled={loading || !smsCode}
                  className="w-full"
                >
                  {loading ? '確認中...' : '認証する'}
                </Button>
              </div>
              <Alert>
                <MessageSquare className="h-4 w-4" />
                <AlertDescription>
                  {user.phone ? `${user.phone} にSMSを送信します` : 'SMS送信用の電話番号が未登録です'}
                </AlertDescription>
              </Alert>
            </TabsContent>
          )}

          <TabsContent value="backup" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="backup-code">バックアップコード</Label>
              <Input
                id="backup-code"
                type="text"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX"
                maxLength={9}
                className="text-center text-lg font-mono"
              />
            </div>
            <Button 
              onClick={handleBackupCodeVerification}
              disabled={loading || !backupCode}
              className="w-full"
            >
              {loading ? '確認中...' : '認証する'}
            </Button>
            <Alert>
              <Key className="h-4 w-4" />
              <AlertDescription>
                バックアップコードは一度のみ使用可能です。使用後は無効になります。
                {backupCodes && (
                  <div className="mt-2 text-sm">
                    残り{BackupCodeService.getRemainingCodeCount(backupCodes)}個のバックアップコードが利用可能です。
                  </div>
                )}
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}