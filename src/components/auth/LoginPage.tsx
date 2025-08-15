import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Fingerprint, Eye, EyeOff, Shield, AlertTriangle } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { User } from '../../App'
import { 
  sanitizeInput, 
  loginAttemptManager, 
  sessionManager, 
  securityLogger,
  rateLimiter,
  hashPassword 
} from '../../lib/security'
import MFAVerification from './MFAVerification'
import { MFAService } from '../../services/mfaService'

interface LoginPageProps {
  onLogin: (user: User) => void
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [staffId, setStaffId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [lockoutTime, setLockoutTime] = useState(0)
  const [securityWarning, setSecurityWarning] = useState('')
  const [mfaUser, setMfaUser] = useState<User | null>(null)
  const [mfaError, setMfaError] = useState('')

  // セキュリティ警告の監視
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = loginAttemptManager.getRemainingLockoutTime(staffId)
      if (remaining > 0) {
        setLockoutTime(Math.ceil(remaining / 1000))
        setSecurityWarning(`アカウントがロックされています。あと${Math.ceil(remaining / 60000)}分後に再試行できます。`)
      } else {
        setLockoutTime(0)
        setSecurityWarning('')
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [staffId])

  // デモ用のユーザーデータ（実際の本番環境では外部のセキュアなDBから取得）
  const demoUsers: User[] = [
    {
      id: '1',
      name: '田中 太郎',
      email: 'tanaka@example.com',
      role: 'staff',
      staffId: 'staff001',
      birthDate: '1990-01-01',
      address: '東京都渋谷区',
      phone: '090-1234-5678',
      mfaEnabled: false,
      mfaMethod: 'none'
    },
    {
      id: '2',
      name: '佐藤 花子',
      email: 'sato@example.com',
      role: 'creator',
      staffId: 'creator001',
      birthDate: '1988-05-15',
      address: '東京都新宿区',
      phone: '090-2345-6789',
      mfaEnabled: true,
      mfaMethod: 'app',
      totpSecret: 'JBSWY3DPEHPK3PXP',
      backupCodes: ['ABC123DE', 'FGH456IJ', 'KLM789NO', 'PQR012ST', 'UVW345XY']
    },
    {
      id: '3',
      name: '管理者 次郎',
      email: 'admin@example.com',
      role: 'admin',
      staffId: 'admin001',
      birthDate: '1985-12-10',
      address: '東京都港区',
      phone: '090-3456-7890',
      mfaEnabled: true,
      mfaMethod: 'sms'
    }
  ]

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // 入力値のサニタイゼーション
      const sanitizedStaffId = sanitizeInput(staffId)
      const sanitizedPassword = sanitizeInput(password)

      // レート制限チェック
      if (!rateLimiter.checkLimit(`login_${sanitizedStaffId}`, 5, 15 * 60 * 1000)) {
        toast.error('ログイン試行回数が多すぎます。しばらく待ってから再試行してください。')
        securityLogger.log('RATE_LIMIT_EXCEEDED', undefined, { staffId: sanitizedStaffId })
        return
      }

      // ログイン試行制限チェック
      if (!loginAttemptManager.canAttemptLogin(sanitizedStaffId)) {
        const remaining = loginAttemptManager.getRemainingLockoutTime(sanitizedStaffId)
        toast.error(`アカウントがロックされています。${Math.ceil(remaining / 60000)}分後に再試行してください。`)
        securityLogger.log('LOGIN_BLOCKED_LOCKOUT', undefined, { staffId: sanitizedStaffId })
        return
      }

      // ユーザー検索
      const user = demoUsers.find(u => u.staffId === sanitizedStaffId)
      
      if (!user) {
        loginAttemptManager.recordLoginAttempt(sanitizedStaffId, false)
        securityLogger.log('LOGIN_FAILED_USER_NOT_FOUND', undefined, { staffId: sanitizedStaffId })
        toast.error('スタッフIDまたはパスワードが間違っています')
        return
      }

      // パスワードチェック（実際の本番環境ではハッシュ化されたパスワードと比較）
      const hashedPassword = await hashPassword(sanitizedPassword)
      const expectedHash = await hashPassword('password123') // デモ用
      
      if (hashedPassword !== expectedHash) {
        loginAttemptManager.recordLoginAttempt(sanitizedStaffId, false)
        securityLogger.log('LOGIN_FAILED_WRONG_PASSWORD', user.id, { staffId: sanitizedStaffId })
        toast.error('スタッフIDまたはパスワードが間違っています')
        return
      }

      // ログイン成功 - MFA確認
      loginAttemptManager.recordLoginAttempt(sanitizedStaffId, true)
      
      if (user.mfaEnabled) {
        // MFA認証が必要
        setMfaUser(user)
        setMfaError('')
        securityLogger.log('MFA_REQUIRED', user.id, { staffId: sanitizedStaffId })
        
        // SMS認証の場合は自動的にSMSを送信
        if (user.mfaMethod === 'sms' && user.phone) {
          try {
            const smsCode = await MFAService.sendSMSCode(user.phone)
            console.log(`Auto-sent SMS code to ${user.phone}: ${smsCode}`)
          } catch (error) {
            console.warn('Failed to auto-send SMS:', error)
          }
        }
      } else {
        // MFA不要 - 直接ログイン
        const sessionId = sessionManager.createSession(user)
        securityLogger.log('LOGIN_SUCCESS', user.id, { staffId: sanitizedStaffId, sessionId })
        toast.success(`${user.name}さん、ログインしました`)
        onLogin(user)
      }
    } catch (error) {
      securityLogger.log('LOGIN_ERROR', undefined, { 
        staffId: sanitizeInput(staffId), 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
      toast.error('ログインに失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMFASuccess = () => {
    if (mfaUser) {
      const sessionId = sessionManager.createSession(mfaUser)
      securityLogger.log('LOGIN_SUCCESS_WITH_MFA', mfaUser.id, { 
        staffId: mfaUser.staffId, 
        sessionId,
        mfaMethod: mfaUser.mfaMethod
      })
      toast.success(`${mfaUser.name}さん、ログインしました`)
      onLogin(mfaUser)
    }
  }

  const handleMFAError = (error: string) => {
    setMfaError(error)
    if (mfaUser) {
      securityLogger.log('MFA_FAILED', mfaUser.id, { 
        staffId: mfaUser.staffId,
        error,
        mfaMethod: mfaUser.mfaMethod
      })
    }
  }

  const handleMFACancel = () => {
    setMfaUser(null)
    setMfaError('')
    if (mfaUser) {
      securityLogger.log('MFA_CANCELLED', mfaUser.id, { staffId: mfaUser.staffId })
    }
  }

  const handleInputChange = (value: string, setter: (value: string) => void) => {
    // 入力値の基本的なセキュリティチェック
    const sanitized = sanitizeInput(value)
    setter(sanitized)
  }

  // MFA認証中の場合、MFA認証画面を表示
  if (mfaUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-4">
        <div className="space-y-4">
          {mfaError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{mfaError}</AlertDescription>
            </Alert>
          )}
          
          <MFAVerification 
            user={mfaUser}
            onVerificationSuccess={handleMFASuccess}
            onError={handleMFAError}
          />
          
          <div className="text-center">
            <Button 
              variant="outline" 
              onClick={handleMFACancel}
              className="w-full max-w-sm"
            >
              ログイン画面に戻る
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <Shield className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl font-bold text-primary">勤怠管理システム</CardTitle>
          </div>
          <CardDescription>セキュアなログインでアクセスしてください</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {securityWarning && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{securityWarning}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="staff-id">スタッフID</Label>
              <Input
                id="staff-id"
                type="text"
                placeholder="例: staff001"
                value={staffId}
                onChange={(e) => handleInputChange(e.target.value, setStaffId)}
                disabled={lockoutTime > 0}
                required
                maxLength={20}
                autoComplete="username"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="パスワードを入力"
                  value={password}
                  onChange={(e) => handleInputChange(e.target.value, setPassword)}
                  disabled={lockoutTime > 0}
                  required
                  maxLength={128}
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-auto p-1"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={lockoutTime > 0}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || lockoutTime > 0}
            >
              {isLoading ? 'ログイン中...' : lockoutTime > 0 ? `ロック中 (${lockoutTime}秒)` : 'ログイン'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">または</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleBiometricLogin}
            disabled={lockoutTime > 0}
          >
            <Fingerprint className="mr-2 h-4 w-4" />
            生体認証でログイン
          </Button>

          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>デモ用アカウント:</p>
            <p>スタッフ: staff001 / 作成者: creator001 / 管理者: admin001</p>
            <p>パスワード: password123</p>
            <p className="text-orange-600 mt-2 flex items-center justify-center space-x-1">
              <Shield size={12} />
              <span>セキュリティが強化されています</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}