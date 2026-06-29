import exp from 'express'
import { hash, compare } from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { UserModel } from '../models/UserModel.js'
import { AddressModel } from '../models/AderssModels.js'
import { KitchenModel } from '../models/KitchenModel.js'
import { MenuModel } from '../models/MenuModel.js'
import { SubscriptionModel } from '../models/SubscriptionModel.js'
import { OrderModel } from '../models/OrderModel.js'
import { DeliveryModel } from '../models/DeliveryModel.js'
import { verifyToken } from '../middlewares/verifyToken.js'
import { upload } from "../config/multer.js"
import { uploadToCloudinary } from "../config/cloudinaryUpload.js"
import cloudinary from "../config/cloudinary.js"

const { sign } = jwt

export const commonApp = exp.Router()

const allowedRoles = ["USER", "FOOD_PROVIDER", "ADMIN", "DELIVERY"]
const publicRoles = ["USER", "FOOD_PROVIDER", "DELIVERY"]
const adminEmail = "admin@gmail.com"
const adminPassword = "123456"

function normalizeRole(role) {
  const roleVal = (role || 'USER').toString().trim().toUpperCase()
  return allowedRoles.includes(roleVal) ? roleVal : 'USER'
}

function normalizePublicRole(role) {
  const roleVal = normalizeRole(role)
  return publicRoles.includes(roleVal) ? roleVal : 'USER'
}

function getAuthCookieOptions() {
  const isDeployed =
    process.env.NODE_ENV === "production" ||
    Boolean(process.env.RENDER || process.env.RENDER_EXTERNAL_URL)

  return {
    httpOnly: true,
    secure: isDeployed,
    sameSite: isDeployed ? "none" : "lax"
  }
}

function setAuthCookie(res, user) {
  const token = sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.SECRET_KEY,
    { expiresIn: "10h" }
  )

  res.cookie("token", token, getAuthCookieOptions())
}

async function getDefaultAdminUser() {
  const adminData = {
    name: "Admin",
    mobile: "9999999999",
    email: adminEmail,
    password: await hash(adminPassword, 10),
    role: "ADMIN",
    isBlocked: false
  }

  return UserModel.findOneAndUpdate(
    { email: adminEmail, role: "ADMIN" },
    { $set: adminData },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
}

function isApprovedProvider(user) {
  return user?.role === "ADMIN" || user?.providerStatus === "APPROVED"
}

async function requireApprovedProvider(req, res) {
  if (req.user.role === "ADMIN") return true

  const provider = await UserModel.findById(req.user.id).select("role providerStatus")
  if (!provider) {
    res.status(404).json({ message: "Provider account not found" })
    return false
  }

  if (provider.role !== "FOOD_PROVIDER" || !isApprovedProvider(provider)) {
    res.status(403).json({ message: "Food provider account is waiting for admin approval" })
    return false
  }

  return true
}

function pickProfileUpdates(body) {
  const allowed = ["name", "email", "mobile"]
  const updates = {}

  for (const field of allowed) {
    if (body[field] !== undefined) updates[field] = body[field]
  }

  if (body.providerDetails && typeof body.providerDetails === "object") {
    updates.providerDetails = {
      location: body.providerDetails.location,
      serviceArea: body.providerDetails.serviceArea,
      mealsCooked: body.providerDetails.mealsCooked,
      kitchenName: body.providerDetails.kitchenName,
      kitchenAddress: body.providerDetails.kitchenAddress,
      dabbaServices: body.providerDetails.dabbaServices,
      experience: body.providerDetails.experience
    }
  }

  return updates
}

// =======================
// ✅ REGISTER
// =======================
commonApp.post("/users", upload.single("profileImage"), async (req, res) => {
  let cloudinaryResult
  try {
    const newUser = req.body

    // normalize and default role to USER when missing/unknown
    newUser.role = normalizePublicRole(newUser.role)
    if (newUser.role === "FOOD_PROVIDER") {
      newUser.providerStatus = "PENDING"
      newUser.providerDetails = {
        location: newUser.location,
        serviceArea: newUser.serviceArea,
        mealsCooked: newUser.mealsCooked,
        kitchenName: newUser.kitchenName,
        kitchenAddress: newUser.kitchenAddress,
        dabbaServices: newUser.dabbaServices,
        experience: newUser.experience
      }
    } else {
      newUser.providerStatus = "NOT_APPLICABLE"
    }

    // upload image
    if (req.file) {
      cloudinaryResult = await uploadToCloudinary(req.file.buffer)
      newUser.profileImage = cloudinaryResult.secure_url
    }

    // hash password
    newUser.password = await hash(newUser.password, 10)

    const savedUser = await UserModel.create(newUser)

    const userObj = savedUser.toObject()
    delete userObj.password
    setAuthCookie(res, savedUser)

    res.status(201).json({
      message: "User created successfully",
      payload: userObj
    })

  } catch (err) {
    if (cloudinaryResult?.public_id)
      await cloudinary.uploader.destroy(cloudinaryResult.public_id)

    if (err?.code === 11000)
      return res.status(409).json({ message: "Email already exists" })

    res.status(500).json({ message: err.message })
  }
})


// =======================
// ✅ LOGIN
// =======================
commonApp.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body
    const normalizedEmail = (email || "").toString().trim().toLowerCase()

    if (normalizedEmail === adminEmail) {
      if (password !== adminPassword)
        return res.status(400).json({ message: "Invalid password" })

      const adminUser = await getDefaultAdminUser()
      setAuthCookie(res, adminUser)

      const adminObj = adminUser.toObject()
      delete adminObj.password

      return res.status(200).json({
        message: "Login successful",
        payload: adminObj
      })
    }

    const query = { email: normalizedEmail }

    if (role) query.role = normalizeRole(role)

    const users = await UserModel.find(query)
    if (!users.length)
      return res.status(400).json({ message: "Invalid credentials" })

    let user = null
    for (const candidate of users) {
      if (await compare(password, candidate.password)) {
        user = candidate
        break
      }
    }

    if (!user)
      return res.status(400).json({ message: "Invalid password" })

    if (user.isBlocked)
      return res.status(403).json({ message: "Account is blocked" })

    setAuthCookie(res, user)

    const userObj = user.toObject()
    delete userObj.password

    res.status(200).json({
      message: "Login successful",
      payload: userObj
    })

  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})


