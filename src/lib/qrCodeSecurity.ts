// QRコード機能のセキュリティとエラーハンドリング

export interface QRSecurityConfig {
  maxScanRetries: number
  timeoutMs: number
  allowedLocationIds: string[]
  validationEnabled: boolean
}

export class QRCodeSecurity {
  private static config: QRSecurityConfig = {
    maxScanRetries: 3,
    timeoutMs: 30000,
    allowedLocationIds: ['main', 'staff-room', 'office', 'test'],
    validationEnabled: true
  }

  // QRコードデータの検証
  static validateQRData(data: string): { isValid: boolean; error?: string; parsed?: any } {
    try {
      const parsed = JSON.parse(data)
      
      // 必須フィールドの確認
      if (!parsed.type || parsed.type !== 'attendance-qr') {
        return { isValid: false, error: '無効なQRコードタイプです' }
      }

      if (!parsed.locationId || !parsed.locationName) {
        return { isValid: false, error: '場所情報が不足しています' }
      }

      if (!parsed.timestamp || !parsed.version) {
        return { isValid: false, error: 'QRコードメタデータが不足しています' }
      }

      // 場所IDの検証
      if (this.config.validationEnabled && !this.config.allowedLocationIds.includes(parsed.locationId)) {
        return { isValid: false, error: '許可されていない場所のQRコードです' }
      }

      // タイムスタンプの検証（24時間以内）
      const currentTime = Date.now()
      const qrTime = parsed.timestamp
      const timeDiff = currentTime - qrTime
      const maxAge = 24 * 60 * 60 * 1000 // 24時間

      if (timeDiff > maxAge) {
        return { isValid: false, error: 'QRコードの有効期限が切れています' }
      }

      return { isValid: true, parsed }
    } catch (error) {
      return { isValid: false, error: 'QRコードの解析に失敗しました' }
    }
  }

  // スキャン頻度の制限
  static scanRateLimit: Map<string, number[]> = new Map()

  static checkScanRateLimit(staffId: string): { allowed: boolean; error?: string } {
    const now = Date.now()
    const scans = this.scanRateLimit.get(staffId) || []
    
    // 1分以内のスキャンを確認
    const recentScans = scans.filter(scanTime => now - scanTime < 60000)
    
    if (recentScans.length >= 5) {
      return { allowed: false, error: 'スキャン頻度が高すぎます。1分後に再試行してください' }
    }

    // 新しいスキャンを記録
    recentScans.push(now)
    this.scanRateLimit.set(staffId, recentScans)
    
    return { allowed: true }
  }

  // 不正アクセスの検出
  static detectSuspiciousActivity(staffId: string, qrData: any): { suspicious: boolean; reason?: string } {
    const now = new Date()
    const currentHour = now.getHours()
    
    // 営業時間外のチェック（例：22時〜6時）
    if (currentHour >= 22 || currentHour < 6) {
      return { suspicious: true, reason: '営業時間外のアクセスです' }
    }

    // 短時間での出退勤チェック
    const scans = this.scanRateLimit.get(staffId) || []
    if (scans.length >= 2) {
      const lastScan = scans[scans.length - 2]
      const timeDiff = now.getTime() - lastScan
      
      if (timeDiff < 300000) { // 5分以内
        return { suspicious: true, reason: '短時間での連続アクセスです' }
      }
    }

    return { suspicious: false }
  }
}

// エラーハンドリングのためのカスタムエラークラス
export class QRCodeError extends Error {
  constructor(
    message: string,
    public code: 'CAMERA_ERROR' | 'SCAN_ERROR' | 'VALIDATION_ERROR' | 'SECURITY_ERROR' | 'NETWORK_ERROR',
    public details?: any
  ) {
    super(message)
    this.name = 'QRCodeError'
  }
}

// エラーレポート機能
export class QRErrorReporter {
  private static errors: Array<{
    timestamp: number
    error: QRCodeError
    context: any
    staffId?: string
  }> = []

