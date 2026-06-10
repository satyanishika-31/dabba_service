import exp from 'express'
import { verifyToken } from '../middlewares/verifyToken.js'
import { SkipMealModel } from '../models/SkipMealModel.js'

export const skipMealApp = exp.Router()

// Skip a meal
skipMealApp.post('/', verifyToken('USER'), async (req, res) => {
  try {
    const data = { ...req.body, userId: req.user.id }
    const existing = await SkipMealModel.findOne({ userId: req.user.id, date: data.date })
    if (existing) return res.status(409).json({ message: 'Already skipped' })
    const skip = await SkipMealModel.create(data)
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
    await SkipMealModel.findByIdAndDelete(req.params.id)
    res.status(200).json({ message: 'Skip removed' })
  } catch (err) { res.status(500).json({ message: err.message }) }
})
