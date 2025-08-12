import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Camera, TestTube, CheckCircle, XCircle, Play, RotateCcw } from '@phosphor-icons/react'
import { toast } from 'sonner'
import QRScanner from './QRScanner'
import QRGenerator from './QRGenerator'
import { QRCodeIntegrationTest, FrontendIntegrationTest } from '../../lib/integrationTests'

interface QRTestProps {
  user: any
}

export default function QRTest({ user }: QRTestProps) {
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; data?: string; error?: string } | null>(null)
  const [testData, setTestData] = useState('')
  const [isRunningTests, setIsRunningTests] = useState(false)
  const [testProgress, setTestProgress] = useState(0)
  const [integrationResults, setIntegrationResults] = useState<{
    qr: { passed: number; total: number; results: boolean[] } | null
    frontend: { passed: number; total: number; results: boolean[] } | null
  }>({ qr: null, frontend: null })

  const handleQRScanSuccess = (qrData: string) => {
    try {
      const data = JSON.parse(qrData)
      if (data.type === 'attendance-qr') {
        setTestResult({
          success: true,
          data: qrData
        })
        toast.success('QRコードテスト成功！')
      } else {
        setTestResult({
          success: false,
          error: '無効なQRコードフォーマット'
        })
        toast.error('無効なQRコードです')
      }
    } catch (error) {
      setTestResult({
        success: false,
        error: 'JSON解析エラー'
      })
      toast.error('QRコードの解析に失敗しました')
    }
  }

  const simulateQRScan = () => {
    if (!testData) {
      toast.error('テストデータを入力してください')
      return
    }
    
    try {
      const data = JSON.parse(testData)
      handleQRScanSuccess(testData)
    } catch (error) {
      setTestResult({
        success: false,
        error: 'JSONフォーマットエラー'
      })
      toast.error('無効なJSONフォーマットです')
    }
  }

  const generateTestData = () => {
    const testQRData = {
      type: 'attendance-qr',
      locationId: 'test',
      locationName: 'テスト場所',
      timestamp: Date.now(),
      version: '1.0'
    }
    setTestData(JSON.stringify(testQRData, null, 2))
  }

  const clearTest = () => {
    setTestResult(null)
    setTestData('')
    setIntegrationResults({ qr: null, frontend: null })
    setTestProgress(0)
  }

  const runIntegrationTests = async () => {
    setIsRunningTests(true)
    setTestProgress(0)
    
    try {
      // QRコード統合テスト実行
      setTestProgress(25)
      const qrResults = await QRCodeIntegrationTest.runAllTests()
      setIntegrationResults(prev => ({ ...prev, qr: qrResults }))
      
      setTestProgress(50)
      
      // フロントエンド統合テスト実行
      setTestProgress(75)
      const frontendResults = await FrontendIntegrationTest.runAllTests()
      setIntegrationResults(prev => ({ ...prev, frontend: frontendResults }))
      
      setTestProgress(100)
      
      const totalPassed = qrResults.passed + frontendResults.passed
      const totalTests = qrResults.total + frontendResults.total
      
      if (totalPassed === totalTests) {
        toast.success(`全統合テスト完了: ${totalPassed}/${totalTests} 成功`)
      } else {
        toast.warning(`統合テスト完了: ${totalPassed}/${totalTests} 成功`)
      }
      
    } catch (error) {
      console.error('Integration test error:', error)
      toast.error('統合テストでエラーが発生しました')
    } finally {
      setIsRunningTests(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* 統合テスト */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube size={20} />
            統合テスト実行
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={runIntegrationTests}
              disabled={isRunningTests}
              className="flex-1"
            >
              <Play size={16} className="mr-2" />
              {isRunningTests ? '実行中...' : '統合テスト実行'}
            </Button>
            <Button
              variant="outline"
              onClick={clearTest}
              disabled={isRunningTests}
            >
              <RotateCcw size={16} className="mr-2" />
              リセット
            </Button>
          </div>

          {isRunningTests && (
            <div>
              <Label>テスト進行状況</Label>
              <Progress value={testProgress} className="mt-2" />
            </div>
          )}

          {/* 統合テスト結果 */}
          {(integrationResults.qr || integrationResults.frontend) && (
            <div className="space-y-3">
              <h4 className="font-medium">テスト結果</h4>
              
              {integrationResults.qr && (
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={integrationResults.qr.passed === integrationResults.qr.total ? 'default' : 'destructive'}>
                      QRコード統合テスト: {integrationResults.qr.passed}/{integrationResults.qr.total}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      {integrationResults.qr.results[0] ? <CheckCircle size={16} className="text-green-500" /> : <XCircle size={16} className="text-red-500" />}
                      カメラAPI
                    </div>
                    <div className="flex items-center gap-1">
                      {integrationResults.qr.results[1] ? <CheckCircle size={16} className="text-green-500" /> : <XCircle size={16} className="text-red-500" />}
                      QRコード生成
                    </div>
                    <div className="flex items-center gap-1">
                      {integrationResults.qr.results[2] ? <CheckCircle size={16} className="text-green-500" /> : <XCircle size={16} className="text-red-500" />}
                      データ保存
                    </div>
                    <div className="flex items-center gap-1">
                      {integrationResults.qr.results[3] ? <CheckCircle size={16} className="text-green-500" /> : <XCircle size={16} className="text-red-500" />}
                      エラーハンドリング
                    </div>
                  </div>
                </div>
              )}

              {integrationResults.frontend && (
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={integrationResults.frontend.passed === integrationResults.frontend.total ? 'default' : 'destructive'}>
                      フロントエンドテスト: {integrationResults.frontend.passed}/{integrationResults.frontend.total}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      {integrationResults.frontend.results[0] ? <CheckCircle size={16} className="text-green-500" /> : <XCircle size={16} className="text-red-500" />}
                      コンポーネント
                    </div>
                    <div className="flex items-center gap-1">
                      {integrationResults.frontend.results[1] ? <CheckCircle size={16} className="text-green-500" /> : <XCircle size={16} className="text-red-500" />}
                      インタラクション
                    </div>
                    <div className="flex items-center gap-1">
                      {integrationResults.frontend.results[2] ? <CheckCircle size={16} className="text-green-500" /> : <XCircle size={16} className="text-red-500" />}
                      レスポンシブ
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 個別機能テスト */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera size={20} />
            個別機能テスト
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* カメラテスト */}
          <div>
            <h4 className="font-medium mb-2">カメラスキャンテスト</h4>
            <Button
              onClick={() => setIsQRScannerOpen(true)}
              className="w-full"
            >
              <Camera size={16} className="mr-2" />
              カメラでQRコードをスキャン
            </Button>
          </div>

          {/* 手動テスト */}
          <div>
            <h4 className="font-medium mb-2">手動データテスト</h4>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={generateTestData}
                  size="sm"
                >
                  テストデータ生成
                </Button>
                <Button
                  variant="outline"
                  onClick={simulateQRScan}
                  size="sm"
                  disabled={!testData}
                >
                  テスト実行
                </Button>
              </div>
              
              <Label htmlFor="test-data">テストJSONデータ</Label>
              <textarea
                id="test-data"
                className="w-full h-32 p-2 border rounded text-xs font-mono"
                value={testData}
                onChange={(e) => setTestData(e.target.value)}
                placeholder="QRコードのJSONデータを入力してください"
              />
            </div>
          </div>

          {/* テスト結果 */}
          {testResult && (
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                {testResult.success ? (
                  <>
                    <CheckCircle size={20} className="text-green-500" />
                    <Badge variant="default" className="bg-green-500">
                      成功
                    </Badge>
                  </>
                ) : (
                  <>
                    <XCircle size={20} className="text-red-500" />
                    <Badge variant="destructive">
                      失敗
                    </Badge>
                  </>
                )}
              </div>
              
              {testResult.success && testResult.data && (
                <div>
                  <Label>スキャン結果:</Label>
                  <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                    {JSON.stringify(JSON.parse(testResult.data), null, 2)}
                  </pre>
                </div>
              )}
              
              {!testResult.success && testResult.error && (
                <div>
                  <Label>エラー:</Label>
                  <div className="text-sm text-red-600 mt-1">
                    {testResult.error}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* QRコード生成テスト */}
      <Card>
        <CardHeader>
          <CardTitle>QRコード生成テスト</CardTitle>
        </CardHeader>
        <CardContent>
          <QRGenerator locationId="test" locationName="テスト環境" />
        </CardContent>
      </Card>

      {/* QRスキャナー */}
      <QRScanner
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onScanSuccess={handleQRScanSuccess}
      />
    </div>
  )
}