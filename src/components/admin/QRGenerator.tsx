import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { QrCode, Download, RefreshCw } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface QRGeneratorProps {
  className?: string
}

export default function QRGenerator({ className }: QRGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [qrData, setQrData] = useState('')
  const [qrType, setQrType] = useState<'attendance' | 'shift' | 'custom'>('attendance')
  const [customData, setCustomData] = useState('')
  const [location, setLocation] = useState('オフィス')

  // QRコードデータの生成
  const generateQRData = () => {
    switch (qrType) {
      case 'attendance':
        return `ATTENDANCE:${location}:${Date.now()}`
      case 'shift':
        return `SHIFT:${location}:${Date.now()}`
      case 'custom':
        return customData || `TIMECARD:${location}:${Date.now()}`
      default:
        return `ATTENDANCE:${location}:${Date.now()}`
    }
  }

  // QRコードの生成と描画
  const generateQR = async () => {
    if (!canvasRef.current) return

    const data = generateQRData()
    setQrData(data)

    try {
      await QRCode.toCanvas(canvasRef.current, data, {
        width: 256,
        margin: 2,
        color: {
          dark: '#1a202c',  // ダークカラー
          light: '#ffffff'  // ライトカラー
        },
        errorCorrectionLevel: 'M'
      })
      toast.success('QRコードを生成しました')
    } catch (error) {
      console.error('QR generation error:', error)
      toast.error('QRコードの生成に失敗しました')
    }
  }

  // QRコードのダウンロード
  const downloadQR = () => {
    if (!canvasRef.current) return

    const link = document.createElement('a')
    link.download = `qr-${qrType}-${Date.now()}.png`
    link.href = canvasRef.current.toDataURL()
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('QRコードをダウンロードしました')
  }

  // 初期QRコード生成
  useEffect(() => {
    generateQR()
  }, [])

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode size={20} />
            QRコード生成
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* QRコード設定 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="qr-type">QRコードタイプ</Label>
              <Select value={qrType} onValueChange={(value: 'attendance' | 'shift' | 'custom') => setQrType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="attendance">出勤・退勤</SelectItem>
                  <SelectItem value="shift">シフト確認</SelectItem>
                  <SelectItem value="custom">カスタム</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="location">勤務場所</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="オフィス、店舗名など"
              />
            </div>
          </div>

          {/* カスタムデータ入力 */}
          {qrType === 'custom' && (
            <div>
              <Label htmlFor="custom-data">カスタムデータ</Label>
              <Input
                id="custom-data"
                value={customData}
                onChange={(e) => setCustomData(e.target.value)}
                placeholder="カスタムQRコードデータを入力"
              />
            </div>
          )}

          {/* QRコード表示 */}
          <div className="flex flex-col items-center space-y-4">
            <div className="bg-white p-4 rounded-lg border">
              <canvas
                ref={canvasRef}
                className="max-w-full h-auto"
              />
            </div>

            {/* QRコードデータ表示 */}
            <div className="text-xs text-muted-foreground text-center max-w-full break-all">
              <strong>データ:</strong> {qrData}
            </div>

            {/* 操作ボタン */}
            <div className="flex gap-2">
              <Button onClick={generateQR} variant="outline" size="sm">
                <RefreshCw size={16} className="mr-1" />
                再生成
              </Button>
              <Button onClick={downloadQR} size="sm">
                <Download size={16} className="mr-1" />
                ダウンロード
              </Button>
            </div>
          </div>

          {/* 使用方法の説明 */}
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
            <h4 className="font-medium mb-2">使用方法:</h4>
            <ul className="space-y-1 text-xs">
              <li>• スタッフは勤怠記録時にこのQRコードをスキャンします</li>
              <li>• QRコードは定期的に再生成することを推奨します</li>
              <li>• 各勤務場所ごとに異なるQRコードを配置してください</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}