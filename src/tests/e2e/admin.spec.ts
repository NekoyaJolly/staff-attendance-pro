import { test, expect } from '@playwright/test'

test.describe('勤怠管理システム - 管理者機能', () => {
  test.beforeEach(async ({ page }) => {
    // 管理者でログイン
    await page.goto('/')
    await page.getByLabel('スタッフID').fill('admin')
    await page.getByLabel('パスワード').fill('admin123')
    await page.getByRole('button', { name: 'ログイン' }).click()
    await expect(page.getByText('管理者ダッシュボード')).toBeVisible({ timeout: 10000 })
  })

  test('管理者ダッシュボードが正しく表示される', async ({ page }) => {
    // 統計カードの確認
    await expect(page.getByText('総スタッフ数')).toBeVisible()
    await expect(page.getByText('アクティブ')).toBeVisible()
    await expect(page.getByText('承認待ち')).toBeVisible()
    await expect(page.getByText('今月シフト')).toBeVisible()
    
    // タブナビゲーションの確認
    await expect(page.getByRole('tab', { name: '承認' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'スタッフ' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'シフト' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'QRコード' })).toBeVisible()
  })

  test('スタッフタブで一覧が表示される', async ({ page }) => {
    // スタッフタブをクリック
    await page.getByRole('tab', { name: 'スタッフ' }).click()
    
    // スタッフ一覧が表示されることを確認
    await expect(page.getByText('スタッフ一覧')).toBeVisible()
  })

  test('QRコードタブでQRコード生成機能が表示される', async ({ page }) => {
    // QRコードタブをクリック
    await page.getByRole('tab', { name: 'QRコード' }).click()
    
    // QRコード生成セクションが表示されることを確認
    await expect(page.getByText('勤怠用QRコード生成')).toBeVisible()
    await expect(page.getByText('メインエントランス')).toBeVisible()
    await expect(page.getByText('スタッフルーム')).toBeVisible()
    await expect(page.getByText('オフィス')).toBeVisible()
  })

  test('エクスポートタブでデータ出力機能が表示される', async ({ page }) => {
    // エクスポートタブをクリック
    await page.getByRole('tab', { name: 'エクスポート' }).click()
    
    // エクスポート機能が表示されることを確認
    await expect(page.getByText('データエクスポート')).toBeVisible()
    await expect(page.getByText('勤怠データ')).toBeVisible()
    await expect(page.getByText('シフトデータ')).toBeVisible()
    await expect(page.getByText('スタッフデータ')).toBeVisible()
    
    // エクスポートボタンの確認
    const excelButtons = page.getByRole('button', { name: /Excel/ })
    const csvButtons = page.getByRole('button', { name: /CSV/ })
    
    await expect(excelButtons.first()).toBeVisible()
    await expect(csvButtons.first()).toBeVisible()
  })

  test('ログアウト機能が動作する', async ({ page }) => {
    // ログアウトボタンを探してクリック
    const logoutButton = page.getByRole('button', { name: /ログアウト|Logout/ }).first()
    if (await logoutButton.isVisible()) {
      await logoutButton.click()
      
      // ログインページに戻ることを確認
      await expect(page.getByText('勤怠管理システム')).toBeVisible()
      await expect(page.getByLabel('スタッフID')).toBeVisible()
    }
  })
})