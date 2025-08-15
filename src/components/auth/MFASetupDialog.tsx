import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { QrCode, Shield, Smartphone, MessageSquare, Copy, CheckCircle } from '@phosphor-icons/react'
import { MFAService } from '@/services/mfaService'
import { User } from '@/App'
import { toast } from 'sonner'

interface MFASetupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User
  onMFAUpdate: (user: User) => void
}

export default function MFASetupDialog({ open, onOpenChange, user, onMFAUpdate }: MFASetupDialogProps) {
  const [step, setStep] = useState<'select' | 'sms' | 'app' | 'verify'>('select')
  const [selectedMethod, setSelectedMethod] = useState<'sms' | 'app'>('app')
  const [phoneNumber, setPhoneNumber] = useState(user.phone || '')
  const [totpSecret, setTotpSecret] = useState('')
  const [qrCodeURI, setQrCodeURI] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [verificationCode, setVerificationCode] = useState('')
  const [smsCode, setSmsCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleMethodSelect = () => {
    if (selectedMethod === 'sms') {
      setStep('sms')
    } else {
      setupTOTP()
    }
  }

  const setupTOTP = () => {
    const secret = MFAService.generateTOTPSecret()
    const qrURI = MFAService.generateQRCodeURI(secret, user.email)
    const codes = MFAService.generateBackupCodes()
    
    setTotpSecret(secret)
    setQrCodeURI(qrURI)
    setBackupCodes(codes)
    setStep('app')
  }

  const sendSMSCode = async () => {
    if (!phoneNumber) {
      setError('電話番号を入力してください')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      await MFAService.sendSMSCode(phoneNumber)
      toast.success('認証コードを送信しました')
      setStep('verify')
    } catch (err) {
      setError('SMS送信に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const verifySetup = async () => {
    setLoading(true)
    setError('')

    try {
      let isValid = false

      if (selectedMethod === 'sms') {
        isValid = MFAService.verifySMSCode(phoneNumber, smsCode)
        if (!isValid) {
          setError('認証コードが正しくありません')
          setLoading(false)
          return
        }
      } else {
        isValid = MFAService.verifyTOTPCode(totpSecret, verificationCode)
        if (!isValid) {
          setError('認証コードが正しくありません')
          setLoading(false)
          return
        }
      }

      // MFA設定を保存
      const updatedUser: User = {
        ...user,
        mfaEnabled: true,
        mfaMethod: selectedMethod,
        phone: selectedMethod === 'sms' ? phoneNumber : user.phone,
        totpSecret: selectedMethod === 'app' ? totpSecret : undefined,
        backupCodes: selectedMethod === 'app' ? backupCodes : undefined
      }

      onMFAUpdate(updatedUser)
      toast.success('多要素認証が有効になりました')
      onOpenChange(false)
      resetDialog()
      
    } catch (err) {
      setError('設定に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const resetDialog = () => {
    setStep('select')
    setSelectedMethod('app')
    setPhoneNumber(user.phone || '')
    setTotpSecret('')
    setQrCodeURI('')
    setBackupCodes([])
    setVerificationCode('')
    setSmsCode('')
    setError('')
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('クリップボードにコピーしました')
    } catch (err) {
      toast.error('コピーに失敗しました')
    }
  }

  const renderQRCode = () => {
    if (!qrCodeURI) return null

    // QRコード生成（実際の実装ではqrcode.jsなどのライブラリを使用）
    const qrSize = 200
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(qrCodeURI)}`

    return (
      <div className="flex flex-col items-center space-y-4">
        <img src={qrUrl} alt="QR Code" className="border rounded-lg" />
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            またはシークレットキーを手動で入力：
          </p>
          <div className="flex items-center space-x-2">
            <code className="bg-muted px-2 py-1 rounded text-xs">{totpSecret}</code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(totpSecret)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>多要素認証の設定</span>
          </DialogTitle>
          <DialogDescription>
            アカウントのセキュリティを強化するために多要素認証を設定します
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === 'select' && (
          <div className="space-y-4">
            <Label>認証方法を選択してください</Label>
            <RadioGroup value={selectedMethod} onValueChange={(value) => setSelectedMethod(value as 'sms' | 'app')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="app" id="app" />
                <Label htmlFor="app" className="flex items-center space-x-2 cursor-pointer">
                  <Smartphone className="h-4 w-4" />
                  <span>認証アプリ（推奨）</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sms" id="sms" />
                <Label htmlFor="sms" className="flex items-center space-x-2 cursor-pointer">
                  <MessageSquare className="h-4 w-4" />
                  <span>SMS認証</span>
                </Label>
              </div>
            </RadioGroup>
            
            {selectedMethod === 'app' && (
              <Alert>
                <QrCode className="h-4 w-4" />
                <AlertDescription>
                  Google Authenticator、Authy、1Passwordなどの認証アプリが必要です
                </AlertDescription>
              </Alert>
            )}
            
            {selectedMethod === 'sms' && (
              <Alert>
                <MessageSquare className="h-4 w-4" />
                <AlertDescription>
                  SMSで認証コードを受信するため、電話番号が必要です
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {step === 'sms' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="phone">電話番号</Label>
              <Input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="090-1234-5678"
              />
            </div>
          </div>
        )}

        {step === 'app' && (
          <div className="space-y-4">
            <div className="text-center space-y-4">
              <h4 className="font-medium">認証アプリでQRコードをスキャン</h4>
              {renderQRCode()}
              <div className="space-y-2">
                <h5 className="font-medium">バックアップコード</h5>
                <p className="text-sm text-muted-foreground">
                  認証アプリにアクセスできない場合に使用できます。安全な場所に保存してください。
                </p>
                <div className="grid grid-cols-2 gap-2 max-h-24 overflow-y-auto">
                  {backupCodes.map((code, index) => (
                    <div key={index} className="flex items-center space-x-1">
                      <code className="bg-muted px-2 py-1 rounded text-xs">{code}</code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(code)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="code">
                {selectedMethod === 'sms' ? 'SMS認証コード' : '認証アプリのコード'}
              </Label>
              <Input
                id="code"
                value={selectedMethod === 'sms' ? smsCode : verificationCode}
                onChange={(e) => selectedMethod === 'sms' 
                  ? setSmsCode(e.target.value) 
                  : setVerificationCode(e.target.value)
                }
                placeholder="123456"
                maxLength={6}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'select' && (
            <Button onClick={handleMethodSelect} disabled={loading}>
              次へ
            </Button>
          )}
          
          {step === 'sms' && (
            <>
              <Button variant="outline" onClick={() => setStep('select')}>
                戻る
              </Button>
              <Button onClick={sendSMSCode} disabled={loading || !phoneNumber}>
                {loading ? '送信中...' : 'SMS送信'}
              </Button>
            </>
          )}
          
          {step === 'app' && (
            <>
              <Button variant="outline" onClick={() => setStep('select')}>
                戻る
              </Button>
              <Button onClick={() => setStep('verify')}>
                設定完了
              </Button>
            </>
          )}
          
          {step === 'verify' && (
            <>
              <Button 
                variant="outline" 
                onClick={() => setStep(selectedMethod === 'sms' ? 'sms' : 'app')}
              >
                戻る
              </Button>
              <Button 
                onClick={verifySetup} 
                disabled={loading || (selectedMethod === 'sms' ? !smsCode : !verificationCode)}
              >
                {loading ? '確認中...' : '設定完了'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}