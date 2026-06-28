//UserModel.js

import { Schema, model } from "mongoose";

const userSchema = new Schema({
    name: {
        type: String,
        required: [true, "Name required"],
        trim: true
    },
    mobile: {
        type: String,
        required: [true, "Mobile Number required"],
        match: [/^[0-9]{10}$/, "Enter valid mobile number"]
    },
    email: {
        type: String,
        required: [true, "Email required"],
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, "Enter valid email"]
    },
    password: {
        type: String,
        required: [true, "Password required"],
        minlength: 6
    },
    role: {
        type: String,
        enum: ["USER", "FOOD_PROVIDER", "ADMIN", "DELIVERY"],
        default: "USER"
    },
    profileImage: {
        type: String
    },
    providerStatus: {
        type: String,
        enum: ["NOT_APPLICABLE", "PENDING", "APPROVED", "REJECTED"],
        default: "NOT_APPLICABLE"
    },
    providerDetails: {
        location: { type: String, trim: true },
        serviceArea: { type: String, trim: true },
        mealsCooked: { type: String, trim: true },
        kitchenName: { type: String, trim: true },
        kitchenAddress: { type: String, trim: true },
        dabbaServices: { type: String, trim: true },
        experience: { type: String, trim: true }
    },
    providerReviewedAt: {
        type: Date
    },
    providerReviewedBy: {
        type: Schema.Types.ObjectId,
        ref: "user"
    },
    isBlocked: {
        type: Boolean,
        default: false
    }
},{
    timestamps: true,
    versionKey: false
})

userSchema.index({ email: 1, role: 1 }, { unique: true })

export const UserModel = model("user", userSchema)
