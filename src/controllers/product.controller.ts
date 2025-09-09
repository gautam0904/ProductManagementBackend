import type { Request, Response } from "express";
import type { Iproduct } from "../interfaces/model.interface.js";
import { ProductService } from "../services/product.service.js";
import { ERROR_MSG } from "../constants/messege.js";

const productService = new ProductService();


   export const create = async (req: Request, res: Response) => {
        try {
            const productData: Iproduct = req.body;
            

            const files = req.file as unknown as { [fieldname: string]: Express.Multer.File[] };
console.log("files", files);
            const profilePictureLocalpath = files?.path as unknown as string;
            productData.productimage = profilePictureLocalpath || "";
            productData.owner = req.headers.USERID as string;
            const post = await productService.createProduct(productData);

            res.status(post.statuscode).json(
                post.Content
            );
        } catch (error: any) {
            res.status(error.statusCode || 500).json({
                message: error.message
            });
        }
    }

export const get = async (req: Request, res: Response) => {
        try {
            const id = req.query.id as string;
            
            const posts = await productService.getProduct(id) ;
            res.status(posts.statuscode).json(
                posts.Content
            )

        } catch (error: any) {
            res.status(error.statusCode || 500).json({
                message: error.message
            })
        }
    }

    // @httpGet('/getfiltered')
    // async getFiltered(req: Request, res: Response) {
    //     try {
    //         const filter : IfilterProduct ={
    //             search : req.query.search as string,
    //             category :  req.query.category as string,
    //             minprice : req.query.minprice as string,
    //             maxprice : req.query.maxprice as string,
    //             maxstock : req.query.maxstock as string,
    //             minstock : req.query.minstock as string,
    //         } 
    //         const posts = await this.product.getFilteredProduct(filter);
    //         res.status(posts.statuscode).json(
    //             posts.Content
    //         )
    //     } catch (error : any) {
    //         res.status(error.status || 500).json({
    //             message : error.message
    //         })
    //     }
    // }


    export const deleteProduct = async (req: Request, res: Response) => {
        try {
            const id = req.query.Id as string;
            
            const deltepost = await productService.deleteProduct(id);

            res.status(deltepost.statuscode).json(
                deltepost.Content
            )
        }
        catch(error : any){
            res.status(error.status || 500).json({
                message : error.message
            })
        }
    }

    export const updatepitcure = async (req: Request, res: Response) => {
        try {

            const updateData: Iproduct = req.body as Iproduct;
            
            const files = req.file as unknown as { [fieldname: string]: Express.Multer.File[] };
            const profilePictureLocalpath = files?.path as unknown as string;
            updateData.productimage = profilePictureLocalpath || "";


            const updated_user = await productService.updateProductWithPicture(updateData.id as string, updateData);

            res.status(updated_user.statuscode).json(updated_user.Content);
        } catch (error: any) {
            res.status(error.statuscode).json({ message: error.message || ERROR_MSG.DEFAULT_ERROR })
        }
    }
    export const update = async (req: Request, res: Response) => {
        try {

            const updateData: Iproduct = req.body as Iproduct;

            const updated_user = await productService.updateProductWithoutPicture(updateData.id as string, updateData);

            res.status(updated_user.statuscode).json(updated_user.Content);
        } catch (error: any) {
            res.status(error.statuscode).json({ message: error.message || ERROR_MSG.DEFAULT_ERROR })
        }
    }


    import mongoose from "mongoose";

    // {
    //   title: String,
    //   content: String,
    //   username: String,
    //   tags: [String],
    //   createdAt: {
    //     type: Date,
    //     default: Date.now
    //   }
    // }
    
    const blogSchema = new mongoose.Schema({
        title : {
            type: String,
            required: true,
        },
        content : {
            type: String,
            required: true,
        },
        username : {
            type: String,
            required: true,
        },
        tags : {
            type: [String],
            required: false,
        },
    }, { timestamps: true });
    
    const Blog = mongoose.model("Blog", blogSchema);
    
    export default Blog;


export const createBlog = async (req: Request, res: Response) => {
     try {
         const blogData = req.body;
         
         const blogs = await Blog.create({
             title: blogData.title,
             content: blogData.content,
             username: blogData.username,
             tags: blogData.tags || []
         })

         res.status(200).json(
             blogs
         );
     } catch (error) {
         res.status(error.statusCode || 500).json({
             message: error.message
         });
     }
 }

export const getAllBlogs = async (req : Request, res: Response) => {
     try {
         
         const blogs = await Blog.find();

         res.status(200).json(
             blogs
         )

     } catch (error) {
         res.status(error.statusCode || 500).json({
             message: error.message
         })
     }
 }

 export const deleteBlog = async (req: Request, res: Response) => {
     try {
         const id = req.query.Id ;
         
         const deleteBlog = await Blog.findByIdAndDelete(id);

         res.status(200).json(
             deleteBlog
         )
     }
     catch(error ){
         res.status(error.status || 500).json({
             message : error.message
         })
     }
 }