  static reportError(error: QRCodeError, context: any, staffId?: string) {
    const errorReport = {
      timestamp: Date.now(),
      error,
      context,
      staffId
    }

    this.errors.push(errorReport)
    
    // 最新の100件のみ保持
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-100)
    }

    // コンソールにログ出力
    console.error('QR Code Error:', errorReport)

    // 重要なエラーの場合は管理者に通知
    if (error.code === 'SECURITY_ERROR') {
      this.notifyAdmin(errorReport)
    }
  }

  private static notifyAdmin(errorReport: any) {
    // 実際の実装では管理者への通知システムを実装
    console.warn('SECURITY ALERT:', errorReport)
  }

  static getErrorSummary() {
    const now = Date.now()
    const last24Hours = this.errors.filter(e => now - e.timestamp < 24 * 60 * 60 * 1000)
    
    const errorCounts = last24Hours.reduce((acc, { error }) => {
      acc[error.code] = (acc[error.code] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      total: last24Hours.length,
      errorCounts,
      recentErrors: this.errors.slice(-10)
    }
  }
}

// カメラAPIのラッパークラス
export class CameraManager {
  private static stream: MediaStream | null = null
  private static isInitialized = false

  static async initialize(): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.isInitialized && this.stream) {
        return { success: true }
      }

      // カメラの許可を確認
      const permission = await navigator.permissions.query({ name: 'camera' as PermissionName })
      
      if (permission.state === 'denied') {
        throw new QRCodeError(
          'カメラのアクセス許可が拒否されています',
          'CAMERA_ERROR',
          { permission: permission.state }
        )
      }

      // カメラストリームを取得
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment'
        }
      })

      this.isInitialized = true
      return { success: true }
    } catch (error) {
      const qrError = error instanceof QRCodeError ? error : new QRCodeError(
        'カメラの初期化に失敗しました',
        'CAMERA_ERROR',
        error
      )
      
      QRErrorReporter.reportError(qrError, { action: 'initialize' })
      return { success: false, error: qrError.message }
    }
  }

  static cleanup() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
    }
    this.isInitialized = false
  }

  static getStream(): MediaStream | null {
    return this.stream
  }

  static async switchCamera(facingMode: 'user' | 'environment'): Promise<{ success: boolean; error?: string }> {
    try {
      this.cleanup()
      
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode
        }
      })

      this.isInitialized = true
      return { success: true }
    } catch (error) {
      const qrError = new QRCodeError(
        'カメラの切り替えに失敗しました',
        'CAMERA_ERROR',
        error
      )
      
      QRErrorReporter.reportError(qrError, { action: 'switchCamera', facingMode })
      return { success: false, error: qrError.message }
    }
  }
}

// 高度なQRコード処理クラス
export class AdvancedQRProcessor {
  // QRコードの前処理
  static preprocessQRData(data: string): string {
    // 空白文字の除去
    let processed = data.trim()
    
    // 不正な文字の除去
    processed = processed.replace(/[^\x20-\x7E\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '')
    
    return processed
  }

  // QRコードの後処理
  static postprocessQRResult(data: string, context: any): { valid: boolean; result?: any; error?: string } {
    try {
      // 前処理
      const preprocessed = this.preprocessQRData(data)
      
      // セキュリティ検証
      const validation = QRCodeSecurity.validateQRData(preprocessed)
      if (!validation.isValid) {
        return { valid: false, error: validation.error }
      }

      // 不正アクセス検出
      if (context.staffId) {
        const suspicious = QRCodeSecurity.detectSuspiciousActivity(context.staffId, validation.parsed)
        if (suspicious.suspicious) {
          QRErrorReporter.reportError(
            new QRCodeError('不正アクセスが検出されました', 'SECURITY_ERROR', suspicious.reason),
            context,
            context.staffId
          )
          return { valid: false, error: suspicious.reason }
        }
      }

      return { valid: true, result: validation.parsed }
    } catch (error) {
      const qrError = new QRCodeError(
        'QRコードの処理に失敗しました',
        'SCAN_ERROR',
        error
      )
      
      QRErrorReporter.reportError(qrError, context, context.staffId)
      return { valid: false, error: qrError.message }
    }
  }
}