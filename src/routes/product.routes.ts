import express from "express";
import { create, deleteProduct, get, update, updatepitcure } from "../controllers/product.controller.js";
import { upload } from "../middleware/multer.middleware.js";
import { createBlog, deleteBlog, getAllBlogs } from "../controllers/product.controller.js";

const productsRoutes = express.Router();

productsRoutes.post("/create", upload.single('productimage'), create);
productsRoutes.put("/update", upload.single('productimage'), updatepitcure);
productsRoutes.put("/updatewithoutpicture", update);
productsRoutes.get("/get", get);
productsRoutes.delete("/delete", deleteProduct);



export default productsRoutes;
