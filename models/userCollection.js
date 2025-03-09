const mongoose = require('mongoose');


const userSchema = mongoose.Schema({
    name:{
        type: String,
        required: true
    },
    email:{
        type: String,
        required: true
    },
    lastSignInTime:{
        type: String,
    },
    role:{
        type: String,

    }

})

const userCollection = mongoose.model('userCollection', userSchema); //model create korle DB te auto collection create hoy. for specific collection provide third params.
module.exports = userCollection;