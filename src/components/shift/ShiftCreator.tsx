import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Plus, Edit, Trash, Users, FloppyDisk } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { User, Shift } from '../../App'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

interface ShiftCreatorProps {
  user: User
}

interface ShiftTemplate {
  id: string
  name: string
  startTime: string
  endTime: string
  position?: string
}

// ドラッグ可能なスタッフアイテム
function DraggableStaff({ user }: { user: User }) {
  const [{ isDragging }, drag] = useDrag({
    type: 'staff',
    item: { staffId: user.staffId, name: user.name },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  return (
    <div
      ref={drag}
      className={`bg-card border rounded-md p-2 cursor-move text-sm font-medium transition-opacity ${
        isDragging ? 'opacity-50' : 'opacity-100'
      } hover:bg-secondary`}
    >
      {user.name}
    </div>
  )
}

// ドロップ可能なカレンダーセル
function DroppableDay({ day, dayShifts, onDrop, onOpenDialog, getUserName, isToday }: {
  day: any
  dayShifts: Shift[]
  onDrop: (staffId: string, staffName: string, date: string) => void
  onOpenDialog: (date: string, shift?: Shift) => void
  getUserName: (staffId: string) => string
  isToday: boolean
}) {
  const [{ isOver }, drop] = useDrop({
    accept: 'staff',
    drop: (item: { staffId: string; name: string }) => {
      onDrop(item.staffId, item.name, day.fullDate)
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  })

  return (
    <div
      ref={drop}
      className={`min-h-[100px] p-1 border rounded transition-colors ${
        !day.isCurrentMonth ? 'bg-muted/50' : 'bg-card'
      } ${isToday ? 'ring-2 ring-primary' : ''} ${
        isOver ? 'bg-primary/10 border-primary' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`text-sm font-medium ${
          !day.isCurrentMonth ? 'text-muted-foreground' : ''
        }`}>
          {day.date}
        </span>
        {day.isCurrentMonth && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => onOpenDialog(day.fullDate)}
          >
            <Plus size={12} />
          </Button>
        )}
      </div>
      
      <div className="space-y-1">
        {dayShifts.map((shift) => (
          <div
            key={shift.id}
            className="bg-primary/10 text-primary text-xs p-1 rounded cursor-pointer hover:bg-primary/20"
            onClick={() => onOpenDialog(day.fullDate, shift)}
          >
            <div className="font-medium truncate">
              {getUserName(shift.staffId)}
            </div>
            <div className="truncate">
              {shift.startTime}-{shift.endTime}
            </div>
            {shift.position && (
              <div className="truncate opacity-75">
                {shift.position}
              </div>
            )}
          </div>
        ))}
      </div>
      {isOver && (
        <div className="text-xs text-primary mt-1 text-center">
          ここにドロップ
        </div>
      )}
    </div>
  )
}

function ShiftCreatorContent({ user }: ShiftCreatorProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [shifts, setShifts] = useKV<Shift[]>('shifts', [])
  const [allUsers] = useKV<User[]>('allUsers', [
    {
      id: '1',
      name: '田中 太郎',
      email: 'tanaka@example.com',
      role: 'staff',
      staffId: 'staff001'
    },
    {
      id: '2',
      name: '佐藤 花子',
      email: 'sato@example.com',
      role: 'creator',
      staffId: 'creator001'
    },
    {
      id: '4',
      name: '山田 三郎',
      email: 'yamada@example.com',
      role: 'staff',
      staffId: 'staff002'
    },
    {
      id: '5',
      name: '鈴木 美咲',
      email: 'suzuki@example.com',
      role: 'staff',
      staffId: 'staff003'
    }
  ])
  const [shiftTemplates] = useKV<ShiftTemplate[]>('shiftTemplates', [
    { id: '1', name: '早番', startTime: '09:00', endTime: '17:00', position: 'フロア' },
    { id: '2', name: '遅番', startTime: '13:00', endTime: '21:00', position: 'フロア' },
    { id: '3', name: '中番', startTime: '11:00', endTime: '19:00', position: 'レジ' }
  ])
  
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isShiftDialogOpen, setIsShiftDialogOpen] = useState(false)
  const [editingShift, setEditingShift] = useState<Shift | null>(null)
  const [newShift, setNewShift] = useState({
    staffId: '',
    startTime: '',
    endTime: '',
    position: ''
  })

  const generateCalendar = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startWeekday = firstDay.getDay()

    const calendar = []
    
    for (let i = startWeekday - 1; i >= 0; i--) {
      const date = new Date(year, month, -i)
      calendar.push({
        date: date.getDate(),
        fullDate: date.toISOString().split('T')[0],
        isCurrentMonth: false
      })
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      calendar.push({
        date: day,
        fullDate: date.toISOString().split('T')[0],
        isCurrentMonth: true
      })
    }

    const remainingCells = 42 - calendar.length
    for (let day = 1; day <= remainingCells; day++) {
      const date = new Date(year, month + 1, day)
      calendar.push({
        date: day,
        fullDate: date.toISOString().split('T')[0],
        isCurrentMonth: false
      })
    }

    return calendar
  }

  const calendar = generateCalendar()

  const getShiftsForDate = (date: string) => {
    return shifts.filter(shift => shift.date === date)
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  const openShiftDialog = (date: string, shift?: Shift) => {
    setSelectedDate(date)
    if (shift) {
      setEditingShift(shift)
      setNewShift({
        staffId: shift.staffId,
        startTime: shift.startTime,
        endTime: shift.endTime,
        position: shift.position || ''
      })
    } else {
      setEditingShift(null)
      setNewShift({
        staffId: '',
        startTime: '',
        endTime: '',
        position: ''
      })
    }
    setIsShiftDialogOpen(true)
  }

  const handleSaveShift = () => {
    if (!selectedDate || !newShift.staffId || !newShift.startTime || !newShift.endTime) {
      toast.error('必要な項目を入力してください')
      return
    }

    if (editingShift) {
      setShifts(current => 
        current.map(shift => 
          shift.id === editingShift.id 
            ? { ...shift, ...newShift, date: selectedDate }
            : shift
        )
      )
      toast.success('シフトを更新しました')
    } else {
      const newShiftRecord: Shift = {
        id: `shift-${Date.now()}`,
        date: selectedDate,
        ...newShift
      }
      setShifts(current => [...current, newShiftRecord])
      toast.success('シフトを登録しました')
    }

    setIsShiftDialogOpen(false)
    setEditingShift(null)
  }

  const handleDeleteShift = (shiftId: string) => {
    setShifts(current => current.filter(shift => shift.id !== shiftId))
    toast.success('シフトを削除しました')
  }

  const applyTemplate = (template: ShiftTemplate) => {
    setNewShift(prev => ({
      ...prev,
      startTime: template.startTime,
      endTime: template.endTime,
      position: template.position || ''
    }))
  }

  const getUserName = (staffId: string) => {
    const user = allUsers.find(u => u.staffId === staffId)
    return user ? user.name : '不明'
  }

  // ドラッグ&ドロップでシフト追加
  const handleStaffDrop = (staffId: string, staffName: string, date: string) => {
    const defaultTemplate = shiftTemplates[0] // デフォルトテンプレートを使用
    const newShiftRecord: Shift = {
      id: `shift-${Date.now()}`,
      staffId,
      date,
      startTime: defaultTemplate.startTime,
      endTime: defaultTemplate.endTime,
      position: defaultTemplate.position || ''
    }
    setShifts(current => [...current, newShiftRecord])
    toast.success(`${staffName}のシフトを${new Date(date).toLocaleDateString('ja-JP')}に追加しました`)
  }

  // 全スタッフページに反映
  const updateAllStaffShifts = () => {
    // 実際の実装では、全スタッフに通知を送信する処理を追加
    toast.success('シフトを全スタッフページに反映しました')
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-4">
      {/* スタッフリスト */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users size={20} />
              スタッフ一覧
            </CardTitle>
            <Button onClick={updateAllStaffShifts} className="flex items-center gap-2">
              <FloppyDisk size={16} />
              更新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {allUsers.map((staffUser) => (
              <DraggableStaff key={staffUser.id} user={staffUser} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            スタッフをドラッグしてカレンダーにドロップしてください
          </p>
        </CardContent>
      </Card>

      {/* シフトカレンダー */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users size={20} />
              シフト作成カレンダー
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                <ChevronLeft size={16} />
              </Button>
              <span className="text-sm font-medium min-w-[120px] text-center">
                {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月
              </span>
              <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 曜日ヘッダー */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => (
              <div
                key={day}
                className={`text-center text-sm font-medium py-2 ${
                  index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-foreground'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* カレンダーグリッド */}
          <div className="grid grid-cols-7 gap-1">
            {calendar.map((day, index) => {
              const dayShifts = getShiftsForDate(day.fullDate)
              const isToday = day.fullDate === today

              return (
                <DroppableDay
                  key={index}
                  day={day}
                  dayShifts={dayShifts}
                  onDrop={handleStaffDrop}
                  onOpenDialog={openShiftDialog}
                  getUserName={getUserName}
                  isToday={isToday}
                />
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* シフト登録・編集ダイアログ */}
      <Dialog open={isShiftDialogOpen} onOpenChange={setIsShiftDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingShift ? 'シフト編集' : 'シフト登録'}
              {selectedDate && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  {new Date(selectedDate).toLocaleDateString('ja-JP', {
                    month: 'numeric',
                    day: 'numeric',
                    weekday: 'short'
                  })}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>スタッフ</Label>
              <Select value={newShift.staffId} onValueChange={(value) => setNewShift(prev => ({ ...prev, staffId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="スタッフを選択" />
                </SelectTrigger>
                <SelectContent>
                  {allUsers.map((user) => (
                    <SelectItem key={user.id} value={user.staffId}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="start-time">開始時刻</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={newShift.startTime}
                  onChange={(e) => setNewShift(prev => ({ ...prev, startTime: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="end-time">終了時刻</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={newShift.endTime}
                  onChange={(e) => setNewShift(prev => ({ ...prev, endTime: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="position">ポジション（任意）</Label>
              <Input
                id="position"
                placeholder="フロア、レジなど"
                value={newShift.position}
                onChange={(e) => setNewShift(prev => ({ ...prev, position: e.target.value }))}
              />
            </div>

            <div>
              <Label>テンプレート</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {shiftTemplates.map((template) => (
                  <Badge
                    key={template.id}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                    onClick={() => applyTemplate(template)}
                  >
                    {template.name}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSaveShift} className="flex-1">
                {editingShift ? '更新' : '登録'}
              </Button>
              {editingShift && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleDeleteShift(editingShift.id)
                    setIsShiftDialogOpen(false)
                  }}
                >
                  <Trash size={16} />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function ShiftCreator(props: ShiftCreatorProps) {
  return (
    <DndProvider backend={HTML5Backend}>
      <ShiftCreatorContent {...props} />
    </DndProvider>
  )
}