import mongoose from "mongoose";

export const connectDb = async () => {
    try {
        await mongoose.connect(`${process.env.DBURL}/${process.env.DBNAME}`, {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000
        });
        console.log('database is connected ');
    }
    catch (e: any) {
        console.log(e);
    }
}