// =======================
// ✅ LOGOUT
// =======================
commonApp.get("/logout", (req, res) => {
  res.clearCookie("token", getAuthCookieOptions())

  res.status(200).json({ message: "Logout successful" })
})


// =======================
// ✅ CHECK AUTH
// =======================
commonApp.get("/check-auth",
  verifyToken("USER", "ADMIN", "FOOD_PROVIDER", "DELIVERY"),
  (req, res) => {
    res.status(200).json({
      message: "Authenticated",
      payload: req.user
    })
  }
)


// =======================
// ✅ GET PROFILE
// =======================
commonApp.get("/profile",
  verifyToken("USER", "ADMIN", "FOOD_PROVIDER", "DELIVERY"),
  async (req, res) => {
    try {
      const user = await UserModel
        .findById(req.user.id)
        .select("-password")

      res.status(200).json({
        message: "User profile",
        payload: user
      })
    } catch (err) {
      res.status(500).json({ message: err.message })
    }
  }
)


//  UPDATE PROFILE
commonApp.put("/profile",
  verifyToken("USER", "ADMIN", "FOOD_PROVIDER", "DELIVERY"),
  upload.single("profileImage"),
  async (req, res) => {

    let cloudinaryResult

    try {
      const updates = pickProfileUpdates(req.body)

      if (req.file) {
        cloudinaryResult = await uploadToCloudinary(req.file.buffer)
        updates.profileImage = cloudinaryResult.secure_url
      }

      const updatedUser = await UserModel.findByIdAndUpdate(
        req.user.id,
        updates,
        { returnDocument: "after" }
      ).select("-password")

      res.status(200).json({
        message: "Profile updated",
        payload: updatedUser
      })

    } catch (err) {
      if (cloudinaryResult?.public_id)
        await cloudinary.uploader.destroy(cloudinaryResult.public_id)

      res.status(500).json({ message: err.message })
    }
  }
)


// =======================
// ✅ CHANGE PASSWORD
// =======================
commonApp.put("/password",
  verifyToken("USER", "ADMIN", "FOOD_PROVIDER", "DELIVERY"),
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body

      const user = await UserModel.findById(req.user.id)

      const isMatch = await compare(currentPassword, user.password)
      if (!isMatch)
        return res.status(400).json({ message: "Wrong password" })

      user.password = await hash(newPassword, 10)
      await user.save()

      res.status(200).json({
        message: "Password updated"
      })

    } catch (err) {
      res.status(500).json({ message: err.message })
    }
  }
)


// =======================
// ✅ DELETE ACCOUNT
// =======================
commonApp.delete("/users",
  verifyToken("USER", "ADMIN", "FOOD_PROVIDER", "DELIVERY"),
  async (req, res) => {
    try {
      await UserModel.findByIdAndDelete(req.user.id)

      res.clearCookie("token", getAuthCookieOptions())

      res.status(200).json({
        message: "Account deleted"
      })

    } catch (err) {
      res.status(500).json({ message: err.message })
    }
  }
)


