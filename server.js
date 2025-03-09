const express = require("express");
const app = express();
const db = require("./db");
require("dotenv").config();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const userCollection = require("./models/userCollection");
const cartCollection = require("./models/cartCollection");
const menuCollection = require("./models/menuCollection");
const paymentCollection = require("./models/paymentCollection");
const reviewCollection = require("./models/reviewCollection");
const reservationCollection = require("./models/reservationCollection");
const { ObjectId } = require("mongodb");
const mongoose = require("mongoose");
// const User = require("./models/user");
const cookieParser = require("cookie-parser");
// const { default: axios } = require("axios");
const axios = require("axios");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
// app.options('*', cors());

///////////////////////////////

// const formData = require("form-data");
// const Mailgun = require("mailgun.js");
// const mailgun = new Mailgun(formData);
// const mg = mailgun.client({
//   username: "api",
//   key: process.env.MAILGUN_API_KEY || "key-yourkeyhere",
// });

/////////////////////////////
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

app.use(express.json());
app.use(express.urlencoded());
const { v4: uuidv4 } = require("uuid");
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  })
);

///////////////////////////////////////////////////////////////***********************GEMINI******************************************/////////////////////////

const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

//Function to generate AI response
const generate = async (prompt) => {
  try {
    if (!prompt) {
      throw new Error("Prompt is required!");
    }

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    return result.response.text();
  } catch (error) {
    console.error("Error generating AI response:", error);
    return "An error occurred while generating the response.";
  }
};

// API Route
app.post("/gemini", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required!" });
    }

    const result = await generate(prompt);
    res.status(200).json({ response: result });
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// // jwt related api
// app.post("/jwt", async (req, res) => {
//   const user = req.body;
//   const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
//     expiresIn: "1h",
//   });
//   res.send({ token });
// });

// // middlewares
// const verifyToken = (req, res, next) => {
//   // console.log('inside verify token', req.headers.authorization);
//   if (!req.headers.authorization) {
//     return res.status(401).send({ message: "unauthorized access" });
//   }
//   const token = req.headers.authorization.split(" ")[1];
//   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
//     if (err) {
//       return res.status(401).send({ message: "unauthorized access" });
//     }
//     req.decoded = decoded;
//     next();
//   });
// };

app.post("/jwt", async (req, res) => {
  const user = req.body;
  console.log(user);

  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "1h",
  });
  console.log(token);

  res
    .cookie("token", token, {
      httpOnly: true, //PRODUCTION A TRUUE DIBO
      // secure: true, //production  a true dibo
      secure: true, //production  a true dibo
      // sameSite: "none",
      sameSite: "lax",
    })
    .send({ success: true });
});

// const verifyToken = async (req, res, next) => {
//   const token = req.cookies?.token;
//   console.log(token);

//   if (!token) {
//     return res.status(401).send({ message: "unauthorized access" });
//   }
//   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
//     if (err) {
//       return res.status(401).send({ message: "unauthorized access" });
//     }
//     req.user = decoded;
//     // res.status(200).send({ success: true });
//     next();
//   });
// };
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  console.log("Token received:", token);

  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log("JWT verification failed:", err);
      res.clearCookie("token", {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
      });
      return res.status(401).send({ message: "unauthorized access" });
    }
    console.log("Decoded Token:", decoded);
    req.decoded = decoded; // Fix: Change from req.user to req.decoded
    next();
  });
};

// use verify admin after verifyToken
// const verifyAdmin = async (req, res, next) => {
//   const email = req.decoded.email;
//   const query = { email: email };
//   const user = await userCollection.findOne(query);
//   const isAdmin = user?.role === "admin";
//   if (!isAdmin) {
//     return res.status(403).send({ message: "forbidden access" });
//   }
//   next();
// };
const verifyAdmin = async (req, res, next) => {
  console.log("Decoded Email:", req.decoded?.email); // Log decoded email
  const email = req.decoded.email;
  const query = { email: email };

  const user = await userCollection.findOne(query);
  console.log("Admin User Found:", user);

  const isAdmin = user?.role === "admin";
  if (!isAdmin) {
    return res.status(403).send({ message: "forbidden access" });
  }
  next();
};

