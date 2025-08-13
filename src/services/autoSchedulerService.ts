import { PaidLeaveService } from './paidLeaveService'
import { User, PayrollInfo, PaidLeaveAlert } from '../App'

/**
 * 自動スケジューラサービス
 * 定期的なタスクの実行を管理
 */
export class AutoSchedulerService {
  private static intervals: Map<string, NodeJS.Timeout> = new Map()

  /**
   * 毎日実行される有給チェック
   */
  static startDailyPaidLeaveCheck(
    getUserList: () => Promise<User[]>,
    getPayrollInfo: (staffId: string) => Promise<PayrollInfo>,
    updatePayrollInfo: (staffId: string, info: PayrollInfo) => Promise<void>,
    addAlert: (alert: PaidLeaveAlert) => Promise<void>
  ): void {
    const intervalId = setInterval(async () => {
      try {
        console.log('Daily paid leave check started...')
        const now = new Date()
        
        // 毎日午前9時に実行
        if (now.getHours() === 9 && now.getMinutes() === 0) {
          const staff = await getUserList()
          
          for (const user of staff) {
            try {
              let payrollInfo = await getPayrollInfo(user.id)
              
              // 期限切れ有給の削除
              const updatedInfo = PaidLeaveService.removeExpiredPaidLeave(payrollInfo)
              if (updatedInfo.remainingPaidLeave !== payrollInfo.remainingPaidLeave) {
                await updatePayrollInfo(user.id, updatedInfo)
                payrollInfo = updatedInfo
              }
              
              // アラートの生成
              const alerts = PaidLeaveService.generateAlerts(user, payrollInfo)
              for (const alert of alerts) {
                await addAlert(alert)
              }
            } catch (error) {
              console.error(`Error processing daily check for staff ${user.id}:`, error)
            }
          }
          
          console.log('Daily paid leave check completed')
        }
      } catch (error) {
        console.error('Error in daily paid leave check:', error)
      }
    }, 60000) // 1分ごとにチェック（実際の時刻を確認）

    this.intervals.set('dailyPaidLeaveCheck', intervalId)
  }

  /**
   * 月次メンテナンス（毎月1日に実行）
   */
  static startMonthlyMaintenance(
    getUserList: () => Promise<User[]>,
    getPayrollInfo: (staffId: string) => Promise<PayrollInfo>,
    updatePayrollInfo: (staffId: string, info: PayrollInfo) => Promise<void>,
    addAlert: (alert: PaidLeaveAlert) => Promise<void>
  ): void {
    const intervalId = setInterval(async () => {
      try {
        const now = new Date()
        
        // 毎月1日の午前10時に実行
        if (now.getDate() === 1 && now.getHours() === 10 && now.getMinutes() === 0) {
          console.log('Monthly maintenance started...')
          
          const staff = await getUserList()
          await PaidLeaveService.runMonthlyMaintenance(
            staff,
            getPayrollInfo,
            updatePayrollInfo,
            addAlert
          )
          
          console.log('Monthly maintenance completed')
        }
      } catch (error) {
        console.error('Error in monthly maintenance:', error)
      }
    }, 60000) // 1分ごとにチェック

    this.intervals.set('monthlyMaintenance', intervalId)
  }

  /**
   * 年度開始時の有給付与（4月1日）
   */
  static startYearlyPaidLeaveGrant(
    getUserList: () => Promise<User[]>,
    getPayrollInfo: (staffId: string) => Promise<PayrollInfo>,
    updatePayrollInfo: (staffId: string, info: PayrollInfo) => Promise<void>,
    addAlert: (alert: PaidLeaveAlert) => Promise<void>
  ): void {
    const intervalId = setInterval(async () => {
      try {
        const now = new Date()
        
        // 4月1日の午前8時に実行
        if (now.getMonth() === 3 && now.getDate() === 1 && now.getHours() === 8 && now.getMinutes() === 0) {
          console.log('Yearly paid leave grant started...')
          
          const staff = await getUserList()
          
          for (const user of staff) {
            try {
              const payrollInfo = await getPayrollInfo(user.id)
              
              if (PaidLeaveService.shouldGrantPaidLeave(payrollInfo)) {
                const updatedInfo = PaidLeaveService.grantPaidLeave(payrollInfo)
                await updatePayrollInfo(user.id, updatedInfo)
                
                // 付与通知アラート
                const grantAlert: PaidLeaveAlert = {
                  id: `yearly-grant-${user.id}-${Date.now()}`,
                  staffId: user.id,
                  type: 'grant_available',
                  message: `年度開始に伴い、${updatedInfo.totalPaidLeave}日の有給休暇を付与しました`,
                  severity: 'info',
                  createdAt: new Date().toISOString(),
                  dismissed: false
                }
                
                await addAlert(grantAlert)
              }
            } catch (error) {
              console.error(`Error processing yearly grant for staff ${user.id}:`, error)
            }
          }
          
          console.log('Yearly paid leave grant completed')
        }
      } catch (error) {
        console.error('Error in yearly paid leave grant:', error)
      }
    }, 60000) // 1分ごとにチェック

    this.intervals.set('yearlyPaidLeaveGrant', intervalId)
  }

