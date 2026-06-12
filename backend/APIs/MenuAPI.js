import exp from 'express'
import { verifyToken } from '../middlewares/verifyToken.js'
import { MenuModel } from '../models/MenuModel.js'
import { KitchenModel } from '../models/KitchenModel.js'
import { upload } from '../config/multer.js'
import { uploadToCloudinary } from '../config/cloudinaryUpload.js'

export const menuApp = exp.Router()

const allowedDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function normalizeDay(day) {
  const normalized = day?.toString().trim().toLowerCase()
  return allowedDays.find(candidate => candidate.toLowerCase() === normalized)
}

// Create menu meal. Meals must belong to the provider, while admins can publish for any kitchen.
menuApp.post('/', verifyToken('FOOD_PROVIDER', 'ADMIN'), upload.single('image'), async (req, res) => {
  try {
    const { day, notes, name, mealTime, description, price, kitchenId, imageUrl } = req.body
    const menuDay = normalizeDay(day)

    if (!menuDay) return res.status(400).json({ message: 'Valid day is required' })
    if (!name) return res.status(400).json({ message: 'Meal name is required' })
    if (!kitchenId) return res.status(400).json({ message: 'Kitchen is required' })
    const linkedImageUrl = imageUrl?.trim()
    if (!req.file && !linkedImageUrl) return res.status(400).json({ message: 'Meal image or image link is required' })

    const kitchen = await KitchenModel.findById(kitchenId)
    if (!kitchen) return res.status(404).json({ message: 'Kitchen not found' })
    if (req.user.role !== 'ADMIN' && kitchen.ownerId.toString() !== req.user.id)
      return res.status(403).json({ message: 'You can add meals only for your own kitchen' })

    const finalImageUrl = req.file
      ? (await uploadToCloudinary(req.file.buffer)).secure_url
      : linkedImageUrl

    const menu = await MenuModel.findOneAndUpdate(
      { day: menuDay },
      {
        $setOnInsert: { day: menuDay },
        ...(notes !== undefined ? { $set: { notes } } : {}),
        ...(name ? {
          $push: {
            items: {
              name,
              mealTime,
              description,
              price,
              imageUrl: finalImageUrl,
              kitchenId,
              kitchenName: kitchen.name,
              providerId: req.user.id
            }
          }
        } : {})
      },
      { upsert: true, new: true, runValidators: true }
    )
    res.status(201).json({ message: 'Menu created', payload: menu })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// Get full weekly menu
menuApp.get('/', async (req, res) => {
  try {
    const menus = await MenuModel.find().populate('items.kitchenId', 'name city')
    res.status(200).json({ message: 'Menu list', payload: menus })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// Get menu by day
menuApp.get('/:day', async (req, res) => {
  try {
    const menuDay = normalizeDay(req.params.day)
    if (!menuDay) return res.status(400).json({ message: 'Valid day is required' })

    const menu = await MenuModel.findOne({ day: menuDay }).populate('items.kitchenId', 'name city')
    if (!menu) return res.status(404).json({ message: 'Menu not found' })
    res.status(200).json({ message: 'Menu', payload: menu })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// Update menu
menuApp.put('/:id', verifyToken('ADMIN', 'FOOD_PROVIDER'), async (req, res) => {
  try {
    const updated = await MenuModel.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' })
    res.status(200).json({ message: 'Menu updated', payload: updated })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// Delete a meal item from a menu. Providers can delete only meals they added.
menuApp.delete('/:menuId/items/:itemId', verifyToken('ADMIN', 'FOOD_PROVIDER'), async (req, res) => {
  try {
    const menu = await MenuModel.findById(req.params.menuId)
    if (!menu) return res.status(404).json({ message: 'Menu not found' })

    const item = menu.items.id(req.params.itemId)
    if (!item) return res.status(404).json({ message: 'Meal not found' })
    if (req.user.role !== 'ADMIN' && item.providerId?.toString() !== req.user.id)
      return res.status(403).json({ message: 'You can delete only meals you added' })

    item.deleteOne()

    if (menu.items.length === 0) {
      await MenuModel.findByIdAndDelete(menu._id)
    } else {
      await menu.save()
    }

    res.status(200).json({ message: 'Meal deleted from menu' })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// Delete menu
menuApp.delete('/:id', verifyToken('ADMIN'), async (req, res) => {
  try {
    await MenuModel.findByIdAndDelete(req.params.id)
    res.status(200).json({ message: 'Menu deleted' })
  } catch (err) { res.status(500).json({ message: err.message }) }
})
