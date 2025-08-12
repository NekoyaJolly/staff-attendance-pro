import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  AlertTriangle,
  Eye,
  MessageSquare,
  Calendar,
  TrendingUp,
  FileText
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useApprovalSystem, ApprovalRequest } from '../../hooks/useApprovalSystem'
import { User as UserType } from '../../App'

interface ApprovalDashboardProps {
  user: UserType
}

export default function ApprovalDashboard({ user }: ApprovalDashboardProps) {
  const {
    processApproval,
    emergencyApprove,
    getPendingApprovals,
    getMyRequests,
    getApprovalHistory,
    getRequestDetails,
    getApprovalStats
  } = useApprovalSystem(user.staffId)

  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null)
  const [actionComment, setActionComment] = useState('')
  const [emergencyReason, setEmergencyReason] = useState('')
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const pendingApprovals = getPendingApprovals()
  const myRequests = getMyRequests()
  const approvalHistory = getApprovalHistory()
  const stats = getApprovalStats()

  const handleApproval = async (requestId: string, action: 'approved' | 'rejected') => {
    try {
      await processApproval(requestId, action, actionComment)
      toast.success(action === 'approved' ? '承認しました' : '却下しました')
      setActionComment('')
      setSelectedRequest(null)
    } catch (error) {
      toast.error('処理に失敗しました')
    }
  }

  const handleEmergencyApproval = async (requestId: string) => {
    if (!emergencyReason.trim()) {
      toast.error('緊急承認の理由を入力してください')
      return
    }

    try {
      emergencyApprove(requestId, emergencyReason)
      toast.success('緊急承認しました')
      setEmergencyReason('')
      setSelectedRequest(null)
    } catch (error) {
      toast.error('緊急承認に失敗しました')
    }
  }

  const getTypeText = (type: ApprovalRequest['type']) => {
    switch (type) {
      case 'time_record': return '勤怠記録'
      case 'shift_change': return 'シフト変更'
      case 'vacation_request': return '休暇申請'
      case 'overtime_request': return '残業申請'
      default: return '不明'
    }
  }

  const getStatusColor = (status: ApprovalRequest['status']) => {
    switch (status) {
      case 'pending': return 'default'
      case 'approved': return 'secondary'
      case 'rejected': return 'destructive'
      default: return 'outline'
    }
  }

  const getPriorityColor = (priority: ApprovalRequest['priority']) => {
    switch (priority) {
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      default: return 'outline'
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const RequestCard = ({ request, showActions = false }: { request: ApprovalRequest; showActions?: boolean }) => (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium">{request.title}</h3>
              <Badge variant={getTypeText(request.type) as any}>{getTypeText(request.type)}</Badge>
              <Badge variant={getPriorityColor(request.priority)}>{request.priority}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{request.description}</p>
            <div className="text-xs text-muted-foreground mt-1">
              申請日時: {formatDateTime(request.requestedAt)}
            </div>
          </div>
          <Badge variant={getStatusColor(request.status)}>
            {request.status === 'pending' ? '承認待ち' : 
             request.status === 'approved' ? '承認済み' : '却下'}
          </Badge>
        </div>

        {showActions && request.status === 'pending' && (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                setSelectedRequest(request)
                setIsDetailsOpen(true)
              }}
              variant="outline"
            >
              <Eye size={14} className="mr-1" />
              詳細
            </Button>
            <Button
              size="sm"
              onClick={() => handleApproval(request.id, 'approved')}
            >
              <CheckCircle size={14} className="mr-1" />
              承認
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                setSelectedRequest(request)
                setActionComment('')
              }}
            >
              <XCircle size={14} className="mr-1" />
              却下
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* 統計カード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">承認待ち</p>
                <p className="text-2xl font-bold text-orange-600">{stats.myPending}</p>
              </div>
              <Clock size={24} className="text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">承認済み</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <CheckCircle size={24} className="text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">却下</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <XCircle size={24} className="text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">承認率</p>
                <p className="text-2xl font-bold text-blue-600">{stats.approvalRate}%</p>
              </div>
              <TrendingUp size={24} className="text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* メインコンテンツ */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">承認待ち ({stats.myPending})</TabsTrigger>
          <TabsTrigger value="my-requests">自分の申請 ({stats.myRequests})</TabsTrigger>
          <TabsTrigger value="history">承認履歴</TabsTrigger>
        </TabsList>

        {/* 承認待ち */}
        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock size={20} />
                承認待ちの申請
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {pendingApprovals.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText size={48} className="mx-auto mb-4 opacity-50" />
                    <p>承認待ちの申請はありません</p>
                  </div>
                ) : (
                  pendingApprovals.map((request) => (
                    <RequestCard key={request.id} request={request} showActions={true} />
                  ))
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 自分の申請 */}
        <TabsContent value="my-requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User size={20} />
                自分の申請
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {myRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText size={48} className="mx-auto mb-4 opacity-50" />
                    <p>申請履歴がありません</p>
                  </div>
                ) : (
                  myRequests.map((request) => (
                    <RequestCard key={request.id} request={request} />
                  ))
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 承認履歴 */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle size={20} />
                承認履歴
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {approvalHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText size={48} className="mx-auto mb-4 opacity-50" />
                    <p>承認履歴がありません</p>
                  </div>
                ) : (
                  approvalHistory.map((request) => (
                    <RequestCard key={request.id} request={request} />
                  ))
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 却下ダイアログ */}
      {selectedRequest && (
        <Dialog open={!!selectedRequest && !isDetailsOpen} onOpenChange={(open) => !open && setSelectedRequest(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>申請の却下</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">{selectedRequest.title}</h4>
                <p className="text-sm text-muted-foreground">{selectedRequest.description}</p>
              </div>
              
              <div>
                <Label htmlFor="rejection-reason">却下理由（任意）</Label>
                <Textarea
                  id="rejection-reason"
                  value={actionComment}
                  onChange={(e) => setActionComment(e.target.value)}
                  placeholder="却下の理由を入力してください"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                  キャンセル
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => handleApproval(selectedRequest.id, 'rejected')}
                >
                  却下
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 詳細ダイアログ */}
      {selectedRequest && (
        <Dialog open={isDetailsOpen} onOpenChange={(open) => {
          setIsDetailsOpen(open)
          if (!open) setSelectedRequest(null)
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>申請詳細</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>申請タイプ</Label>
                    <p className="text-sm">{getTypeText(selectedRequest.type)}</p>
                  </div>
                  <div>
                    <Label>優先度</Label>
                    <Badge variant={getPriorityColor(selectedRequest.priority)}>
                      {selectedRequest.priority}
                    </Badge>
                  </div>
                  <div>
                    <Label>申請日時</Label>
                    <p className="text-sm">{formatDateTime(selectedRequest.requestedAt)}</p>
                  </div>
                  <div>
                    <Label>ステータス</Label>
                    <Badge variant={getStatusColor(selectedRequest.status)}>
                      {selectedRequest.status === 'pending' ? '承認待ち' : 
                       selectedRequest.status === 'approved' ? '承認済み' : '却下'}
                    </Badge>
                  </div>
                </div>

                <div>
                  <Label>申請内容</Label>
                  <p className="text-sm">{selectedRequest.description}</p>
                </div>

                {selectedRequest.data && (
                  <div>
                    <Label>詳細データ</Label>
                    <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                      {JSON.stringify(selectedRequest.data, null, 2)}
                    </pre>
                  </div>
                )}

                {user.role === 'admin' && selectedRequest.status === 'pending' && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">緊急承認</h4>
                    <div className="space-y-2">
                      <Textarea
                        value={emergencyReason}
                        onChange={(e) => setEmergencyReason(e.target.value)}
                        placeholder="緊急承認の理由を入力してください"
                        rows={2}
                      />
                      <Button
                        variant="outline"
                        className="text-orange-600 border-orange-600"
                        onClick={() => handleEmergencyApproval(selectedRequest.id)}
                      >
                        <AlertTriangle size={14} className="mr-1" />
                        緊急承認
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
                    閉じる
                  </Button>
                  {selectedRequest.status === 'pending' && (
                    <>
                      <Button onClick={() => handleApproval(selectedRequest.id, 'approved')}>
                        <CheckCircle size={14} className="mr-1" />
                        承認
                      </Button>
                      <Button 
                        variant="destructive"
                        onClick={() => {
                          setIsDetailsOpen(false)
                          setActionComment('')
                        }}
                      >
                        <XCircle size={14} className="mr-1" />
                        却下
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}