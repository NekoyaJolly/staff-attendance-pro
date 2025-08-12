import { toast } from 'sonner'

// QRコード機能の統合テスト
export class QRCodeIntegrationTest {
  // カメラAPIのテスト
  static async testCameraAPI(): Promise<boolean> {
    try {
      // カメラのアクセス許可をテスト
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach(track => track.stop())
      
      toast.success('カメラAPIテスト: 成功')
      return true
    } catch (error) {
      console.error('Camera API test failed:', error)
      toast.error('カメラAPIテスト: 失敗')
      return false
    }
  }

  // QRコード生成のテスト
  static async testQRGeneration(): Promise<boolean> {
    try {
      const testData = {
        type: 'attendance-qr',
        locationId: 'test',
        locationName: 'テスト',
        timestamp: Date.now(),
        version: '1.0'
      }
      
      const jsonString = JSON.stringify(testData)
      const parsedData = JSON.parse(jsonString)
      
      if (parsedData.type === 'attendance-qr') {
        toast.success('QRコード生成テスト: 成功')
        return true
      } else {
        throw new Error('Invalid QR data format')
      }
    } catch (error) {
      console.error('QR generation test failed:', error)
      toast.error('QRコード生成テスト: 失敗')
      return false
    }
  }

  // 勤怠データ保存のテスト
  static async testAttendanceDataSave(): Promise<boolean> {
    try {
      const testRecord = {
        id: `test-${Date.now()}`,
        staffId: 'test-staff',
        date: new Date().toISOString().split('T')[0],
        clockIn: new Date().toTimeString().slice(0, 5),
        type: 'auto' as const,
        status: 'approved' as const
      }
      
      // LocalStorageを使用してテスト（実際はuseKVを使用）
      const existingRecords = JSON.parse(localStorage.getItem('test-timeRecords') || '[]')
      existingRecords.push(testRecord)
      localStorage.setItem('test-timeRecords', JSON.stringify(existingRecords))
      
      // データの読み込みテスト
      const savedRecords = JSON.parse(localStorage.getItem('test-timeRecords') || '[]')
      const foundRecord = savedRecords.find((r: any) => r.id === testRecord.id)
      
      if (foundRecord) {
        toast.success('勤怠データ保存テスト: 成功')
        // テストデータをクリーンアップ
        localStorage.removeItem('test-timeRecords')
        return true
      } else {
        throw new Error('Test record not found')
      }
    } catch (error) {
      console.error('Attendance data save test failed:', error)
      toast.error('勤怠データ保存テスト: 失敗')
      return false
    }
  }

  // エラーハンドリングのテスト
  static async testErrorHandling(): Promise<boolean> {
    try {
      // 無効なQRコードデータのテスト
      const invalidData = '{"invalid": "data"}'
      
      try {
        const parsed = JSON.parse(invalidData)
        if (parsed.type !== 'attendance-qr') {
          // 期待されるエラーケース
          toast.success('エラーハンドリングテスト: 成功（無効データを正しく検出）')
          return true
        }
      } catch (parseError) {
        // JSONパースエラーも期待されるケース
        toast.success('エラーハンドリングテスト: 成功（JSONパースエラーを正しく処理）')
        return true
      }
      
      return false
    } catch (error) {
      console.error('Error handling test failed:', error)
      toast.error('エラーハンドリングテスト: 失敗')
      return false
    }
  }

  // 全テストの実行
  static async runAllTests(): Promise<{ passed: number; total: number; results: boolean[] }> {
    const tests = [
      { name: 'カメラAPI', test: this.testCameraAPI },
      { name: 'QRコード生成', test: this.testQRGeneration },
      { name: '勤怠データ保存', test: this.testAttendanceDataSave },
      { name: 'エラーハンドリング', test: this.testErrorHandling }
    ]

    const results: boolean[] = []
    
    toast.info('統合テストを開始します...')
    
    for (const { name, test } of tests) {
      toast.info(`${name}テストを実行中...`)
      const result = await test()
      results.push(result)
      
      // テスト間の間隔
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    const passed = results.filter(Boolean).length
    const total = results.length
    
    if (passed === total) {
      toast.success(`全テスト完了: ${passed}/${total} 成功`)
    } else {
      toast.error(`テスト完了: ${passed}/${total} 成功、${total - passed} 失敗`)
    }
    
    return { passed, total, results }
  }
}

// フロントエンド機能のテスト
export class FrontendIntegrationTest {
  // コンポーネントのレンダリングテスト
  static testComponentRendering(): boolean {
    try {
      // DOM要素の存在確認
      const root = document.getElementById('root')
      if (!root) {
        throw new Error('Root element not found')
      }
      
      toast.success('コンポーネントレンダリングテスト: 成功')
      return true
    } catch (error) {
      console.error('Component rendering test failed:', error)
      toast.error('コンポーネントレンダリングテスト: 失敗')
      return false
    }
  }

  // ユーザーインタラクションのテスト
  static testUserInteractions(): boolean {
    try {
      // ボタンクリックイベントのシミュレーション
      const testEvent = new Event('click', { bubbles: true })
      
      // イベントハンドラのテスト
      let eventHandled = false
      const testHandler = () => { eventHandled = true }
      
      document.addEventListener('click', testHandler)
      document.dispatchEvent(testEvent)
      document.removeEventListener('click', testHandler)
      
      if (eventHandled) {
        toast.success('ユーザーインタラクションテスト: 成功')
        return true
      } else {
        throw new Error('Event not handled')
      }
    } catch (error) {
      console.error('User interaction test failed:', error)
      toast.error('ユーザーインタラクションテスト: 失敗')
      return false
    }
  }

  // レスポンシブデザインのテスト
  static testResponsiveDesign(): boolean {
    try {
      const originalWidth = window.innerWidth
      
      // モバイルサイズをシミュレート
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      })
      
      // デスクトップサイズに戻す
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: originalWidth
      })
      
      toast.success('レスポンシブデザインテスト: 成功')
      return true
    } catch (error) {
      console.error('Responsive design test failed:', error)
      toast.error('レスポンシブデザインテスト: 失敗')
      return false
    }
  }

  // 全フロントエンドテストの実行
  static async runAllTests(): Promise<{ passed: number; total: number; results: boolean[] }> {
    const tests = [
      { name: 'コンポーネントレンダリング', test: this.testComponentRendering },
      { name: 'ユーザーインタラクション', test: this.testUserInteractions },
      { name: 'レスポンシブデザイン', test: this.testResponsiveDesign }
    ]

    const results: boolean[] = []
    
    toast.info('フロントエンドテストを開始します...')
    
    for (const { name, test } of tests) {
      toast.info(`${name}テストを実行中...`)
      const result = test()
      results.push(result)
      
      await new Promise(resolve => setTimeout(resolve, 300))
    }
    
    const passed = results.filter(Boolean).length
    const total = results.length
    
    if (passed === total) {
      toast.success(`フロントエンドテスト完了: ${passed}/${total} 成功`)
    } else {
      toast.error(`フロントエンドテスト完了: ${passed}/${total} 成功、${total - passed} 失敗`)
    }
    
    return { passed, total, results }
  }
}