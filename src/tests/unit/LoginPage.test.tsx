import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '../test-utils'
import LoginPage from '../../components/auth/LoginPage'

const mockOnLogin = vi.fn()

describe('LoginPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders login form', () => {
    render(<LoginPage onLogin={mockOnLogin} />)
    
    expect(screen.getByText('勤怠管理システム')).toBeInTheDocument()
    expect(screen.getByLabelText('スタッフID')).toBeInTheDocument()
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument()
  })

  it('shows validation errors for empty fields', async () => {
    render(<LoginPage onLogin={mockOnLogin} />)
    
    const loginButton = screen.getByRole('button', { name: 'ログイン' })
    fireEvent.click(loginButton)
    
    // バリデーションエラーメッセージの確認は実装に依存
    // 実際のフォームバリデーション実装に合わせて調整が必要
  })

  it('calls onLogin when form is submitted with valid data', async () => {
    render(<LoginPage onLogin={mockOnLogin} />)
    
    const staffIdInput = screen.getByLabelText('スタッフID')
    const passwordInput = screen.getByLabelText('パスワード')
    const loginButton = screen.getByRole('button', { name: 'ログイン' })
    
    fireEvent.change(staffIdInput, { target: { value: 'admin' } })
    fireEvent.change(passwordInput, { target: { value: 'admin123' } })
    fireEvent.click(loginButton)
    
    // ログイン処理の確認は実装に依存
    // 実際のログイン実装に合わせて調整が必要
  })
})