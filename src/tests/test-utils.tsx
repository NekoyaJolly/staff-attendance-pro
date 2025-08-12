import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'
import { User, TimeRecord, Shift } from '../App'

// テスト用のデータファクトリ
export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'test-user-1',
  name: 'テストユーザー',
  email: 'test@example.com',
  role: 'staff',
  staffId: 'S001',
  birthDate: '1990-01-01',
  address: '東京都渋谷区',
  phone: '090-1234-5678',
  ...overrides
})

export const createMockTimeRecord = (overrides: Partial<TimeRecord> = {}): TimeRecord => ({
  id: 'record-1',
  staffId: 'S001',
  date: new Date().toISOString().split('T')[0],
  clockIn: '09:00',
  clockOut: '18:00',
  type: 'auto',
  status: 'approved',
  ...overrides
})

export const createMockShift = (overrides: Partial<Shift> = {}): Shift => ({
  id: 'shift-1',
  staffId: 'S001',
  date: new Date().toISOString().split('T')[0],
  startTime: '09:00',
  endTime: '18:00',
  position: 'フロント',
  ...overrides
})

// テスト用のWrapper
interface TestWrapperProps {
  children: ReactElement
}

function TestWrapper({ children }: TestWrapperProps) {
  return (
    <div>
      {children}
    </div>
  )
}

// カスタムrender関数
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: TestWrapper, ...options })

export * from '@testing-library/react'
export { customRender as render }

// テスト用のヘルパー関数
export const mockUserEvent = () => {
  return {
    click: vi.fn(),
    type: vi.fn(),
    clear: vi.fn(),
    selectOptions: vi.fn(),
    upload: vi.fn(),
  }
}

// 日付ヘルパー
export const getDateString = (daysFromToday = 0): string => {
  const date = new Date()
  date.setDate(date.getDate() + daysFromToday)
  return date.toISOString().split('T')[0]
}

// 時間文字列ヘルパー
export const getTimeString = (hours = 9, minutes = 0): string => {
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}