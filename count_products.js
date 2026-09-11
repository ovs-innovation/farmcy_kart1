require('./backend/config/env');
const mongoose = require('mongoose');
const Product = require('./backend/models/Product');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const count = await Product.countDocuments({ status: "show" });
  const all = await Product.find({ status: "show" }).select("title slug category brand");
  console.log('Total show products:', count);
  console.log('Products:', all);
  await mongoose.disconnect();
}
run();