// =======================
// 👑 ADMIN - GET ALL USERS
// =======================
commonApp.get("/all-users",
  verifyToken("ADMIN"),
  async (req, res) => {
    try {
      const users = await UserModel.find().select("-password")

      res.status(200).json({
        message: "All users",
        payload: users
      })

    } catch (err) {
      res.status(500).json({ message: err.message })
    }
  }
)


// =======================
// Address APIs
// =======================
// Create address
commonApp.post('/addresses',
  verifyToken('USER', 'ADMIN', 'FOOD_PROVIDER'),
  async (req, res) => {
    try {
      const data = {
        ...req.body,
        userId: req.user.id,
        addressLine: req.body.addressLine || req.body.line1,
        pincode: req.body.pincode || req.body.zip
      }
      // if setting default, unset others
      if (data.isDefault) {
        await AddressModel.updateMany({ userId: req.user.id }, { isDefault: false })
      }

      const addr = await AddressModel.create(data)
      res.status(201).json({ message: 'Address created', payload: addr })
    } catch (err) {
      res.status(500).json({ message: err.message })
    }
  }
)

// Get all addresses for current user
commonApp.get('/addresses',
  verifyToken('USER', 'ADMIN', 'FOOD_PROVIDER'),
  async (req, res) => {
    try {
      const addrs = await AddressModel.find({ userId: req.user.id })
      res.status(200).json({ message: 'User addresses', payload: addrs })
    } catch (err) {
      res.status(500).json({ message: err.message })
    }
  }
)

// Update address
commonApp.put('/addresses/:id',
  verifyToken('USER', 'ADMIN', 'FOOD_PROVIDER'),
  async (req, res) => {
    try {
      const { id } = req.params
      const updates = {
        ...req.body,
        addressLine: req.body.addressLine || req.body.line1,
        pincode: req.body.pincode || req.body.zip
      }

      const addr = await AddressModel.findById(id)
      if (!addr) return res.status(404).json({ message: 'Address not found' })
      if (addr.userId.toString() !== req.user.id && req.user.role !== 'ADMIN')
        return res.status(403).json({ message: 'Not authorized' })

      if (updates.isDefault) {
        await AddressModel.updateMany({ userId: req.user.id }, { isDefault: false })
      }

      const updated = await AddressModel.findByIdAndUpdate(id, updates, { returnDocument: 'after' })
      res.status(200).json({ message: 'Address updated', payload: updated })
    } catch (err) {
      res.status(500).json({ message: err.message })
    }
  }
)

// Delete address
commonApp.delete('/addresses/:id',
  verifyToken('USER', 'ADMIN', 'FOOD_PROVIDER'),
  async (req, res) => {
    try {
      const { id } = req.params
      const addr = await AddressModel.findById(id)
      if (!addr) return res.status(404).json({ message: 'Address not found' })
      if (addr.userId.toString() !== req.user.id && req.user.role !== 'ADMIN')
        return res.status(403).json({ message: 'Not authorized' })

      await AddressModel.findByIdAndDelete(id)
      res.status(200).json({ message: 'Address deleted' })
    } catch (err) {
      res.status(500).json({ message: err.message })
    }
  }
)


// =======================
// Kitchen APIs
// =======================
// Create kitchen (owner is the authenticated user)
commonApp.post('/kitchens',
  verifyToken('FOOD_PROVIDER', 'ADMIN'),
  async (req, res) => {
    try {
      if (!(await requireApprovedProvider(req, res))) return

      const provider = req.user.role === 'ADMIN'
        ? null
        : await UserModel.findById(req.user.id).select('providerDetails')

      const data = {
        ...req.body,
        ownerId: req.user.id,
        name: req.body.name || provider?.providerDetails?.kitchenName,
        city: req.body.city || provider?.providerDetails?.location,
        addressLine: req.body.addressLine || provider?.providerDetails?.kitchenAddress,
        mealsCooked: req.body.mealsCooked || provider?.providerDetails?.mealsCooked,
        serviceArea: req.body.serviceArea || provider?.providerDetails?.serviceArea,
        dabbaServices: req.body.dabbaServices || provider?.providerDetails?.dabbaServices
      }
      const kitchen = await KitchenModel.create(data)
      res.status(201).json({ message: 'Kitchen created', payload: kitchen })
    } catch (err) {
      res.status(500).json({ message: err.message })
    }
  }
)

// Get kitchens (for owner: own kitchens, for admin: all kitchens)
commonApp.get('/kitchens',
  verifyToken('FOOD_PROVIDER', 'ADMIN', 'USER'),
  async (req, res) => {
    try {
      if (req.user.role === 'FOOD_PROVIDER' && !(await requireApprovedProvider(req, res))) return

      let query = {}
      if (req.user.role === 'FOOD_PROVIDER') query.ownerId = req.user.id
      const kitchens = await KitchenModel.find(query)
      res.status(200).json({ message: 'Kitchens', payload: kitchens })
    } catch (err) {
      res.status(500).json({ message: err.message })
    }
  }
)

