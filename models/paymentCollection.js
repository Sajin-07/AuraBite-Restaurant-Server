const mongoose = require('mongoose');

const paymentSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    price: {  
        type: Number, 
        required: true
    },
    transactionId: {
        type: String,  
        required: true
    },
    card_type: {
        type: String,
        default: 'ssl',  
        required: true
    },
    date: {
        type: Date,  // ✅ Changed to Date type
        default: Date.now  // ✅ Stores timestamp in UTC
    },
    cartIds: {
        type: [mongoose.Schema.Types.ObjectId],  // ✅ Changed to an array of ObjectIds
        ref: 'cartCollection', // Optional: Reference to Cart collection
        // required: true
    },
    menuItemIds: {
        type: [mongoose.Schema.Types.ObjectId],  // ✅ Changed to an array of ObjectIds
        ref: 'menuCollection', // Optional: Reference to Menu collection
        // required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'], // ✅ Restrict values to valid statuses
        default: 'pending'
    }
});

// Create the model
const paymentCollection = mongoose.model('paymentCollection', paymentSchema);

module.exports = paymentCollection;





