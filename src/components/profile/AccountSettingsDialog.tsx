import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Lock, 
  Fingerprint, 
  Bell, 
  Eye, 
  EyeSlash,
  CheckCircle,
  XCircle,
  Shield,
  Key
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { validatePasswordStrength, sanitizeInput, hashPassword, securityLogger } from '../../lib/security'
import { User } from '../../App'
import MFASetupDialog from '../auth/MFASetupDialog'
import BackupCodeManager from '../security/BackupCodeManager'

interface AccountSettingsDialogProps {
  trigger: React.ReactNode
  type: 'password' | 'biometric' | 'notification' | 'mfa' | 'backup'
  user: User
  onUserUpdate?: (user: User) => void
}

export default function AccountSettingsDialog({ trigger, type, user, onUserUpdate }: AccountSettingsDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [mfaSetupOpen, setMfaSetupOpen] = useState(false)

  // パスワード変更用の状態
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordStrength, setPasswordStrength] = useState({ isValid: false, errors: [] as string[] })

  // 生体認証用の状態
  const [biometricEnabled, setBiometricEnabled] = useState(false)

  // 通知設定用の状態
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [shiftUpdates, setShiftUpdates] = useState(true)
  const [timeRecordReminders, setTimeRecordReminders] = useState(true)
  const [vacationApprovals, setVacationApprovals] = useState(true)

  const handleNewPasswordChange = (password: string) => {
    const sanitized = sanitizeInput(password)
    setNewPassword(sanitized)
    setPasswordStrength(validatePasswordStrength(sanitized))
    setPasswordError('')
  }

  const handlePasswordChange = async () => {
    setPasswordError('')
    
    try {
      // 入力値のサニタイゼーション
      const sanitizedCurrentPassword = sanitizeInput(currentPassword)
      const sanitizedNewPassword = sanitizeInput(newPassword)
      const sanitizedConfirmPassword = sanitizeInput(confirmPassword)

      // バリデーション
      if (!sanitizedCurrentPassword) {
        setPasswordError('現在のパスワードを入力してください')
        return
      }
      
      if (!sanitizedNewPassword) {
        setPasswordError('新しいパスワードを入力してください')
        return
      }
      
      if (!passwordStrength.isValid) {
        setPasswordError('パスワードが要件を満たしていません')
        return
      }
      
      if (sanitizedNewPassword !== sanitizedConfirmPassword) {
        setPasswordError('確認用パスワードが一致しません')
        return
      }

      if (sanitizedCurrentPassword === sanitizedNewPassword) {
        setPasswordError('現在のパスワードと同じパスワードは使用できません')
        return
      }

      setIsLoading(true)
      
      // 現在のパスワードの検証
      const currentHash = await hashPassword(sanitizedCurrentPassword)
      const expectedHash = await hashPassword('password123') // デモ用
      
      if (currentHash !== expectedHash) {
        setPasswordError('現在のパスワードが正しくありません')
        securityLogger.log('PASSWORD_CHANGE_FAILED_WRONG_CURRENT', user.id)
        return
      }
      
      // パスワード更新処理
      const newHash = await hashPassword(sanitizedNewPassword)
      securityLogger.log('PASSWORD_CHANGED', user.id, { method: 'manual_secure' })
      
      toast.success('パスワードを安全に変更しました')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordStrength({ isValid: false, errors: [] })
      setOpen(false)
    } catch (error) {
      setPasswordError('パスワードの変更に失敗しました')
      securityLogger.log('PASSWORD_CHANGE_ERROR', user.id, { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleBiometricToggle = async () => {
    setIsLoading(true)
    
    try {
      // 生体認証の設定変更（セキュリティログ記録）
      securityLogger.log('BIOMETRIC_SETTING_CHANGED', user.id, { 
        enabled: !biometricEnabled,
        timestamp: Date.now()
      })
      
      setBiometricEnabled(!biometricEnabled)
      toast.success(
        !biometricEnabled 
          ? '生体認証を有効にしました' 
          : '生体認証を無効にしました'
      )
      setOpen(false)
    } catch (error) {
      securityLogger.log('BIOMETRIC_SETTING_ERROR', user.id, { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
      toast.error('生体認証の設定に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleNotificationSave = async () => {
    setIsLoading(true)
    
    try {
      // 通知設定の保存（セキュリティログ記録）
      securityLogger.log('NOTIFICATION_SETTINGS_CHANGED', user.id, {
        emailNotifications,
        pushNotifications,
        shiftUpdates,
        timeRecordReminders,
        vacationApprovals
      })
      
      toast.success('通知設定を保存しました')
      setOpen(false)
    } catch (error) {
      securityLogger.log('NOTIFICATION_SETTINGS_ERROR', user.id, { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
      toast.error('通知設定の保存に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const renderPasswordContent = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="current-password">現在のパスワード</Label>
        <div className="relative">
          <Input
            id="current-password"
            type={showCurrentPassword ? "text" : "password"}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(sanitizeInput(e.target.value))}
            placeholder="現在のパスワードを入力"
            autoComplete="current-password"
            maxLength={128}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            tabIndex={-1}
          >
            {showCurrentPassword ? (
              <EyeSlash className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-password">新しいパスワード</Label>
        <div className="relative">
          <Input
            id="new-password"
            type={showNewPassword ? "text" : "password"}
            value={newPassword}
            onChange={(e) => handleNewPasswordChange(e.target.value)}
            placeholder="新しいパスワードを入力"
            autoComplete="new-password"
            maxLength={128}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowNewPassword(!showNewPassword)}
            tabIndex={-1}
          >
            {showNewPassword ? (
              <EyeSlash className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {newPassword && (
          <div className="mt-2 space-y-1">
            <div className="flex items-center space-x-2 text-sm">
              {passwordStrength.isValid ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Shield className="h-4 w-4 text-orange-500" />
              )}
              <span className={passwordStrength.isValid ? 'text-green-600' : 'text-orange-600'}>
                {passwordStrength.isValid ? 'パスワード強度: 強い' : 'パスワード強度: 弱い'}
              </span>
            </div>
            
            {passwordStrength.errors.length > 0 && (
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">パスワード要件:</p>
                    <ul className="text-sm space-y-1">
                      {passwordStrength.errors.map((error, index) => (
                        <li key={index} className="text-red-600">• {error}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password">パスワード確認</Label>
        <div className="relative">
          <Input
            id="confirm-password"
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(sanitizeInput(e.target.value))}
            placeholder="新しいパスワードを再入力"
            autoComplete="new-password"
            maxLength={128}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            tabIndex={-1}
          >
            {showConfirmPassword ? (
              <EyeSlash className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
        {confirmPassword && newPassword !== confirmPassword && (
          <p className="text-sm text-red-600">パスワードが一致しません</p>
        )}
      </div>

      {passwordError && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <XCircle size={16} />
          {passwordError}
        </div>
      )}

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>セキュアなパスワードの要件:</strong>
          <ul className="mt-1 text-sm space-y-1">
            <li>• 8文字以上</li>
            <li>• 大文字と小文字を含む</li>
            <li>• 数字を含む</li>
            <li>• 特殊文字(@$!%*?&)を含む</li>
          </ul>
        </AlertDescription>
      </Alert>

      <div className="flex gap-2 pt-4">
        <Button 
          onClick={handlePasswordChange} 
          disabled={
            isLoading || 
            !currentPassword || 
            !newPassword || 
            !confirmPassword || 
            !passwordStrength.isValid ||
            newPassword !== confirmPassword
          }
          className="flex-1"
        >
          {isLoading ? '変更中...' : '変更'}
        </Button>
        <Button 
          variant="outline" 
          onClick={() => setOpen(false)}
          className="flex-1"
        >
          キャンセル
        </Button>
      </div>
    </div>
  )

  const renderBiometricContent = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="biometric-switch">生体認証</Label>
          <p className="text-sm text-muted-foreground">
            Face IDや指紋認証でログインできます
          </p>
        </div>
        <Switch
          id="biometric-switch"
          checked={biometricEnabled}
          onCheckedChange={setBiometricEnabled}
          disabled={isLoading}
        />
      </div>

      <Separator />

      <div className="text-sm text-muted-foreground">
        この機能を有効にすると、次回ログイン時から生体認証が利用できます。
        無効にする場合は、パスワードでのログインが必要になります。
      </div>

      <div className="flex gap-2 pt-4">
        <Button 
          onClick={handleBiometricToggle} 
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading ? '設定中...' : (biometricEnabled ? '無効にする' : '有効にする')}
        </Button>
        <Button 
          variant="outline" 
          onClick={() => setOpen(false)}
          className="flex-1"
        >
          キャンセル
        </Button>
      </div>
    </div>
  )

  const renderMFAContent = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">多要素認証</h4>
          <p className="text-sm text-muted-foreground">
            アカウントのセキュリティを強化します
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {user.mfaEnabled ? (
            <div className="flex items-center space-x-1 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-xs">有効</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1 text-red-600">
              <XCircle className="h-4 w-4" />
              <span className="text-xs">無効</span>
            </div>
          )}
        </div>
      </div>

      {user.mfaEnabled && (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="text-sm font-medium">認証方法</p>
              <p className="text-xs text-muted-foreground">
                {user.mfaMethod === 'app' ? '認証アプリ' : 'SMS認証'}
              </p>
            </div>
            <Shield className="h-5 w-5 text-primary" />
          </div>

          {user.mfaMethod === 'app' && user.backupCodes && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm font-medium text-yellow-800">
                バックアップコード
              </p>
              <p className="text-xs text-yellow-700">
                残り{user.backupCodes.length}個のコードが利用可能です
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-4">
        {user.mfaEnabled ? (
          <>
            <Button 
              onClick={() => {
                // MFA無効化の処理
                if (onUserUpdate) {
                  const updatedUser = {
                    ...user,
                    mfaEnabled: false,
                    mfaMethod: 'none' as const,
                    totpSecret: undefined,
                    backupCodes: undefined
                  }
                  onUserUpdate(updatedUser)
                  toast.success('多要素認証を無効にしました')
                  setOpen(false)
                }
              }}
              variant="destructive"
              disabled={isLoading}
              className="flex-1"
            >
              無効にする
            </Button>
            <Button 
              onClick={() => setMfaSetupOpen(true)}
              variant="outline"
              className="flex-1"
            >
              再設定
            </Button>
          </>
        ) : (
          <Button 
            onClick={() => setMfaSetupOpen(true)}
            disabled={isLoading}
            className="flex-1"
          >
            有効にする
          </Button>
        )}
        <Button 
          variant="outline" 
          onClick={() => setOpen(false)}
          className="flex-1"
        >
          キャンセル
        </Button>
      </div>
    </div>
  )
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium mb-3">通知方法</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="email-notifications">メール通知</Label>
            <Switch
              id="email-notifications"
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="push-notifications">プッシュ通知</Label>
            <Switch
              id="push-notifications"
              checked={pushNotifications}
              onCheckedChange={setPushNotifications}
            />
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="text-sm font-medium mb-3">通知内容</h4>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="shift-updates"
              checked={shiftUpdates}
              onCheckedChange={(checked) => setShiftUpdates(checked === true)}
            />
            <Label htmlFor="shift-updates" className="text-sm">
              シフト更新通知
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="time-record-reminders"
              checked={timeRecordReminders}
              onCheckedChange={(checked) => setTimeRecordReminders(checked === true)}
            />
            <Label htmlFor="time-record-reminders" className="text-sm">
              勤怠記録リマインド
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="vacation-approvals"
              checked={vacationApprovals}
              onCheckedChange={(checked) => setVacationApprovals(checked === true)}
            />
            <Label htmlFor="vacation-approvals" className="text-sm">
              有給申請の承認通知
            </Label>
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button 
          onClick={handleNotificationSave} 
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading ? '保存中...' : '保存'}
        </Button>
        <Button 
          variant="outline" 
          onClick={() => setOpen(false)}
          className="flex-1"
        >
          キャンセル
        </Button>
      </div>
    </div>
  )

  const getDialogTitle = () => {
    switch (type) {
      case 'password':
        return 'パスワード変更'
      case 'biometric':
        return '生体認証設定'
      case 'notification':
        return '通知設定'
      case 'mfa':
        return '多要素認証設定'
      case 'backup':
        return 'バックアップコード管理'
      default:
        return 'アカウント設定'
    }
  }

  const getDialogDescription = () => {
    switch (type) {
      case 'password':
        return 'アカウントのパスワードを変更します'
      case 'biometric':
        return '生体認証によるログイン設定を変更します'
      case 'notification':
        return '通知の受信設定を変更します'
      case 'mfa':
        return 'セキュリティを強化するための多要素認証を設定します'
      case 'backup':
        return '緊急時のアクセス手段となるバックアップコードを管理します'
      default:
        return 'アカウント設定を変更します'
    }
  }

  const getDialogIcon = () => {
    switch (type) {
      case 'password':
        return <Lock size={20} />
      case 'biometric':
        return <Fingerprint size={20} />
      case 'notification':
        return <Bell size={20} />
      case 'mfa':
        return <Shield size={20} />
      case 'backup':
        return <Key size={20} />
      default:
        return <Lock size={20} />
    }
  }

  const renderBackupContent = () => (
    <div className="space-y-4">
      <BackupCodeManager 
        user={user}
        onCodesUpdated={(codes) => {
          // バックアップコードが更新された時の処理
          console.log('Backup codes updated:', codes)
        }}
      />
    </div>
  )

  const renderContent = () => {
    switch (type) {
      case 'password':
        return renderPasswordContent()
      case 'biometric':
        return renderBiometricContent()
      case 'notification':
        return renderNotificationContent()
      case 'mfa':
        return renderMFAContent()
      case 'backup':
        return renderBackupContent()
      default:
        return null
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
        <DialogContent className={`${type === 'backup' ? 'sm:max-w-[800px] max-h-[90vh] overflow-y-auto' : 'sm:max-w-[425px]'}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getDialogIcon()}
              {getDialogTitle()}
            </DialogTitle>
            <DialogDescription>
              {getDialogDescription()}
            </DialogDescription>
          </DialogHeader>
          {renderContent()}
        </DialogContent>
      </Dialog>

      {/* MFA設定ダイアログ */}
      <MFASetupDialog
        open={mfaSetupOpen}
        onOpenChange={setMfaSetupOpen}
        user={user}
        onMFAUpdate={(updatedUser) => {
          if (onUserUpdate) {
            onUserUpdate(updatedUser)
          }
          setMfaSetupOpen(false)
          setOpen(false)
        }}
      />
    </>
  )
}