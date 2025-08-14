import { User } from '../App'

// セキュリティ関連の定数
export const SECURITY_CONFIG = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 30 * 60 * 1000, // 30分
  SESSION_TIMEOUT: 8 * 60 * 60 * 1000, // 8時間
  CSRF_TOKEN_LENGTH: 32,
  ENCRYPTION_KEY_LENGTH: 256
}

// パスワード強度チェック
export const validatePasswordStrength = (password: string): {
  isValid: boolean
  errors: string[]
} => {
  const errors: string[] = []

  if (password.length < SECURITY_CONFIG.PASSWORD_MIN_LENGTH) {
    errors.push(`パスワードは${SECURITY_CONFIG.PASSWORD_MIN_LENGTH}文字以上で入力してください`)
  }

  if (!/[a-z]/.test(password)) {
    errors.push('小文字を含む必要があります')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('大文字を含む必要があります')
  }

  if (!/\d/.test(password)) {
    errors.push('数字を含む必要があります')
  }

  if (!/[@$!%*?&]/.test(password)) {
    errors.push('特殊文字(@$!%*?&)を含む必要があります')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// 入力値サニタイゼーション
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // HTMLタグ除去
    .replace(/['"]/g, '') // クォート除去
    .replace(/javascript:/gi, '') // JavaScript URL除去
    .replace(/on\w+=/gi, '') // イベントハンドラー除去
    .trim()
}

// XSS防止用HTMLエスケープ
export const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// CSRFトークン生成
export const generateCSRFToken = (): string => {
  const array = new Uint8Array(SECURITY_CONFIG.CSRF_TOKEN_LENGTH)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

// セッション管理
interface SessionData {
  userId: string
  loginTime: number
  csrfToken: string
  lastActivity: number
}

class SessionManager {
  private sessions = new Map<string, SessionData>()

  createSession(user: User): string {
    const sessionId = this.generateSessionId()
    const csrfToken = generateCSRFToken()
    
    this.sessions.set(sessionId, {
      userId: user.id,
      loginTime: Date.now(),
      csrfToken,
      lastActivity: Date.now()
    })

    return sessionId
  }

  validateSession(sessionId: string, csrfToken?: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false

    // セッション有効期限チェック
    if (Date.now() - session.lastActivity > SECURITY_CONFIG.SESSION_TIMEOUT) {
      this.sessions.delete(sessionId)
      return false
    }

    // CSRFトークンチェック（必要な場合）
    if (csrfToken && session.csrfToken !== csrfToken) {
      return false
    }

    // 最終アクティビティ時間更新
    session.lastActivity = Date.now()
    return true
  }

  destroySession(sessionId: string): void {
    this.sessions.delete(sessionId)
  }

  private generateSessionId(): string {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }
}

export const sessionManager = new SessionManager()

// ログイン試行制限
interface LoginAttempt {
  attempts: number
  lastAttempt: number
  lockedUntil?: number
}

class LoginAttemptManager {
  private attempts = new Map<string, LoginAttempt>()

  canAttemptLogin(identifier: string): boolean {
    const attempt = this.attempts.get(identifier)
    if (!attempt) return true

    // ロックアウト期間チェック
    if (attempt.lockedUntil && Date.now() < attempt.lockedUntil) {
      return false
    }

    // ロックアウト期間が過ぎた場合、リセット
    if (attempt.lockedUntil && Date.now() >= attempt.lockedUntil) {
      this.attempts.delete(identifier)
      return true
    }

    return attempt.attempts < SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS
  }

  recordLoginAttempt(identifier: string, success: boolean): void {
    if (success) {
      this.attempts.delete(identifier)
      return
    }

    const current = this.attempts.get(identifier) || { attempts: 0, lastAttempt: 0 }
    current.attempts++
    current.lastAttempt = Date.now()

    if (current.attempts >= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS) {
      current.lockedUntil = Date.now() + SECURITY_CONFIG.LOCKOUT_DURATION
    }

    this.attempts.set(identifier, current)
  }

  getRemainingLockoutTime(identifier: string): number {
    const attempt = this.attempts.get(identifier)
    if (!attempt?.lockedUntil) return 0

    const remaining = attempt.lockedUntil - Date.now()
    return Math.max(0, remaining)
  }
}

export const loginAttemptManager = new LoginAttemptManager()

// 権限チェック
export const hasPermission = (user: User, requiredRole: User['role'] | User['role'][]): boolean => {
  const roles: User['role'][] = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
  
  // 管理者は全ての権限を持つ
  if (user.role === 'admin') return true
  
  // 作成者は staff 権限も持つ
  if (user.role === 'creator' && roles.includes('staff')) return true
  
  return roles.includes(user.role)
}

// セキュアなパスワードハッシュ化（簡易版）
export const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + 'secure_salt_2024')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// ログ記録（セキュリティイベント）
interface SecurityLog {
  timestamp: number
  userId?: string
  event: string
  ip?: string
  userAgent?: string
  details?: Record<string, any>
}

class SecurityLogger {
  private logs: SecurityLog[] = []

  log(event: string, userId?: string, details?: Record<string, any>): void {
    this.logs.push({
      timestamp: Date.now(),
      userId,
      event,
      details
    })

    // ログが多くなりすぎないよう、古いものは削除
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-500)
    }
  }

  getLogs(limit = 100): SecurityLog[] {
    return this.logs.slice(-limit)
  }

  getLogsByUser(userId: string, limit = 50): SecurityLog[] {
    return this.logs
      .filter(log => log.userId === userId)
      .slice(-limit)
  }
}

export const securityLogger = new SecurityLogger()

// データ検証ユーティリティ
export const validateData = {
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },

  phone: (phone: string): boolean => {
    const phoneRegex = /^[0-9-+().\s]+$/
    return phoneRegex.test(phone) && phone.length >= 10
  },

  staffId: (staffId: string): boolean => {
    const staffIdRegex = /^[a-zA-Z0-9]+$/
    return staffIdRegex.test(staffId) && staffId.length >= 3
  },

  date: (date: string): boolean => {
    const dateObj = new Date(date)
    return !isNaN(dateObj.getTime()) && date.match(/^\d{4}-\d{2}-\d{2}$/)
  },

  time: (time: string): boolean => {
    return time.match(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/) !== null
  }
}

// レート制限
interface RateLimit {
  count: number
  resetTime: number
}

class RateLimiter {
  private limits = new Map<string, RateLimit>()

  checkLimit(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now()
    const limit = this.limits.get(key)

    if (!limit || now > limit.resetTime) {
      this.limits.set(key, {
        count: 1,
        resetTime: now + windowMs
      })
      return true
    }

    if (limit.count >= maxRequests) {
      return false
    }

    limit.count++
    return true
  }
}

export const rateLimiter = new RateLimiter()