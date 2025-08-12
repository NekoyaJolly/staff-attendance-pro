const express = require('express')
const router = express.Router()

// 勤怠記録を取得
router.get('/:staffId', async (req, res) => {
  try {
    const { staffId } = req.params
    const { month, year } = req.query

    // 実際の実装では、データベースから勤怠記録を取得
    const records = [
      {
        id: '1',
        staffId,
        date: new Date().toISOString().split('T')[0],
        clockIn: '09:00',
        clockOut: '18:00',
        type: 'auto',
        status: 'approved'
      }
    ]

    res.json({
      success: true,
      data: records
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch attendance records',
      message: error.message
    })
  }
})

// 勤怠記録を登録
router.post('/', async (req, res) => {
  try {
    const { staffId, type, clockIn, clockOut, qrCode, location } = req.body

    // 実際の実装では、データベースに勤怠記録を保存
    const newRecord = {
      id: Date.now().toString(),
      staffId,
      date: new Date().toISOString().split('T')[0],
      clockIn,
      clockOut,
      type,
      status: type === 'manual' ? 'pending' : 'approved',
      location,
      qrCode
    }

    res.status(201).json({
      success: true,
      data: newRecord,
      message: '勤怠記録を登録しました'
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to create attendance record',
      message: error.message
    })
  }
})

// 勤怠記録を承認
router.patch('/:recordId/approve', async (req, res) => {
  try {
    const { recordId } = req.params
    const { approved } = req.body

    // 実際の実装では、データベースの記録を更新
    res.json({
      success: true,
      message: approved ? '勤怠記録を承認しました' : '勤怠記録を却下しました'
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to approve attendance record',
      message: error.message
    })
  }
})

module.exports = router