const mongoose = require('mongoose');


const reservationSchema = mongoose.Schema({
    name:{
        type: String,
        required: true
    },
    email:{
        type: String,
        required: true
    },
    date:{
        type: Date,
        required: true
    },
    time:{
        type: String,
        required: true
    },
    guests:{
        type: Number,
        required: true
    },
    request:{
        type: String,

    },
    status:{
        type: String,
        default:'pending'
    }
    


})

const reservationCollection = mongoose.model('reservationCollection', reservationSchema); //model create korle DB te auto collection create hoy. for specific collection provide third params.
module.exports = reservationCollection;