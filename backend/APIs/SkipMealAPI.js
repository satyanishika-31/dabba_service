import exp from 'express'
import { verifyToken } from '../middlewares/verifyToken.js'
import { SkipMealModel } from '../models/SkipMealModel.js'
import { OrderModel } from '../models/OrderModel.js'
import { DeliveryModel } from '../models/DeliveryModel.js'

export const skipMealApp = exp.Router()

// Skip a meal
skipMealApp.post('/', verifyToken('USER'), async (req, res) => {
  try {
    const data = { ...req.body, userId: req.user.id } // date, mealTime, reason
    if (!data.mealTime) return res.status(400).json({ message: 'Meal time is required' })

    const existing = await SkipMealModel.findOne({ userId: req.user.id, date: data.date, mealTime: data.mealTime })
    if (existing) return res.status(409).json({ message: 'Already skipped for this meal time' })

    const skip = await SkipMealModel.create(data)

    // Find the corresponding active order for this user, weekday and mealTime and mark it CANCELLED
    const dateObj = new Date(data.date)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayName = dayNames[dateObj.getDay()]

    const order = await OrderModel.findOne({
      customerId: req.user.id,
      'mealSnapshot.day': dayName,
      'mealSnapshot.mealTime': data.mealTime,
      status: 'ORDERED'
    })

    if (order) {
      order.status = 'CANCELLED'
      await order.save()

      // Set delivery status to FAILED
      await DeliveryModel.findOneAndUpdate({ orderId: order._id }, { status: 'FAILED' })
    }

    res.status(201).json({ message: 'Meal skipped', payload: skip })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// Get skipped meals for user
skipMealApp.get('/', verifyToken('USER'), async (req, res) => {
  try {
    const skips = await SkipMealModel.find({ userId: req.user.id })
    res.status(200).json({ message: 'Skipped meals', payload: skips })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// Undo skip
skipMealApp.delete('/:id', verifyToken('USER'), async (req, res) => {
  try {
    const skip = await SkipMealModel.findById(req.params.id)
    if (!skip) return res.status(404).json({ message: 'Not found' })
    if (skip.userId.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' })

    const dateObj = new Date(skip.date)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayName = dayNames[dateObj.getDay()]

    // Find the cancelled order and restore it to ORDERED
    const order = await OrderModel.findOne({
      customerId: req.user.id,
      'mealSnapshot.day': dayName,
      'mealSnapshot.mealTime': skip.mealTime,
      status: 'CANCELLED'
    })

    if (order) {
      order.status = 'ORDERED'
      await order.save()

      // Reset delivery to ASSIGNED
      await DeliveryModel.findOneAndUpdate({ orderId: order._id }, { status: 'ASSIGNED', userConfirmed: false })
    }

    await SkipMealModel.findByIdAndDelete(req.params.id)
    res.status(200).json({ message: 'Skip removed' })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

