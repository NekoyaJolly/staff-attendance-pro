import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Fingerprint, Eye, EyeOff } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { User } from '../../App'

interface LoginPageProps {
  onLogin: (user: User) => void
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [staffId, setStaffId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // デモ用のユーザーデータ
  const demoUsers: User[] = [
    {
      id: '1',
      name: '田中 太郎',
      email: 'tanaka@example.com',
      role: 'staff',
      staffId: 'staff001',
      birthDate: '1990-01-01',
      address: '東京都渋谷区',
      phone: '090-1234-5678'
    },
    {
      id: '2',
      name: '佐藤 花子',
      email: 'sato@example.com',
      role: 'creator',
      staffId: 'creator001',
      birthDate: '1988-05-15',
      address: '東京都新宿区',
      phone: '090-2345-6789'
    },
    {
      id: '3',
      name: '管理者 次郎',
      email: 'admin@example.com',
      role: 'admin',
      staffId: 'admin001',
      birthDate: '1985-12-10',
      address: '東京都港区',
      phone: '090-3456-7890'
    }
  ]

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // デモ用の認証ロジック
      const user = demoUsers.find(u => u.staffId === staffId)
      
      if (!user) {
        toast.error('スタッフIDが見つかりません')
        return
      }

      // パスワードチェック（デモでは簡単な検証）
      if (password !== 'password123') {
        toast.error('パスワードが間違っています')
        return
      }

      toast.success(`${user.name}さん、ログインしました`)
      onLogin(user)
    } catch (error) {
      toast.error('ログインに失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBiometricLogin = () => {
    toast.info('生体認証は開発中です')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold text-primary">勤怠管理システム</CardTitle>
          <CardDescription>スタッフIDとパスワードでログインしてください</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="staff-id">スタッフID</Label>
              <Input
                id="staff-id"
                type="text"
                placeholder="例: staff001"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                required
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
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-auto p-1"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? 'ログイン中...' : 'ログイン'}
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
          >
            <Fingerprint className="mr-2 h-4 w-4" />
            生体認証でログイン
          </Button>

          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>デモ用アカウント:</p>
            <p>スタッフ: staff001 / 作成者: creator001 / 管理者: admin001</p>
            <p>パスワード: password123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}