import { User, TimeRecord, Shift, PayrollInfo } from '../App'

export interface ExportData {
  timeRecords: TimeRecord[]
  shifts: Shift[]
  users: User[]
  payrollInfo?: PayrollInfo[]
}

export interface ExportOptions {
  format: 'excel' | 'csv'
  dataType: 'timeRecords' | 'shifts' | 'users' | 'all'
  startDate?: string
  endDate?: string
  staffIds?: string[]
}

export class ExportService {
  // CSVエクスポート機能
  static exportToCsv(data: any[], filename: string): void {
    if (data.length === 0) {
      throw new Error('エクスポートするデータがありません')
    }

    // ヘッダー行を作成
    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header]
          // カンマやダブルクォートが含まれる場合はエスケープ
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        }).join(',')
      )
    ].join('\n')

    // BOM付きUTF-8でダウンロード（Excelでの文字化け防止）
    const bom = '\uFEFF'
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // 勤怠データのフォーマット
  static formatTimeRecordsForExport(
    timeRecords: TimeRecord[], 
    users: User[],
    startDate?: string,
    endDate?: string
  ): any[] {
    const getUserName = (staffId: string) => {
      const user = users.find(u => u.id === staffId || u.staffId === staffId)
      return user?.name || 'Unknown User'
    }

    let filteredRecords = timeRecords

    // 日付フィルタリング
    if (startDate || endDate) {
      filteredRecords = timeRecords.filter(record => {
        const recordDate = new Date(record.date)
        if (startDate && recordDate < new Date(startDate)) return false
        if (endDate && recordDate > new Date(endDate)) return false
        return true
      })
    }

    return filteredRecords.map(record => ({
      '日付': new Date(record.date).toLocaleDateString('ja-JP'),
      'スタッフ名': getUserName(record.staffId),
      'スタッフID': record.staffId,
      '出勤時刻': record.clockIn || '',
      '退勤時刻': record.clockOut || '',
      '記録方法': record.type === 'manual' ? '手動入力' : '自動記録',
      'ステータス': record.status === 'approved' ? '承認済み' : 
                    record.status === 'rejected' ? '却下' : '承認待ち',
      '備考': record.note || '',
      '勤務時間': this.calculateWorkingHours(record.clockIn, record.clockOut),
      'レコードID': record.id
    }))
  }

  // シフトデータのフォーマット
  static formatShiftsForExport(
    shifts: Shift[], 
    users: User[],
    startDate?: string,
    endDate?: string
  ): any[] {
    const getUserName = (staffId: string) => {
      const user = users.find(u => u.id === staffId || u.staffId === staffId)
      return user?.name || 'Unknown User'
    }

    let filteredShifts = shifts

    // 日付フィルタリング
    if (startDate || endDate) {
      filteredShifts = shifts.filter(shift => {
        const shiftDate = new Date(shift.date)
        if (startDate && shiftDate < new Date(startDate)) return false
        if (endDate && shiftDate > new Date(endDate)) return false
        return true
      })
    }

    return filteredShifts.map(shift => ({
      '日付': new Date(shift.date).toLocaleDateString('ja-JP'),
      'スタッフ名': getUserName(shift.staffId),
      'スタッフID': shift.staffId,
      '開始時刻': shift.startTime,
      '終了時刻': shift.endTime,
      'ポジション': shift.position || '',
      'シフト時間': this.calculateShiftHours(shift.startTime, shift.endTime),
      'シフトID': shift.id
    }))
  }

  // スタッフデータのフォーマット
  static formatUsersForExport(users: User[]): any[] {
    return users.map(user => ({
      'スタッフ名': user.name,
      'スタッフID': user.staffId,
      'メールアドレス': user.email,
      '権限': user.role === 'admin' ? '管理者' : 
             user.role === 'creator' ? '作成者' : 'スタッフ',
      '生年月日': user.birthDate || '',
      '住所': user.address || '',
      '電話番号': user.phone || '',
      'ユーザーID': user.id
    }))
  }

  // 勤務時間計算
  static calculateWorkingHours(clockIn?: string, clockOut?: string): string {
    if (!clockIn || !clockOut) return ''
    
    try {
      const startTime = new Date(`2000-01-01 ${clockIn}`)
      const endTime = new Date(`2000-01-01 ${clockOut}`)
      
      // 終了時刻が開始時刻より早い場合は翌日とみなす
      if (endTime < startTime) {
        endTime.setDate(endTime.getDate() + 1)
      }
      
      const diffMs = endTime.getTime() - startTime.getTime()
      const diffHours = diffMs / (1000 * 60 * 60)
      
      const hours = Math.floor(diffHours)
      const minutes = Math.round((diffHours - hours) * 60)
      
      return `${hours}時間${minutes}分`
    } catch (error) {
      return ''
    }
  }

  // シフト時間計算
  static calculateShiftHours(startTime: string, endTime: string): string {
    return this.calculateWorkingHours(startTime, endTime)
  }

  // Excel形式のエクスポート（簡易版）
  static exportToExcel(data: any[], filename: string): void {
    // 実際のExcelエクスポートには外部ライブラリが必要
    // ここではCSV形式でダウンロードし、ユーザーに説明を表示
    this.exportToCsv(data, filename)
    
    // Excel形式での保存方法を案内
    setTimeout(() => {
      alert(
        'CSVファイルがダウンロードされました。\n\n' +
        'Excelで開く場合：\n' +
        '1. ダウンロードしたCSVファイルをExcelで開く\n' +
        '2. データが正しく表示されない場合は「データ」タブの「テキストから列へ」を使用\n' +
        '3. 区切り文字として「カンマ」を選択'
      )
    }, 500)
  }

  // 統合エクスポート
  static async exportData(
    options: ExportOptions,
    data: ExportData
  ): Promise<void> {
    try {
      const now = new Date()
      const timestamp = now.toISOString().slice(0, 16).replace(/[:-]/g, '')
      
      let exportData: any[] = []
      let filename = ''

      switch (options.dataType) {
        case 'timeRecords':
          exportData = this.formatTimeRecordsForExport(
            data.timeRecords, 
            data.users, 
            options.startDate, 
            options.endDate
          )
          filename = `勤怠データ_${timestamp}`
          break

        case 'shifts':
          exportData = this.formatShiftsForExport(
            data.shifts, 
            data.users, 
            options.startDate, 
            options.endDate
          )
          filename = `シフトデータ_${timestamp}`
          break

        case 'users':
          exportData = this.formatUsersForExport(data.users)
          filename = `スタッフデータ_${timestamp}`
          break

        case 'all':
          // 複数のシートに分けてエクスポート
          const timeRecordsData = this.formatTimeRecordsForExport(
            data.timeRecords, 
            data.users, 
            options.startDate, 
            options.endDate
          )
          const shiftsData = this.formatShiftsForExport(
            data.shifts, 
            data.users, 
            options.startDate, 
            options.endDate
          )
          const usersData = this.formatUsersForExport(data.users)

          // 個別にエクスポート
          if (options.format === 'csv') {
            this.exportToCsv(timeRecordsData, `勤怠データ_${timestamp}`)
            setTimeout(() => this.exportToCsv(shiftsData, `シフトデータ_${timestamp}`), 1000)
            setTimeout(() => this.exportToCsv(usersData, `スタッフデータ_${timestamp}`), 2000)
          } else {
            this.exportToExcel(timeRecordsData, `勤怠データ_${timestamp}`)
            setTimeout(() => this.exportToExcel(shiftsData, `シフトデータ_${timestamp}`), 1000)
            setTimeout(() => this.exportToExcel(usersData, `スタッフデータ_${timestamp}`), 2000)
          }
          return

        default:
          throw new Error('無効なデータタイプです')
      }

      if (exportData.length === 0) {
        throw new Error('エクスポートするデータがありません')
      }

      // スタッフIDでフィルタリング
      if (options.staffIds && options.staffIds.length > 0) {
        exportData = exportData.filter(row => 
          options.staffIds!.includes(row['スタッフID'])
        )
      }

      // フォーマットに応じてエクスポート
      if (options.format === 'csv') {
        this.exportToCsv(exportData, filename)
      } else {
        this.exportToExcel(exportData, filename)
      }

    } catch (error) {
      console.error('Export error:', error)
      throw error
    }
  }

  // 月次レポート生成
  static generateMonthlyReport(
    timeRecords: TimeRecord[],
    shifts: Shift[],
    users: User[],
    year: number,
    month: number
  ): any[] {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)
    
    const monthlyData = users.map(user => {
      const userTimeRecords = timeRecords.filter(record => {
        const recordDate = new Date(record.date)
        return record.staffId === user.staffId &&
               recordDate >= startDate &&
               recordDate <= endDate &&
               record.status === 'approved'
      })

      const userShifts = shifts.filter(shift => {
        const shiftDate = new Date(shift.date)
        return shift.staffId === user.staffId &&
               shiftDate >= startDate &&
               shiftDate <= endDate
      })

      // 勤務日数計算
      const workDays = userTimeRecords.length
      
      // 総勤務時間計算
      const totalWorkingHours = userTimeRecords.reduce((total, record) => {
        if (record.clockIn && record.clockOut) {
          const hours = this.calculateWorkingHoursNumeric(record.clockIn, record.clockOut)
          return total + hours
        }
        return total
      }, 0)

      // 予定シフト時間計算
      const scheduledHours = userShifts.reduce((total, shift) => {
        const hours = this.calculateWorkingHoursNumeric(shift.startTime, shift.endTime)
        return total + hours
      }, 0)

      return {
        'スタッフ名': user.name,
        'スタッフID': user.staffId,
        '年月': `${year}年${month}月`,
        '勤務日数': workDays,
        '総勤務時間': `${Math.floor(totalWorkingHours)}時間${Math.round((totalWorkingHours % 1) * 60)}分`,
        '予定シフト時間': `${Math.floor(scheduledHours)}時間${Math.round((scheduledHours % 1) * 60)}分`,
        '勤務時間差': `${Math.floor(Math.abs(totalWorkingHours - scheduledHours))}時間${Math.round((Math.abs(totalWorkingHours - scheduledHours) % 1) * 60)}分`,
        '勤務率': scheduledHours > 0 ? `${Math.round((totalWorkingHours / scheduledHours) * 100)}%` : '0%'
      }
    })

    return monthlyData
  }

  // 数値形式の勤務時間計算
  private static calculateWorkingHoursNumeric(clockIn: string, clockOut: string): number {
    try {
      const startTime = new Date(`2000-01-01 ${clockIn}`)
      const endTime = new Date(`2000-01-01 ${clockOut}`)
      
      // 終了時刻が開始時刻より早い場合は翌日とみなす
      if (endTime < startTime) {
        endTime.setDate(endTime.getDate() + 1)
      }
      
      const diffMs = endTime.getTime() - startTime.getTime()
      return diffMs / (1000 * 60 * 60) // 時間単位で返す
    } catch (error) {
      return 0
    }
  }
}