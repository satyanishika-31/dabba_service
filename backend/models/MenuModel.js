import { Schema, Types, model } from "mongoose";

const menuItemSchema = new Schema({
  name: { type: String, required: true, trim: true },
  mealTime: {
    type: String,
    enum: ["MORNING", "AFTERNOON", "EVENING"],
    required: true
  },
  description: { type: String, trim: true },
  price: { type: Number, required: true, min: 0 },
  imageUrl: { type: String, required: true, trim: true },
  providerId: { type: Types.ObjectId, ref: "user" },
  providerEmail: { type: String, trim: true },
  kitchenId: { type: Types.ObjectId, ref: "kitchen" },
  kitchenName: { type: String, required: true, trim: true },
  kitchenLocation: { type: String, trim: true },
  isAvailable: { type: Boolean, default: true }
}, { timestamps: true });

const menuSchema = new Schema({
  day: { type: String, required: true }, // e.g., Monday
  items: [menuItemSchema],
  notes: { type: String }
}, { timestamps: true, versionKey: false })

export const MenuModel = model('menu', menuSchema)
