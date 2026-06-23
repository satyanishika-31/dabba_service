import exp from 'express'
import { verifyToken } from '../middlewares/verifyToken.js'
import { MenuModel } from '../models/MenuModel.js'
import { OrderModel } from '../models/OrderModel.js'
import { DeliveryModel } from '../models/DeliveryModel.js'
import { UserModel } from '../models/UserModel.js'
import { ComplaintModel } from '../models/ComplaintModel.js'

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
      providerId: item.providerId,
      kitchenId: item.kitchenId,
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
    const orders = await OrderModel.find({ customerId: req.user.id, complaintAccepted: { $ne: true } }).sort({ createdAt: -1 })
    const deliveries = await DeliveryModel.find({ orderId: { $in: orders.map(order => order._id) } })
    const deliveryMap = new Map(deliveries.map(delivery => [delivery.orderId.toString(), delivery]))
    const complaints = await ComplaintModel.find({ customerId: req.user.id })
    const complaintMap = new Map(complaints.map(c => [c.orderId.toString(), c]))
    res.status(200).json({
      message: 'Customer orders',
      payload: orders.map(order => ({
        ...order.toObject(),
        delivery: deliveryMap.get(order._id.toString()),
        complaint: complaintMap.get(order._id.toString())
      }))
    })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

orderApp.get('/delivery', verifyToken('DELIVERY', 'ADMIN'), async (req, res) => {
  try {
    const orders = await OrderModel.find({ complaintAccepted: { $ne: true } }).sort({ createdAt: -1 })
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

    let delivery = await DeliveryModel.findOne({ orderId: order._id })
    if (!delivery) {
      delivery = await DeliveryModel.create({ orderId: order._id })
    }

    delivery.userConfirmed = true

    if (delivery.status === 'PICKED' || delivery.status === 'REACHED' || delivery.status === 'DELIVERED') {
      order.status = 'DELIVERED'
      delivery.status = 'DELIVERED'
      await order.save()
    }

    await delivery.save()

    res.status(200).json({ message: 'Delivery confirmed', payload: { order, delivery } })
  } catch (err) { res.status(500).json({ message: err.message }) }
})

// Raise complaint on order
orderApp.post('/:id/complaint', verifyToken('USER'), async (req, res) => {
  try {
    const { description } = req.body
    if (!description || !description.trim()) {
      return res.status(400).json({ message: 'Complaint description is required' })
    }

    const order = await OrderModel.findById(req.params.id)
    if (!order) return res.status(404).json({ message: 'Order not found' })
    if (order.customerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    // Check if complaint already exists for this order
    const existing = await ComplaintModel.findOne({ orderId: order._id })
    if (existing) {
      return res.status(400).json({ message: 'A complaint has already been raised for this order' })
    }

    // Resolve providerId and kitchenId
    let providerId = order.providerId
    let kitchenId = order.kitchenId

    if (!providerId || !kitchenId) {
      const menu = await MenuModel.findById(order.menuId)
      if (menu) {
        const item = menu.items.id(order.itemId)
        if (item) {
          providerId = item.providerId
          kitchenId = item.kitchenId
        }
      }
    }

    if (!providerId || !kitchenId) {
      return res.status(400).json({ message: 'Could not resolve the food provider for this order' })
    }

    const complaint = await ComplaintModel.create({
      customerId: req.user.id,
      orderId: order._id,
      kitchenId,
      providerId,
      description
    })

    res.status(201).json({ message: 'Complaint raised successfully', payload: complaint })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Get pending complaints for provider
orderApp.get('/provider/complaints', verifyToken('FOOD_PROVIDER', 'ADMIN'), async (req, res) => {
  try {
    const complaints = await ComplaintModel.find({ providerId: req.user.id })
      .populate('orderId')
      .populate('customerId', 'name email mobile')
      .sort({ createdAt: -1 })
    res.status(200).json({ message: 'Provider complaints', payload: complaints })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Accept (resolve & delete) complaint
orderApp.delete('/complaints/:id', verifyToken('FOOD_PROVIDER', 'ADMIN'), async (req, res) => {
  try {
    const complaint = await ComplaintModel.findById(req.params.id)
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' })

    if (req.user.role !== 'ADMIN' && complaint.providerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    await OrderModel.findByIdAndUpdate(complaint.orderId, { complaintAccepted: true })
    await ComplaintModel.findByIdAndDelete(req.params.id)
    res.status(200).json({ message: 'Complaint resolved and accepted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

