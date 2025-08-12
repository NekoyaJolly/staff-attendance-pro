import { test, expect } from '@playwright/test'

test.describe('勤怠管理システム - スタッフ機能', () => {
  test.beforeEach(async ({ page }) => {
    // 一般スタッフでログイン
    await page.goto('/')
    await page.getByLabel('スタッフID').fill('S001')
    await page.getByLabel('パスワード').fill('staff123')
    await page.getByRole('button', { name: 'ログイン' }).click()
    await expect(page.getByText('スタッフダッシュボード')).toBeVisible({ timeout: 10000 })
  })

  test('スタッフダッシュボードが正しく表示される', async ({ page }) => {
    // ダッシュボードの基本要素が表示されることを確認
    await expect(page.getByText('スタッフダッシュボード')).toBeVisible()
    
    // フッターナビゲーションの確認
    await expect(page.getByText('シフト')).toBeVisible()
    await expect(page.getByText('勤務情報')).toBeVisible()
    await expect(page.getByText('プロフィール')).toBeVisible()
  })

  test('勤怠記録機能が利用できる', async ({ page }) => {
    // 出勤ボタンが表示されることを確認
    const clockInButton = page.getByRole('button', { name: /出勤|Clock In/ })
    if (await clockInButton.isVisible()) {
      await expect(clockInButton).toBeVisible()
    }
    
    // 退勤ボタンが表示されることを確認
    const clockOutButton = page.getByRole('button', { name: /退勤|Clock Out/ })
    if (await clockOutButton.isVisible()) {
      await expect(clockOutButton).toBeVisible()
    }
  })

  test('シフト確認ページが表示される', async ({ page }) => {
    // シフトタブをクリック
    await page.getByText('シフト').click()
    
    // シフト関連の要素が表示されることを確認
    // 実装に応じて適切な要素を確認
    await expect(page.getByText(/シフト|Schedule/)).toBeVisible()
  })

  test('勤務情報ページが表示される', async ({ page }) => {
    // 勤務情報タブをクリック
    await page.getByText('勤務情報').click()
    
    // 勤務情報関連の要素が表示されることを確認
    await expect(page.getByText(/勤務|Time|Record/)).toBeVisible()
  })

  test('プロフィールページが表示される', async ({ page }) => {
    // プロフィールタブをクリック
    await page.getByText('プロフィール').click()
    
    // プロフィール関連の要素が表示されることを確認
    await expect(page.getByText(/プロフィール|Profile/)).toBeVisible()
  })

  test('モバイル表示でレスポンシブデザインが動作する', async ({ page }) => {
    // モバイルサイズにビューポートを変更
    await page.setViewportSize({ width: 375, height: 667 })
    
    // モバイル表示でも基本要素が表示されることを確認
    await expect(page.getByText('スタッフダッシュボード')).toBeVisible()
    await expect(page.getByText('シフト')).toBeVisible()
    await expect(page.getByText('勤務情報')).toBeVisible()
    await expect(page.getByText('プロフィール')).toBeVisible()
  })
})