require("./config/env");

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { connectDB } = require("./config/db");
const Admin = require("./models/Admin");

async function seedAdmin() {
    try {
        await connectDB();

        const exists = await Admin.findOne({
            email: "info@ovsinnovation.com",
        });

        if (exists) {
            console.log("Admin already exists");
            process.exit(0);
        }

        await Admin.create({
            name: "Admin",
            email: "info@ovsinnovation.com",
            password: bcrypt.hashSync("Ovsinnovation@123", 10),
            role: "Super Admin",
            status: "Active",
        });

        console.log("✅ Super Admin created successfully");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seedAdmin();