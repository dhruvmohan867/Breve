import "./config/env.js";
import connectDB from "./db/index.js";
import { app } from "./app.js";

const PORT = process.env.PORT || 2001;

connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running at port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error(`MongoDB connection failed: ${error.message}`);
    });
