require("./env");
const mongoose = require("mongoose");

const connectOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 15000,
  connectTimeoutMS: 15000,
};

const logConnectionTips = (err) => {
  const msg = err?.message || "";

  if (
    msg.includes("MongooseServerSelectionError") ||
    msg.includes("Could not connect to any servers") ||
    msg.includes("ETIMEDOUT")
  ) {
    console.warn("\n💡 TIP: MongoDB Atlas connection timed out. Check:");
    console.warn("   1. Your internet connection");
    console.warn("   2. MongoDB Atlas → Network Access → whitelist your IP");
    console.warn("   3. MONGO_URI in backend/.env uses correct Atlas URI\n");
  } else if (msg.includes("ENOTFOUND")) {
    console.warn("\n💡 TIP: DNS resolution failed. Check internet or DNS.\n");
  }
};


const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in environment variables. Please set MONGO_URI in your .env file.");
    }
    
    // Cleanup URI (remove any trailing spaces or hidden characters)
    const mongoUri = process.env.MONGO_URI.trim();

    // await mongoose.connect(mongoUri, {
    //   useFindAndModify: false,
    //   useNewUrlParser: true,
    //   useUnifiedTopology: true,
    //   useCreateIndex: true,
    // });

await mongoose.connect(mongoUri, connectOptions);

    console.log("✅ MongoDB Connected Successfully!");
  } catch (err) {
    console.error("❌ MongoDB connection failed!");
    console.error("Error Message:", err.message);
    
    // if (err.message.includes("MongooseServerSelectionError") || err.message.includes("Could not connect to any servers")) {
    //   console.warn("\n💡 TIP: This usually means your IP address is not whitelisted in MongoDB Atlas.");
    //   console.warn("Please go to MongoDB Atlas -> Security -> Network Access and add your current IP.\n");
    // } else if (err.message.includes("ENOTFOUND")) {
    //   console.warn("\n💡 TIP: DNS resolution failed. Check your internet connection or DNS settings.\n");
    // }
    
    logConnectionTips(err);

    throw err;
  }
};

// Create separate MongoDB connection for modules that need it
let mongo_connection = null;
if (process.env.MONGO_URI) {
  const mongoUri = process.env.MONGO_URI.trim();
  try {
    mongo_connection = mongoose.createConnection(mongoUri, {
      useFindAndModify: false,
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      keepAlive: 1,
      poolSize: 10, // Reduced from 100 to be more reasonable for dev
      bufferMaxEntries: 0,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 30000,
    });

    mongo_connection.on("error", (err) => {
      console.error("⚠️ Secondary MongoDB connection error:", err.message);
      if (err.message.includes("Could not connect")) {
         console.warn("Verify your IP whitelist in MongoDB Atlas.");
      }
    });

    mongo_connection.on("connected", () => {
      console.log("✅ Secondary MongoDB connected!");
    });
  } catch (err) {
    console.warn("Warning: Could not create separate MongoDB connection:", err.message);
  }
}

module.exports = {
  connectDB,
  mongo_connection,
};
