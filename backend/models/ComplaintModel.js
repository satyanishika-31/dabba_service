import { Schema, Types, model } from "mongoose";

const complaintSchema = new Schema({
  customerId: { type: Types.ObjectId, ref: 'user', required: true },
  orderId: { type: Types.ObjectId, ref: 'order', required: true },
  kitchenId: { type: Types.ObjectId, ref: 'kitchen', required: true },
  providerId: { type: Types.ObjectId, ref: 'user', required: true },
  description: { type: String, required: true, trim: true },
  status: { type: String, enum: ['PENDING', 'ACCEPTED'], default: 'PENDING' }
}, { timestamps: true, versionKey: false });

export const ComplaintModel = model('complaint', complaintSchema);
