import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../test-utils'
import AdminPanel from '../../components/admin/AdminPanel'
import { createMockUser } from '../test-utils'

describe('AdminPanel Component', () => {
  const mockUser = createMockUser({ role: 'admin' })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders admin statistics cards', () => {
    render(<AdminPanel user={mockUser} />)
    
    expect(screen.getByText('総スタッフ数')).toBeInTheDocument()
    expect(screen.getByText('アクティブ')).toBeInTheDocument()
    expect(screen.getByText('承認待ち')).toBeInTheDocument()
    expect(screen.getByText('今月シフト')).toBeInTheDocument()
  })

  it('renders tab navigation', () => {
    render(<AdminPanel user={mockUser} />)
    
    expect(screen.getByRole('tab', { name: '承認' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'スタッフ' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'シフト' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'QRコード' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'テスト' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'エクスポート' })).toBeInTheDocument()
  })

  it('displays empty state when no pending approvals', () => {
    render(<AdminPanel user={mockUser} />)
    
    expect(screen.getByText('承認待ちの記録はありません')).toBeInTheDocument()
  })

  it('renders without crashing', () => {
    expect(() => render(<AdminPanel user={mockUser} />)).not.toThrow()
  })
})