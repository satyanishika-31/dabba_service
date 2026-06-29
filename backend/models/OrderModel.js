import { Schema, Types, model } from "mongoose";

const orderSchema = new Schema({
  customerId: { type: Types.ObjectId, ref: "user", required: true },
  menuId: { type: Types.ObjectId, ref: "menu", required: true },
  itemId: { type: Types.ObjectId, required: true },
  providerId: { type: Types.ObjectId, ref: "user" },
  kitchenId: { type: Types.ObjectId, ref: "kitchen" },
  packId: { type: String },
  complaintAccepted: { type: Boolean, default: false },
  quantity: { type: Number, min: 1, default: 1 },
  status: {
    type: String,
    enum: ["ORDERED", "PREPARING", "OUT_FOR_DELIVERY", "REACHED", "DELIVERED", "CANCELLED"],
    default: "ORDERED"
  },
  mealSnapshot: {
    name: String,
    mealTime: String,
    day: String,
    kitchenName: String,
    description: String,
    price: Number,
    imageUrl: String
  },
  customerSnapshot: {
    name: String,
    email: String,
    mobile: String,
    address: String
  },
  totalAmount: { type: Number, required: true }
}, {
  timestamps: true,
  versionKey: false
});

export const OrderModel = model("order", orderSchema);
