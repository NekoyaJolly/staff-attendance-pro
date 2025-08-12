import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../test-utils'
import App from '../../App'

// useKVモックの設定
const mockSetCurrentUser = vi.fn()
const mockCurrentUser = null

vi.mock('@github/spark/hooks', () => ({
  useKV: vi.fn((key: string, defaultValue: any) => {
    if (key === 'currentUser') {
      return [mockCurrentUser, mockSetCurrentUser, vi.fn()]
    }
    return [defaultValue, vi.fn(), vi.fn()]
  })
}))

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading spinner initially', () => {
    render(<App />)
    
    // ローディングスピナーが表示されることを確認
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('shows login page when no user is logged in', async () => {
    render(<App />)
    
    await waitFor(() => {
      expect(screen.getByText('勤怠管理システム')).toBeInTheDocument()
    })
  })

  it('renders without crashing', () => {
    expect(() => render(<App />)).not.toThrow()
  })
})