// AddressModel.js

import { Schema, Types, model } from "mongoose";

const addressSchema = new Schema({
    userId: {
        type: Types.ObjectId,
        ref: "user",
        required: true
    },
    addressLine: {
        type: String,
        required: true,
        trim: true
    },
    city: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    pincode: {
        type: String,
        match: [/^[0-9]{6}$/, "Enter valid pincode"]
    },
    isDefault: {
        type: Boolean,
        default: false
    }
},{
    timestamps: true,
    versionKey: false
})

export const AddressModel = model("address", addressSchema);