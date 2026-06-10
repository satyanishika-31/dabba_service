//server.js
import exp from 'express';
import { connect } from 'mongoose';
import { config } from 'dotenv';
import { adminApp } from './APIs/AdminAPI.js'
import { commonApp } from './APIs/CommonAPI.js';
import { menuApp } from './APIs/MenuAPI.js';
import { skipMealApp } from './APIs/SkipMealAPI.js';
import { kitchenApp } from './APIs/KitchenAPI.js';
import { orderApp } from './APIs/OrderAPI.js';
import { UserModel } from './models/UserModel.js';
import cors from 'cors';
import cookieParser from 'cookie-parser';
config()

//express app 
const app = exp()


app.use(cors({
  origin: true,
  credentials: true
}))

app.use(cookieParser())
app.use(exp.json())

//routes
app.use("/admin-api",adminApp)
app.use("/auth",commonApp)
// dabbaApp removed — consolidated APIs mounted individually
app.use('/menu', menuApp)
app.use('/skip-meal', skipMealApp)
app.use('/kitchen', kitchenApp)
app.use('/orders', orderApp)

//assign port number
const port = process.env.PORT || 4000

let isConnected = false

//connect to DB
const connectDB = async () => {
    if (isConnected) return
    try {
        await connect(process.env.DB_URL)
        isConnected = true
        await UserModel.syncIndexes()
        console.log("DB connected")
    } catch (err) {
        console.error("DB connection error:", err.message)
        console.error("Continuing without DB connection (development mode). Some features will be unavailable.")
        // Do not exit process; allow server to start for development without DB.
    }
};

//call DB to connect then server should run
const startServer = async () => {
    await connectDB();

    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
};

//after DB connect server should run
startServer();

app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ message: err.message || "Internal server error" });
});
