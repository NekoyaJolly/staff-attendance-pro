import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, RefreshCw, QrCode } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface QRGeneratorProps {
  locationId?: string
  locationName?: string
}

export default function QRGenerator({ locationId = 'main', locationName = 'メイン' }: QRGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [qrData, setQrData] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const generateQRCode = async () => {
    setIsGenerating(true)
    
    try {
      // QRコードのデータを生成（勤怠管理システム用の識別情報を含む）
      const qrPayload = {
        type: 'attendance-qr',
        locationId,
        locationName,
        timestamp: Date.now(),
        version: '1.0'
      }
      
      const qrString = JSON.stringify(qrPayload)
      setQrData(qrString)

      if (canvasRef.current) {
        await QRCode.toCanvas(canvasRef.current, qrString, {
          width: 300,
          margin: 2,
          color: {
            dark: '#1f2937', // Dark blue
            light: '#ffffff' // White
          },
          errorCorrectionLevel: 'M'
        })
      }

      toast.success('QRコードを生成しました')
    } catch (error) {
      console.error('QR Code generation error:', error)
      toast.error('QRコードの生成に失敗しました')
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadQRCode = () => {
    if (canvasRef.current) {
      const link = document.createElement('a')
      link.download = `attendance-qr-${locationId}-${Date.now()}.png`
      link.href = canvasRef.current.toDataURL()
      link.click()
      toast.success('QRコードをダウンロードしました')
    }
  }

  useEffect(() => {
    generateQRCode()
  }, [locationId, locationName])

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode size={20} />
          勤怠用QRコード
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="border rounded-lg shadow-sm"
              style={{ maxWidth: '100%', height: 'auto' }}
            />
            {isGenerating && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}
          </div>
        </div>

        <div className="text-center">
          <div className="text-sm font-medium">{locationName}</div>
          <div className="text-xs text-muted-foreground">勤怠記録用</div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={generateQRCode}
            disabled={isGenerating}
            className="flex-1"
          >
            <RefreshCw size={16} className="mr-1" />
            再生成
          </Button>
          <Button
            size="sm"
            onClick={downloadQRCode}
            disabled={isGenerating || !qrData}
            className="flex-1"
          >
            <Download size={16} className="mr-1" />
            ダウンロード
          </Button>
        </div>

        <div className="text-xs text-muted-foreground text-center">
          ※ このQRコードを勤怠記録時にスキャンしてください
        </div>
      </CardContent>
    </Card>
  )
}