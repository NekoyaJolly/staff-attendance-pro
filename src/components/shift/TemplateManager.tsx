import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Plus, 
  Edit, 
  Trash, 
  Copy, 
  Clock, 
  Calendar,
  Play,
  Star,
  Users
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useShiftTemplates, ShiftTemplate, TemplateShift, validateTemplate } from '../../hooks/useShiftTemplates'
import { User } from '../../App'

interface TemplateManagerProps {
  user: User
  onApplyTemplate?: (templateId: string, staffId: string, startDate: Date, endDate: Date) => void
}

export default function TemplateManager({ user, onApplyTemplate }: TemplateManagerProps) {
  const { 
    templates, 
    createTemplate, 
    updateTemplate, 
    deleteTemplate, 
    duplicateTemplate,
    getDayName,
    getTemplateSummary 
  } = useShiftTemplates()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ShiftTemplate | null>(null)
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    pattern: [] as TemplateShift[]
  })

  // 新しいシフトパターン
  const [newShiftPattern, setNewShiftPattern] = useState({
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '17:00',
    position: ''
  })

  const resetForm = () => {
    setTemplateForm({
      name: '',
      description: '',
      pattern: []
    })
    setNewShiftPattern({
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '17:00',
      position: ''
    })
    setEditingTemplate(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditDialog = (template: ShiftTemplate) => {
    setEditingTemplate(template)
    setTemplateForm({
      name: template.name,
      description: template.description || '',
      pattern: [...template.pattern]
    })
    setIsDialogOpen(true)
  }

  const addShiftPattern = () => {
    const newPattern: TemplateShift = {
      dayOfWeek: newShiftPattern.dayOfWeek,
      startTime: newShiftPattern.startTime,
      endTime: newShiftPattern.endTime,
      position: newShiftPattern.position || undefined
    }

    setTemplateForm(prev => ({
      ...prev,
      pattern: [...prev.pattern, newPattern]
    }))

    setNewShiftPattern({
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '17:00',
      position: ''
    })
  }

  const removeShiftPattern = (index: number) => {
    setTemplateForm(prev => ({
      ...prev,
      pattern: prev.pattern.filter((_, i) => i !== index)
    }))
  }

  const handleSave = () => {
    const templateData = {
      name: templateForm.name,
      description: templateForm.description,
      pattern: templateForm.pattern,
      createdBy: user.staffId
    }

    const errors = validateTemplate(templateData)
    if (errors.length > 0) {
      toast.error(errors[0])
      return
    }

    try {
      if (editingTemplate) {
        updateTemplate(editingTemplate.id, templateData)
        toast.success('テンプレートを更新しました')
      } else {
        createTemplate(templateData)
        toast.success('テンプレートを作成しました')
      }
      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      toast.error('テンプレートの保存に失敗しました')
    }
  }

  const handleDelete = (templateId: string) => {
    try {
      deleteTemplate(templateId)
      toast.success('テンプレートを削除しました')
    } catch (error) {
      toast.error('テンプレートの削除に失敗しました')
    }
  }

  const handleDuplicate = (template: ShiftTemplate) => {
    const newName = `${template.name} (コピー)`
    try {
      duplicateTemplate(template.id, newName, user.staffId)
      toast.success('テンプレートを複製しました')
    } catch (error) {
      toast.error('テンプレートの複製に失敗しました')
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar size={20} />
              シフトテンプレート
            </CardTitle>
            <Button onClick={openCreateDialog}>
              <Plus size={16} className="mr-2" />
              新規作成
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => {
              const summary = getTemplateSummary(template)
              return (
                <Card key={template.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium flex items-center gap-2">
                          {template.name}
                          {template.isDefault && (
                            <Star size={14} className="text-yellow-500" />
                          )}
                        </h3>
                        {template.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {template.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* 統計情報 */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-muted/50 p-2 rounded">
                        <div className="font-medium">{summary.totalDays}日</div>
                        <div className="text-muted-foreground">稼働日数</div>
                      </div>
                      <div className="bg-muted/50 p-2 rounded">
                        <div className="font-medium">{summary.totalHours}h</div>
                        <div className="text-muted-foreground">総時間</div>
                      </div>
                    </div>

                    {/* 曜日表示 */}
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">勤務曜日</div>
                      <div className="text-xs">{summary.daysText}</div>
                    </div>

                    {/* シフトパターン */}
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">シフト時間</div>
                      <ScrollArea className="h-20">
                        <div className="space-y-1">
                          {template.pattern.map((shift, index) => (
                            <div key={index} className="text-xs flex items-center justify-between bg-muted/30 p-1 rounded">
                              <span>{getDayName(shift.dayOfWeek)}</span>
                              <span>{shift.startTime}-{shift.endTime}</span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>

                    {/* アクションボタン */}
                    <div className="flex gap-1 pt-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(template)}
                        className="flex-1"
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicate(template)}
                        className="flex-1"
                      >
                        <Copy size={14} />
                      </Button>
                      {!template.isDefault && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="flex-1">
                              <Trash size={14} />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>テンプレートの削除</AlertDialogTitle>
                              <AlertDialogDescription>
                                「{template.name}」を削除しますか？この操作は取り消せません。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>キャンセル</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(template.id)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                削除
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 作成・編集ダイアログ */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open)
        if (!open) resetForm()
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'テンプレート編集' : 'テンプレート作成'}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-4 p-1">
              {/* 基本情報 */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="template-name">テンプレート名</Label>
                  <Input
                    id="template-name"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="例: 朝シフト、夜勤パターン"
                  />
                </div>
                <div>
                  <Label htmlFor="template-description">説明（任意）</Label>
                  <Textarea
                    id="template-description"
                    value={templateForm.description}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="テンプレートの説明"
                    rows={2}
                  />
                </div>
              </div>

              {/* シフトパターン追加 */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">シフトパターンを追加</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label htmlFor="day-of-week">曜日</Label>
                    <Select
                      value={newShiftPattern.dayOfWeek.toString()}
                      onValueChange={(value) => setNewShiftPattern(prev => ({ ...prev, dayOfWeek: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">日曜日</SelectItem>
                        <SelectItem value="1">月曜日</SelectItem>
                        <SelectItem value="2">火曜日</SelectItem>
                        <SelectItem value="3">水曜日</SelectItem>
                        <SelectItem value="4">木曜日</SelectItem>
                        <SelectItem value="5">金曜日</SelectItem>
                        <SelectItem value="6">土曜日</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="start-time">開始時刻</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={newShiftPattern.startTime}
                      onChange={(e) => setNewShiftPattern(prev => ({ ...prev, startTime: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-time">終了時刻</Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={newShiftPattern.endTime}
                      onChange={(e) => setNewShiftPattern(prev => ({ ...prev, endTime: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="position">ポジション</Label>
                    <Input
                      id="position"
                      value={newShiftPattern.position}
                      onChange={(e) => setNewShiftPattern(prev => ({ ...prev, position: e.target.value }))}
                      placeholder="任意"
                    />
                  </div>
                </div>
                <Button onClick={addShiftPattern} className="mt-3" size="sm">
                  <Plus size={14} className="mr-1" />
                  追加
                </Button>
              </div>

              {/* 現在のパターン */}
              {templateForm.pattern.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">設定されたシフトパターン</h4>
                  <div className="space-y-2">
                    {templateForm.pattern.map((shift, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <Badge variant="outline">{getDayName(shift.dayOfWeek)}</Badge>
                          <span className="text-sm">
                            {shift.startTime} - {shift.endTime}
                          </span>
                          {shift.position && (
                            <Badge variant="secondary">{shift.position}</Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeShiftPattern(index)}
                        >
                          <Trash size={14} />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  キャンセル
                </Button>
                <Button onClick={handleSave}>
                  {editingTemplate ? '更新' : '作成'}
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}