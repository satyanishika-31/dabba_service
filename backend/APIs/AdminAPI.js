import exp from 'express'
import { verifyToken } from '../middlewares/verifyToken.js'
import { SubscriptionModel } from '../models/SubscriptionModel.js'
import { UserModel } from '../models/UserModel.js'

export const adminApp = exp.Router()

// Get all subscriptions
adminApp.get('/subscriptions', verifyToken('ADMIN'), async (req, res) => {
  try {
    const subs = await SubscriptionModel.find()
    res.status(200).json({ message: 'Subscriptions', payload: subs })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// Block / unblock user
adminApp.put('/block-user/:id', verifyToken('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params
    const { block } = req.body // { block: true }
    const updated = await UserModel.findByIdAndUpdate(id, { isBlocked: !!block }, { returnDocument: 'after' }).select('-password')
    if (!updated) return res.status(404).json({ message: 'User not found' })
    res.status(200).json({ message: 'User updated', payload: updated })
  } catch (err) { res.status(500).json({ message: err.message }) }
})


