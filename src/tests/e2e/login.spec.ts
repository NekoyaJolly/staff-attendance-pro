import { test, expect } from '@playwright/test'

test.describe('勤怠管理システム - ログイン機能', () => {
  test('ログインページが正しく表示される', async ({ page }) => {
    await page.goto('/')
    
    // ページタイトルの確認
    await expect(page).toHaveTitle(/勤怠管理システム/)
    
    // ログインフォームの要素が表示されることを確認
    await expect(page.getByText('勤怠管理システム')).toBeVisible()
    await expect(page.getByLabel('スタッフID')).toBeVisible()
    await expect(page.getByLabel('パスワード')).toBeVisible()
    await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible()
  })

  test('管理者でログインできる', async ({ page }) => {
    await page.goto('/')
    
    // 管理者でログイン
    await page.getByLabel('スタッフID').fill('admin')
    await page.getByLabel('パスワード').fill('admin123')
    await page.getByRole('button', { name: 'ログイン' }).click()
    
    // ダッシュボードへの遷移を確認
    await expect(page.getByText('管理者ダッシュボード')).toBeVisible({ timeout: 10000 })
    
    // 統計カードが表示されることを確認
    await expect(page.getByText('総スタッフ数')).toBeVisible()
    await expect(page.getByText('アクティブ')).toBeVisible()
    await expect(page.getByText('承認待ち')).toBeVisible()
  })

  test('一般スタッフでログインできる', async ({ page }) => {
    await page.goto('/')
    
    // 一般スタッフでログイン
    await page.getByLabel('スタッフID').fill('S001')
    await page.getByLabel('パスワード').fill('staff123')
    await page.getByRole('button', { name: 'ログイン' }).click()
    
    // スタッフダッシュボードへの遷移を確認
    await expect(page.getByText('スタッフダッシュボード')).toBeVisible({ timeout: 10000 })
    
    // フッターナビゲーションが表示されることを確認
    await expect(page.getByText('シフト')).toBeVisible()
    await expect(page.getByText('勤務情報')).toBeVisible()
    await expect(page.getByText('プロフィール')).toBeVisible()
  })

  test('無効な認証情報でログインエラーが表示される', async ({ page }) => {
    await page.goto('/')
    
    // 無効な認証情報でログイン試行
    await page.getByLabel('スタッフID').fill('invalid')
    await page.getByLabel('パスワード').fill('invalid')
    await page.getByRole('button', { name: 'ログイン' }).click()
    
    // エラーメッセージが表示されることを確認
    await expect(page.getByText('スタッフIDまたはパスワードが正しくありません')).toBeVisible()
  })
})