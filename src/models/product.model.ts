import mongoose from 'mongoose';
import { ERROR_MSG } from '../constants/messege.js';

const prouctSchema = new mongoose.Schema({
    name : {
        type : String ,
        REQUIRED  : [true , ERROR_MSG.REQUIRED('product Name')]
    },
    description : {
        type : String ,
        REQUIRED  : [true , ERROR_MSG.REQUIRED('product description')]
    },
    productimage : {
        type : String ,
        REQUIRED  : [true ,ERROR_MSG.REQUIRED('product image') ]
    },
    price:{
        type : Number ,
        REQUIRED  : [true ,ERROR_MSG.REQUIRED('product price')],
        defaultValue : 0
    },
    stock :{
        type : Number ,
        REQUIRED  : [true , ERROR_MSG.REQUIRED('product stock')],
        defaultValue : 0
    },
    category : {
        type : mongoose.Schema.ObjectId,
        ref : 'Category',
        REQUIRED  : [true , ERROR_MSG.REQUIRED('product category')]
    },
    owner : {
        type : mongoose.Schema.ObjectId,
        ref : 'User',
        REQUIRED  : [true ,ERROR_MSG.REQUIRED('product owner') ]
    }
},{timestamps : true });

export const Product  = mongoose.model('Product', prouctSchema)