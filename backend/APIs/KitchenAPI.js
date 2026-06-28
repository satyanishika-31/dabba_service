import exp from 'express'
import { verifyToken } from '../middlewares/verifyToken.js'
import { SubscriptionModel } from '../models/SubscriptionModel.js'
import { SkipMealModel } from '../models/SkipMealModel.js'
import { UserModel } from '../models/UserModel.js'

export const kitchenApp = exp.Router()

async function requireApprovedProvider(req, res) {
  if (req.user.role === 'ADMIN') return true

  const provider = await UserModel.findById(req.user.id).select('role providerStatus')
  if (!provider) {
    res.status(404).json({ message: 'Provider account not found' })
    return false
  }

  if (provider.role !== 'FOOD_PROVIDER' || provider.providerStatus !== 'APPROVED') {
    res.status(403).json({ message: 'Food provider account is waiting for admin approval' })
    return false
  }

  return true
}

// Count today's meals for a kitchen
kitchenApp.get('/today-count', verifyToken('FOOD_PROVIDER', 'ADMIN'), async (req, res) => {
  try {
    if (!(await requireApprovedProvider(req, res))) return

    const start = new Date()
    start.setHours(0,0,0,0)
    const end = new Date()
    end.setHours(23,59,59,999)

    const totalSubs = await SubscriptionModel.countDocuments({
      status: 'ACTIVE',
      startDate: { $lte: end },
      $or: [ { endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: start } } ]
    })

    const skips = await SkipMealModel.countDocuments({ date: { $gte: start, $lte: end } })

    const count = Math.max(0, totalSubs - skips)
    res.status(200).json({ message: 'Today count', payload: { count, totalSubs, skips } })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// Weekly report for kitchen: orders per day
kitchenApp.get('/weekly-report', verifyToken('FOOD_PROVIDER', 'ADMIN'), async (req, res) => {
  try {
    if (!(await requireApprovedProvider(req, res))) return

    const now = new Date()
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      d.setHours(0,0,0,0)
      days.push(new Date(d))
    }

    const report = []
    for (const dayStart of days) {
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23,59,59,999)

      const totalSubs = await SubscriptionModel.countDocuments({
        status: 'ACTIVE',
        startDate: { $lte: dayEnd },
        $or: [ { endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: dayStart } } ]
      })

      const skips = await SkipMealModel.countDocuments({ date: { $gte: dayStart, $lte: dayEnd } })
      report.push({ date: dayStart.toISOString().slice(0,10), totalSubs, skips, meals: Math.max(0, totalSubs - skips) })
    }

    res.status(200).json({ message: 'Weekly report', payload: report })
  } catch (err) { res.status(500).json({ message: err.message }) }
})
