import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
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
  TestTube,
  Check,
  SelectionAll
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { User, TimeRecord, Shift, CorrectionRequest } from '../../App'
import QRGenerator from '../timecard/QRGenerator'
import QRTest from '../timecard/QRTest'

interface AdminPanelProps {
  user: User
}

export default function AdminPanel({ user }: AdminPanelProps) {
  const [timeRecords, setTimeRecords] = useKV<TimeRecord[]>('timeRecords', [])
  const [shifts] = useKV<Shift[]>('shifts', [])
  const [allUsers] = useKV<User[]>('allUsers', [])
  const [correctionRequests, setCorrectionRequests] = useKV<CorrectionRequest[]>('correctionRequests', [])
  const [selectedRecords, setSelectedRecords] = useState<string[]>([])

  // 承認待ちの勤怠記録を取得
  const getPendingRecords = () => {
    return timeRecords.filter(record => record.status === 'pending')
  }

  // 承認待ちの修正リクエストを取得
  const getPendingCorrections = () => {
    return correctionRequests.filter(req => req.status === 'pending')
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
    const pendingApprovals = getPendingRecords().length + getPendingCorrections().length
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
    setTimeRecords(current => 
      current.map(record => 
        record.id === recordId 
          ? { ...record, status: approved ? 'approved' : 'rejected' }
          : record
      )
    )
    toast.success(approved ? '勤怠記録を承認しました' : '勤怠記録を却下しました')
  }

  const handleCorrectionApproval = (requestId: string, approved: boolean) => {
    const request = correctionRequests.find(req => req.id === requestId)
    if (!request) return

    if (approved) {
      // 修正を適用
      setTimeRecords(current => 
        current.map(record => 
          record.id === request.recordId 
            ? { 
                ...record,
                clockIn: request.correctedClockIn || record.clockIn,
                clockOut: request.correctedClockOut || record.clockOut,
                status: 'approved'
              }
            : record
        )
      )
    }

    // 修正リクエストのステータスを更新
    setCorrectionRequests(current => 
      current.map(req => 
        req.id === requestId 
          ? { ...req, status: approved ? 'approved' : 'rejected' }
          : req
      )
    )

    toast.success(approved ? '修正を承認しました' : '修正を却下しました')
  }

  const handleBulkApproval = (approved: boolean) => {
    if (selectedRecords.length === 0) {
      toast.error('承認するレコードを選択してください')
      return
    }

    setTimeRecords(current => 
      current.map(record => 
        selectedRecords.includes(record.id)
          ? { ...record, status: approved ? 'approved' : 'rejected' }
          : record
      )
    )

    setSelectedRecords([])
    toast.success(`${selectedRecords.length}件の記録を${approved ? '承認' : '却下'}しました`)
  }

  const handleSelectAll = () => {
    const pendingRecords = getPendingRecords()
    if (selectedRecords.length === pendingRecords.length) {
      setSelectedRecords([])
    } else {
      setSelectedRecords(pendingRecords.map(record => record.id))
    }
  }

  const handleRecordSelect = (recordId: string) => {
    setSelectedRecords(current => 
      current.includes(recordId)
        ? current.filter(id => id !== recordId)
        : [...current, recordId]
    )
  }

  const handleExport = (format: 'excel' | 'csv') => {
    toast.info(`${format.toUpperCase()}形式でのエクスポート機能は開発中です`)
  }

  const getUserName = (staffId: string) => {
    const user = allUsers.find(u => u.staffId === staffId)
    return user ? user.name : '不明'
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 統計カード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
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

        <Card className="shadow-sm">
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

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">承認待ち</p>
                <p className="text-2xl font-bold text-amber-500">{statistics.pendingApprovals}</p>
              </div>
              <AlertCircle size={24} className="text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
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

      {/* メインタブ - より目立つように配置 */}
      <Card className="shadow-md border-2 border-primary/10">
        <CardContent className="p-0">
          <Tabs defaultValue="approvals" className="w-full">
            <div className="bg-gradient-to-r from-primary/5 to-accent/5 p-4 border-b">
              <TabsList className="h-12 bg-background/80 backdrop-blur-sm shadow-sm">
                <TabsTrigger value="approvals" className="px-4 py-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <AlertCircle size={16} className="mr-2" />
                  承認管理
                </TabsTrigger>
                <TabsTrigger value="staff" className="px-4 py-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Users size={16} className="mr-2" />
                  スタッフ
                </TabsTrigger>
                <TabsTrigger value="shifts" className="px-4 py-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Calendar size={16} className="mr-2" />
                  シフト
                </TabsTrigger>
                <TabsTrigger value="qr" className="px-4 py-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <QrCode size={16} className="mr-2" />
                  QR
                </TabsTrigger>
                <TabsTrigger value="test" className="px-4 py-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <TestTube size={16} className="mr-2" />
                  テスト
                </TabsTrigger>
                <TabsTrigger value="export" className="px-4 py-2 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Download size={16} className="mr-2" />
                  データ
                </TabsTrigger>
              </TabsList>
            </div>

        {/* 承認管理 */}
        <TabsContent value="approvals" className="p-6 space-y-6">
          {/* 勤怠記録の承認 */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock size={20} />
                  承認待ちの勤怠記録
                  {getPendingRecords().length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {getPendingRecords().length}
                    </Badge>
                  )}
                </CardTitle>
                {getPendingRecords().length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                      className="flex items-center gap-2"
                    >
                      <SelectionAll size={16} />
                      {selectedRecords.length === getPendingRecords().length ? '全選択解除' : '全選択'}
                    </Button>
                    {selectedRecords.length > 0 && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleBulkApproval(true)}
                          className="flex items-center gap-2"
                        >
                          <Check size={16} />
                          一括承認 ({selectedRecords.length})
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleBulkApproval(false)}
                          className="flex items-center gap-2"
                        >
                          <XCircle size={16} />
                          一括却下 ({selectedRecords.length})
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="max-h-96 overflow-y-auto">
              <div className="space-y-3">
                {getPendingRecords().length === 0 ? (
                  <div className="text-center py-8">
                    <Clock size={48} className="mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">承認待ちの勤怠記録はありません</p>
                  </div>
                ) : (
                  getPendingRecords().map((record) => (
                    <div key={record.id} className="flex items-center gap-3 p-4 border rounded-lg bg-card hover:bg-muted/30 transition-colors">
                      <Checkbox
                        checked={selectedRecords.includes(record.id)}
                        onCheckedChange={() => handleRecordSelect(record.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground">{getUserName(record.staffId)}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(record.date).toLocaleDateString('ja-JP')}
                          {record.clockIn && ` • 出勤: ${record.clockIn}`}
                          {record.clockOut && ` • 退勤: ${record.clockOut}`}
                        </div>
                        {record.note && (
                          <div className="text-xs text-muted-foreground mt-1 bg-muted/50 px-2 py-1 rounded">
                            備考: {record.note}
                          </div>
                        )}
                        <Badge variant={record.type === 'manual' ? 'destructive' : 'default'} className="mt-2">
                          {record.type === 'manual' ? '手動入力' : '自動記録'}
                        </Badge>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          onClick={() => handleApproval(record.id, true)}
                          className="h-8 px-3"
                        >
                          <CheckCircle size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleApproval(record.id, false)}
                          className="h-8 px-3"
                        >
                          <XCircle size={14} />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* 修正リクエストの承認 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle size={20} />
                打刻修正の承認待ち
                {getPendingCorrections().length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {getPendingCorrections().length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-96 overflow-y-auto">
              <div className="space-y-3">
                {getPendingCorrections().length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle size={48} className="mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">承認待ちの修正リクエストはありません</p>
                  </div>
                ) : (
                  getPendingCorrections().map((request) => (
                    <div key={request.id} className="p-4 border rounded-lg bg-card">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{getUserName(request.staffId)}</div>
                          <div className="text-sm text-muted-foreground mb-2">
                            申請日: {new Date(request.createdAt).toLocaleDateString('ja-JP')}
                          </div>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-sm">
                            <div className="space-y-1">
                              <div className="font-medium text-destructive">修正前</div>
                              {request.originalClockIn && (
                                <div>出勤: {request.originalClockIn}</div>
                              )}
                              {request.originalClockOut && (
                                <div>退勤: {request.originalClockOut}</div>
                              )}
                            </div>
                            <div className="space-y-1">
                              <div className="font-medium text-green-600">修正後</div>
                              {request.correctedClockIn && (
                                <div>出勤: {request.correctedClockIn}</div>
                              )}
                              {request.correctedClockOut && (
                                <div>退勤: {request.correctedClockOut}</div>
                              )}
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                            理由: {request.reason}
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0 ml-4">
                          <Button
                            size="sm"
                            onClick={() => handleCorrectionApproval(request.id, true)}
                          >
                            <CheckCircle size={16} />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleCorrectionApproval(request.id, false)}
                          >
                            <XCircle size={16} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* スタッフ管理 */}
        <TabsContent value="staff" className="p-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users size={20} />
                スタッフ一覧
                <Badge variant="secondary" className="ml-2">
                  {allUsers.length}名
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-96 overflow-y-auto">
              <div className="space-y-3">
                {allUsers.map((staff) => (
                  <div key={staff.id} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground">{staff.name}</div>
                      <div className="text-sm text-muted-foreground">ID: {staff.staffId}</div>
                      <div className="text-sm text-muted-foreground">{staff.email}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
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
        <TabsContent value="shifts" className="p-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar size={20} />
                今月のシフト統計
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="text-center p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg">
                  <div className="text-3xl font-bold text-primary">{statistics.totalShifts}</div>
                  <div className="text-sm text-muted-foreground mt-1">総シフト数</div>
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">{statistics.activeStaff}</div>
                  <div className="text-sm text-muted-foreground mt-1">稼働スタッフ</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* QRコード生成 */}
        <TabsContent value="qr" className="p-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode size={20} />
                勤怠用QRコード生成
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-96 overflow-y-auto">
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
        <TabsContent value="test" className="p-6 space-y-4">
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
        <TabsContent value="export" className="p-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download size={20} />
                データエクスポート
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-96 overflow-y-auto space-y-6">
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Clock size={16} />
                    勤怠データ
                  </h4>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleExport('excel')} className="flex-1">
                      <Download size={16} className="mr-2" />
                      Excel
                    </Button>
                    <Button variant="outline" onClick={() => handleExport('csv')} className="flex-1">
                      <Download size={16} className="mr-2" />
                      CSV
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Calendar size={16} />
                    シフトデータ
                  </h4>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleExport('excel')} className="flex-1">
                      <Download size={16} className="mr-2" />
                      Excel
                    </Button>
                    <Button variant="outline" onClick={() => handleExport('csv')} className="flex-1">
                      <Download size={16} className="mr-2" />
                      CSV
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Users size={16} />
                    スタッフデータ
                  </h4>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleExport('excel')} className="flex-1">
                      <Download size={16} className="mr-2" />
                      Excel
                    </Button>
                    <Button variant="outline" onClick={() => handleExport('csv')} className="flex-1">
                      <Download size={16} className="mr-2" />
                      CSV
                    </Button>
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-amber-800 mb-1">個人情報の取り扱いについて</p>
                    <p className="text-amber-700">エクスポートされるデータには個人情報が含まれています。適切な管理と取り扱いにご注意ください。</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}