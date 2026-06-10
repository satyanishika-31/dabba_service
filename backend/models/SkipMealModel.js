import { Schema, Types, model } from "mongoose";

const skipMealSchema = new Schema({
  userId: { type: Types.ObjectId, ref: 'user', required: true },
  date: { type: Date, required: true },
  reason: { type: String }
}, { timestamps: true, versionKey: false })

export const SkipMealModel = model('skipmeal', skipMealSchema)
