import express from 'express';
import dotenv from 'dotenv';
import { connectDb } from './db/index.js';
import cors from 'cors';
import productsRoutes from "./routes/product.routes.js";  
import categoryRoutes from "./routes/category.routes.js";
import discountRuleRoutes from "./routes/discountRule.routes.js";
import cartRoutes from "./routes/cart.routes.js";
import orderRoutes from "./routes/order.routes.js";
import userRoutes from "./routes/user.routes.js";
import { auth } from './middleware/auth.middleware.js';
// import customerRoutes from './routes/customerGST.routes.js';
// import purchaseRoutes from './routes/purchaseGST.routes.js';
// import saleRoutes from './routes/saleGST.routes.js';
// import productRoutes from './routes/product.routes.js';
// import challanRoutes from './routes/challan.routes.js';
// import billRoutes from './routes/bill.routes.js';
// import paymentRoutes from './routes/payment.routes.js';
// import msgRoutes from './routes/whatrsapp.routes.js';

dotenv.config();

const app : express.Application = express();

app.use(express.json({limit: "16kb"}));
app.use(express.urlencoded({extended: true, limit: "16kb"}));
app.use(express.static("public"));

app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use("/api/v1/products", productsRoutes);
app.use("/api/v1/category", categoryRoutes);
app.use("/api/v1/rules", discountRuleRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1/order", orderRoutes);
app.use("/api/v1/auth", userRoutes);

const PORT = process.env.PORT || 4000;

connectDb().then(()=>{
    app.listen(PORT , ()=>{
        console.log(`server is starting on port ${PORT}`);
    })
}).catch((error)=>{
    console.log(error);
    
})

export default app;