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
import { 
  Lock, 
  Fingerprint, 
  Bell, 
  Eye, 
  EyeSlash,
  CheckCircle,
  XCircle 
} from '@phosphor-icons/react'
import { toast } from 'sonner'

interface AccountSettingsDialogProps {
  trigger: React.ReactNode
  type: 'password' | 'biometric' | 'notification'
}

export default function AccountSettingsDialog({ trigger, type }: AccountSettingsDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // パスワード変更用の状態
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  // 生体認証用の状態
  const [biometricEnabled, setBiometricEnabled] = useState(false)

  // 通知設定用の状態
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [shiftUpdates, setShiftUpdates] = useState(true)
  const [timeRecordReminders, setTimeRecordReminders] = useState(true)
  const [vacationApprovals, setVacationApprovals] = useState(true)

  const handlePasswordChange = async () => {
    setPasswordError('')
    
    // バリデーション
    if (!currentPassword) {
      setPasswordError('現在のパスワードを入力してください')
      return
    }
    
    if (!newPassword) {
      setPasswordError('新しいパスワードを入力してください')
      return
    }
    
    if (newPassword.length < 8) {
      setPasswordError('パスワードは8文字以上で入力してください')
      return
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('確認用パスワードが一致しません')
      return
    }

    setIsLoading(true)
    
    try {
      // 現在のパスワードの検証（ダミー実装）
      // 実際の実装では、APIで現在のパスワードを検証
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // ここでランダムにエラーを発生させることで、エラーハンドリングをデモ
      if (currentPassword === 'wrong') {
        setPasswordError('現在のパスワードが正しくありません')
        return
      }
      
      // パスワード更新処理（実際の実装ではAPIコール）
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.success('パスワードを変更しました')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setOpen(false)
    } catch (error) {
      setPasswordError('パスワードの変更に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBiometricToggle = async () => {
    setIsLoading(true)
    
    try {
      // 生体認証の設定変更（実際の実装ではデバイスの生体認証APIを使用）
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setBiometricEnabled(!biometricEnabled)
      toast.success(
        !biometricEnabled 
          ? '生体認証を有効にしました' 
          : '生体認証を無効にしました'
      )
      setOpen(false)
    } catch (error) {
      toast.error('生体認証の設定に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleNotificationSave = async () => {
    setIsLoading(true)
    
    try {
      // 通知設定の保存（実際の実装ではAPIコール）
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.success('通知設定を保存しました')
      setOpen(false)
    } catch (error) {
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
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="現在のパスワードを入力"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
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
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="新しいパスワードを入力"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowNewPassword(!showNewPassword)}
          >
            {showNewPassword ? (
              <EyeSlash className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password">パスワード確認</Label>
        <div className="relative">
          <Input
            id="confirm-password"
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="新しいパスワードを再入力"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? (
              <EyeSlash className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {passwordError && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <XCircle size={16} />
          {passwordError}
        </div>
      )}

      <div className="text-sm text-muted-foreground">
        パスワードは8文字以上で設定してください
      </div>

      <div className="flex gap-2 pt-4">
        <Button 
          onClick={handlePasswordChange} 
          disabled={isLoading}
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

  const renderNotificationContent = () => (
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
      default:
        return <Lock size={20} />
    }
  }

  const renderContent = () => {
    switch (type) {
      case 'password':
        return renderPasswordContent()
      case 'biometric':
        return renderBiometricContent()
      case 'notification':
        return renderNotificationContent()
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
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
  )
}