// Update kitchen
commonApp.put('/kitchens/:id',
  verifyToken('FOOD_PROVIDER', 'ADMIN'),
  async (req, res) => {
    try {
      if (!(await requireApprovedProvider(req, res))) return

      const { id } = req.params
      const kitchen = await KitchenModel.findById(id)
      if (!kitchen) 
        return res.status(404).json({ message: 'Kitchen not found' })
      if (kitchen.ownerId.toString() !== req.user.id && req.user.role !== 'ADMIN')
        return res.status(403).json({ message: 'Not authorized' })

      const updated = await KitchenModel.findByIdAndUpdate(id, req.body, { returnDocument: 'after' })
      res.status(200).json({ message: 'Kitchen updated', payload: updated })
    } catch (err) {
      res.status(500).json({ message: err.message })
    }
  }
)

// Delete kitchen
commonApp.delete('/kitchens/:id',
  verifyToken('FOOD_PROVIDER', 'ADMIN'),
  async (req, res) => {
    try {
      if (!(await requireApprovedProvider(req, res))) return

      const { id } = req.params
      const kitchen = await KitchenModel.findById(id)
      if (!kitchen) return res.status(404).json({ message: 'Kitchen not found' })
      if (kitchen.ownerId.toString() !== req.user.id && req.user.role !== 'ADMIN')
        return res.status(403).json({ message: 'Not authorized' })

      const menuCleanup = await MenuModel.updateMany(
        { 'items.kitchenId': kitchen._id },
        { $pull: { items: { kitchenId: kitchen._id } } }
      )
      const emptyMenuCleanup = await MenuModel.deleteMany({ items: { $size: 0 } })
      await KitchenModel.findByIdAndDelete(id)

      res.status(200).json({
        message: 'Kitchen and related menu items deleted',
        payload: {
          matchedMenus: menuCleanup.matchedCount,
          updatedMenus: menuCleanup.modifiedCount,
          deletedEmptyMenus: emptyMenuCleanup.deletedCount
        }
      })
    } catch (err) {
      res.status(500).json({ message: err.message })
    }
  }
)

// =======================
// Subscription APIs
// =======================

// Create subscription
commonApp.post('/subscriptions', verifyToken('USER'), async (req, res) => {
  try {
    const { planName, deliveryAddress } = req.body
    if (!planName) return res.status(400).json({ message: 'Plan name is required' })
    if (!deliveryAddress) return res.status(400).json({ message: 'Delivery address is required' })

    const customer = await UserModel.findById(req.user.id).select('-password')
    if (!customer) return res.status(404).json({ message: 'User not found' })

    // Cancel existing active subscriptions
    await SubscriptionModel.updateMany(
      { userId: req.user.id, status: 'ACTIVE' },
      { status: 'CANCELLED', endDate: new Date() }
    )

    // Create the new subscription
    const subscription = await SubscriptionModel.create({
      userId: req.user.id,
      planName,
      startDate: new Date(),
      deliveryAddress,
      status: 'ACTIVE'
    })

    const oldActiveOrders = await OrderModel.find({ customerId: req.user.id, status: 'ORDERED' })
    const oldActiveOrderIds = oldActiveOrders.map(order => order._id)
    await DeliveryModel.deleteMany({ orderId: { $in: oldActiveOrderIds } })
    await OrderModel.deleteMany({ _id: { $in: oldActiveOrderIds } })

    res.status(201).json({ message: 'Subscribed successfully. Select meals from the menu to book them.', payload: subscription })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Get active subscription for user
commonApp.get('/subscriptions/mine', verifyToken('USER'), async (req, res) => {
  try {
    const sub = await SubscriptionModel.findOne({ userId: req.user.id, status: 'ACTIVE' })
    res.status(200).json({ message: 'Active subscription', payload: sub })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Cancel subscription
commonApp.put('/subscriptions/:id/cancel', verifyToken('USER'), async (req, res) => {
  try {
    const sub = await SubscriptionModel.findById(req.params.id)
    if (!sub) return res.status(404).json({ message: 'Subscription not found' })
    if (sub.userId.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' })

    sub.status = 'CANCELLED'
    sub.endDate = new Date()
    await sub.save()

    // Delete active unconfirmed orders created under this subscription
    const activeOrders = await OrderModel.find({ customerId: req.user.id, status: 'ORDERED' })
    const activeOrderIds = activeOrders.map(o => o._id)

    await DeliveryModel.deleteMany({ orderId: { $in: activeOrderIds } })
    await OrderModel.deleteMany({ _id: { $in: activeOrderIds } })

    res.status(200).json({ message: 'Subscription cancelled. Pending orders removed.', payload: sub })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})
