import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

// モック関数
const mockKVHook = vi.fn()
const mockSpark = {
  llmPrompt: vi.fn(),
  llm: vi.fn(),
  user: vi.fn(),
  kv: {
    keys: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  }
}

// グローバルモック
Object.defineProperty(window, 'spark', {
  value: mockSpark,
  writable: true
})

// モジュールモック
vi.mock('@github/spark/hooks', () => ({
  useKV: mockKVHook
}))

// 各テスト後のクリーンアップ
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// 各テスト前の初期化
beforeEach(() => {
  // useKVのデフォルト実装
  mockKVHook.mockImplementation((key: string, defaultValue: any) => {
    const [value, setValue] = vi.fn().mockReturnValue([defaultValue, vi.fn(), vi.fn()])()
    return [value, setValue, vi.fn()]
  })
  
  // spark APIのデフォルト実装
  mockSpark.llm.mockResolvedValue('Mock LLM response')
  mockSpark.user.mockResolvedValue({
    id: 'test-user',
    login: 'testuser',
    email: 'test@example.com',
    avatarUrl: 'https://example.com/avatar.jpg',
    isOwner: false
  })
  mockSpark.kv.get.mockResolvedValue(undefined)
  mockSpark.kv.set.mockResolvedValue(undefined)
  mockSpark.kv.delete.mockResolvedValue(undefined)
  mockSpark.kv.keys.mockResolvedValue([])
})

// Web APIs のモック
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// ResizeObserver のモック
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// IntersectionObserver のモック
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))