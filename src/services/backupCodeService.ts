/**
 * バックアップコードサービス
 * 緊急時のアクセス手段を提供
 */

export interface BackupCodeSet {
  codes: string[]
  createdAt: string
  usedCodes: string[]
  lastUsed?: string
}

export interface BackupCodeValidationResult {
  valid: boolean
  remainingCodes: string[]
  usedCodes: string[]
  message?: string
}

export class BackupCodeService {
  
  /**
   * 新しいバックアップコードセットを生成
   */
  static generateBackupCodeSet(): BackupCodeSet {
    const codes: string[] = []
    
    // 10個のユニークなバックアップコードを生成
    for (let i = 0; i < 10; i++) {
      let code: string
      do {
        code = this.generateSingleCode()
      } while (codes.includes(code))
      
      codes.push(code)
    }
    
    return {
      codes,
      createdAt: new Date().toISOString(),
      usedCodes: [],
      lastUsed: undefined
    }
  }
  
  /**
   * 単一のバックアップコードを生成
   */
  private static generateSingleCode(): string {
    // 8文字の英数字コード（0, O, I, l を除外して視認性を向上）
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
    let code = ''
    
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)]
    }
    
    // ハイフンで区切って読みやすく
    return `${code.slice(0, 4)}-${code.slice(4, 8)}`
  }
  
  /**
   * バックアップコードを検証して使用済みにマーク
   */
  static validateAndUseBackupCode(
    codeSet: BackupCodeSet, 
    inputCode: string
  ): BackupCodeValidationResult {
    const normalizedInput = inputCode.trim().toUpperCase().replace(/\s+/g, '')
    
    // 既に使用済みかチェック
    if (codeSet.usedCodes.includes(normalizedInput)) {
      return {
        valid: false,
        remainingCodes: codeSet.codes.filter(code => !codeSet.usedCodes.includes(code)),
        usedCodes: codeSet.usedCodes,
        message: 'このバックアップコードは既に使用済みです'
      }
    }
    
    // 有効なコードかチェック
    const isValidCode = codeSet.codes.some(code => 
      code.replace('-', '') === normalizedInput || code === normalizedInput
    )
    
    if (!isValidCode) {
      return {
        valid: false,
        remainingCodes: codeSet.codes.filter(code => !codeSet.usedCodes.includes(code)),
        usedCodes: codeSet.usedCodes,
        message: '無効なバックアップコードです'
      }
    }
    
    // コードを使用済みとしてマーク
    const updatedUsedCodes = [...codeSet.usedCodes, normalizedInput]
    const remainingCodes = codeSet.codes.filter(code => 
      !updatedUsedCodes.includes(code) && !updatedUsedCodes.includes(code.replace('-', ''))
    )
    
    return {
      valid: true,
      remainingCodes,
      usedCodes: updatedUsedCodes,
      message: `認証成功。残り${remainingCodes.length}個のバックアップコードが利用可能です`
    }
  }
  
  /**
   * 残りのバックアップコード数を取得
   */
  static getRemainingCodeCount(codeSet: BackupCodeSet): number {
    return codeSet.codes.length - codeSet.usedCodes.length
  }
  
  /**
   * バックアップコードの期限をチェック
   */
  static isCodeSetExpired(codeSet: BackupCodeSet, expiryDays: number = 365): boolean {
    const createdDate = new Date(codeSet.createdAt)
    const expiryDate = new Date(createdDate.getTime() + expiryDays * 24 * 60 * 60 * 1000)
    return new Date() > expiryDate
  }
  
  /**
   * 新しいバックアップコードセットが必要かチェック
   */
  static needsNewCodeSet(codeSet: BackupCodeSet): boolean {
    const remainingCount = this.getRemainingCodeCount(codeSet)
    const isExpired = this.isCodeSetExpired(codeSet)
    
    // 残り3個以下、または期限切れの場合は新しいセットが必要
    return remainingCount <= 3 || isExpired
  }
  
  /**
   * バックアップコードの使用統計を取得
   */
  static getUsageStats(codeSet: BackupCodeSet): {
    total: number
    used: number
    remaining: number
    usageRate: number
    lastUsed?: string
  } {
    const total = codeSet.codes.length
    const used = codeSet.usedCodes.length
    const remaining = total - used
    const usageRate = Math.round((used / total) * 100)
    
    return {
      total,
      used,
      remaining,
      usageRate,
      lastUsed: codeSet.lastUsed
    }
  }
  
  /**
   * 表示用にバックアップコードをフォーマット
   */
  static formatCodesForDisplay(codes: string[]): string[] {
    return codes.map((code, index) => {
      const formatted = code.includes('-') ? code : `${code.slice(0, 4)}-${code.slice(4)}`
      return `${(index + 1).toString().padStart(2, '0')}. ${formatted}`
    })
  }
  
  /**
   * バックアップコードをセキュアにコピー用テキストとして生成
   */
  static generateCopyText(codes: string[], userInfo: { name: string; email: string }): string {
    const formattedCodes = this.formatCodesForDisplay(codes)
    const timestamp = new Date().toLocaleString('ja-JP')
    
    return `
勤怠管理システム - バックアップコード
生成日時: ${timestamp}
ユーザー: ${userInfo.name} (${userInfo.email})

これらのコードは一度だけ使用できます。
安全な場所に保管し、他人と共有しないでください。

${formattedCodes.join('\n')}

注意事項:
- 各コードは一度だけ使用可能です
- コードを紛失した場合は管理者にお問い合わせください  
- 定期的に新しいコードを生成することを推奨します
`.trim()
  }
  
  /**
   * バックアップコードの安全性をチェック
   */
  static validateCodeSecurity(codes: string[]): {
    isSecure: boolean
    issues: string[]
    recommendations: string[]
  } {
    const issues: string[] = []
    const recommendations: string[] = []
    
    // コード数のチェック
    if (codes.length < 8) {
      issues.push('バックアップコードの数が不足しています')
      recommendations.push('最低8個のバックアップコードを生成してください')
    }
    
    // コードの複雑性チェック
    const simplePattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/
    const hasWeakCodes = codes.some(code => !simplePattern.test(code))
    
    if (hasWeakCodes) {
      issues.push('フォーマットが不正なコードが含まれています')
      recommendations.push('標準フォーマット（XXXX-XXXX）のコードを使用してください')
    }
    
    // 重複チェック
    const uniqueCodes = new Set(codes)
    if (uniqueCodes.size !== codes.length) {
      issues.push('重複したコードが含まれています')
      recommendations.push('すべてのコードがユニークであることを確認してください')
    }
    
    return {
      isSecure: issues.length === 0,
      issues,
      recommendations
    }
  }
}