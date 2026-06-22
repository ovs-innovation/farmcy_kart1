require("dotenv").config();
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

const signInToken = (user) => {
  return jwt.sign(
    {
      _id: user._id,
      name: user.name,
      email: user.email,
      address: user.address,
      phone: user.phone,
      image: user.image,
      role: user.role,
    },
    process.env.JWT_SECRET || "fallback_jwt_secret",
    {
      expiresIn: "7d",
    }
  );
};

const tokenForVerify = (user) => {
  return jwt.sign(
    {
      _id: user._id,
      name: user.name,
      email: user.email,
      password: user.password,
    },
    process.env.JWT_SECRET_FOR_VERIFY || "fallback_jwt_verify_secret",
    { expiresIn: "15m" }
  );
};

const isAuth = async (req, res, next) => {
  const { authorization } = req.headers;
  // console.log("authorization", req.headers);
  try {
    if (!authorization) {
      console.log("isAuth: No authorization header");
      return res.status(401).json({
        message: "Authorization header is required",
      });
    }
    const token = authorization.split(" ")[1];
    if (!token) {
      console.log("isAuth: No token found in header");
      return res.status(401).json({
        message: "Token is required",
      });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_jwt_secret");
    req.user = decoded;
    next();
  } catch (err) {
    console.log("isAuth Error:", err.message);
    res.status(401).json({
      message: err.message || "Invalid or expired token",
    });
  }
};

const isAuthOptional = async (req, res, next) => {
  const { authorization } = req.headers;
  // console.log("isAuthOptional: Authorization Header:", authorization ? "Present" : "Missing");
  try {
    if (authorization) {
      const token = authorization.split(" ")[1];
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_jwt_secret");
        req.user = decoded;
        // console.log("isAuthOptional: Token verified for user:", decoded._id);
      }
    }
  } catch (err) {
    // If token is invalid or expired, we just ignore it and proceed as guest
    console.log("isAuthOptional Error:", err.message);
  }
  next();
};


const isAdmin = async (req, res, next) => {
  const adminRoles = ["Admin", "Super Admin", "Cashier", "Manager", "CEO", "Driver", "Security Guard", "Accountant"];
  if (req.user && req.user.role && adminRoles.includes(req.user.role)) {
    next();
  } else {
    res.status(401).send({
      message: "User is not authorized as Admin",
    });
  }
};

const secretKey = process.env.ENCRYPT_PASSWORD || "default_encryption_key_for_dev_only";

// Ensure the secret key is exactly 32 bytes (256 bits)
const key = crypto.createHash("sha256").update(secretKey).digest();

// Generate an initialization vector (IV)
const iv = crypto.randomBytes(16); // AES-CBC requires a 16-byte IV

// Helper function to encrypt data
const handleEncryptData = (data) => {
  // Ensure the input is a string or convert it to a string
  const dataToEncrypt = typeof data === "string" ? data : JSON.stringify(data);

  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encryptedData = cipher.update(dataToEncrypt, "utf8", "hex");
  encryptedData += cipher.final("hex");

  return {
    data: encryptedData,
    iv: iv.toString("hex"),
  };
};

module.exports = {
  isAuth,
  isAuthOptional,
  isAdmin,
  signInToken,
  tokenForVerify,
  handleEncryptData,
};
