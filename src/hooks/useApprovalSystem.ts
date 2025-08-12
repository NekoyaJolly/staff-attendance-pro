import { useKV } from '@github/spark/hooks'
import { User, TimeRecord } from '../App'

export interface ApprovalRequest {
  id: string
  type: 'time_record' | 'shift_change' | 'vacation_request' | 'overtime_request'
  requesterId: string
  requestedAt: string
  title: string
  description: string
  data: any // 承認対象のデータ
  status: 'pending' | 'approved' | 'rejected'
  approvedBy?: string
  approvedAt?: string
  rejectionReason?: string
  priority: 'low' | 'medium' | 'high'
  requiredApprovers: string[] // 必要な承認者のID
  approvals: ApprovalAction[] // 承認履歴
}

export interface ApprovalAction {
  approverId: string
  action: 'approved' | 'rejected'
  timestamp: string
  comment?: string
}

export interface ApprovalWorkflow {
  id: string
  name: string
  type: ApprovalRequest['type']
  steps: ApprovalStep[]
  isActive: boolean
}

export interface ApprovalStep {
  id: string
  name: string
  approverRoles: ('admin' | 'creator' | 'supervisor')[]
  isRequired: boolean
  order: number
}

// 承認管理フック
export function useApprovalSystem(currentUserId: string) {
  const [approvalRequests, setApprovalRequests] = useKV<ApprovalRequest[]>('approvalRequests', [])
  const [workflows, setWorkflows] = useKV<ApprovalWorkflow[]>('approvalWorkflows', [
    // デフォルトワークフロー
    {
      id: 'time-record-approval',
      name: '勤怠記録承認',
      type: 'time_record',
      steps: [
        {
          id: 'step1',
          name: '管理者承認',
          approverRoles: ['admin', 'creator'],
          isRequired: true,
          order: 1
        }
      ],
      isActive: true
    },
    {
      id: 'overtime-approval',
      name: '残業申請承認',
      type: 'overtime_request',
      steps: [
        {
          id: 'step1',
          name: '作成者承認',
          approverRoles: ['creator'],
          isRequired: true,
          order: 1
        },
        {
          id: 'step2',
          name: '管理者承認',
          approverRoles: ['admin'],
          isRequired: true,
          order: 2
        }
      ],
      isActive: true
    }
  ])
  const [allUsers] = useKV<User[]>('allUsers', [])

  // 承認リクエスト作成
  const createApprovalRequest = (requestData: Omit<ApprovalRequest, 'id' | 'requestedAt' | 'status' | 'approvals' | 'requiredApprovers'>) => {
    const workflow = workflows.find(w => w.type === requestData.type && w.isActive)
    if (!workflow) {
      throw new Error('対応するワークフローが見つかりません')
    }

    // 必要な承認者を決定
    const requiredApprovers = workflow.steps.flatMap(step => 
      allUsers
        .filter(user => step.approverRoles.includes(user.role as any))
        .map(user => user.staffId)
    )

    const newRequest: ApprovalRequest = {
      ...requestData,
      id: `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      requestedAt: new Date().toISOString(),
      status: 'pending',
      approvals: [],
      requiredApprovers
    }

    setApprovalRequests(current => [...current, newRequest])
    return newRequest
  }

  // 承認・却下処理
  const processApproval = (
    requestId: string, 
    action: 'approved' | 'rejected', 
    comment?: string
  ) => {
    const request = approvalRequests.find(r => r.id === requestId)
    if (!request) {
      throw new Error('承認リクエストが見つかりません')
    }

    if (request.status !== 'pending') {
      throw new Error('この承認リクエストは既に処理済みです')
    }

    if (!request.requiredApprovers.includes(currentUserId)) {
      throw new Error('この承認リクエストを処理する権限がありません')
    }

    const approvalAction: ApprovalAction = {
      approverId: currentUserId,
      action,
      timestamp: new Date().toISOString(),
      comment
    }

    const updatedRequest: ApprovalRequest = {
      ...request,
      approvals: [...request.approvals, approvalAction],
      status: action === 'rejected' ? 'rejected' : 'pending',
      approvedBy: action === 'approved' ? currentUserId : undefined,
      approvedAt: action === 'approved' ? new Date().toISOString() : undefined,
      rejectionReason: action === 'rejected' ? comment : undefined
    }

    // 複数段階承認の場合の最終承認判定
    if (action === 'approved') {
      const workflow = workflows.find(w => w.type === request.type && w.isActive)
      if (workflow) {
        const requiredSteps = workflow.steps.filter(step => step.isRequired)
        const completedSteps = requiredSteps.filter(step => {
          return step.approverRoles.some(role => {
            const approver = allUsers.find(u => u.staffId === currentUserId)
            return approver?.role === role
          })
        })

        if (completedSteps.length >= requiredSteps.length) {
          updatedRequest.status = 'approved'
        }
      } else {
        updatedRequest.status = 'approved'
      }
    }

    setApprovalRequests(current => 
      current.map(r => r.id === requestId ? updatedRequest : r)
    )

    return updatedRequest
  }

  // 自動承認処理（特定の条件下で）
  const autoApprove = (requestId: string, reason: string) => {
    const request = approvalRequests.find(r => r.id === requestId)
    if (!request) return false

    const autoApprovalAction: ApprovalAction = {
      approverId: 'system',
      action: 'approved',
      timestamp: new Date().toISOString(),
      comment: `自動承認: ${reason}`
    }

    const updatedRequest: ApprovalRequest = {
      ...request,
      approvals: [...request.approvals, autoApprovalAction],
      status: 'approved',
      approvedBy: 'system',
      approvedAt: new Date().toISOString()
    }

    setApprovalRequests(current => 
      current.map(r => r.id === requestId ? updatedRequest : r)
    )

    return true
  }

  // 承認待ちリクエスト取得
  const getPendingApprovals = () => {
    return approvalRequests.filter(request => 
      request.status === 'pending' && 
      request.requiredApprovers.includes(currentUserId)
    )
  }

  // 自分が作成したリクエスト取得
  const getMyRequests = () => {
    return approvalRequests.filter(request => request.requesterId === currentUserId)
  }

  // 承認履歴取得
  const getApprovalHistory = () => {
    return approvalRequests.filter(request => 
      request.approvals.some(approval => approval.approverId === currentUserId)
    )
  }

  // 緊急承認（管理者のみ）
  const emergencyApprove = (requestId: string, reason: string) => {
    const currentUser = allUsers.find(u => u.staffId === currentUserId)
    if (currentUser?.role !== 'admin') {
      throw new Error('緊急承認は管理者のみ実行できます')
    }

    const emergencyAction: ApprovalAction = {
      approverId: currentUserId,
      action: 'approved',
      timestamp: new Date().toISOString(),
      comment: `緊急承認: ${reason}`
    }

    setApprovalRequests(current => 
      current.map(request => 
        request.id === requestId
          ? {
              ...request,
              approvals: [...request.approvals, emergencyAction],
              status: 'approved',
              approvedBy: currentUserId,
              approvedAt: new Date().toISOString(),
              priority: 'high'
            }
          : request
      )
    )
  }

  // リクエストの詳細取得
  const getRequestDetails = (requestId: string) => {
    const request = approvalRequests.find(r => r.id === requestId)
    if (!request) return null

    const requester = allUsers.find(u => u.staffId === request.requesterId)
    const approvers = request.approvals.map(approval => ({
      ...approval,
      approver: allUsers.find(u => u.staffId === approval.approverId)
    }))

    return {
      ...request,
      requester,
      approvers
    }
  }

  // 統計情報取得
  const getApprovalStats = () => {
    const total = approvalRequests.length
    const pending = approvalRequests.filter(r => r.status === 'pending').length
    const approved = approvalRequests.filter(r => r.status === 'approved').length
    const rejected = approvalRequests.filter(r => r.status === 'rejected').length

    const myPending = getPendingApprovals().length
    const myRequests = getMyRequests().length

    return {
      total,
      pending,
      approved,
      rejected,
      myPending,
      myRequests,
      approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0
    }
  }

  return {
    approvalRequests,
    workflows,
    createApprovalRequest,
    processApproval,
    autoApprove,
    emergencyApprove,
    getPendingApprovals,
    getMyRequests,
    getApprovalHistory,
    getRequestDetails,
    getApprovalStats
  }
}

// 勤怠記録の承認リクエスト作成ヘルパー
export const createTimeRecordApproval = (
  createApprovalRequest: ReturnType<typeof useApprovalSystem>['createApprovalRequest'],
  timeRecord: TimeRecord,
  reason: string
) => {
  return createApprovalRequest({
    type: 'time_record',
    requesterId: timeRecord.staffId,
    title: '勤怠記録の承認申請',
    description: `${timeRecord.date}の勤怠記録について承認をお願いします。`,
    data: timeRecord,
    priority: 'medium'
  })
}

// 残業申請の承認リクエスト作成ヘルパー
export const createOvertimeApproval = (
  createApprovalRequest: ReturnType<typeof useApprovalSystem>['createApprovalRequest'],
  requesterId: string,
  date: string,
  hours: number,
  reason: string
) => {
  return createApprovalRequest({
    type: 'overtime_request',
    requesterId,
    title: '残業申請',
    description: `${date}に${hours}時間の残業申請をします。理由: ${reason}`,
    data: { date, hours, reason },
    priority: hours > 3 ? 'high' : 'medium'
  })
}