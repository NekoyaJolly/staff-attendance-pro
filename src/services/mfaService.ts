/**
 * 多要素認証サービス
 * SMS認証とTOTPアプリ認証をサポート
 */

export interface MFASetupResponse {
  secret: string
  qrCode: string
  backupCodes: string[]
}

export interface VerificationResult {
  success: boolean
  error?: string
}

export class MFAService {
  /**
   * TOTP秘密鍵を生成
   */
  static generateTOTPSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
    let secret = ''
    for (let i = 0; i < 32; i++) {
      secret += chars[Math.floor(Math.random() * chars.length)]
    }
    return secret
  }

  /**
   * QRコード用のURIを生成
   */
  static generateQRCodeURI(secret: string, userEmail: string, serviceName: string = '勤怠管理システム'): string {
    const encodedService = encodeURIComponent(serviceName)
    const encodedEmail = encodeURIComponent(userEmail)
    return `otpauth://totp/${encodedService}:${encodedEmail}?secret=${secret}&issuer=${encodedService}`
  }

  /**
   * バックアップコードを生成
   */
  static generateBackupCodes(): string[] {
    const codes: string[] = []
    for (let i = 0; i < 10; i++) {
      const code = Math.random().toString(36).substr(2, 8).toUpperCase()
      codes.push(code)
    }
    return codes
  }

  /**
   * TOTP認証コードを生成（検証用）
   */
  static generateTOTPCode(secret: string, timeStep: number = Math.floor(Date.now() / 30000)): string {
    // 簡易TOTP実装（実際のプロダクションでは専用ライブラリを使用）
    const key = this.base32ToBytes(secret)
    const time = new ArrayBuffer(8)
    const timeView = new DataView(time)
    timeView.setUint32(4, timeStep, false)
    
    // HMAC-SHA1の簡易実装
    const hash = this.hmacSHA1(key, new Uint8Array(time))
    const offset = hash[hash.length - 1] & 0xf
    const code = ((hash[offset] & 0x7f) << 24) |
                 ((hash[offset + 1] & 0xff) << 16) |
                 ((hash[offset + 2] & 0xff) << 8) |
                 (hash[offset + 3] & 0xff)
    
    return (code % 1000000).toString().padStart(6, '0')
  }

  /**
   * TOTPコードを検証
   */
  static verifyTOTPCode(secret: string, inputCode: string): boolean {
    const currentTime = Math.floor(Date.now() / 30000)
    
    // 時刻のずれを考慮して前後1ステップも検証
    for (let i = -1; i <= 1; i++) {
      const expectedCode = this.generateTOTPCode(secret, currentTime + i)
      if (expectedCode === inputCode) {
        return true
      }
    }
    return false
  }

  /**
   * SMS認証コードを送信（シミュレーション）
   */
  static async sendSMSCode(phoneNumber: string): Promise<string> {
    // 実際の実装ではSMS APIを使用
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    
    // シミュレーション用の遅延
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    console.log(`SMS sent to ${phoneNumber}: ${code}`)
    
    // 開発用：コードをローカルストレージに保存
    localStorage.setItem(`sms_code_${phoneNumber}`, code)
    localStorage.setItem(`sms_code_timestamp_${phoneNumber}`, Date.now().toString())
    
    return code
  }

  /**
   * SMS認証コードを検証
   */
  static verifySMSCode(phoneNumber: string, inputCode: string): boolean {
    const storedCode = localStorage.getItem(`sms_code_${phoneNumber}`)
    const timestamp = localStorage.getItem(`sms_code_timestamp_${phoneNumber}`)
    
    if (!storedCode || !timestamp) {
      return false
    }
    
    // 5分以内のコードのみ有効
    const codeAge = Date.now() - parseInt(timestamp)
    if (codeAge > 5 * 60 * 1000) {
      localStorage.removeItem(`sms_code_${phoneNumber}`)
      localStorage.removeItem(`sms_code_timestamp_${phoneNumber}`)
      return false
    }
    
    const isValid = storedCode === inputCode
    if (isValid) {
      // 使用済みコードを削除
      localStorage.removeItem(`sms_code_${phoneNumber}`)
      localStorage.removeItem(`sms_code_timestamp_${phoneNumber}`)
    }
    
    return isValid
  }

  /**
   * バックアップコードを検証
   */
  static verifyBackupCode(backupCodes: string[], inputCode: string): { valid: boolean; remainingCodes: string[] } {
    const index = backupCodes.indexOf(inputCode.toUpperCase())
    if (index !== -1) {
      const remainingCodes = [...backupCodes]
      remainingCodes.splice(index, 1)
      return { valid: true, remainingCodes }
    }
    return { valid: false, remainingCodes: backupCodes }
  }

  // ユーティリティ関数
  private static base32ToBytes(base32: string): Uint8Array {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
    const bytes: number[] = []
    let bits = 0
    let value = 0
    
    for (const char of base32) {
      const index = alphabet.indexOf(char.toUpperCase())
      if (index === -1) continue
      
      value = (value << 5) | index
      bits += 5
      
      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 255)
        bits -= 8
      }
    }
    
    return new Uint8Array(bytes)
  }

  private static hmacSHA1(key: Uint8Array, data: Uint8Array): Uint8Array {
    // 簡易HMAC-SHA1実装（実際のプロダクションでは専用ライブラリを使用）
    // この実装は学習用であり、セキュリティ要件を満たさない可能性があります
    
    const blockSize = 64
    let adjustedKey = new Uint8Array(blockSize)
    
    if (key.length > blockSize) {
      // キーがブロックサイズより大きい場合はハッシュ化
      adjustedKey.set(this.sha1(key))
    } else {
      adjustedKey.set(key)
    }
    
    const ipad = new Uint8Array(blockSize)
    const opad = new Uint8Array(blockSize)
    
    for (let i = 0; i < blockSize; i++) {
      ipad[i] = adjustedKey[i] ^ 0x36
      opad[i] = adjustedKey[i] ^ 0x5C
    }
    
    const innerData = new Uint8Array(ipad.length + data.length)
    innerData.set(ipad)
    innerData.set(data, ipad.length)
    
    const innerHash = this.sha1(innerData)
    
    const outerData = new Uint8Array(opad.length + innerHash.length)
    outerData.set(opad)
    outerData.set(innerHash, opad.length)
    
    return this.sha1(outerData)
  }

  private static sha1(data: Uint8Array): Uint8Array {
    // 簡易SHA1実装（実際のプロダクションでは専用ライブラリを使用）
    // この実装は学習用であり、セキュリティ要件を満たさない可能性があります
    
    const h = [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0]
    
    const message = new Uint8Array(data.length + 9 + (64 - ((data.length + 9) % 64)) % 64)
    message.set(data)
    message[data.length] = 0x80
    
    const lengthBits = data.length * 8
    const view = new DataView(message.buffer)
    view.setUint32(message.length - 4, lengthBits & 0xFFFFFFFF, false)
    view.setUint32(message.length - 8, (lengthBits >>> 32) & 0xFFFFFFFF, false)
    
    for (let i = 0; i < message.length; i += 64) {
      const w = new Array(80)
      
      for (let j = 0; j < 16; j++) {
        w[j] = view.getUint32(i + j * 4, false)
      }
      
      for (let j = 16; j < 80; j++) {
        w[j] = this.rotateLeft(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1)
      }
      
      let [a, b, c, d, e] = h
      
      for (let j = 0; j < 80; j++) {
        let f, k
        if (j < 20) {
          f = (b & c) | (~b & d)
          k = 0x5A827999
        } else if (j < 40) {
          f = b ^ c ^ d
          k = 0x6ED9EBA1
        } else if (j < 60) {
          f = (b & c) | (b & d) | (c & d)
          k = 0x8F1BBCDC
        } else {
          f = b ^ c ^ d
          k = 0xCA62C1D6
        }
        
        const temp = (this.rotateLeft(a, 5) + f + e + k + w[j]) & 0xFFFFFFFF
        e = d
        d = c
        c = this.rotateLeft(b, 30)
        b = a
        a = temp
      }
      
      h[0] = (h[0] + a) & 0xFFFFFFFF
      h[1] = (h[1] + b) & 0xFFFFFFFF
      h[2] = (h[2] + c) & 0xFFFFFFFF
      h[3] = (h[3] + d) & 0xFFFFFFFF
      h[4] = (h[4] + e) & 0xFFFFFFFF
    }
    
    const result = new Uint8Array(20)
    const resultView = new DataView(result.buffer)
    for (let i = 0; i < 5; i++) {
      resultView.setUint32(i * 4, h[i], false)
    }
    
    return result
  }

  private static rotateLeft(value: number, amount: number): number {
    return ((value << amount) | (value >>> (32 - amount))) & 0xFFFFFFFF
  }
}