app.post("/clearCookie", async (req, res) => {
  const user = req.body;
  console.log("logging out", user);
  res.clearCookie("token", { maxAge: 0 }).send({ success: true });
});

// users related api
app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
  //   const result = await userCollection.find().toArray();
  const result = await userCollection.find();
  res.send(result);
});

app.get("/users/admin/:email", verifyToken, async (req, res) => {
  const email = req.params.email;

  if (email !== req.decoded.email) {
    return res.status(403).send({ message: "forbidden access" });
  }

  const query = { email: email };
  const user = await userCollection.findOne(query);
  let admin = false;
  if (user) {
    admin = user?.role === "admin";
  }
  res.send({ admin });
});

app.post("/users", async (req, res) => {
  const user = req.body;
  // insert email if user doesnt exists:
  // you can do this many ways (1. email unique, 2. upsert 3. simple checking)
  const query = { email: user.email };
  const existingUser = await userCollection.findOne(query);
  if (existingUser) {
    return res.send({ message: "user already exists", insertedId: null });
  }
  const newUser = new userCollection(user);
  const saveIn = await newUser.save();
  console.log("Data saved");
  res.status(200).json(saveIn);
});

app.patch("/userUpdate", async (req, res) => {
  try {
    const { email, lastLoggedAt } = req.body;

    if (!email || !lastLoggedAt) {
      return res
        .status(400)
        .json({ message: "Email and lastLoggedAt are required" });
    }

    // Update user document
    const updatedUser = await userCollection.findOneAndUpdate(
      { email }, // Find user by email
      { lastSignInTime: lastLoggedAt }, // Update lastSignInTime
      { new: true } // Return the updated document
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log("User updated:", updatedUser);
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.patch("/users/admin/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;

    if (!id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Update user document
    const updatedUser = await userCollection.findOneAndUpdate(
      { _id: id }, // Find user by ID
      { role: "admin" }, // Update role to admin
      { new: true } // Return the updated document
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log("User updated:", updatedUser);
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
//   const id = req.params.id;
//   const query = { _id: new ObjectId(id) };
//   const result = await userCollection.deleteOne(query);
//   res.send(result);
// });

app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;

    if (!id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const response = await userCollection.findByIdAndDelete(id);

    if (!response) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log("User deleted");
    res.status(200).json({ message: "Deleted Successfully", deletedCount: 1 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// menu related apis
app.get("/menu", async (req, res) => {
  //   const result = await menuCollection.find().toArray();
  const result = await menuCollection.find();
  res.send(result);
});

// app.get("/menu/:id", async (req, res) => {
//   const id = req.params.id;
//   data = await menuCollection.find({_id: id});
//   console.log("response fetched");
//   res.status(200).json(data);
// });
app.get("/menu/:id", async (req, res) => {
  try {
    const id = req.params.id;

    // Fetch using string-based ID since IDs in your collection are stored as strings
    const data = await menuCollection.findOne({ _id: id });

    if (!data) {
      return res.status(404).json({ error: "Item not found" });
    }

    console.log("Response fetched:", data);
    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching menu item:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/menu", verifyToken, verifyAdmin, async (req, res) => {
  const item = req.body;
  const newMenu = new menuCollection(item);
  const saveIn = await newMenu.save();
  console.log("Data saved");
  res.status(200).json(saveIn);
});

app.patch("/menu/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    userID = req.params.id;
    const updatedMenuData = req.body;

    const response = await menuCollection.findByIdAndUpdate(
      userID,
      updatedMenuData,
      {
        new: true, // Return the updated document
        runValidators: true, // Run Mongoose validation
      }
    );

    if (!response) {
      return res.status(404).json({ error: "Menu not found" });
    }
    console.log("data updated");
    res.status(200).json(response);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.delete("/menu/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const userID = req.params.id; // Extract the User's ID from the URL parameter

    // Assuming you have a User model
    const response = await menuCollection.findByIdAndDelete(userID);
    if (!response) {
      return res.status(404).json({ error: "Menu not found" });
    }
    console.log("data deleted");
    res.status(200).json({ message: "Deleted Successfully", deletedCount: 1 }); // Include deletedCount
    // res.status(200).json({message: 'Deleted Successfully'});
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/reviews", async (req, res) => {
  //   const result = await reviewCollection.find().toArray();
  const result = await reviewCollection.find();
  res.send(result);
});
app.post("/reviews",verifyToken, async (req, res) => {
  const data = req.body;
  const newReview = new reviewCollection(data);
  const saveIn = await newReview.save();
  res.status(200).json(saveIn);
});
app.post("/reservation",verifyToken, async (req, res) => {
  const data = req.body;
  const newReservation = new reservationCollection(data);
  const saveIn = await newReservation.save();
  res.status(200).json(saveIn);
});

app.get("/reservation",verifyToken, async (req, res) => {
  //   const result = await reviewCollection.find().toArray();
  const result = await reservationCollection.find();
  res.send(result);
});

app.patch("/reservation/:id",verifyToken,verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // Expecting 'confirmed' or 'denied'

  try {
    const result = await reservationCollection.updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      { $set: { status: status } }
    );

    if (!result) {
      return res
        .status(400)
        .json({ success: false, message: "No changes made" });
    }
    res.json({ success: true, message: "Reservation updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error });
  }
});

// carts collection
app.get("/carts", async (req, res) => {
  const email = req.query.email;
  const query = { email: email };
  //   const result = await cartCollection.find(query).toArray();
  const result = await cartCollection.find(query);
  res.send(result);
});

//main
// app.post("/carts", async (req, res) => {
//   try {
//     const cartItem = req.body;
//     const newCartIItem = new cartCollection(cartItem);

//     const saveIn = await newCartIItem.save();
//     console.log("Added to Cart");
//     res.status(200).json(saveIn);
//     // res.send(saveIn);
//   } catch (error) {
//     console.log(error);
//     res.status(500).json("Internal server Error");
//   }
// });

app.post("/carts",verifyToken, async (req, res) => {
  try {
    const { menuId, email, quantity } = req.body;

    // Find existing cart item
    const existingItem = await cartCollection.findOne({
      menuId: menuId,
      email: email,
    });

    if (existingItem) {
      // Update quantity if exists
      const updatedItem = await cartCollection.findOneAndUpdate(
        { _id: existingItem._id },
        { $inc: { quantity: quantity } },
        { new: true }
      );
      res.status(200).json(updatedItem);
    } else {
      // Create new item if doesn't exist
      const newItem = new cartCollection(req.body);
      const savedItem = await newItem.save();
      res.status(200).json(savedItem);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json("Internal server Error");
  }
});

//new
// Update cart quantity
app.patch("/carts/:id",verifyToken, async (req, res) => {
  try {
    const { quantity } = req.body;
    const { id } = req.params;

    if (quantity < 1) {
      return res.status(400).json({ message: "Quantity must be at least 1" });
    }

    // Update the quantity in the cart
    const updatedItem = await cartCollection.findOneAndUpdate(
      { _id: id },
      { $set: { quantity: quantity } },
      { new: true }
    );

    if (!updatedItem) {
      return res.status(404).json({ message: "Item not found" });
    }

    res.status(200).json(updatedItem);
  } catch (error) {
    console.error("Error updating cart quantity:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.delete("/carts/:id",verifyToken, async (req, res) => {
  try {
    const userID = req.params.id; // Extract the User's ID from the URL parameter

    // Assuming you have a User model
    const response = await cartCollection.findByIdAndDelete(userID);
    if (!response) {
      return res.status(404).json({ error: "CartItem not found" });
    }
    console.log("data deleted");
    res.status(200).json({ message: "Deleted Successfully", deletedCount: 1 }); // Include deletedCount
    // res.status(200).json({message: 'Deleted Successfully'});
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
///////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////
app.patch("/carts/update-item/:menuId",verifyToken, async (req, res) => {
  try {
    const { menuId } = req.params;
    const updatedItem = req.body;

    // Update all cart items that contain this menu item
    const result = await cartCollection.updateMany(
      { menuId: menuId }, // Find all cart items with this menu item
      {
        $set: {
          name: updatedItem.name,
          price: updatedItem.price,
          image: updatedItem.image,
        },
      }
    );

    res.json({
      success: true,
      message: "Cart items updated",
      modifiedCount: 1,
    });
  } catch (error) {
    console.error("Error updating cart items:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

app.delete("/carts/remove-item/:menuId",verifyToken, async (req, res) => {
  try {
    const { menuId } = req.params;

    // Delete all cart items that contain this menu item
    const result = await cartCollection.deleteMany({ menuId: menuId });
    res.status(200).json({ message: "Cart items removed", deletedCount: 1 });
  } catch (error) {
    console.error("Error deleting cart items:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////
// payment intent
app.post("/create-payment-intent", async (req, res) => {
  const { price } = req.body;
  const amount = parseInt(price * 100);
  console.log(amount, "amount inside the intent");

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: "usd",
    payment_method_types: ["card"],
  });

  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});

app.get("/payments/:email", verifyToken, async (req, res) => {
  const query = { email: req.params.email };
  if (req.params.email !== req.decoded.email) {
    return res.status(403).send({ message: "forbidden access" });
  }
  //   const result = await paymentCollection.find(query).toArray();
  const result = await paymentCollection.find(query);
  res.send(result);
});

// app.post("/payments", async (req, res) => {
//   const payment = req.body;
//   const newPayment = new paymentCollection(payment);
//   const saveIn = await newPayment.save();
//   //  carefully delete each item from the cart
//   console.log("payment info", payment);
//   res.status(200).json(saveIn);

//   const query = {
//     _id: {
//       $in: payment.cartIds.map((id) => new ObjectId(id)),
//     },
//   };

//   const deleteResult = await cartCollection.deleteMany(query);

//   res.send({ paymentResult, deleteResult });
// });

app.post("/payments", async (req, res) => {
  try {
    const payment = req.body;
    const newPayment = new paymentCollection(payment);
    const saveIn = await newPayment.save();

    console.log("Payment info:", payment);

    // Delete items from the cart before sending the response
    const query = {
      _id: {
        $in: payment.cartIds.map((id) => new mongoose.Types.ObjectId(id)),
      },
    };

    const deleteResult = await cartCollection.deleteMany(query);

    // Send the final response **only once**
    res.status(200).json({ paymentResult: saveIn, deleteResult });
  } catch (error) {
    console.error("Error processing payment:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// stats or analytics
app.get("/admin-stats", verifyToken, verifyAdmin, async (req, res) => {
  const users = await userCollection.estimatedDocumentCount();
  const menuItems = await menuCollection.estimatedDocumentCount();
  const orders = await paymentCollection.estimatedDocumentCount();

  // this is not the best way
  // const payments = await paymentCollection.find().toArray();
  // const revenue = payments.reduce((total, payment) => total + payment.price, 0);

  const result = await paymentCollection.aggregate([
    {
      $group: {
        _id: null,
        totalRevenue: {
          $sum: "$price",
        },
      },
    },
  ]);
  // .toArray();

  const revenue = result.length > 0 ? result[0].totalRevenue : 0;

  res.send({
    users,
    menuItems,
    orders,
    revenue,
  });
});

// order status
/**
 * ----------------------------
 *    NON-Efficient Way
 * ------------------------------
 * 1. load all the payments
 * 2. for every menuItemIds (which is an array), go find the item from menu collection
 * 3. for every item in the menu collection that you found from a payment entry (document)
 */

// using aggregate pipeline  verifyToken, verifyAdmin,
app.get("/order-stats", async (req, res) => {
  const result = await paymentCollection.aggregate([
    {
      $unwind: "$menuItemIds",
    },
    {
      $lookup: {
        from: "menu",
        localField: "menuItemIds",
        foreignField: "_id",
        as: "menuItems",
      },
    },
    {
      $unwind: "$menuItems",
    },
    {
      $group: {
        _id: "$menuItems.category",
        quantity: { $sum: 1 },
        revenue: { $sum: "$menuItems.price" },
      },
    },
    {
      $project: {
        _id: 0,
        category: "$_id",
        quantity: "$quantity",
        revenue: "$revenue",
      },
    },
  ]);
  // .toArray();

  res.send(result);
});

//SSLCommerz

// app.post('/create-payment', async(req,res)=>{
//   const paymentData = req.body;
//   console.log(paymentData);
//   res.status(200).json(paymentData);

//   const initiateData = {
//     store_id: process.env.STORE_ID,
//     store_passwd: process.env.STORE_PASSWORD,
//     total_amount: paymentData.totalPrice,
//     currency: 'BDT',
//     tran_id: 'REF123', // generate unique transaction ID
//     success_url: 'http://localhost:5000/success-payment',
//     fail_url: 'http://yourdomain.com/fail',
//     cancel_url: 'http://yourdomain.com/cancel',
//     shipping_method: 'NO',
//     product_name: 'Restaurant Order',
//     product_category: 'Food',
//     product_profile: 'general',
//     cus_name: paymentData.name,
//     cus_email: paymentData.email,
//     cus_add1: paymentData.address,
//     cus_city: paymentData.city,
//     cus_postcode: paymentData.postalCode,
//     cus_phone: paymentData.phone,
//   };

//   const sslResponse = await axios.post('https://sandbox.sslcommerz.com/gwprocess/v4/api.php',initiateData, {headers: { 'Content-Type': 'application/json' }});
//   console.log(sslResponse.data);

// })

app.post("/create-payment", async (req, res) => {
  try {
    const paymentData = req.body;
    console.log(paymentData);

    const initiateData = {
      store_id: process.env.STORE_ID, // Ensure correct env variable names
      store_passwd: process.env.STORE_PASSWORD,
      total_amount: paymentData.totalPrice,
      currency: "BDT",
      tran_id: uuidv4(), // Generate a unique transaction ID
      success_url: "http://localhost:5000/success-payment",
      fail_url: "http://localhost:5000/fail-payment",
      cancel_url: "http://localhost:5000/cancel-payment",
      shipping_method: "NO",
      product_name: "Restaurant Order",
      product_category: "Food",
      product_profile: "general",
      cus_name: paymentData.name,
      cus_email: paymentData.email,
      cus_add1: paymentData.address,
      cus_city: paymentData.city,
      cus_country: paymentData.city,
      cus_postcode: paymentData.postalCode,
      cus_phone: paymentData.phone,
    };

    const sslResponse = await axios({
      method: "POST",
      url: "https://sandbox.sslcommerz.com/gwprocess/v4/api.php",
      data: initiateData,
      headers: { "Content-Type": "application/x-www-form-urlencoded" }, // Important header
    });

    const saveData = {
      name: paymentData.name,
      email: paymentData.email,
      price: paymentData.totalPrice,
      transactionId: initiateData.tran_id,
      date: new Date(), // utc date convert. use moment js to
      menuItemIds: paymentData.menuItemIds,
      status: "pending",
    };
    const newPayment = new paymentCollection(saveData);
    const saveIn = await newPayment.save();
    console.log("Payment info saved");

    if (saveIn) {
      console.log(sslResponse.data);
      res.status(200).json({ paymentUrl: sslResponse.data.GatewayPageURL }); // Send response after getting data
    }
  } catch (error) {
    console.error("Error initiating payment:", error);
    res
      .status(500)
      .json({ message: "Payment initiation failed", error: error.message });
  }
});

//sendGrid

app.post("/success-payment", async (req, res) => {
  try {
    const successData = req.body;
    console.log(successData);

    if (successData.status !== "VALID") {
      return res.status(400).json({ message: "Transaction Failed" });
    }

    // Update Payment Status in DB
    const updatePaymentStatus = await paymentCollection.findOneAndUpdate(
      { transactionId: successData.tran_id },
      { $set: { status: "Success", card_type: successData.card_type } },
      { new: true }
    );

    if (!updatePaymentStatus) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    // Get user details
    const userEmail = updatePaymentStatus.email;
    const transactionId = updatePaymentStatus.transactionId;
    const totalPrice = updatePaymentStatus.price;
    const paymentDate = new Date().toLocaleString(); // Format date

    // Delete all cart items for this user
    await cartCollection.deleteMany({ email: userEmail });

    console.log(`Cart items for ${userEmail} deleted successfully`);

    // Prepare Invoice Email HTML
        const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
          <title>Invoice - Payment Successful</title>
          <style>
              body {
                  font-family: Arial, sans-serif;
                  background-color: #f4f4f4;
                  padding: 20px;
              }
              .invoice-container {
                  background: #ffffff;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                  border-radius: 10px;
                  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                  text-align: center;
              }
              .invoice-header {
                  background: #0073e6;
                  color: white;
                  padding: 15px;
                  font-size: 20px;
                  font-weight: bold;
                  border-radius: 10px 10px 0 0;
              }
              .invoice-body {
                  padding: 20px;
                  text-align: left;
              }
              .invoice-body p {
                  font-size: 16px;
                  color: #555;
              }
              .invoice-details {
                  background: #f9f9f9;
                  padding: 15px;
                  border-radius: 5px;
                  margin: 20px 0;
              }
              .invoice-details ul {
                  list-style: none;
                  padding: 0;
              }
              .invoice-details ul li {
                  padding: 5px 0;
                  font-size: 16px;
              }
              .success-badge {
                  display: inline-block;
                  background: #28a745;
                  color: white;
                  padding: 5px 10px;
                  border-radius: 5px;
                  font-weight: bold;
                  font-size: 14px;
              }
              .footer {
                  font-size: 14px;
                  color: #777;
                  margin-top: 15px;
              }
              .contact-btn {
                  display: inline-block;
                  padding: 10px 20px;
                  background: #0073e6;
                  color: white;
                  text-decoration: none;
                  border-radius: 5px;
                  margin-top: 15px;
              }
          </style>
      </head>
      <body>
          <div class="invoice-container">
              <div class="invoice-header">
                  Payment Invoice
              </div>
              <div class="invoice-body">
                  <p>Dear Customer,</p>
                  <p>Thank you for your payment. Below are your transaction details:</p>

                  <div class="invoice-details">
                      <ul>
                          <li><strong>Transaction ID:</strong> ${transactionId}</li>
                          <li><strong>Total Amount:</strong> ${totalPrice} BDT</li>
                          <li><strong>Payment Date:</strong> ${paymentDate}</li>
                          <li><strong>Payment Status:</strong> <span class="success-badge">Success ✅</span></li>
                      </ul>
                  </div>

                  <a href="https://yourbusiness.com/contact" class="contact-btn">Contact Support</a>
              </div>

              <div class="footer">
                  <p>Best regards,</p>
                  <p><strong>AuraBite Restaurant</strong></p>
              </div>
          </div>
      </body>
      </html>
    `;

    // Email message object
    const msg = {
      to: userEmail,
      from: process.env.SENDGRID_VERIFIED_EMAIL, // This should be your verified sender email
      subject: "Payment Receipt - Your Business Name",
      html: invoiceHTML,
    };

    // Send email with error handling
    try {
      await sgMail.send(msg);
      console.log(`Invoice email sent to ${userEmail}`);
    } catch (emailError) {
      console.error("Error sending email:", emailError);
    }

    // Redirect to success page
    return res.redirect("http://localhost:5173/dashboard/Success");
  } catch (error) {
    console.error("Error processing success-payment:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/fail-payment", async (req, res) => {
  try {
    const failData = req.body;
    console.log("Payment Failed:", failData);

    // Update status to "Failed" in the database
    const updatePaymentStatus = await paymentCollection.findOneAndUpdate(
      { transactionId: failData.tran_id },
      { $set: { status: "Failed" } },
      { new: true }
    );

    if (!updatePaymentStatus) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    // Redirect user to the fail page
    return res.redirect("http://localhost:5173/dashboard/Fail");
  } catch (error) {
    console.error("Error processing fail-payment:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/cancel-payment", async (req, res) => {
  try {
    const cancelData = req.body;
    console.log("Payment Canceled:", cancelData);
    // Update status to "Canceled" in the database
    const updatePaymentStatus = await paymentCollection.findOneAndUpdate(
      { transactionId: cancelData.tran_id },
      { $set: { status: "Canceled" } },
      { new: true }
    );

    if (!updatePaymentStatus) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    // Redirect user to the cancel page
    return res.redirect("http://localhost:5173/dashboard/Cancel");
  } catch (error) {
    console.error("Error processing cancel-payment:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("Server is running on http://localhost:5000");
});

/**
 * --------------------------------
 *      NAMING CONVENTION
 * --------------------------------
 * app.get('/users')
 * app.get('/users/:id')
 * app.post('/users')
 * app.put('/users/:id')
 * app.patch('/users/:id')
 * app.delete('/users/:id')
 *
 */
//main
// app.post("/success-payment", async (req, res) => {
//   try {
//     const successData = req.body; // SSLCommerz response
//     console.log(successData);

//     if (successData.status !== "VALID") {
//       return res.status(400).json({ message: "Transaction Failed" });
//     }

//     // Update Payment Status in DB
//     const updatePaymentStatus = await paymentCollection.findOneAndUpdate(
//       { transactionId: successData.tran_id },
//       { $set: { status: "Success", card_type: successData.card_type } },
//       { new: true }
//     );

//     if (!updatePaymentStatus) {
//       return res.status(404).json({ message: "Transaction not found" });
//     }

//     // Get the email of the user who made the payment
//     const userEmail = updatePaymentStatus.email;

//     // Delete all cart items for this user
//     await cartCollection.deleteMany({ email: userEmail });

//     console.log(`Cart items for ${userEmail} deleted successfully`);
// //////////////////////////////////////////////////////////////////////////////////////////

// ///////////////////////////////////////////////////////////////////////////////////////////

//     // Redirect to success page
//     return res.redirect("http://localhost:5173/dashboard/Success");
//   } catch (error) {
//     console.error("Error processing success-payment:", error);
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// });

//mailgun
// app.post("/success-payment", async (req, res) => {
//   try {
//     const successData = req.body; // SSLCommerz response
//     console.log(successData);

//     if (successData.status !== "VALID") {
//       return res.status(400).json({ message: "Transaction Failed" });
//     }

//     // Update Payment Status in DB
//     const updatePaymentStatus = await paymentCollection.findOneAndUpdate(
//       { transactionId: successData.tran_id },
//       { $set: { status: "Success", card_type: successData.card_type } },
//       { new: true }
//     );

//     if (!updatePaymentStatus) {
//       return res.status(404).json({ message: "Transaction not found" });
//     }

//     // Get the email of the user who made the payment
//     const userEmail = updatePaymentStatus.email;

//     // Delete all cart items for this user
//     await cartCollection.deleteMany({ email: userEmail });

//     console.log(`Cart items for ${userEmail} deleted successfully`);
// //////////////////////////////////////////////////////////////////////////////////////////
//     // Get payment details
//     // const userEmail = updatePaymentStatus.email;
//     const transactionId = updatePaymentStatus.transactionId;
//     const totalPrice = updatePaymentStatus.price;
//     const paymentDate = new Date().toLocaleString(); // Format date

//     // Prepare Invoice Email HTML
//     const invoiceHTML = `
//       <h1>Payment Successful ✅</h1>
//       <p>Dear Customer,</p>
//       <p>Thank you for your payment. Here are your transaction details:</p>
//       <ul>
//         <li><strong>Transaction ID:</strong> ${transactionId}</li>
//         <li><strong>Total Amount:</strong> ${totalPrice} BDT</li>
//         <li><strong>Payment Date:</strong> ${paymentDate}</li>
//         <li><strong>Payment Status:</strong> Success ✅</li>
//       </ul>
//       <p>We appreciate your business! If you have any questions, feel free to contact us.</p>
//       <p>Best regards,</p>
//       <p><strong>Your Business Name</strong></p>
//     `;

//     mg.messages
//       .create(process.env.MAILGUN_DOMAIN, {
//         from: `SjsCode Creations <no-reply@${process.env.MAILGUN_DOMAIN}>`,
//         to: ["sifatsajin88@gmail.com"],
//         subject: "Hello",
//         text: "Testing some Mailgun awesomness!",
//         html: invoiceHTML,
//       })
//       .then((msg) => console.log(msg)) // logs response data
//       .catch((err) => console.error(err)); // logs any error
// ///////////////////////////////////////////////////////////////////////////////////////////

//     // Redirect to success page
//     return res.redirect("http://localhost:5173/dashboard/Success");
//   } catch (error) {
//     console.error("Error processing success-payment:", error);
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// });
