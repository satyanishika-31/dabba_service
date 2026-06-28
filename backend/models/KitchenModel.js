import { Schema, Types, model } from "mongoose";

const kitchenSchema = new Schema({
  ownerId: {
    type: Types.ObjectId,
    ref: "user",
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  addressLine: {
    type: String,
    trim: true
  },
  contactNumber: {
    type: String,
    match: [/^[0-9]{10}$/, "Enter valid mobile number"]
  },
  mealsCooked: {
    type: String,
    trim: true
  },
  serviceArea: {
    type: String,
    trim: true
  },
  dabbaServices: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  versionKey: false
});

export const KitchenModel = model("kitchen", kitchenSchema);
