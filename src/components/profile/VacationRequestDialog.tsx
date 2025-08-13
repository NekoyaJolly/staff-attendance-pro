import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { CalendarPlus } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useKV } from '@github/spark/hooks'
import { VacationRequest } from '../../App'

interface VacationRequestDialogProps {
  staffId: string
  remainingDays: number
}

export default function VacationRequestDialog({ staffId, remainingDays }: VacationRequestDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [requests, setRequests] = useKV<VacationRequest[]>('vacationRequests', [])

  const calculateDays = () => {
    if (!startDate || !endDate) return 0
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
  }

  const requestDays = calculateDays()

  const handleSubmit = () => {
    if (!startDate || !endDate || !reason.trim()) {
      toast.error('すべての項目を入力してください')
      return
    }

    if (requestDays > remainingDays) {
      toast.error('有給残日数が不足しています')
      return
    }

    const newRequest: VacationRequest = {
      id: `vacation_${Date.now()}`,
      staffId,
      startDate,
      endDate,
      days: requestDays,
      reason,
      status: 'pending',
      createdAt: new Date().toISOString()
    }

    setRequests(current => [...current, newRequest])
    toast.success('有給申請を送信しました')
    
    // フォームをリセット
    setStartDate('')
    setEndDate('')
    setReason('')
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <CalendarPlus size={16} className="mr-2" />
          有給申請
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>有給休暇申請</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground mb-4">
            有給残日数: {remainingDays}日
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-date">開始日</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="end-date">終了日</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="mt-1"
              />
            </div>
          </div>

          {requestDays > 0 && (
            <div className="text-sm">
              申請日数: <span className="font-semibold">{requestDays}日</span>
              {requestDays > remainingDays && (
                <span className="text-destructive ml-2">(有給残日数を超過しています)</span>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="reason">申請理由</Label>
            <Textarea
              id="reason"
              placeholder="有給取得の理由を入力してください"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={!startDate || !endDate || !reason.trim() || requestDays > remainingDays}
              className="flex-1"
            >
              申請する
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              キャンセル
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}