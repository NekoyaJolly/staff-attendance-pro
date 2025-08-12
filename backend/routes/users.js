const express = require('express')
const router = express.Router()

// 全ユーザー取得
router.get('/', async (req, res) => {
  try {
    // 実際の実装では、データベースからユーザー一覧を取得
    const users = [
      {
        id: 'admin',
        name: '管理者',
        email: 'admin@company.com',
        role: 'admin',
        staffId: 'admin'
      },
      {
        id: 'S001',
        name: 'スタッフ1',
        email: 'staff1@company.com',
        role: 'staff',
        staffId: 'S001'
      },
      {
        id: 'C001',
        name: '作成者1',
        email: 'creator1@company.com',
        role: 'creator',
        staffId: 'C001'
      }
    ]

    res.json({
      success: true,
      data: users
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch users',
      message: error.message
    })
  }
})

// ユーザー登録
router.post('/', async (req, res) => {
  try {
    const { name, email, role, staffId, password } = req.body

    // 実際の実装では、データベースにユーザーを登録
    const newUser = {
      id: Date.now().toString(),
      name,
      email,
      role,
      staffId,
      createdAt: new Date().toISOString()
    }

    res.status(201).json({
      success: true,
      data: newUser,
      message: 'ユーザーを登録しました'
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to create user',
      message: error.message
    })
  }
})

module.exports = router