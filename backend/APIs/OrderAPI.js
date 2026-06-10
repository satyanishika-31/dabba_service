import exp from 'express'
import { verifyToken } from '../middlewares/verifyToken.js'
import { MenuModel } from '../models/MenuModel.js'
import { OrderModel } from '../models/OrderModel.js'
import { DeliveryModel } from '../models/DeliveryModel.js'
import { UserModel } from '../models/UserModel.js'

export const orderApp = exp.Router()

orderApp.post('/', verifyToken('USER'), async (req, res) => {
  try {
    const { menuId, itemId, quantity = 1, deliveryAddress = '' } = req.body
    const menu = await MenuModel.findById(menuId)
    if (!menu) return res.status(404).json({ message: 'Menu not found' })

    const item = menu.items.id(itemId)
    if (!item || !item.isAvailable) return res.status(404).json({ message: 'Meal not available' })

    const customer = await UserModel.findById(req.user.id).select('-password')
    const order = await OrderModel.create({
      customerId: req.user.id,
      menuId,
      itemId,
      quantity,
      mealSnapshot: {
        name: item.name,
        mealTime: item.mealTime,
        day: menu.day,
        kitchenName: item.kitchenName,
        description: item.description,
        price: item.price,
        imageUrl: item.imageUrl
      },
      customerSnapshot: {
        name: customer.name,
        email: customer.email,
        mobile: customer.mobile,
        address: deliveryAddress
      },
      totalAmount: item.price * quantity
    })

    await DeliveryModel.create({ orderId: order._id })
    res.status(201).json({ message: 'Order placed', payload: order })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

orderApp.get('/mine', verifyToken('USER'), async (req, res) => {
  try {
    const orders = await OrderModel.find({ customerId: req.user.id }).sort({ createdAt: -1 })
    const deliveries = await DeliveryModel.find({ orderId: { $in: orders.map(order => order._id) } })
    const deliveryMap = new Map(deliveries.map(delivery => [delivery.orderId.toString(), delivery]))
    res.status(200).json({
      message: 'Customer orders',
      payload: orders.map(order => ({ ...order.toObject(), delivery: deliveryMap.get(order._id.toString()) }))
    })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

orderApp.get('/delivery', verifyToken('DELIVERY', 'ADMIN'), async (req, res) => {
  try {
    const orders = await OrderModel.find().sort({ createdAt: -1 })
    const deliveries = await DeliveryModel.find({ orderId: { $in: orders.map(order => order._id) } })
    const deliveryMap = new Map(deliveries.map(delivery => [delivery.orderId.toString(), delivery]))
    res.status(200).json({
      message: 'Delivery orders',
      payload: orders.map(order => ({ ...order.toObject(), delivery: deliveryMap.get(order._id.toString()) }))
    })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

orderApp.put('/:id/delivery-status', verifyToken('DELIVERY'), async (req, res) => {
  try {
    const { status } = req.body
    const allowed = ['ASSIGNED', 'PICKED', 'REACHED', 'DELIVERED', 'FAILED']
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' })

    const orderStatus = {
      ASSIGNED: 'OUT_FOR_DELIVERY',
      PICKED: 'OUT_FOR_DELIVERY',
      REACHED: 'REACHED',
      DELIVERED: 'DELIVERED',
      FAILED: 'CANCELLED'
    }[status]

    const delivery = await DeliveryModel.findOneAndUpdate(
      { orderId: req.params.id },
      { status, deliveryPersonId: req.user.id },
      { new: true, upsert: true }
    )
    const order = await OrderModel.findByIdAndUpdate(req.params.id, { status: orderStatus }, { new: true })
    if (!order) return res.status(404).json({ message: 'Order not found' })

    res.status(200).json({ message: 'Delivery status updated', payload: { order, delivery } })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

orderApp.put('/:id/confirm-delivered', verifyToken('USER'), async (req, res) => {
  try {
    const order = await OrderModel.findById(req.params.id)
    if (!order) return res.status(404).json({ message: 'Order not found' })
    if (order.customerId.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' })

    const delivery = await DeliveryModel.findOne({ orderId: order._id })
    if (!delivery || delivery.status !== 'REACHED')
      return res.status(400).json({ message: 'Delivery has not reached the customer yet' })

    order.status = 'DELIVERED'
    delivery.status = 'DELIVERED'
    await order.save()
    await delivery.save()

    res.status(200).json({ message: 'Delivery confirmed', payload: { order, delivery } })
  } catch (err) { res.status(500).json({ message: err.message }) }
})