  /**
   * 期限間近アラート（毎週実行）
   */
  static startWeeklyExpiryAlert(
    getUserList: () => Promise<User[]>,
    getPayrollInfo: (staffId: string) => Promise<PayrollInfo>,
    addAlert: (alert: PaidLeaveAlert) => Promise<void>
  ): void {
    const intervalId = setInterval(async () => {
      try {
        const now = new Date()
        
        // 毎週月曜日の午前9時に実行
        if (now.getDay() === 1 && now.getHours() === 9 && now.getMinutes() === 0) {
          console.log('Weekly expiry alert check started...')
          
          const staff = await getUserList()
          
          for (const user of staff) {
            try {
              const payrollInfo = await getPayrollInfo(user.id)
              const expiryDate = new Date(payrollInfo.paidLeaveExpiry)
              const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
              
              // 30日前と7日前にアラート
              if ((daysUntilExpiry === 30 || daysUntilExpiry === 7) && payrollInfo.remainingPaidLeave > 0) {
                const urgencyLevel = daysUntilExpiry <= 7 ? 'error' : 'warning'
                const message = daysUntilExpiry <= 7 
                  ? `有給休暇があと${daysUntilExpiry}日で期限切れになります！至急使用してください`
                  : `有給休暇があと${daysUntilExpiry}日で期限切れになります。計画的に使用してください`
                
                const expiryAlert: PaidLeaveAlert = {
                  id: `weekly-expiry-${user.id}-${daysUntilExpiry}-${Date.now()}`,
                  staffId: user.id,
                  type: 'expiry_warning',
                  message,
                  severity: urgencyLevel,
                  createdAt: new Date().toISOString(),
                  dismissed: false
                }
                
                await addAlert(expiryAlert)
              }
            } catch (error) {
              console.error(`Error processing weekly expiry alert for staff ${user.id}:`, error)
            }
          }
          
          console.log('Weekly expiry alert check completed')
        }
      } catch (error) {
        console.error('Error in weekly expiry alert:', error)
      }
    }, 60000) // 1分ごとにチェック

    this.intervals.set('weeklyExpiryAlert', intervalId)
  }

  /**
   * 全自動スケジューラーを開始
   */
  static startAllSchedulers(
    getUserList: () => Promise<User[]>,
    getPayrollInfo: (staffId: string) => Promise<PayrollInfo>,
    updatePayrollInfo: (staffId: string, info: PayrollInfo) => Promise<void>,
    addAlert: (alert: PaidLeaveAlert) => Promise<void>
  ): void {
    this.startDailyPaidLeaveCheck(getUserList, getPayrollInfo, updatePayrollInfo, addAlert)
    this.startMonthlyMaintenance(getUserList, getPayrollInfo, updatePayrollInfo, addAlert)
    this.startYearlyPaidLeaveGrant(getUserList, getPayrollInfo, updatePayrollInfo, addAlert)
    this.startWeeklyExpiryAlert(getUserList, getPayrollInfo, addAlert)
    
    console.log('All paid leave schedulers started')
  }

  /**
   * 指定したスケジューラーを停止
   */
  static stopScheduler(name: string): void {
    const intervalId = this.intervals.get(name)
    if (intervalId) {
      clearInterval(intervalId)
      this.intervals.delete(name)
      console.log(`Scheduler ${name} stopped`)
    }
  }

  /**
   * 全スケジューラーを停止
   */
  static stopAllSchedulers(): void {
    for (const [name, intervalId] of this.intervals) {
      clearInterval(intervalId)
    }
    this.intervals.clear()
    console.log('All schedulers stopped')
  }

  /**
   * 動作中のスケジューラー一覧を取得
   */
  static getActiveSchedulers(): string[] {
    return Array.from(this.intervals.keys())
  }
}