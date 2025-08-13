import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, Download, Calendar, Users, Clock, FileText, CheckCircle, BarChart3 } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { ExportService, ExportOptions } from '../../services/exportService'
import { User, TimeRecord, Shift } from '../../App'
import AdvancedExportPanel from './AdvancedExportPanel'

interface DataExportPanelProps {
  users: User[]
  timeRecords: TimeRecord[]
  shifts: Shift[]
}

export default function DataExportPanel({ users, timeRecords, shifts }: DataExportPanelProps) {
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv'>('csv')
  const [dataType, setDataType] = useState<'timeRecords' | 'shifts' | 'users' | 'all'>('timeRecords')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([])
  const [isExporting, setIsExporting] = useState(false)

  // 現在の月の開始日と終了日を取得
  const getCurrentMonthRange = () => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    }
  }

  // 前月の開始日と終了日を取得
  const getLastMonthRange = () => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 0)
    
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    }
  }

  // クイック日付設定
  const setQuickDateRange = (range: 'thisMonth' | 'lastMonth' | 'thisYear' | 'all') => {
    switch (range) {
      case 'thisMonth':
        const thisMonth = getCurrentMonthRange()
        setStartDate(thisMonth.start)
        setEndDate(thisMonth.end)
        break
      case 'lastMonth':
        const lastMonth = getLastMonthRange()
        setStartDate(lastMonth.start)
        setEndDate(lastMonth.end)
        break
      case 'thisYear':
        const now = new Date()
        setStartDate(`${now.getFullYear()}-01-01`)
        setEndDate(`${now.getFullYear()}-12-31`)
        break
      case 'all':
        setStartDate('')
        setEndDate('')
        break
    }
  }

  // スタッフ選択の切り替え
  const toggleStaffSelection = (staffId: string) => {
    setSelectedStaffIds(current => 
      current.includes(staffId)
        ? current.filter(id => id !== staffId)
        : [...current, staffId]
    )
  }

  // 全スタッフ選択の切り替え
  const toggleAllStaff = () => {
    if (selectedStaffIds.length === users.length) {
      setSelectedStaffIds([])
    } else {
      setSelectedStaffIds(users.map(user => user.staffId))
    }
  }

  // エクスポート実行
  const handleExport = async () => {
    try {
      setIsExporting(true)
      
      const options: ExportOptions = {
        format: exportFormat,
        dataType: dataType,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        staffIds: selectedStaffIds.length > 0 ? selectedStaffIds : undefined
      }

      const exportData = {
        timeRecords,
        shifts,
        users
      }

      await ExportService.exportData(options, exportData)
      
      toast.success('データのエクスポートが完了しました')
      
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('エクスポートに失敗しました: ' + (error as Error).message)
    } finally {
      setIsExporting(false)
    }
  }

  // 月次レポートのエクスポート
  const handleMonthlyReport = async () => {
    try {
      setIsExporting(true)
      
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() + 1
      
      const reportData = ExportService.generateMonthlyReport(
        timeRecords,
        shifts,
        users,
        year,
        month
      )

      ExportService.exportToCsv(reportData, `月次レポート_${year}年${month}月_${now.toISOString().slice(0, 16).replace(/[:-]/g, '')}`)
      
      toast.success('月次レポートのエクスポートが完了しました')
      
    } catch (error) {
      console.error('Monthly report export failed:', error)
      toast.error('月次レポートのエクスポートに失敗しました')
    } finally {
      setIsExporting(false)
    }
  }

  // データ統計を計算
  const getDataStatistics = () => {
    let filteredTimeRecords = timeRecords
    let filteredShifts = shifts
    
    // 日付フィルタリング
    if (startDate || endDate) {
      if (startDate) {
        filteredTimeRecords = filteredTimeRecords.filter(record => record.date >= startDate)
        filteredShifts = filteredShifts.filter(shift => shift.date >= startDate)
      }
      if (endDate) {
        filteredTimeRecords = filteredTimeRecords.filter(record => record.date <= endDate)
        filteredShifts = filteredShifts.filter(shift => shift.date <= endDate)
      }
    }
    
    // スタッフフィルタリング
    if (selectedStaffIds.length > 0) {
      filteredTimeRecords = filteredTimeRecords.filter(record => selectedStaffIds.includes(record.staffId))
      filteredShifts = filteredShifts.filter(shift => selectedStaffIds.includes(shift.staffId))
    }

    return {
      timeRecords: filteredTimeRecords.length,
      shifts: filteredShifts.length,
      users: selectedStaffIds.length > 0 ? selectedStaffIds.length : users.length
    }
  }

  const statistics = getDataStatistics()

  return (
    <div className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic">基本エクスポート</TabsTrigger>
          <TabsTrigger value="advanced">高度な機能</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6">
          {/* データ統計表示 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-700 mb-1">勤怠記録</p>
                    <p className="text-2xl font-bold text-blue-800">{statistics.timeRecords}</p>
                    <p className="text-xs text-blue-600">件</p>
                  </div>
                  <Clock size={24} className="text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-700 mb-1">シフト</p>
                    <p className="text-2xl font-bold text-green-800">{statistics.shifts}</p>
                    <p className="text-xs text-green-600">件</p>
                  </div>
                  <Calendar size={24} className="text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-700 mb-1">対象スタッフ</p>
                    <p className="text-2xl font-bold text-purple-800">{statistics.users}</p>
                    <p className="text-xs text-purple-600">名</p>
                  </div>
                  <Users size={24} className="text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* エクスポート設定 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download size={20} />
                エクスポート設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* データタイプ選択 */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">エクスポートするデータ</Label>
                <Select value={dataType} onValueChange={(value: any) => setDataType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="timeRecords">勤怠記録</SelectItem>
                    <SelectItem value="shifts">シフト</SelectItem>
                    <SelectItem value="users">スタッフ情報</SelectItem>
                    <SelectItem value="all">すべてのデータ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* フォーマット選択 */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">ファイル形式</Label>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="csv"
                      checked={exportFormat === 'csv'}
                      onCheckedChange={() => setExportFormat('csv')}
                    />
                    <Label htmlFor="csv" className="text-sm">CSV形式</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="excel"
                      checked={exportFormat === 'excel'}
                      onCheckedChange={() => setExportFormat('excel')}
                    />
                    <Label htmlFor="excel" className="text-sm">Excel形式</Label>
                  </div>
                </div>
              </div>

              <Separator />

              {/* 日付範囲設定 */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">期間設定</Label>
                
                {/* クイック設定ボタン */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickDateRange('thisMonth')}
                    className="text-xs"
                  >
                    今月
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickDateRange('lastMonth')}
                    className="text-xs"
                  >
                    先月
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickDateRange('thisYear')}
                    className="text-xs"
                  >
                    今年
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuickDateRange('all')}
                    className="text-xs"
                  >
                    全期間
                  </Button>
                </div>

                {/* 手動日付設定 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate" className="text-sm">開始日</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate" className="text-sm">終了日</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* スタッフ選択 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">対象スタッフ</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleAllStaff}
                    className="text-xs"
                  >
                    {selectedStaffIds.length === users.length ? '全選択解除' : '全選択'}
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto border rounded-lg p-4">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={user.id}
                        checked={selectedStaffIds.includes(user.staffId)}
                        onCheckedChange={() => toggleStaffSelection(user.staffId)}
                      />
                      <Label htmlFor={user.id} className="text-sm flex-1 cursor-pointer">
                        {user.name}
                      </Label>
                      <Badge variant="outline" className="text-xs">
                        {user.role === 'admin' ? '管理' : 
                         user.role === 'creator' ? '作成' : 'スタッフ'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* アクションボタン */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Download size={24} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">データエクスポート</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      設定した条件でデータをエクスポートします
                    </p>
                    <Button 
                      onClick={handleExport}
                      disabled={isExporting}
                      className="w-full"
                    >
                      {isExporting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          エクスポート中...
                        </>
                      ) : (
                        <>
                          <Download size={16} className="mr-2" />
                          エクスポート実行
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <FileText size={24} className="text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">月次レポート</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      今月の勤怠サマリーレポートを生成します
                    </p>
                    <Button 
                      onClick={handleMonthlyReport}
                      disabled={isExporting}
                      variant="outline"
                      className="w-full"
                    >
                      <FileText size={16} className="mr-2" />
                      月次レポート生成
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 注意事項 */}
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-amber-600 mt-0.5 shrink-0" />
                <div className="space-y-2">
                  <h4 className="font-medium text-amber-800">データエクスポートに関する注意事項</h4>
                  <ul className="text-sm text-amber-700 space-y-1">
                    <li>• エクスポートされるデータには個人情報が含まれています</li>
                    <li>• ファイルの保存と管理には十分注意してください</li>
                    <li>• Excel形式はCSV形式でダウンロードされ、Excelで開けます</li>
                    <li>• 大量のデータをエクスポートする場合は時間がかかることがあります</li>
                    <li>• セキュリティのため、定期的にダウンロードファイルを削除してください</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced">
          <AdvancedExportPanel 
            users={users}
            timeRecords={timeRecords}
            shifts={shifts}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}