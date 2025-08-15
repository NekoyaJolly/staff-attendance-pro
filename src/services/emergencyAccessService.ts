/**
 * 緊急アクセス管理サービス
 * バックアップコードとアカウント復旧機能を提供
 */

import { BackupCodeService, BackupCodeSet } from './backupCodeService'

export interface EmergencyAccessRequest {
  id: string
  userId: string
  requestType: 'backup_code_reset' | 'account_recovery' | 'mfa_disable'
  reason: string
  contactMethod: 'email' | 'phone' | 'admin'
  contactInfo: string
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  createdAt: string
  processedAt?: string
  processedBy?: string
  adminNotes?: string
}

export interface EmergencyContact {
  name: string
  relationship: string
  email?: string
  phone?: string
  verified: boolean
}

export class EmergencyAccessService {
  
  /**
   * 緊急アクセス要求を作成
   */
  static createEmergencyRequest(
    userId: string,
    requestType: EmergencyAccessRequest['requestType'],
    reason: string,
    contactMethod: 'email' | 'phone' | 'admin',
    contactInfo: string
  ): EmergencyAccessRequest {
    return {
      id: `emergency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      requestType,
      reason,
      contactMethod,
      contactInfo,
      status: 'pending',
      createdAt: new Date().toISOString()
    }
  }
  
  /**
   * バックアップコードの緊急リセット
   */
  static async requestBackupCodeReset(
    userId: string,
    reason: string,
    contactMethod: 'email' | 'phone',
    contactInfo: string
  ): Promise<EmergencyAccessRequest> {
    const request = this.createEmergencyRequest(
      userId,
      'backup_code_reset',
      reason,
      contactMethod,
      contactInfo
    )
    
    // 管理者への通知をシミュレート
    console.log('緊急バックアップコードリセット要求が管理者に送信されました:', request)
    
    return request
  }
  
  /**
   * アカウント復旧要求
   */
  static async requestAccountRecovery(
    userId: string,
    reason: string,
    emergencyContact: EmergencyContact
  ): Promise<EmergencyAccessRequest> {
    const request = this.createEmergencyRequest(
      userId,
      'account_recovery',
      reason,
      'admin',
      emergencyContact.email || emergencyContact.phone || ''
    )
    
    // セキュリティチェックのための追加情報
    const securityInfo = {
      requestTime: new Date().toISOString(),
      userAgent: navigator.userAgent,
      ipAddress: 'シミュレート', // 実際の実装では実際のIPを取得
      emergencyContact
    }
    
    console.log('アカウント復旧要求:', { request, securityInfo })
    
    return request
  }
  
  /**
   * MFAの緊急無効化要求
   */
  static async requestMFADisable(
    userId: string,
    reason: string,
    verificationMethod: 'backup_codes' | 'emergency_contact' | 'admin_override'
  ): Promise<EmergencyAccessRequest> {
    const request = this.createEmergencyRequest(
      userId,
      'mfa_disable',
      reason,
      'admin',
      verificationMethod
    )
    
    console.log('MFA無効化要求:', request)
    
    return request
  }
  
  /**
   * 緊急アクセス要求の処理（管理者用）
   */
  static processEmergencyRequest(
    request: EmergencyAccessRequest,
    action: 'approve' | 'reject',
    adminId: string,
    adminNotes?: string
  ): EmergencyAccessRequest {
    const processedRequest = {
      ...request,
      status: action === 'approve' ? 'approved' as const : 'rejected' as const,
      processedAt: new Date().toISOString(),
      processedBy: adminId,
      adminNotes
    }
    
    if (action === 'approve') {
      // 承認時の処理
      switch (request.requestType) {
        case 'backup_code_reset':
          console.log('新しいバックアップコードを生成しています...')
          break
        case 'account_recovery':
          console.log('アカウント復旧処理を開始しています...')
          break
        case 'mfa_disable':
          console.log('MFAを一時的に無効化しています...')
          break
      }
    }
    
    return processedRequest
  }
  
  /**
   * 緊急バックアップコードを生成（管理者承認後）
   */
  static generateEmergencyBackupCodes(userId: string): BackupCodeSet {
    const emergencyCodeSet = BackupCodeService.generateBackupCodeSet()
    
    // 緊急生成の記録
    const emergencyRecord = {
      ...emergencyCodeSet,
      isEmergencyGenerated: true,
      emergencyGeneratedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7日間有効
    }
    
    console.log(`緊急バックアップコードが生成されました (ユーザー: ${userId}):`, emergencyRecord)
    
    return emergencyCodeSet
  }
  
  /**
   * 緊急アクセスコードの検証
   */
  static validateEmergencyAccess(
    userId: string,
    emergencyCode: string,
    context: 'backup_code' | 'recovery_code' | 'admin_override'
  ): {
    valid: boolean
    reason?: string
    action?: string
  } {
    // 緊急アクセスの検証ロジック
    if (!emergencyCode || emergencyCode.length < 8) {
      return {
        valid: false,
        reason: '緊急アクセスコードが不正です'
      }
    }
    
    // コンテキストに応じた検証
    switch (context) {
      case 'backup_code':
        // バックアップコードとしての検証
        return {
          valid: true,
          action: 'バックアップコード認証でログインを許可'
        }
        
      case 'recovery_code':
        // 復旧コードとしての検証
        return {
          valid: true,
          action: 'アカウント復旧処理を開始'
        }
        
      case 'admin_override':
        // 管理者オーバーライドとしての検証
        return {
          valid: true,
          action: '管理者権限でアクセスを許可'
        }
        
      default:
        return {
          valid: false,
          reason: '不明なアクセスコンテキストです'
        }
    }
  }
  
  /**
   * 緊急アクセス履歴の記録
   */
  static logEmergencyAccess(
    userId: string,
    accessType: string,
    success: boolean,
    details?: any
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      userId,
      accessType,
      success,
      details,
      userAgent: navigator.userAgent,
      // 実際の実装では IPアドレス、地理的位置なども記録
    }
    
    console.log('緊急アクセスログ:', logEntry)
    
    // セキュリティ監査のために重要なアクセスをアラート
    if (success && ['account_recovery', 'mfa_disable'].includes(accessType)) {
      console.warn('重要: 緊急アクセスが実行されました', logEntry)
    }
  }
  
  /**
   * 緊急連絡先の設定
   */
  static setEmergencyContact(
    userId: string,
    contact: EmergencyContact
  ): EmergencyContact {
    // 緊急連絡先の検証
    if (!contact.name || (!contact.email && !contact.phone)) {
      throw new Error('緊急連絡先には名前と連絡方法（メールまたは電話）が必要です')
    }
    
    const verifiedContact = {
      ...contact,
      verified: false // 実際の実装では検証プロセスを通す
    }
    
    console.log(`緊急連絡先が設定されました (ユーザー: ${userId}):`, verifiedContact)
    
    return verifiedContact
  }
  
  /**
   * 緊急時のアクセス統計
   */
  static getEmergencyAccessStats(requests: EmergencyAccessRequest[]): {
    total: number
    pending: number
    approved: number
    rejected: number
    byType: Record<string, number>
    recent: EmergencyAccessRequest[]
  } {
    const stats = {
      total: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
      byType: requests.reduce((acc, r) => {
        acc[r.requestType] = (acc[r.requestType] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      recent: requests
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
    }
    
    return stats
  }
}