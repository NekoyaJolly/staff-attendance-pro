import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Calendar, CalendarBlank, List } from '@phosphor-icons/react'
import { User, Shift } from '../../App'

interface ShiftViewProps {
  user: User
}

type ViewMode = 'monthly' | 'weekly'

export default function ShiftView({ user }: ShiftViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [shifts, setShifts] = useKV<Shift[]>('shifts', [])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('monthly')

  // 現在月のカレンダーを生成
  const generateCalendar = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startWeekday = firstDay.getDay()

    const calendar = []
    
    // 前月の末尾日付
    for (let i = startWeekday - 1; i >= 0; i--) {
      const date = new Date(year, month, -i)
      calendar.push({
        date: date.getDate(),
        fullDate: date.toISOString().split('T')[0],
        isCurrentMonth: false
      })
    }

    // 当月の日付
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      calendar.push({
        date: day,
        fullDate: date.toISOString().split('T')[0],
        isCurrentMonth: true
      })
    }

    // 次月の開始日付
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

  // 現在週のカレンダーを生成
  const generateWeekCalendar = () => {
    const startOfWeek = new Date(currentDate)
    const day = startOfWeek.getDay()
    startOfWeek.setDate(startOfWeek.getDate() - day)

    const weekCalendar = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      weekCalendar.push({
        date: date.getDate(),
        fullDate: date.toISOString().split('T')[0],
        isCurrentMonth: date.getMonth() === currentDate.getMonth()
      })
    }

    return weekCalendar
  }

  const calendar = viewMode === 'monthly' ? generateCalendar() : generateWeekCalendar()
  
  // ユーザーのシフトを取得
  const userShifts = shifts.filter(shift => shift.staffId === user.staffId)
  
  // 指定日のシフトを取得
  const getShiftForDate = (date: string) => {
    return userShifts.find(shift => shift.date === date)
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (direction === 'prev') {
      if (viewMode === 'monthly') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setDate(newDate.getDate() - 7)
      }
    } else {
      if (viewMode === 'monthly') {
        newDate.setMonth(newDate.getMonth() + 1)
      } else {
        newDate.setDate(newDate.getDate() + 7)
      }
    }
    setCurrentDate(newDate)
  }

  const getDateRangeLabel = () => {
    if (viewMode === 'monthly') {
      return `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月`
    } else {
      const weekCalendar = generateWeekCalendar()
      const startDate = new Date(weekCalendar[0].fullDate)
      const endDate = new Date(weekCalendar[6].fullDate)
      
      if (startDate.getMonth() === endDate.getMonth()) {
        return `${startDate.getFullYear()}年${startDate.getMonth() + 1}月${startDate.getDate()}日 - ${endDate.getDate()}日`
      } else {
        return `${startDate.getFullYear()}年${startDate.getMonth() + 1}月${startDate.getDate()}日 - ${endDate.getMonth() + 1}月${endDate.getDate()}日`
      }
    }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar size={20} />
              シフト確認
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* ビューモード切替ボタン */}
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === 'monthly' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-r-none"
                  onClick={() => setViewMode('monthly')}
                >
                  <CalendarBlank size={16} />
                  月
                </Button>
                <Button
                  variant={viewMode === 'weekly' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-l-none"
                  onClick={() => setViewMode('weekly')}
                >
                  <List size={16} />
                  週
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                <ChevronLeft size={16} />
              </Button>
              <span className="text-sm font-medium min-w-[160px] text-center">
                {getDateRangeLabel()}
              </span>
              <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 曜日ヘッダー */}
          <div className={`grid ${viewMode === 'monthly' ? 'grid-cols-7' : 'grid-cols-7'} gap-1 mb-2`}>
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
          <div className={`grid ${viewMode === 'monthly' ? 'grid-cols-7' : 'grid-cols-7'} gap-1`}>
            {calendar.map((day, index) => {
              const shift = getShiftForDate(day.fullDate)
              const isToday = day.fullDate === today
              const hasShift = !!shift

              return (
                <Button
                  key={index}
                  variant="ghost"
                  className={`${viewMode === 'monthly' ? 'h-12' : 'h-20'} p-1 flex flex-col items-center justify-center relative ${
                    !day.isCurrentMonth ? 'text-muted-foreground opacity-50' : ''
                  } ${isToday ? 'ring-2 ring-primary' : ''} ${
                    hasShift ? 'bg-primary/10' : ''
                  }`}
                  onClick={() => setSelectedDate(day.fullDate)}
                >
                  <span className="text-sm font-medium">{day.date}</span>
                  {hasShift && viewMode === 'weekly' && (
                    <div className="text-xs mt-1 text-center">
                      <div className="text-primary font-medium">
                        {shift.startTime}-{shift.endTime}
                      </div>
                      {shift.position && (
                        <div className="text-muted-foreground truncate max-w-full">
                          {shift.position}
                        </div>
                      )}
                    </div>
                  )}
                  {hasShift && viewMode === 'monthly' && (
                    <div className="w-1 h-1 bg-primary rounded-full absolute bottom-1"></div>
                  )}
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 選択された日のシフト詳細 */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {new Date(selectedDate).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const shift = getShiftForDate(selectedDate)
              if (shift) {
                return (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">勤務時間:</span>
                      <span className="font-medium">
                        {shift.startTime} - {shift.endTime}
                      </span>
                    </div>
                    {shift.position && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">ポジション:</span>
                        <span className="font-medium">{shift.position}</span>
                      </div>
                    )}
                  </div>
                )
              } else {
                return (
                  <p className="text-muted-foreground text-center py-4">
                    この日はシフトが登録されていません
                  </p>
                )
              }
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  )
}