import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { User, Edit, Mail, Phone, MapPin, Calendar } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { User as UserType } from '../../App'

interface ProfileViewProps {
  user: UserType
}

export default function ProfileView({ user }: ProfileViewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedUser, setEditedUser] = useState(user)

  const handleSave = () => {
    // 実際の実装では、ここでAPIを呼び出してユーザー情報を更新
    toast.success('プロフィールを更新しました')
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedUser(user)
    setIsEditing(false)
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="destructive">管理者</Badge>
      case 'creator':
        return <Badge variant="default">作成者</Badge>
      case 'staff':
        return <Badge variant="secondary">スタッフ</Badge>
      default:
        return <Badge variant="outline">不明</Badge>
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User size={20} />
              プロフィール
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Edit size={16} className="mr-1" />
              {isEditing ? 'キャンセル' : '編集'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 基本情報 */}
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
              <User size={40} className="text-primary" />
            </div>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold">{user.name}</h2>
            <div className="mt-2">
              {getRoleBadge(user.role)}
            </div>
          </div>

          {/* 詳細情報 */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="staff-id">スタッフID</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="staff-id"
                    value={user.staffId}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="name">氏名</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="name"
                    value={editedUser.name}
                    onChange={(e) => setEditedUser(prev => ({ ...prev, name: e.target.value }))}
                    disabled={!isEditing}
                    className={!isEditing ? "bg-muted" : ""}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">メールアドレス</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Mail size={16} className="text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={editedUser.email}
                    onChange={(e) => setEditedUser(prev => ({ ...prev, email: e.target.value }))}
                    disabled={!isEditing}
                    className={!isEditing ? "bg-muted" : ""}
                  />
                </div>
              </div>

              {user.phone && (
                <div>
                  <Label htmlFor="phone">電話番号</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Phone size={16} className="text-muted-foreground" />
                    <Input
                      id="phone"
                      value={editedUser.phone || ''}
                      onChange={(e) => setEditedUser(prev => ({ ...prev, phone: e.target.value }))}
                      disabled={!isEditing}
                      className={!isEditing ? "bg-muted" : ""}
                    />
                  </div>
                </div>
              )}

              {user.address && (
                <div>
                  <Label htmlFor="address">住所</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin size={16} className="text-muted-foreground" />
                    <Input
                      id="address"
                      value={editedUser.address || ''}
                      onChange={(e) => setEditedUser(prev => ({ ...prev, address: e.target.value }))}
                      disabled={!isEditing}
                      className={!isEditing ? "bg-muted" : ""}
                    />
                  </div>
                </div>
              )}

              {user.birthDate && (
                <div>
                  <Label htmlFor="birth-date">生年月日</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar size={16} className="text-muted-foreground" />
                    <Input
                      id="birth-date"
                      type="date"
                      value={editedUser.birthDate || ''}
                      onChange={(e) => setEditedUser(prev => ({ ...prev, birthDate: e.target.value }))}
                      disabled={!isEditing}
                      className={!isEditing ? "bg-muted" : ""}
                    />
                  </div>
                </div>
              )}
            </div>

            {isEditing && (
              <div className="flex gap-2 mt-6">
                <Button onClick={handleSave} className="flex-1">
                  保存
                </Button>
                <Button variant="outline" onClick={handleCancel} className="flex-1">
                  キャンセル
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* アカウント情報 */}
      <Card>
        <CardHeader>
          <CardTitle>アカウント設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start">
            パスワード変更
          </Button>
          <Button variant="outline" className="w-full justify-start">
            生体認証設定
          </Button>
          <Button variant="outline" className="w-full justify-start">
            通知設定
          </Button>
        </CardContent>
      </Card>

      {/* アプリ情報 */}
      <Card>
        <CardHeader>
          <CardTitle>アプリ情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">バージョン</span>
            <span>1.0.0</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">最終更新</span>
            <span>2024年12月</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}