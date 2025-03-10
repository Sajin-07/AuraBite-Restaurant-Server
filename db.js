// const mongoose = require('mongoose');
// require('dotenv').config();

// // Define the MongoDB connection URL
// const mongoURL = process.env.MONGODB_URL_ATLAS
// // const mongoURL = process.env.MONGODB_URL_LOCAL

// // Set up MongoDB connection
// mongoose.connect(mongoURL, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true
// })
// // mongoose.connect(mongoURL)

// // Get the default connection
// // Mongoose maintains a default connection object representing the MongoDB connection.
// const db = mongoose.connection;

// // Define event listeners for database connection

// db.on('connected', () => {
//     console.log('Connected to MongoDB server');
// });

// db.on('error', (err) => {
//     console.error('MongoDB connection error:', err);
// });

// db.on('disconnected', () => {
//     console.log('MongoDB disconnected');
// });


// // Export the database connection
// module.exports = db; //const db = mongoose.connection; ei line export kortesi not file.

const mongoose = require('mongoose');
require('dotenv').config();

// Cache the database connection
let cachedConnection = null;

// Define the MongoDB connection URL
const mongoURL = process.env.MONGODB_URL_ATLAS;

const connectDB = async () => {
  // If we already have a connection, use it
  if (cachedConnection) {
    return cachedConnection;
  }

  try {
    // Create new connection
    const conn = await mongoose.connect(mongoURL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000, // Timeout after 10s
    });

    console.log('Connected to MongoDB server');
    cachedConnection = conn;
    return conn;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Handle connection events
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
  cachedConnection = null;
});

// Export the connection function
module.exports = connectDB;