import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { User, Edit, Mail, Phone, MapPin, Calendar, CurrencyYen, Bus, CalendarCheck, Lock, Fingerprint, Bell, Briefcase } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useKV } from '@github/spark/hooks'
import { User as UserType, PayrollInfo } from '../../App'
import VacationRequestDialog from './VacationRequestDialog'
import AccountSettingsDialog from './AccountSettingsDialog'
import PaidLeaveAlerts from '../common/PaidLeaveAlerts'
import PaidLeaveManagement from '../common/PaidLeaveManagement'

interface ProfileViewProps {
  user: UserType
  isAdmin?: boolean
}

export default function ProfileView({ user, isAdmin = false }: ProfileViewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedUser, setEditedUser] = useState(user)
  const [payrollInfo, setPayrollInfo] = useKV<PayrollInfo>(`payroll_${user.id}`, {
    hourlyRate: 1000,
    transportationAllowance: 500,
    remainingPaidLeave: 20,
    totalPaidLeave: 20,
    usedPaidLeave: 0,
    paidLeaveExpiry: '2025-03-31',
    lastGrantDate: new Date().toISOString().split('T')[0],
    workStartDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  })
  const [editedPayroll, setEditedPayroll] = useState(payrollInfo)

  useEffect(() => {
    setEditedPayroll(payrollInfo)
  }, [payrollInfo])

  const handleSave = () => {
    // 実際の実装では、ここでAPIを呼び出してユーザー情報を更新
    if (isAdmin) {
      setPayrollInfo(editedPayroll)
      toast.success('給与情報を更新しました')
    } else {
      toast.success('プロフィールを更新しました')
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedUser(user)
    setEditedPayroll(payrollInfo)
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
      {/* 有給アラート表示 */}
      <PaidLeaveAlerts staffId={user.id} />

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

            {/* 勤務詳細情報を統合 */}
            <Separator className="my-4" />
            
            <div className="grid grid-cols-1 gap-4">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Briefcase size={16} />
                勤務情報
              </h4>
              
              <div>
                <Label htmlFor="work-start-date">入社日</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar size={16} className="text-muted-foreground" />
                  <Input
                    id="work-start-date"
                    type="date"
                    value={payrollInfo.workStartDate}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="service-years">勤続年数</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="service-years"
                    value={`${Math.floor((new Date().getTime() - new Date(payrollInfo.workStartDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25))}年`}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="paid-leave-expiry">有給休暇期限</Label>
                <div className="flex items-center gap-2 mt-1">
                  <CalendarCheck size={16} className="text-muted-foreground" />
                  <Input
                    id="paid-leave-expiry"
                    value={new Date(payrollInfo.paidLeaveExpiry).toLocaleDateString('ja-JP')}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
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

      {/* 給与・勤務条件 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CurrencyYen size={20} />
              給与・勤務条件
            </CardTitle>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit size={16} className="mr-1" />
                {isEditing ? 'キャンセル' : '編集'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="hourly-rate">時給</Label>
              <div className="flex items-center gap-2 mt-1">
                <CurrencyYen size={16} className="text-muted-foreground" />
                <Input
                  id="hourly-rate"
                  type="number"
                  value={editedPayroll.hourlyRate}
                  onChange={(e) => setEditedPayroll(prev => ({ ...prev, hourlyRate: Number(e.target.value) }))}
                  disabled={!isEditing || !isAdmin}
                  className={(!isEditing || !isAdmin) ? "bg-muted" : ""}
                />
                <span className="text-sm text-muted-foreground">円</span>
              </div>
            </div>

            <div>
              <Label htmlFor="transportation">交通費</Label>
              <div className="flex items-center gap-2 mt-1">
                <Bus size={16} className="text-muted-foreground" />
                <Input
                  id="transportation"
                  type="number"
                  value={editedPayroll.transportationAllowance}
                  onChange={(e) => setEditedPayroll(prev => ({ ...prev, transportationAllowance: Number(e.target.value) }))}
                  disabled={!isEditing || !isAdmin}
                  className={(!isEditing || !isAdmin) ? "bg-muted" : ""}
                />
                <span className="text-sm text-muted-foreground">円/日</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 有給休暇管理パネル（統合版） */}
      <PaidLeaveManagement user={user} isAdmin={isAdmin}>
        {/* 有給申請ボタンを統合 */}
        <div className="mt-4 pt-4 border-t">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <CalendarCheck size={16} />
            有給申請
          </h4>
          <VacationRequestDialog 
            staffId={user.id} 
            remainingDays={payrollInfo.remainingPaidLeave} 
          />
        </div>
      </PaidLeaveManagement>

      {/* アカウント設定 */}
      <Card>
        <CardHeader>
          <CardTitle>アカウント設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <AccountSettingsDialog 
            type="password"
            trigger={
              <Button variant="outline" className="w-full justify-start">
                <Lock size={16} className="mr-2" />
                パスワード変更
              </Button>
            }
          />
          
          <AccountSettingsDialog 
            type="biometric"
            trigger={
              <Button variant="outline" className="w-full justify-start">
                <Fingerprint size={16} className="mr-2" />
                生体認証設定
              </Button>
            }
          />
          
          <AccountSettingsDialog 
            type="notification"
            trigger={
              <Button variant="outline" className="w-full justify-start">
                <Bell size={16} className="mr-2" />
                通知設定
              </Button>
            }
          />
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