const mongoose = require('mongoose');


const reviewSchema = mongoose.Schema({
    name:{
        type: String,
        required: true
    },
    rating:{
        type: Number,
        required: true
    },
    details:{
        type: String,
        required: true
    },

})

const reviewCollection = mongoose.model('reviewCollection', reviewSchema); //model create korle DB te auto collection create hoy. for specific collection provide third params.
module.exports = reviewCollection;