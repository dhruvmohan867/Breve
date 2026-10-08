import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    try {
        const dbName = process.env.DB_NAME || DB_NAME;
        const connection = await mongoose.connect(`${process.env.MONGODB_URL}/${dbName}`);
        console.log(`MongoDB connected: ${connection.connection.host}/${dbName}`);
    } catch (error) {
        console.error("MongoDB connection failed");
        console.error(error.message);
        process.exit(1);
    }
};

export default connectDB;
