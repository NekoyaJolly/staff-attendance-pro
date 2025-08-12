import { useEffect, useRef, useState } from 'react'
import QrScanner from 'qr-scanner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { X, RotateCcw, Shield } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { QRCodeSecurity, QRErrorReporter, QRCodeError, CameraManager, AdvancedQRProcessor } from '../../lib/qrCodeSecurity'

interface QRScannerProps {
  isOpen: boolean
  onClose: () => void
  onScanSuccess: (data: string) => void
  staffId?: string
}

export default function QRScanner({ isOpen, onClose, onScanSuccess, staffId }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<QrScanner | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasCamera, setHasCamera] = useState(true)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [scanAttempts, setScanAttempts] = useState(0)
  const [securityStatus, setSecurityStatus] = useState<'safe' | 'warning' | 'blocked'>('safe')

  useEffect(() => {
    if (isOpen && videoRef.current) {
      initializeScanner()
    }

    return () => {
      cleanupScanner()
    }
  }, [isOpen, facingMode])

  const cleanupScanner = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.stop()
        scannerRef.current.destroy()
      } catch (error) {
        console.error('Scanner cleanup error:', error)
      } finally {
        scannerRef.current = null
      }
    }
    CameraManager.cleanup()
  }

  const initializeScanner = async () => {
    if (!videoRef.current) return

    setIsLoading(true)

    try {
      // セキュリティチェック: スキャン頻度制限
      if (staffId) {
        const rateCheck = QRCodeSecurity.checkScanRateLimit(staffId)
        if (!rateCheck.allowed) {
          setSecurityStatus('blocked')
          toast.error(rateCheck.error)
          setIsLoading(false)
          return
        }
      }

      // カメラの初期化
      const cameraResult = await CameraManager.initialize()
      if (!cameraResult.success) {
        setHasCamera(false)
        toast.error(cameraResult.error || 'カメラが利用できません')
        setIsLoading(false)
        return
      }

      // Check if camera is available
      const hasCamera = await QrScanner.hasCamera()
      if (!hasCamera) {
        setHasCamera(false)
        toast.error('カメラが利用できません')
        setIsLoading(false)
        return
      }

      // Initialize scanner with enhanced error handling
      scannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          handleScanResult(result.data)
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          returnDetailedScanResult: true,
          preferredCamera: facingMode,
        }
      )

      await scannerRef.current.start()
      setIsLoading(false)
      setSecurityStatus('safe')
    } catch (error) {
      console.error('QR Scanner initialization error:', error)
      
      const qrError = new QRCodeError(
        'カメラの初期化に失敗しました',
        'CAMERA_ERROR',
        error
      )
      
      QRErrorReporter.reportError(qrError, { action: 'initialize', facingMode }, staffId)
      
      toast.error('カメラの初期化に失敗しました')
      setIsLoading(false)
      setHasCamera(false)
    }
  }

  const handleScanResult = (data: string) => {
    try {
      setScanAttempts(prev => prev + 1)

      // 高度なQR処理でセキュリティチェックを実行
      const context = {
        staffId,
        scanAttempts: scanAttempts + 1,
        timestamp: Date.now(),
        facingMode
      }

      const processResult = AdvancedQRProcessor.postprocessQRResult(data, context)

      if (!processResult.valid) {
        setSecurityStatus('warning')
        toast.error(processResult.error || 'QRコードの検証に失敗しました')
        
        // 最大試行回数に達した場合
        if (scanAttempts >= 2) {
          setSecurityStatus('blocked')
          toast.error('スキャン試行回数が上限に達しました')
          setTimeout(() => {
            handleClose()
          }, 2000)
        }
        return
      }

      // 成功時の処理
      onScanSuccess(data)
      onClose()
      toast.success(`${processResult.result.locationName}での勤怠記録を登録しました`)
      
      // 成功時は試行回数をリセット
      setScanAttempts(0)
      setSecurityStatus('safe')
    } catch (error) {
      console.error('QR code processing error:', error)
      
      const qrError = new QRCodeError(
        'QRコードの処理に失敗しました',
        'SCAN_ERROR',
        error
      )
      
      QRErrorReporter.reportError(qrError, { data, scanAttempts }, staffId)
      
      setSecurityStatus('warning')
      toast.error('QRコードの処理に失敗しました')
    }
  }

  const switchCamera = async () => {
    if (scannerRef.current) {
      try {
        setIsLoading(true)
        await scannerRef.current.stop()
        cleanupScanner()
        
        const newFacingMode = facingMode === 'user' ? 'environment' : 'user'
        const switchResult = await CameraManager.switchCamera(newFacingMode)
        
        if (switchResult.success) {
          setFacingMode(newFacingMode)
        } else {
          toast.error(switchResult.error || 'カメラの切り替えに失敗しました')
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Camera switch error:', error)
        toast.error('カメラの切り替えに失敗しました')
        setIsLoading(false)
      }
    }
  }

  const handleClose = () => {
    cleanupScanner()
    setScanAttempts(0)
    setSecurityStatus('safe')
    onClose()
  }

  const getSecurityStatusColor = () => {
    switch (securityStatus) {
      case 'safe': return 'text-green-500'
      case 'warning': return 'text-yellow-500'
      case 'blocked': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getSecurityStatusText = () => {
    switch (securityStatus) {
      case 'safe': return '安全'
      case 'warning': return '警告'
      case 'blocked': return 'ブロック中'
      default: return ''
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              QRコードスキャン
              <div className="flex items-center gap-1">
                <Shield size={16} className={getSecurityStatusColor()} />
                <span className={`text-xs ${getSecurityStatusColor()}`}>
                  {getSecurityStatusText()}
                </span>
              </div>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
            >
              <X size={20} />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {hasCamera && securityStatus !== 'blocked' ? (
            <>
              <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                
                {isLoading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  </div>
                )}

                {/* Scan area indicator */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-white rounded-lg opacity-50">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white"></div>
                  </div>
                </div>

                {/* セキュリティ警告オーバーレイ */}
                {securityStatus === 'warning' && (
                  <div className="absolute top-4 left-4 right-4">
                    <div className="bg-yellow-500 bg-opacity-90 text-black text-xs p-2 rounded">
                      警告: 無効なQRコードです
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={switchCamera}
                  disabled={isLoading}
                >
                  <RotateCcw size={16} className="mr-1" />
                  カメラ切替
                </Button>
              </div>

              <div className="text-center space-y-2">
                <div className="text-sm text-muted-foreground">
                  勤怠管理用のQRコードを枠内に合わせてください
                </div>
                {scanAttempts > 0 && (
                  <div className="text-xs text-yellow-600">
                    スキャン試行: {scanAttempts}/3
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="text-muted-foreground mb-4">
                {securityStatus === 'blocked' 
                  ? 'セキュリティ制限により一時的にブロックされています'
                  : 'カメラが利用できません'
                }
              </div>
              <Button onClick={handleClose}>
                閉じる
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}