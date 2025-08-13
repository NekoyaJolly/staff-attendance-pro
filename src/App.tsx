import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import LoginPage from './components/auth/LoginPage'
import StaffDashboard from './components/dashboard/StaffDashboard'
import CreatorDashboard from './components/dashboard/CreatorDashboard'
import AdminDashboard from './components/dashboard/AdminDashboard'
import { Toaster } from 'sonner'

export interface User {
  id: string
  name: string
  email: string
  role: 'staff' | 'creator' | 'admin'
  staffId: string
  birthDate?: string
  address?: string
  phone?: string
}

export interface TimeRecord {
  id: string
  staffId: string
  date: string
  clockIn?: string
  clockOut?: string
  type: 'auto' | 'manual'
  status: 'pending' | 'approved' | 'rejected'
  note?: string
}

export interface Shift {
  id: string
  staffId: string
  date: string
  startTime: string
  endTime: string
  position?: string
}

export interface CorrectionRequest {
  id: string
  recordId: string
  staffId: string
  originalClockIn?: string
  originalClockOut?: string
  correctedClockIn?: string
  correctedClockOut?: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

export interface PayrollInfo {
  hourlyRate: number // 時給
  transportationAllowance: number // 交通費
  remainingPaidLeave: number // 有給残日数
  paidLeaveExpiry: string // 有給休暇期限
}

export interface VacationRequest {
  id: string
  staffId: string
  startDate: string
  endDate: string
  days: number
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

function App() {
  const [currentUser, setCurrentUser] = useKV<User | null>('currentUser', null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500)
    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <>
        <LoginPage onLogin={setCurrentUser} />
        <Toaster position="top-center" />
      </>
    )
  }

  const renderDashboard = () => {
    switch (currentUser.role) {
      case 'admin':
        return <AdminDashboard user={currentUser} onLogout={() => setCurrentUser(null)} />
      case 'creator':
        return <CreatorDashboard user={currentUser} onLogout={() => setCurrentUser(null)} />
      default:
        return <StaffDashboard user={currentUser} onLogout={() => setCurrentUser(null)} />
    }
  }

  return (
    <>
      {renderDashboard()}
      <Toaster position="top-center" />
    </>
  )
}

export default App