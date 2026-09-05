const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      console.error("❌ MONGO_URI environment variable is missing! Please configure it in Render environment settings.");
      return;
    }
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host} (${conn.connection.name})`);

    // Ensure legacy global unique index on transactionId is dropped so each user can have isolated demo datasets
    try {
      const paymentCol = conn.connection.collection("paymentrecords");
      const indexes = await paymentCol.indexes();
      const legacyTxnIndex = indexes.find((idx) => idx.name === "transactionId_1" && idx.unique);
      if (legacyTxnIndex) {
        console.log("Dropping legacy global unique index transactionId_1 on paymentrecords...");
        await paymentCol.dropIndex("transactionId_1");
        console.log("Legacy transactionId_1 index dropped successfully.");
      }
    } catch (idxErr) {
      // Ignore if index doesn't exist or collection hasn't been created yet
    }
  } catch (error) {
    console.error("❌ Database Connection Failed:", error.message);
  }
};

module.exports = connectDB;