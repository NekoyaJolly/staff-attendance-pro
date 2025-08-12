import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart3, 
  Users, 
  Calendar, 
  Download, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  QrCode,
  TestTube
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { User, TimeRecord, Shift } from '../../App'
import QRGenerator from '../timecard/QRGenerator'
import QRTest from '../timecard/QRTest'

interface AdminPanelProps {
  user: User
}

export default function AdminPanel({ user }: AdminPanelProps) {
  const [timeRecords] = useKV<TimeRecord[]>('timeRecords', [])
  const [shifts] = useKV<Shift[]>('shifts', [])
  const [allUsers] = useKV<User[]>('allUsers', [])
  const [pendingRecords, setPendingRecords] = useKV<TimeRecord[]>('timeRecords', [])

  // 承認待ちの勤怠記録を取得
  const getPendingRecords = () => {
    return timeRecords.filter(record => record.status === 'pending')
  }

  // 統計データを計算
  const getStatistics = () => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    
    const currentMonthRecords = timeRecords.filter(record => {
      const recordDate = new Date(record.date)
      return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear
    })

    const totalStaff = allUsers.length
    const activeStaff = new Set(currentMonthRecords.map(r => r.staffId)).size
    const pendingApprovals = getPendingRecords().length
    const totalShifts = shifts.filter(shift => {
      const shiftDate = new Date(shift.date)
      return shiftDate.getMonth() === currentMonth && shiftDate.getFullYear() === currentYear
    }).length

    return {
      totalStaff,
      activeStaff,
      pendingApprovals,
      totalShifts,
      currentMonthRecords: currentMonthRecords.length
    }
  }

  const statistics = getStatistics()

  const handleApproval = (recordId: string, approved: boolean) => {
    setPendingRecords(current => 
      current.map(record => 
        record.id === recordId 
          ? { ...record, status: approved ? 'approved' : 'rejected' }
          : record
      )
    )
    toast.success(approved ? '勤怠記録を承認しました' : '勤怠記録を却下しました')
  }

  const handleExport = (format: 'excel' | 'csv') => {
    toast.info(`${format.toUpperCase()}形式でのエクスポート機能は開発中です`)
  }

  const getUserName = (staffId: string) => {
    const user = allUsers.find(u => u.staffId === staffId)
    return user ? user.name : '不明'
  }

  return (
    <div className="space-y-4">
      {/* 統計カード */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">総スタッフ数</p>
                <p className="text-2xl font-bold">{statistics.totalStaff}</p>
              </div>
              <Users size={24} className="text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">アクティブ</p>
                <p className="text-2xl font-bold">{statistics.activeStaff}</p>
              </div>
              <TrendingUp size={24} className="text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">承認待ち</p>
                <p className="text-2xl font-bold text-yellow-500">{statistics.pendingApprovals}</p>
              </div>
              <AlertCircle size={24} className="text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">今月シフト</p>
                <p className="text-2xl font-bold">{statistics.totalShifts}</p>
              </div>
              <Calendar size={24} className="text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* タブコンテンツ */}
      <Tabs defaultValue="approvals" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="approvals" className="text-xs">承認</TabsTrigger>
          <TabsTrigger value="staff" className="text-xs">スタッフ</TabsTrigger>
          <TabsTrigger value="shifts" className="text-xs">シフト</TabsTrigger>
          <TabsTrigger value="qr" className="text-xs">QRコード</TabsTrigger>
          <TabsTrigger value="test" className="text-xs">テスト</TabsTrigger>
          <TabsTrigger value="export" className="text-xs">エクスポート</TabsTrigger>
        </TabsList>

        {/* 承認管理 */}
        <TabsContent value="approvals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock size={20} />
                承認待ちの勤怠記録
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getPendingRecords().length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    承認待ちの記録はありません
                  </p>
                ) : (
                  getPendingRecords().map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{getUserName(record.staffId)}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(record.date).toLocaleDateString('ja-JP')}
                          {record.clockIn && ` - 出勤: ${record.clockIn}`}
                          {record.clockOut && ` - 退勤: ${record.clockOut}`}
                        </div>
                        {record.note && (
                          <div className="text-xs text-muted-foreground mt-1">
                            備考: {record.note}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApproval(record.id, true)}
                        >
                          <CheckCircle size={16} />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleApproval(record.id, false)}
                        >
                          <XCircle size={16} />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* スタッフ管理 */}
        <TabsContent value="staff" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users size={20} />
                スタッフ一覧
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {allUsers.map((staff) => (
                  <div key={staff.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{staff.name}</div>
                      <div className="text-sm text-muted-foreground">ID: {staff.staffId}</div>
                      <div className="text-sm text-muted-foreground">{staff.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        staff.role === 'admin' ? 'destructive' :
                        staff.role === 'creator' ? 'default' : 'secondary'
                      }>
                        {staff.role === 'admin' ? '管理者' :
                         staff.role === 'creator' ? '作成者' : 'スタッフ'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* シフト管理 */}
        <TabsContent value="shifts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar size={20} />
                今月のシフト統計
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">{statistics.totalShifts}</div>
                  <div className="text-sm text-muted-foreground">総シフト数</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">{statistics.activeStaff}</div>
                  <div className="text-sm text-muted-foreground">稼働スタッフ</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* QRコード生成 */}
        <TabsContent value="qr" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode size={20} />
                勤怠用QRコード生成
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                <QRGenerator locationId="main" locationName="メインエントランス" />
                <QRGenerator locationId="staff-room" locationName="スタッフルーム" />
                <QRGenerator locationId="office" locationName="オフィス" />
              </div>
              
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">QRコードの使用方法</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• スタッフは勤怠記録時にQRコードをスキャンします</li>
                  <li>• QRコードには場所情報が含まれています</li>
                  <li>• 必要に応じて複数の場所にQRコードを設置してください</li>
                  <li>• ダウンロードしたQRコードを印刷して掲示してください</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* テスト機能 */}
        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube size={20} />
                QRコード機能テスト
              </CardTitle>
            </CardHeader>
            <CardContent>
              <QRTest user={user} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* データエクスポート */}
        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download size={20} />
                データエクスポート
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium mb-2">勤怠データ</h4>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleExport('excel')}>
                      <Download size={16} className="mr-2" />
                      Excel
                    </Button>
                    <Button variant="outline" onClick={() => handleExport('csv')}>
                      <Download size={16} className="mr-2" />
                      CSV
                    </Button>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">シフトデータ</h4>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleExport('excel')}>
                      <Download size={16} className="mr-2" />
                      Excel
                    </Button>
                    <Button variant="outline" onClick={() => handleExport('csv')}>
                      <Download size={16} className="mr-2" />
                      CSV
                    </Button>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">スタッフデータ</h4>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleExport('excel')}>
                      <Download size={16} className="mr-2" />
                      Excel
                    </Button>
                    <Button variant="outline" onClick={() => handleExport('csv')}>
                      <Download size={16} className="mr-2" />
                      CSV
                    </Button>
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground mt-4 p-3 bg-muted/50 rounded">
                <p>※ エクスポートされるデータには個人情報が含まれています。</p>
                <p>適切な管理と取り扱いにご注意ください。</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}