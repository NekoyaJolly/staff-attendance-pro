import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar, 
  Download, 
  FileText, 
  TrendingUp, 
  Users, 
  Clock,
  BarChart3,
  Settings
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { ExportService } from '../../services/exportService'
import { User, TimeRecord, Shift } from '../../App'

interface AdvancedExportPanelProps {
  users: User[]
  timeRecords: TimeRecord[]
  shifts: Shift[]
}

interface CustomTemplate {
  id: string
  name: string
  description: string
  dataType: 'timeRecords' | 'shifts' | 'users' | 'custom'
  fields: string[]
  filters: any
}

export default function AdvancedExportPanel({ users, timeRecords, shifts }: AdvancedExportPanelProps) {
  const [templates, setTemplates] = useKV<CustomTemplate[]>('exportTemplates', [])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [customQuery, setCustomQuery] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  // 事前定義されたテンプレート
  const defaultTemplates: CustomTemplate[] = [
    {
      id: 'monthly-attendance',
      name: '月次勤怠レポート',
      description: '月単位の勤怠状況をまとめたレポート',
      dataType: 'timeRecords',
      fields: ['date', 'staff', 'clockIn', 'clockOut', 'workingHours', 'status'],
      filters: { period: 'monthly' }
    },
    {
      id: 'staff-performance',
      name: 'スタッフ別勤務実績',
      description: 'スタッフごとの勤務実績と効率性分析',
      dataType: 'timeRecords',
      fields: ['staff', 'totalWorkingDays', 'totalHours', 'averageDaily', 'attendanceRate'],
      filters: { groupBy: 'staff' }
    },
    {
      id: 'shift-coverage',
      name: 'シフトカバレッジ分析',
      description: 'シフトの充足率と空き時間分析',
      dataType: 'shifts',
      fields: ['date', 'timeSlot', 'requiredStaff', 'assignedStaff', 'coverageRate'],
      filters: { analysis: 'coverage' }
    },
    {
      id: 'overtime-report',
      name: '残業時間レポート',
      description: '残業時間の分析と集計',
      dataType: 'timeRecords',
      fields: ['staff', 'date', 'regularHours', 'overtimeHours', 'totalHours'],
      filters: { includeOvertime: true }
    },
    {
      id: 'payroll-data',
      name: '給与計算データ',
      description: '給与計算に必要なデータの出力',
      dataType: 'timeRecords',
      fields: ['staff', 'period', 'workingDays', 'totalHours', 'hourlyRate', 'basePay', 'overtimePay'],
      filters: { payroll: true }
    }
  ]

  // テンプレートの保存
  const saveTemplate = () => {
    const templateName = prompt('テンプレート名を入力してください:')
    if (!templateName) return

    const newTemplate: CustomTemplate = {
      id: `custom-${Date.now()}`,
      name: templateName,
      description: 'カスタムテンプレート',
      dataType: 'custom',
      fields: [],
      filters: { custom: true }
    }

    setTemplates(current => [...current, newTemplate])
    toast.success('テンプレートが保存されました')
  }

  // 高度なエクスポート実行
  const executeAdvancedExport = async (templateId: string) => {
    try {
      setIsExporting(true)
      
      const template = [...defaultTemplates, ...templates].find(t => t.id === templateId)
      if (!template) {
        throw new Error('テンプレートが見つかりません')
      }

      let exportData: any[] = []
      const timestamp = new Date().toISOString().slice(0, 16).replace(/[:-]/g, '')

      switch (template.id) {
        case 'monthly-attendance':
          exportData = generateMonthlyAttendanceReport()
          break
        case 'staff-performance':
          exportData = generateStaffPerformanceReport()
          break
        case 'shift-coverage':
          exportData = generateShiftCoverageReport()
          break
        case 'overtime-report':
          exportData = generateOvertimeReport()
          break
        case 'payroll-data':
          exportData = generatePayrollData()
          break
        default:
          throw new Error('未対応のテンプレートです')
      }

      ExportService.exportToCsv(exportData, `${template.name}_${timestamp}`)
      toast.success(`${template.name}のエクスポートが完了しました`)

    } catch (error) {
      console.error('Advanced export failed:', error)
      toast.error('エクスポートに失敗しました: ' + (error as Error).message)
    } finally {
      setIsExporting(false)
    }
  }

  // 月次勤怠レポートの生成
  const generateMonthlyAttendanceReport = () => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    
    return timeRecords
      .filter(record => {
        const recordDate = new Date(record.date)
        return recordDate.getMonth() === currentMonth && 
               recordDate.getFullYear() === currentYear &&
               record.status === 'approved'
      })
      .map(record => {
        const user = users.find(u => u.staffId === record.staffId)
        const workingHours = ExportService.calculateWorkingHours(record.clockIn, record.clockOut)
        
        return {
          '日付': new Date(record.date).toLocaleDateString('ja-JP'),
          'スタッフ名': user?.name || 'Unknown',
          'スタッフID': record.staffId,
          '出勤時刻': record.clockIn || '',
          '退勤時刻': record.clockOut || '',
          '勤務時間': workingHours,
          'ステータス': record.status === 'approved' ? '承認済み' : '未承認',
          '記録方法': record.type === 'manual' ? '手動' : '自動',
          '備考': record.note || ''
        }
      })
  }

  // スタッフ別勤務実績レポートの生成
  const generateStaffPerformanceReport = () => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    
    return users.map(user => {
      const userRecords = timeRecords.filter(record => 
        record.staffId === user.staffId &&
        record.status === 'approved' &&
        new Date(record.date).getMonth() === currentMonth &&
        new Date(record.date).getFullYear() === currentYear
      )

      const totalWorkingDays = userRecords.length
      const totalHours = userRecords.reduce((sum, record) => {
        if (record.clockIn && record.clockOut) {
          const hours = calculateHoursNumeric(record.clockIn, record.clockOut)
          return sum + hours
        }
        return sum
      }, 0)

      const averageDaily = totalWorkingDays > 0 ? totalHours / totalWorkingDays : 0
      
      // 予定シフト数を計算
      const userShifts = shifts.filter(shift => 
        shift.staffId === user.staffId &&
        new Date(shift.date).getMonth() === currentMonth &&
        new Date(shift.date).getFullYear() === currentYear
      )
      
      const attendanceRate = userShifts.length > 0 ? (totalWorkingDays / userShifts.length) * 100 : 0

      return {
        'スタッフ名': user.name,
        'スタッフID': user.staffId,
        '勤務日数': totalWorkingDays,
        '総勤務時間': `${Math.floor(totalHours)}時間${Math.round((totalHours % 1) * 60)}分`,
        '平均日別時間': `${Math.floor(averageDaily)}時間${Math.round((averageDaily % 1) * 60)}分`,
        '出勤率': `${Math.round(attendanceRate)}%`,
        '予定シフト数': userShifts.length,
        '実績評価': attendanceRate >= 95 ? '優秀' : attendanceRate >= 80 ? '良好' : '要改善'
      }
    })
  }

  // シフトカバレッジレポートの生成
  const generateShiftCoverageReport = () => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    
    const monthlyShifts = shifts.filter(shift => {
      const shiftDate = new Date(shift.date)
      return shiftDate.getMonth() === currentMonth && shiftDate.getFullYear() === currentYear
    })

    // 日付別でグループ化
    const dailyShifts = monthlyShifts.reduce((acc, shift) => {
      const date = shift.date
      if (!acc[date]) acc[date] = []
      acc[date].push(shift)
      return acc
    }, {} as Record<string, Shift[]>)

    return Object.entries(dailyShifts).map(([date, shifts]) => {
      const assignedStaff = shifts.length
      const requiredStaff = 3 // 仮の必要人数
      const coverageRate = (assignedStaff / requiredStaff) * 100

      return {
        '日付': new Date(date).toLocaleDateString('ja-JP'),
        '曜日': new Date(date).toLocaleDateString('ja-JP', { weekday: 'short' }),
        '必要人数': requiredStaff,
        'アサイン人数': assignedStaff,
        'カバレッジ率': `${Math.round(coverageRate)}%`,
        'ステータス': coverageRate >= 100 ? '充足' : coverageRate >= 80 ? '要注意' : '不足',
        'アサインスタッフ': shifts.map(s => users.find(u => u.staffId === s.staffId)?.name).join(', ')
      }
    })
  }

  // 残業時間レポートの生成
  const generateOvertimeReport = () => {
    const standardHours = 8 // 標準勤務時間
    
    return timeRecords
      .filter(record => record.status === 'approved' && record.clockIn && record.clockOut)
      .map(record => {
        const user = users.find(u => u.staffId === record.staffId)
        const totalHours = calculateHoursNumeric(record.clockIn!, record.clockOut!)
        const regularHours = Math.min(totalHours, standardHours)
        const overtimeHours = Math.max(0, totalHours - standardHours)

        return {
          '日付': new Date(record.date).toLocaleDateString('ja-JP'),
          'スタッフ名': user?.name || 'Unknown',
          'スタッフID': record.staffId,
          '出勤時刻': record.clockIn,
          '退勤時刻': record.clockOut,
          '総勤務時間': `${Math.floor(totalHours)}時間${Math.round((totalHours % 1) * 60)}分`,
          '通常勤務時間': `${Math.floor(regularHours)}時間${Math.round((regularHours % 1) * 60)}分`,
          '残業時間': overtimeHours > 0 ? `${Math.floor(overtimeHours)}時間${Math.round((overtimeHours % 1) * 60)}分` : '0時間',
          '残業区分': overtimeHours > 0 ? '有り' : '無し'
        }
      })
      .filter(record => record['残業区分'] === '有り') // 残業がある記録のみ
  }

  // 給与計算データの生成
  const generatePayrollData = () => {
    const hourlyRate = 1000 // 仮の時給

    return users.map(user => {
      const userRecords = timeRecords.filter(record => 
        record.staffId === user.staffId &&
        record.status === 'approved' &&
        record.clockIn && record.clockOut
      )

      const totalHours = userRecords.reduce((sum, record) => {
        return sum + calculateHoursNumeric(record.clockIn!, record.clockOut!)
      }, 0)

      const regularHours = Math.min(totalHours, userRecords.length * 8)
      const overtimeHours = Math.max(0, totalHours - regularHours)
      
      const basePay = regularHours * hourlyRate
      const overtimePay = overtimeHours * hourlyRate * 1.25 // 残業割増25%
      const totalPay = basePay + overtimePay

      return {
        'スタッフ名': user.name,
        'スタッフID': user.staffId,
        '対象期間': `${new Date().getFullYear()}年${new Date().getMonth() + 1}月`,
        '勤務日数': userRecords.length,
        '総勤務時間': Math.round(totalHours * 100) / 100,
        '通常時間': Math.round(regularHours * 100) / 100,
        '残業時間': Math.round(overtimeHours * 100) / 100,
        '時給': hourlyRate,
        '基本給': basePay,
        '残業代': Math.round(overtimePay),
        '総支給額': Math.round(totalPay),
        '交通費': 500 // 仮の交通費
      }
    })
  }

  // 時間計算のヘルパー関数
  const calculateHoursNumeric = (clockIn: string, clockOut: string): number => {
    try {
      const startTime = new Date(`2000-01-01 ${clockIn}`)
      const endTime = new Date(`2000-01-01 ${clockOut}`)
      
      if (endTime < startTime) {
        endTime.setDate(endTime.getDate() + 1)
      }
      
      const diffMs = endTime.getTime() - startTime.getTime()
      return diffMs / (1000 * 60 * 60)
    } catch (error) {
      return 0
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 size={20} />
            高度なエクスポート機能
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="templates" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="templates">テンプレート</TabsTrigger>
              <TabsTrigger value="custom">カスタム</TabsTrigger>
              <TabsTrigger value="analytics">分析</TabsTrigger>
            </TabsList>

            {/* 事前定義テンプレート */}
            <TabsContent value="templates" className="space-y-4">
              <div className="grid gap-4">
                {defaultTemplates.map((template) => (
                  <Card key={template.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold mb-1">{template.name}</h4>
                          <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="text-xs">
                              {template.dataType === 'timeRecords' ? '勤怠' : 
                               template.dataType === 'shifts' ? 'シフト' : 'スタッフ'}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {template.fields.length}フィールド
                            </Badge>
                          </div>
                        </div>
                        <Button
                          onClick={() => executeAdvancedExport(template.id)}
                          disabled={isExporting}
                          className="ml-4"
                        >
                          {isExporting ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            <Download size={16} />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* カスタムクエリ */}
            <TabsContent value="custom" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">カスタムエクスポート</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="customQuery">カスタムクエリ（JSON形式）</Label>
                    <Textarea
                      id="customQuery"
                      value={customQuery}
                      onChange={(e) => setCustomQuery(e.target.value)}
                      placeholder='{"dataType": "timeRecords", "filters": {"startDate": "2024-01-01"}, "fields": ["date", "staff", "clockIn"]}'
                      rows={6}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={saveTemplate}>
                      <Settings size={16} className="mr-2" />
                      テンプレートとして保存
                    </Button>
                    <Button 
                      onClick={() => toast.info('カスタムクエリ機能は開発中です')}
                      disabled={!customQuery}
                    >
                      <Download size={16} className="mr-2" />
                      実行
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 分析レポート */}
            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-6 text-center">
                    <TrendingUp size={32} className="mx-auto mb-3 text-green-600" />
                    <h3 className="font-semibold mb-2">勤務効率分析</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      スタッフごとの勤務効率と生産性を分析
                    </p>
                    <Button variant="outline" className="w-full">
                      <BarChart3 size={16} className="mr-2" />
                      分析実行
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6 text-center">
                    <Calendar size={32} className="mx-auto mb-3 text-blue-600" />
                    <h3 className="font-semibold mb-2">シフト最適化</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      シフトパターンの最適化提案
                    </p>
                    <Button variant="outline" className="w-full">
                      <FileText size={16} className="mr-2" />
                      レポート生成
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6 text-center">
                    <Users size={32} className="mx-auto mb-3 text-purple-600" />
                    <h3 className="font-semibold mb-2">労務管理</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      労働基準法準拠チェック
                    </p>
                    <Button variant="outline" className="w-full">
                      <Clock size={16} className="mr-2" />
                      チェック実行
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6 text-center">
                    <Download size={32} className="mx-auto mb-3 text-orange-600" />
                    <h3 className="font-semibold mb-2">一括エクスポート</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      全データの一括ダウンロード
                    </p>
                    <Button variant="outline" className="w-full">
                      <Download size={16} className="mr-2" />
                      一括実行
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}