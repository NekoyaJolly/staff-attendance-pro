import { PayrollInfo, PaidLeaveAlert, User } from '../App'

/**
 * 有給休暇管理サービス
 * 自動更新、アラート機能を提供
 */
export class PaidLeaveService {
  /**
   * 勤続年数に基づく年間有給付与日数を計算
   */
  static calculateAnnualPaidLeave(workStartDate: string): number {
    const startDate = new Date(workStartDate)
    const now = new Date()
    const yearsWorked = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    
    // 労働基準法に基づく有給付与日数
    if (yearsWorked < 0.5) return 0
    if (yearsWorked < 1.5) return 10
    if (yearsWorked < 2.5) return 11
    if (yearsWorked < 3.5) return 12
    if (yearsWorked < 4.5) return 14
    if (yearsWorked < 5.5) return 16
    if (yearsWorked < 6.5) return 18
    return 20 // 6.5年以上
  }

  /**
   * 有給の有効期限を計算（付与から2年）
   */
  static calculateExpiryDate(grantDate: string): string {
    const grant = new Date(grantDate)
    grant.setFullYear(grant.getFullYear() + 2)
    return grant.toISOString().split('T')[0]
  }

  /**
   * 年度開始時の有給付与が必要かチェック
   */
  static shouldGrantPaidLeave(payrollInfo: PayrollInfo): boolean {
    const lastGrant = new Date(payrollInfo.lastGrantDate)
    const now = new Date()
    const workStart = new Date(payrollInfo.workStartDate)
    
    // 入社から6ヶ月経過している必要がある
    const sixMonthsAfterStart = new Date(workStart)
    sixMonthsAfterStart.setMonth(sixMonthsAfterStart.getMonth() + 6)
    
    if (now < sixMonthsAfterStart) return false
    
    // 最後の付与から1年経過していればtrue
    const oneYearAfterGrant = new Date(lastGrant)
    oneYearAfterGrant.setFullYear(oneYearAfterGrant.getFullYear() + 1)
    
    return now >= oneYearAfterGrant
  }

  /**
   * 有給の自動付与処理
   */
  static grantPaidLeave(payrollInfo: PayrollInfo): PayrollInfo {
    const newTotalDays = this.calculateAnnualPaidLeave(payrollInfo.workStartDate)
    const grantDate = new Date().toISOString().split('T')[0]
    
    return {
      ...payrollInfo,
      totalPaidLeave: newTotalDays,
      remainingPaidLeave: payrollInfo.remainingPaidLeave + newTotalDays,
      lastGrantDate: grantDate,
      paidLeaveExpiry: this.calculateExpiryDate(grantDate)
    }
  }

  /**
   * 有給使用時の残日数更新
   */
  static consumePaidLeave(payrollInfo: PayrollInfo, daysUsed: number): PayrollInfo {
    return {
      ...payrollInfo,
      remainingPaidLeave: Math.max(0, payrollInfo.remainingPaidLeave - daysUsed),
      usedPaidLeave: payrollInfo.usedPaidLeave + daysUsed
    }
  }

  /**
   * アラートを生成
   */
  static generateAlerts(staff: User, payrollInfo: PayrollInfo): PaidLeaveAlert[] {
    const alerts: PaidLeaveAlert[] = []
    const now = new Date()
    const expiryDate = new Date(payrollInfo.paidLeaveExpiry)
    const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    // 有効期限切れ警告（30日前、7日前）
    if (daysUntilExpiry <= 30 && daysUntilExpiry > 7 && payrollInfo.remainingPaidLeave > 0) {
      alerts.push({
        id: `expiry-${staff.id}-${Date.now()}`,
        staffId: staff.id,
        type: 'expiry_warning',
        message: `有給休暇が${daysUntilExpiry}日後に期限切れになります（残り${payrollInfo.remainingPaidLeave}日）`,
        severity: 'warning',
        createdAt: new Date().toISOString(),
        dismissed: false
      })
    }
    
    if (daysUntilExpiry <= 7 && daysUntilExpiry >= 0 && payrollInfo.remainingPaidLeave > 0) {
      alerts.push({
        id: `expiry-urgent-${staff.id}-${Date.now()}`,
        staffId: staff.id,
        type: 'expiry_warning',
        message: `有給休暇が${daysUntilExpiry}日後に期限切れになります！早急に使用してください（残り${payrollInfo.remainingPaidLeave}日）`,
        severity: 'error',
        createdAt: new Date().toISOString(),
        dismissed: false
      })
    }
    
    // 残日数少数警告
    if (payrollInfo.remainingPaidLeave <= 3 && payrollInfo.remainingPaidLeave > 0) {
      alerts.push({
        id: `low-balance-${staff.id}-${Date.now()}`,
        staffId: staff.id,
        type: 'low_balance',
        message: `有給休暇の残日数が少なくなっています（残り${payrollInfo.remainingPaidLeave}日）`,
        severity: 'warning',
        createdAt: new Date().toISOString(),
        dismissed: false
      })
    }
    
    // 新規付与可能通知
    if (this.shouldGrantPaidLeave(payrollInfo)) {
      const newDays = this.calculateAnnualPaidLeave(payrollInfo.workStartDate)
      alerts.push({
        id: `grant-available-${staff.id}-${Date.now()}`,
        staffId: staff.id,
        type: 'grant_available',
        message: `新たに${newDays}日の有給休暇を付与できます`,
        severity: 'info',
        createdAt: new Date().toISOString(),
        dismissed: false
      })
    }
    
    return alerts
  }

  /**
   * 期限切れ有給の自動削除
   */
  static removeExpiredPaidLeave(payrollInfo: PayrollInfo): PayrollInfo {
    const now = new Date()
    const expiryDate = new Date(payrollInfo.paidLeaveExpiry)
    
    if (now > expiryDate) {
      return {
        ...payrollInfo,
        remainingPaidLeave: 0,
        paidLeaveExpiry: this.calculateExpiryDate(new Date().toISOString().split('T')[0])
      }
    }
    
    return payrollInfo
  }

  /**
   * 月次バッチ処理（全スタッフの有給状況チェック）
   */
  static async runMonthlyMaintenance(
    staffList: User[],
    getPayrollInfo: (staffId: string) => Promise<PayrollInfo>,
    updatePayrollInfo: (staffId: string, info: PayrollInfo) => Promise<void>,
    addAlert: (alert: PaidLeaveAlert) => Promise<void>
  ): Promise<void> {
    for (const staff of staffList) {
      try {
        let payrollInfo = await getPayrollInfo(staff.id)
        
        // 期限切れ有給の削除
        payrollInfo = this.removeExpiredPaidLeave(payrollInfo)
        
        // 新規付与の実行
        if (this.shouldGrantPaidLeave(payrollInfo)) {
          payrollInfo = this.grantPaidLeave(payrollInfo)
        }
        
        // アラートの生成
        const alerts = this.generateAlerts(staff, payrollInfo)
        for (const alert of alerts) {
          await addAlert(alert)
        }
        
        await updatePayrollInfo(staff.id, payrollInfo)
      } catch (error) {
        console.error(`Error processing paid leave for staff ${staff.id}:`, error)
      }
    }
  }
}