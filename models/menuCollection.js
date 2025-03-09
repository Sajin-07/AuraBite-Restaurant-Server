const mongoose = require('mongoose');


const menuSchema = mongoose.Schema({
    name:{
        type: String,
        required: true
    },
    category:{
        type: String,
        required: true
    },
    price:{
        type: Number,
        required: true
    },
    recipe:{
        type: String,
        required: true
    },
    image:{
        type: String,
        required: true
    }

})

const menuCollection = mongoose.model('menuCollection', menuSchema); //model create korle DB te auto collection create hoy. for specific collection provide third params.
module.exports = menuCollection;