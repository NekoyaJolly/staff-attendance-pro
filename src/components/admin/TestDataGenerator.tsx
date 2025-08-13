import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Database, Users, Clock, Calendar, Trash2 } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { User, TimeRecord, Shift } from '../../App'

export default function TestDataGenerator() {
  const [allUsers, setAllUsers] = useKV<User[]>('allUsers', [])
  const [timeRecords, setTimeRecords] = useKV<TimeRecord[]>('timeRecords', [])
  const [shifts, setShifts] = useKV<Shift[]>('shifts', [])

  // サンプルスタッフデータ生成
  const generateSampleUsers = () => {
    const sampleUsers: User[] = [
      {
        id: 'user-001',
        name: '田中太郎',
        email: 'tanaka@example.com',
        role: 'staff',
        staffId: 'STAFF001',
        birthDate: '1990-05-15',
        address: '東京都渋谷区',
        phone: '090-1234-5678'
      },
      {
        id: 'user-002',
        name: '佐藤花子',
        email: 'sato@example.com',
        role: 'creator',
        staffId: 'STAFF002',
        birthDate: '1988-12-03',
        address: '東京都新宿区',
        phone: '090-2345-6789'
      },
      {
        id: 'user-003',
        name: '鈴木一郎',
        email: 'suzuki@example.com',
        role: 'staff',
        staffId: 'STAFF003',
        birthDate: '1995-08-20',
        address: '東京都品川区',
        phone: '090-3456-7890'
      },
      {
        id: 'user-004',
        name: '高橋美咲',
        email: 'takahashi@example.com',
        role: 'staff',
        staffId: 'STAFF004',
        birthDate: '1992-03-10',
        address: '東京都目黒区',
        phone: '090-4567-8901'
      },
      {
        id: 'user-005',
        name: '山田健太',
        email: 'yamada@example.com',
        role: 'admin',
        staffId: 'ADMIN001',
        birthDate: '1985-11-25',
        address: '東京都港区',
        phone: '090-5678-9012'
      }
    ]

    setAllUsers(current => {
      const existingIds = current.map(u => u.id)
      const newUsers = sampleUsers.filter(u => !existingIds.includes(u.id))
      return [...current, ...newUsers]
    })

    toast.success(`${sampleUsers.length}名のサンプルスタッフを追加しました`)
  }

  // サンプル勤怠データ生成
  const generateSampleTimeRecords = () => {
    if (allUsers.length === 0) {
      toast.error('先にスタッフデータを生成してください')
      return
    }

    const sampleRecords: TimeRecord[] = []
    const today = new Date()
    
    // 過去30日間のデータを生成
    for (let i = 0; i < 30; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      allUsers.forEach((user, userIndex) => {
        // 80%の確率で出勤
        if (Math.random() < 0.8) {
          const clockInHour = 9 + Math.floor(Math.random() * 2) // 9-10時
          const clockInMinute = Math.floor(Math.random() * 60)
          const clockOutHour = 17 + Math.floor(Math.random() * 3) // 17-19時
          const clockOutMinute = Math.floor(Math.random() * 60)

          const record: TimeRecord = {
            id: `record-${date.getTime()}-${userIndex}`,
            staffId: user.staffId,
            date: dateStr,
            clockIn: `${clockInHour.toString().padStart(2, '0')}:${clockInMinute.toString().padStart(2, '0')}`,
            clockOut: `${clockOutHour.toString().padStart(2, '0')}:${clockOutMinute.toString().padStart(2, '0')}`,
            type: Math.random() < 0.9 ? 'auto' : 'manual',
            status: Math.random() < 0.95 ? 'approved' : 'pending',
            note: Math.random() < 0.1 ? '交通遅延のため遅刻' : undefined
          }

          sampleRecords.push(record)
        }
      })
    }

    setTimeRecords(current => [...current, ...sampleRecords])
    toast.success(`${sampleRecords.length}件の勤怠記録を生成しました`)
  }

  // サンプルシフトデータ生成
  const generateSampleShifts = () => {
    if (allUsers.length === 0) {
      toast.error('先にスタッフデータを生成してください')
      return
    }

    const sampleShifts: Shift[] = []
    const today = new Date()
    
    // 未来30日間のシフトを生成
    for (let i = 1; i <= 30; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]

      // 平日は3-4人、休日は2-3人のシフト
      const isWeekend = date.getDay() === 0 || date.getDay() === 6
      const staffCount = isWeekend ? 2 + Math.floor(Math.random() * 2) : 3 + Math.floor(Math.random() * 2)
      
      // ランダムにスタッフを選択
      const shuffledUsers = [...allUsers].sort(() => 0.5 - Math.random())
      const selectedUsers = shuffledUsers.slice(0, staffCount)

      selectedUsers.forEach((user, index) => {
        const shiftTypes = [
          { start: '09:00', end: '17:00', position: '通常シフト' },
          { start: '10:00', end: '18:00', position: '遅番シフト' },
          { start: '08:00', end: '16:00', position: '早番シフト' }
        ]
        
        const shiftType = shiftTypes[index % shiftTypes.length]

        const shift: Shift = {
          id: `shift-${date.getTime()}-${index}`,
          staffId: user.staffId,
          date: dateStr,
          startTime: shiftType.start,
          endTime: shiftType.end,
          position: shiftType.position
        }

        sampleShifts.push(shift)
      })
    }

    setShifts(current => [...current, ...sampleShifts])
    toast.success(`${sampleShifts.length}件のシフトを生成しました`)
  }

  // すべてのサンプルデータを生成
  const generateAllSampleData = () => {
    generateSampleUsers()
    setTimeout(() => {
      generateSampleTimeRecords()
    }, 500)
    setTimeout(() => {
      generateSampleShifts()
    }, 1000)
  }

  // データクリア
  const clearAllData = () => {
    if (confirm('すべてのデータを削除しますか？この操作は取り消せません。')) {
      setAllUsers([])
      setTimeRecords([])
      setShifts([])
      toast.success('すべてのデータを削除しました')
    }
  }

  // データ統計
  const getDataStats = () => {
    return {
      users: allUsers.length,
      timeRecords: timeRecords.length,
      shifts: shifts.length,
      approvedRecords: timeRecords.filter(r => r.status === 'approved').length,
      pendingRecords: timeRecords.filter(r => r.status === 'pending').length
    }
  }

  const stats = getDataStats()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database size={20} />
          テストデータ生成ツール
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 現在のデータ統計 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Users size={20} className="text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-800">{stats.users}</div>
            <div className="text-sm text-blue-600">スタッフ</div>
          </div>
          
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Clock size={20} className="text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-800">{stats.timeRecords}</div>
            <div className="text-sm text-green-600">勤怠記録</div>
          </div>
          
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Calendar size={20} className="text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-800">{stats.shifts}</div>
            <div className="text-sm text-purple-600">シフト</div>
          </div>
          
          <div className="text-center p-3 bg-emerald-50 rounded-lg">
            <div className="text-2xl font-bold text-emerald-800">{stats.approvedRecords}</div>
            <div className="text-sm text-emerald-600">承認済み</div>
          </div>
          
          <div className="text-center p-3 bg-amber-50 rounded-lg">
            <div className="text-2xl font-bold text-amber-800">{stats.pendingRecords}</div>
            <div className="text-sm text-amber-600">承認待ち</div>
          </div>
        </div>

        {/* データ生成ボタン */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button
            onClick={generateSampleUsers}
            variant="outline"
            className="h-20 flex flex-col items-center justify-center space-y-2"
          >
            <Users size={24} />
            <span className="text-sm">スタッフデータ</span>
            <Badge variant="secondary" className="text-xs">5名</Badge>
          </Button>

          <Button
            onClick={generateSampleTimeRecords}
            variant="outline"
            className="h-20 flex flex-col items-center justify-center space-y-2"
            disabled={allUsers.length === 0}
          >
            <Clock size={24} />
            <span className="text-sm">勤怠記録</span>
            <Badge variant="secondary" className="text-xs">30日分</Badge>
          </Button>

          <Button
            onClick={generateSampleShifts}
            variant="outline"
            className="h-20 flex flex-col items-center justify-center space-y-2"
            disabled={allUsers.length === 0}
          >
            <Calendar size={24} />
            <span className="text-sm">シフトデータ</span>
            <Badge variant="secondary" className="text-xs">30日分</Badge>
          </Button>

          <Button
            onClick={generateAllSampleData}
            className="h-20 flex flex-col items-center justify-center space-y-2"
          >
            <Database size={24} />
            <span className="text-sm">すべて生成</span>
            <Badge variant="outline" className="text-xs bg-white">一括</Badge>
          </Button>
        </div>

        {/* 危険な操作 */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-destructive mb-1">危険な操作</h4>
              <p className="text-sm text-muted-foreground">
                すべてのテストデータを削除します
              </p>
            </div>
            <Button
              onClick={clearAllData}
              variant="destructive"
              size="sm"
              className="flex items-center gap-2"
            >
              <Trash2 size={16} />
              全データ削除
            </Button>
          </div>
        </div>

        {/* 注意事項 */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-medium text-amber-800 mb-2">テストデータについて</h4>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• このツールは開発・テスト目的で使用してください</li>
                <li>• 生成されるデータは架空のものです</li>
                <li>• 本番環境では使用しないでください</li>
                <li>• データエクスポート機能のテストに最適です</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}