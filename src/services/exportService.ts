import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { User, TimeRecord, Shift } from '../App'

export interface ExportData {
  timeRecords: TimeRecord[]
  shifts: Shift[]
  users: User[]
}

// エクスポート用のユーティリティクラス
export class ExportService {
  
  // 勤怠データをエクスポート
  static async exportTimeRecords(
    timeRecords: TimeRecord[], 
    users: User[], 
    format: 'excel' | 'csv',
    dateRange?: { start: string; end: string }
  ) {
    // 日付フィルター
    let filteredRecords = timeRecords
    if (dateRange) {
      filteredRecords = timeRecords.filter(record => 
        record.date >= dateRange.start && record.date <= dateRange.end
      )
    }

    // データを整形
    const exportData = filteredRecords.map(record => {
      const user = users.find(u => u.staffId === record.staffId)
      return {
        'スタッフID': record.staffId,
        'スタッフ名': user?.name || '不明',
        '日付': new Date(record.date).toLocaleDateString('ja-JP'),
        '出勤時刻': record.clockIn || '',
        '退勤時刻': record.clockOut || '',
        '勤務時間': this.calculateWorkHours(record.clockIn, record.clockOut),
        '記録タイプ': record.type === 'auto' ? '自動' : '手動',
        '承認状況': this.getStatusText(record.status),
        '備考': record.note || ''
      }
    })

    // エクスポート実行
    const filename = `勤怠データ_${new Date().toLocaleDateString('ja-JP').replace(/\//g, '-')}`
    
    if (format === 'excel') {
      this.exportToExcel(exportData, filename)
    } else {
      this.exportToCsv(exportData, filename)
    }
  }

  // シフトデータをエクスポート
  static async exportShifts(
    shifts: Shift[], 
    users: User[], 
    format: 'excel' | 'csv',
    dateRange?: { start: string; end: string }
  ) {
    // 日付フィルター
    let filteredShifts = shifts
    if (dateRange) {
      filteredShifts = shifts.filter(shift => 
        shift.date >= dateRange.start && shift.date <= dateRange.end
      )
    }

    // データを整形
    const exportData = filteredShifts.map(shift => {
      const user = users.find(u => u.staffId === shift.staffId)
      return {
        'スタッフID': shift.staffId,
        'スタッフ名': user?.name || '不明',
        '日付': new Date(shift.date).toLocaleDateString('ja-JP'),
        '曜日': this.getWeekdayText(shift.date),
        '開始時刻': shift.startTime,
        '終了時刻': shift.endTime,
        'シフト時間': this.calculateWorkHours(shift.startTime, shift.endTime),
        'ポジション': shift.position || ''
      }
    })

    // エクスポート実行
    const filename = `シフトデータ_${new Date().toLocaleDateString('ja-JP').replace(/\//g, '-')}`
    
    if (format === 'excel') {
      this.exportToExcel(exportData, filename)
    } else {
      this.exportToCsv(exportData, filename)
    }
  }

  // スタッフデータをエクスポート
  static async exportUsers(users: User[], format: 'excel' | 'csv') {
    // データを整形
    const exportData = users.map(user => ({
      'スタッフID': user.staffId,
      'スタッフ名': user.name,
      'メールアドレス': user.email,
      '権限': this.getRoleText(user.role),
      '生年月日': user.birthDate || '',
      '住所': user.address || '',
      '電話番号': user.phone || ''
    }))

    // エクスポート実行
    const filename = `スタッフデータ_${new Date().toLocaleDateString('ja-JP').replace(/\//g, '-')}`
    
    if (format === 'excel') {
      this.exportToExcel(exportData, filename)
    } else {
      this.exportToCsv(exportData, filename)
    }
  }

