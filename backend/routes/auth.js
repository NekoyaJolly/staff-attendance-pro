const express = require('express')
const router = express.Router()

// ログイン
router.post('/login', async (req, res) => {
  try {
    const { staffId, password } = req.body

    // 実際の実装では、データベースからユーザー情報を取得し、パスワードを確認
    const users = {
      'admin': { id: 'admin', name: '管理者', role: 'admin', password: 'admin123' },
      'S001': { id: 'S001', name: 'スタッフ1', role: 'staff', password: 'staff123' },
      'C001': { id: 'C001', name: '作成者1', role: 'creator', password: 'creator123' }
    }

    const user = users[staffId]
    if (!user || user.password !== password) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'スタッフIDまたはパスワードが正しくありません'
      })
    }

    // JWTトークンを生成（実際の実装では）
    const token = 'dummy-jwt-token'
    
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        staffId: user.id
      },
      token
    })
  } catch (error) {
    res.status(500).json({
      error: 'Login failed',
      message: error.message
    })
  }
})

// ログアウト
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'ログアウトしました'
  })
})

module.exports = router