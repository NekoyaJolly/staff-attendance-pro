import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Clock, Camera, Edit, CheckCircle, XCircle, AlertCircle } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { User, TimeRecord } from '../../App'
import QRScanner from './QRScanner'

interface TimeCardViewProps {
  user: User
}

export default function TimeCardView({ user }: TimeCardViewProps) {
  const [timeRecords, setTimeRecords] = useKV<TimeRecord[]>('timeRecords', [])
  const [currentStatus, setCurrentStatus] = useState<'out' | 'in'>('out')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false)
  const [recordType, setRecordType] = useState<'clockIn' | 'clockOut'>('clockIn')
  const [manualTime, setManualTime] = useState('')
  const [note, setNote] = useState('')

  // 現在の勤務状態をチェック
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    const todayRecords = timeRecords.filter(
      record => record.staffId === user.staffId && record.date === today
    )
    
    const latestRecord = todayRecords.sort((a, b) => 
      new Date(`${a.date} ${a.clockOut || a.clockIn}`).getTime() - 
      new Date(`${b.date} ${b.clockOut || b.clockIn}`).getTime()
    ).pop()

    if (latestRecord?.clockIn && !latestRecord?.clockOut) {
      setCurrentStatus('in')
    } else {
      setCurrentStatus('out')
    }
  }, [timeRecords, user.staffId])

  const handleTimeRecord = (type: 'auto' | 'manual', time?: string) => {
    const now = new Date()
    const currentTime = time || now.toTimeString().slice(0, 5)
    const currentDate = now.toISOString().split('T')[0]

    const newRecord: TimeRecord = {
      id: `${user.staffId}-${Date.now()}`,
      staffId: user.staffId,
      date: currentDate,
      type,
      status: type === 'manual' ? 'pending' : 'approved',
      note: note || undefined
    }

    if (recordType === 'clockIn') {
      newRecord.clockIn = currentTime
      toast.success('出勤記録を登録しました')
    } else {
      // 今日の最新の出勤記録を見つけて退勤時刻を追加
      const todayRecords = timeRecords.filter(
        record => record.staffId === user.staffId && record.date === currentDate
      )
      const latestClockIn = todayRecords
        .filter(record => record.clockIn && !record.clockOut)
        .sort((a, b) => new Date(`${a.date} ${a.clockIn}`).getTime() - new Date(`${b.date} ${b.clockIn}`).getTime())
        .pop()

      if (latestClockIn) {
        setTimeRecords(current => 
          current.map(record => 
            record.id === latestClockIn.id 
              ? { ...record, clockOut: currentTime, status: type === 'manual' ? 'pending' : 'approved' }
              : record
          )
        )
        toast.success('退勤記録を登録しました')
      } else {
        newRecord.clockOut = currentTime
        setTimeRecords(current => [...current, newRecord])
        toast.success('退勤記録を登録しました')
      }
      setIsDialogOpen(false)
      setNote('')
      setManualTime('')
      return
    }

    setTimeRecords(current => [...current, newRecord])
    setIsDialogOpen(false)
    setNote('')
    setManualTime('')
  }

  const openRecordDialog = (type: 'clockIn' | 'clockOut') => {
    setRecordType(type)
    setIsDialogOpen(true)
  }

  const handleQRScan = () => {
    setIsQRScannerOpen(true)
  }

  const handleQRScanSuccess = (qrData: string) => {
    try {
      const data = JSON.parse(qrData)
      if (data.type === 'attendance-qr') {
        handleTimeRecord('auto')
        toast.success(`${data.locationName}での勤怠記録を登録しました`)
      } else {
        toast.error('無効なQRコードです')
      }
    } catch (error) {
      console.error('QR data parse error:', error)
      toast.error('QRコードの読み取りに失敗しました')
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualTime) {
      toast.error('時刻を入力してください')
      return
    }
    handleTimeRecord('manual', manualTime)
  }

  // 今月の勤怠記録を取得
  const getCurrentMonthRecords = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const startDate = new Date(year, month, 1).toISOString().split('T')[0]
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]

    return timeRecords
      .filter(record => 
        record.staffId === user.staffId && 
        record.date >= startDate && 
        record.date <= endDate
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  const monthlyRecords = getCurrentMonthRecords()

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle size={16} className="text-green-500" />
      case 'pending':
        return <AlertCircle size={16} className="text-yellow-500" />
      case 'rejected':
        return <XCircle size={16} className="text-red-500" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      {/* 出退勤ボタン */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock size={20} />
            タイムカード
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-2xl font-bold">
              {new Date().toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
            <div className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              size="lg"
              className="h-16"
              onClick={() => openRecordDialog('clockIn')}
              disabled={currentStatus === 'in'}
            >
              出勤
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-16"
              onClick={() => openRecordDialog('clockOut')}
              disabled={currentStatus === 'out'}
            >
              退勤
            </Button>
          </div>

          <div className="text-center">
            <Badge variant={currentStatus === 'in' ? 'default' : 'secondary'}>
              {currentStatus === 'in' ? '勤務中' : '退勤済み'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* 今月の勤怠記録 */}
      <Card>
        <CardHeader>
          <CardTitle>今月の勤怠記録</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {monthlyRecords.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                まだ勤怠記録がありません
              </p>
            ) : (
              monthlyRecords.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">
                      {new Date(record.date).toLocaleDateString('ja-JP', {
                        month: 'numeric',
                        day: 'numeric',
                        weekday: 'short'
                      })}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {record.clockIn && `出勤: ${record.clockIn}`}
                      {record.clockOut && ` / 退勤: ${record.clockOut}`}
                    </div>
                    {record.note && (
                      <div className="text-xs text-muted-foreground mt-1">
                        備考: {record.note}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(record.status)}
                    <Badge variant={record.type === 'manual' ? 'outline' : 'secondary'}>
                      {record.type === 'manual' ? '手動' : '自動'}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* 勤怠記録ダイアログ */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {recordType === 'clockIn' ? '出勤' : '退勤'}記録
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={handleQRScan} className="h-16 flex flex-col">
                <Camera size={24} />
                <span className="text-sm mt-1">QRコード</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  const form = document.getElementById('manual-form') as HTMLFormElement
                  form?.requestSubmit()
                }}
                className="h-16 flex flex-col"
              >
                <Edit size={24} />
                <span className="text-sm mt-1">手動入力</span>
              </Button>
            </div>

            <form id="manual-form" onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <Label htmlFor="manual-time">時刻</Label>
                <Input
                  id="manual-time"
                  type="time"
                  value={manualTime}
                  onChange={(e) => setManualTime(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="note">備考（任意）</Label>
                <Textarea
                  id="note"
                  placeholder="遅刻理由や備考があれば入力してください"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="text-xs text-muted-foreground">
                ※ 手動入力の場合は管理者の承認が必要です
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* QRスキャナー */}
      <QRScanner
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onScanSuccess={handleQRScanSuccess}
        staffId={user.staffId}
      />
    </div>
  )
}