  // 複合レポートをエクスポート
  static async exportSummaryReport(
    timeRecords: TimeRecord[],
    shifts: Shift[],
    users: User[],
    format: 'excel' | 'csv',
    month: { year: number; month: number }
  ) {
    const startDate = new Date(month.year, month.month - 1, 1).toISOString().split('T')[0]
    const endDate = new Date(month.year, month.month, 0).toISOString().split('T')[0]

    // 月次勤怠サマリー作成
    const summaryData = users.map(user => {
      const userTimeRecords = timeRecords.filter(record => 
        record.staffId === user.staffId && 
        record.date >= startDate && 
        record.date <= endDate &&
        record.status === 'approved'
      )

      const userShifts = shifts.filter(shift => 
        shift.staffId === user.staffId && 
        shift.date >= startDate && 
        shift.date <= endDate
      )

      const totalWorkDays = userTimeRecords.filter(record => record.clockIn && record.clockOut).length
      const totalWorkHours = userTimeRecords.reduce((total, record) => {
        if (record.clockIn && record.clockOut) {
          return total + this.calculateWorkHoursNumeric(record.clockIn, record.clockOut)
        }
        return total
      }, 0)

      const totalScheduledDays = userShifts.length
      const totalScheduledHours = userShifts.reduce((total, shift) => {
        return total + this.calculateWorkHoursNumeric(shift.startTime, shift.endTime)
      }, 0)

      return {
        'スタッフID': user.staffId,
        'スタッフ名': user.name,
        '権限': this.getRoleText(user.role),
        '出勤日数': totalWorkDays,
        '実働時間': Math.round(totalWorkHours * 10) / 10,
        'シフト日数': totalScheduledDays,
        'シフト時間': Math.round(totalScheduledHours * 10) / 10,
        '出勤率': totalScheduledDays > 0 ? Math.round((totalWorkDays / totalScheduledDays) * 100) + '%' : '0%',
        '平均勤務時間': totalWorkDays > 0 ? Math.round((totalWorkHours / totalWorkDays) * 10) / 10 : 0
      }
    })

    // エクスポート実行
    const filename = `月次レポート_${month.year}年${month.month}月_${new Date().toLocaleDateString('ja-JP').replace(/\//g, '-')}`
    
    if (format === 'excel') {
      this.exportToExcel(summaryData, filename)
    } else {
      this.exportToCsv(summaryData, filename)
    }
  }

  // Excelファイルとしてエクスポート
  private static exportToExcel(data: any[], filename: string) {
    try {
      const worksheet = XLSX.utils.json_to_sheet(data)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'データ')

      // セルの幅を自動調整
      const maxWidth = 20
      const colWidths = Object.keys(data[0] || {}).map(key => ({
        wch: Math.min(maxWidth, Math.max(10, key.length + 2))
      }))
      worksheet['!cols'] = colWidths

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      saveAs(blob, `${filename}.xlsx`)
    } catch (error) {
      console.error('Excel export error:', error)
      throw new Error('Excelファイルの生成に失敗しました')
    }
  }

  // CSVファイルとしてエクスポート
  private static exportToCsv(data: any[], filename: string) {
    try {
      const worksheet = XLSX.utils.json_to_sheet(data)
      const csvData = XLSX.utils.sheet_to_csv(worksheet)
      
      // BOM付きでUTF-8エンコーディング
      const BOM = '\uFEFF'
      const blob = new Blob([BOM + csvData], { type: 'text/csv;charset=utf-8' })
      saveAs(blob, `${filename}.csv`)
    } catch (error) {
      console.error('CSV export error:', error)
      throw new Error('CSVファイルの生成に失敗しました')
    }
  }

  // 勤務時間計算（文字列表示用）
  private static calculateWorkHours(startTime?: string, endTime?: string): string {
    if (!startTime || !endTime) return ''
    
    const start = new Date(`2000-01-01 ${startTime}`)
    const end = new Date(`2000-01-01 ${endTime}`)
    
    // 日付をまたぐ場合の処理
    if (end < start) {
      end.setDate(end.getDate() + 1)
    }
    
    const diffMs = end.getTime() - start.getTime()
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    return `${hours}時間${minutes}分`
  }

  // 勤務時間計算（数値用）
  private static calculateWorkHoursNumeric(startTime: string, endTime: string): number {
    const start = new Date(`2000-01-01 ${startTime}`)
    const end = new Date(`2000-01-01 ${endTime}`)
    
    if (end < start) {
      end.setDate(end.getDate() + 1)
    }
    
    const diffMs = end.getTime() - start.getTime()
    return diffMs / (1000 * 60 * 60) // 時間として返す
  }

  // 承認状況テキスト
  private static getStatusText(status: string): string {
    switch (status) {
      case 'approved': return '承認済み'
      case 'pending': return '承認待ち'
      case 'rejected': return '却下'
      default: return '不明'
    }
  }

  // 権限テキスト
  private static getRoleText(role: string): string {
    switch (role) {
      case 'admin': return '管理者'
      case 'creator': return '作成者'
      case 'staff': return 'スタッフ'
      default: return '不明'
    }
  }

  // 曜日テキスト
  private static getWeekdayText(dateString: string): string {
    const date = new Date(dateString)
    const weekdays = ['日', '月', '火', '水', '木', '金', '土']
    return weekdays[date.getDay()]
  }
}