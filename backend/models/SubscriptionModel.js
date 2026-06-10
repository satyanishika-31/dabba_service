import { Schema, Types, model } from "mongoose";

const subscriptionSchema = new Schema({
    userId: { type: Types.ObjectId, ref: 'user', required: true },
    planName: { type: String, required: true },
    mealsPerDay: { type: Number, default: 1 },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    status: { type: String, enum: ['ACTIVE', 'PAUSED', 'CANCELLED', 'COMPLETED'], default: 'ACTIVE' }
}, { timestamps: true, versionKey: false })

export const SubscriptionModel = model('subscription', subscriptionSchema)
