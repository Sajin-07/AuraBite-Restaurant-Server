const mongoose = require('mongoose');


const cartSchema = mongoose.Schema({
    menuId:{
        type: String,
        required: true
    },
    email:{
        type: String,
        required: true
    },
    name:{
        type: String,
        required: true
    },
    image:{
        type: String,
        required: true
    },
    price:{
        type: Number,
        required: true
    },
    quantity:{
        type: Number,
    }


})

const cartCollection = mongoose.model('cartCollection', cartSchema); //model create korle DB te auto collection create hoy. for specific collection provide third params.
module.exports = cartCollection;