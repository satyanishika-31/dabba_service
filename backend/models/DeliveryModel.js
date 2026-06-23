import { Schema, Types, model } from "mongoose";

const deliverySchema = new Schema({
  orderId: { type: Types.ObjectId, ref: 'order', required: true },
  deliveryPersonId: { type: Types.ObjectId, ref: 'user' },
  status: { type: String, enum: ['ASSIGNED', 'PICKED', 'REACHED', 'DELIVERED', 'FAILED'], default: 'ASSIGNED' },
  userConfirmed: { type: Boolean, default: false }
}, { timestamps: true, versionKey: false })

export const DeliveryModel = model('delivery', deliverySchema)
