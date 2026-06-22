require('dotenv').config();
const mongoose = require('mongoose');
const Customer = require('../models/Customer');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to DB');

    const customer = await Customer.findOne({ phone: '9263128909' });
    if (!customer) {
      console.log('Customer not found with phone 9263128909');
      // Let's search by name
      const customersByName = await Customer.find({ name: /Drishti/i });
      console.log('Customers matching Drishti:', customersByName);
    } else {
      console.log('Customer details:', {
        _id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        emailVerified: customer.emailVerified,
        pendingEmail: customer.pendingEmail,
      });
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
