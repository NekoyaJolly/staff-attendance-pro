import { useKV } from '@github/spark/hooks'
import { Shift } from '../App'

export interface ShiftTemplate {
  id: string
  name: string
  description?: string
  pattern: TemplateShift[]
  createdAt: string
  createdBy: string
  isDefault?: boolean
}

export interface TemplateShift {
  dayOfWeek: number // 0-6 (日曜日=0)
  startTime: string
  endTime: string
  position?: string
  isOptional?: boolean
}

// テンプレート管理フック
export function useShiftTemplates() {
  const [templates, setTemplates] = useKV<ShiftTemplate[]>('shiftTemplates', [
    // デフォルトテンプレート
    {
      id: 'default-morning',
      name: '朝シフト',
      description: '9:00-17:00の基本的な朝シフトパターン',
      pattern: [
        { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }, // 月曜日
        { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' }, // 火曜日
        { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' }, // 水曜日
        { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' }, // 木曜日
        { dayOfWeek: 5, startTime: '09:00', endTime: '17:00' }, // 金曜日
      ],
      createdAt: new Date().toISOString(),
      createdBy: 'system',
      isDefault: true
    },
    {
      id: 'default-evening',
      name: '夜シフト',
      description: '17:00-1:00の夜間シフトパターン',
      pattern: [
        { dayOfWeek: 1, startTime: '17:00', endTime: '01:00' }, // 月曜日
        { dayOfWeek: 2, startTime: '17:00', endTime: '01:00' }, // 火曜日
        { dayOfWeek: 3, startTime: '17:00', endTime: '01:00' }, // 水曜日
        { dayOfWeek: 4, startTime: '17:00', endTime: '01:00' }, // 木曜日
        { dayOfWeek: 5, startTime: '17:00', endTime: '01:00' }, // 金曜日
        { dayOfWeek: 6, startTime: '17:00', endTime: '01:00' }, // 土曜日
      ],
      createdAt: new Date().toISOString(),
      createdBy: 'system',
      isDefault: true
    },
    {
      id: 'default-weekend',
      name: '週末シフト',
      description: '土日の週末シフトパターン',
      pattern: [
        { dayOfWeek: 6, startTime: '10:00', endTime: '18:00' }, // 土曜日
        { dayOfWeek: 0, startTime: '10:00', endTime: '18:00' }, // 日曜日
      ],
      createdAt: new Date().toISOString(),
      createdBy: 'system',
      isDefault: true
    }
  ])

  // テンプレート作成
  const createTemplate = (templateData: Omit<ShiftTemplate, 'id' | 'createdAt'>) => {
    const newTemplate: ShiftTemplate = {
      ...templateData,
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    }
    setTemplates(current => [...current, newTemplate])
    return newTemplate
  }

  // テンプレート更新
  const updateTemplate = (templateId: string, updates: Partial<ShiftTemplate>) => {
    setTemplates(current => 
      current.map(template => 
        template.id === templateId 
          ? { ...template, ...updates }
          : template
      )
    )
  }

  // テンプレート削除
  const deleteTemplate = (templateId: string) => {
    setTemplates(current => 
      current.filter(template => template.id !== templateId && !template.isDefault)
    )
  }

  // テンプレートを特定の期間に適用
  const applyTemplate = (
    templateId: string, 
    staffId: string, 
    startDate: Date, 
    endDate: Date
  ): Shift[] => {
    const template = templates.find(t => t.id === templateId)
    if (!template) throw new Error('テンプレートが見つかりません')

    const shifts: Shift[] = []
    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay()
      const templateShift = template.pattern.find(p => p.dayOfWeek === dayOfWeek)

      if (templateShift) {
        const shift: Shift = {
          id: `shift_${currentDate.toISOString().split('T')[0]}_${staffId}_${Date.now()}`,
          staffId,
          date: currentDate.toISOString().split('T')[0],
          startTime: templateShift.startTime,
          endTime: templateShift.endTime,
          position: templateShift.position
        }
        shifts.push(shift)
      }

      currentDate.setDate(currentDate.getDate() + 1)
    }

    return shifts
  }

  // テンプレート複製
  const duplicateTemplate = (templateId: string, newName: string, createdBy: string) => {
    const template = templates.find(t => t.id === templateId)
    if (!template) throw new Error('テンプレートが見つかりません')

    const duplicatedTemplate: ShiftTemplate = {
      ...template,
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: newName,
      createdAt: new Date().toISOString(),
      createdBy,
      isDefault: false
    }

    setTemplates(current => [...current, duplicatedTemplate])
    return duplicatedTemplate
  }

  // 曜日名取得
  const getDayName = (dayOfWeek: number): string => {
    const days = ['日', '月', '火', '水', '木', '金', '土']
    return days[dayOfWeek]
  }

  // テンプレートのサマリー取得
  const getTemplateSummary = (template: ShiftTemplate) => {
    const totalDays = template.pattern.length
    const totalHours = template.pattern.reduce((total, shift) => {
      const start = new Date(`2000-01-01 ${shift.startTime}`)
      const end = new Date(`2000-01-01 ${shift.endTime}`)
      
      if (end < start) {
        end.setDate(end.getDate() + 1)
      }
      
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      return total + hours
    }, 0)

    const daysText = template.pattern
      .map(p => getDayName(p.dayOfWeek))
      .join(', ')

    return {
      totalDays,
      totalHours: Math.round(totalHours * 10) / 10,
      daysText,
      averageHoursPerDay: totalDays > 0 ? Math.round((totalHours / totalDays) * 10) / 10 : 0
    }
  }

  return {
    templates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    applyTemplate,
    duplicateTemplate,
    getDayName,
    getTemplateSummary
  }
}

// テンプレートバリデーション
export const validateTemplate = (template: Partial<ShiftTemplate>): string[] => {
  const errors: string[] = []

  if (!template.name || template.name.trim().length < 1) {
    errors.push('テンプレート名は必須です')
  }

  if (!template.pattern || template.pattern.length === 0) {
    errors.push('少なくとも1つのシフトパターンが必要です')
  }

  if (template.pattern) {
    template.pattern.forEach((shift, index) => {
      if (!shift.startTime) {
        errors.push(`${index + 1}番目のシフトの開始時刻が必要です`)
      }
      if (!shift.endTime) {
        errors.push(`${index + 1}番目のシフトの終了時刻が必要です`)
      }
      if (shift.dayOfWeek < 0 || shift.dayOfWeek > 6) {
        errors.push(`${index + 1}番目のシフトの曜日が無効です`)
      }
    })
  }

  return errors
}