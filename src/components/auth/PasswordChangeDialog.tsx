import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Key, Shield, CheckCircle } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { validatePasswordStrength, hashPassword, securityLogger } from '../../lib/security'
import { User } from '../../App'

interface PasswordChangeDialogProps {
  user: User
  trigger: React.ReactNode
}

export default function PasswordChangeDialog({ user, trigger }: PasswordChangeDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState({ isValid: false, errors: [] as string[] })

  const handleNewPasswordChange = (password: string) => {
    setNewPassword(password)
    setPasswordStrength(validatePasswordStrength(password))
  }

  const handlePasswordChange = async () => {
    setIsLoading(true)

    try {
      // 現在のパスワード確認（デモ用）
      const currentHash = await hashPassword(currentPassword)
      const expectedHash = await hashPassword('password123') // デモ用
      
      if (currentHash !== expectedHash) {
        toast.error('現在のパスワードが間違っています')
        securityLogger.log('PASSWORD_CHANGE_FAILED_WRONG_CURRENT', user.id)
        return
      }

      // パスワード強度チェック
      if (!passwordStrength.isValid) {
        toast.error('新しいパスワードが要件を満たしていません')
        return
      }

      // パスワード確認チェック
      if (newPassword !== confirmPassword) {
        toast.error('新しいパスワードと確認パスワードが一致しません')
        return
      }

      // 現在のパスワードと同じでないかチェック
      if (currentPassword === newPassword) {
        toast.error('現在のパスワードと同じパスワードは使用できません')
        return
      }

      // パスワード変更処理（実際の実装ではAPIに送信）
      const newHash = await hashPassword(newPassword)
      securityLogger.log('PASSWORD_CHANGED', user.id, { method: 'manual' })
      
      toast.success('パスワードが正常に変更されました')
      setIsOpen(false)
      resetForm()
    } catch (error) {
      securityLogger.log('PASSWORD_CHANGE_ERROR', user.id, { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
      toast.error('パスワード変更に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordStrength({ isValid: false, errors: [] })
  }

  const handleClose = () => {
    setIsOpen(false)
    resetForm()
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Key className="h-5 w-5 text-primary" />
            <span>パスワード変更</span>
          </DialogTitle>
          <DialogDescription>
            セキュリティのため、定期的にパスワードを変更することをお勧めします。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">現在のパスワード</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="現在のパスワードを入力"
              autoComplete="current-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">新しいパスワード</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => handleNewPasswordChange(e.target.value)}
              placeholder="新しいパスワードを入力"
              autoComplete="new-password"
            />
            
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
            <Label htmlFor="confirm-password">新しいパスワード（確認）</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="新しいパスワードを再入力"
              autoComplete="new-password"
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-sm text-red-600">パスワードが一致しません</p>
            )}
          </div>
        </div>

        <DialogFooter className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isLoading}
          >
            キャンセル
          </Button>
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
          >
            {isLoading ? '変更中...' : 'パスワード変更'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}