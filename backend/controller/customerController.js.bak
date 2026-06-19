require("../config/env");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Customer = require("../models/Customer");
const Order = require("../models/Order");
const Setting = require("../models/Setting");
const { signInToken, tokenForVerify } = require("../config/auth");
const { sendEmail } = require("../lib/email-sender/sender");
const { sendSMS, sendLoginOtpSms } = require("../lib/sms-sender/sender");
const {
  simpleOtpEmail,
  simpleVerifyEmail,
  simpleResetPasswordEmail,
} = require("../lib/email-sender/simple-templates");
const { sendVerificationCode } = require("../lib/phone-verification/sender");

const PLACEHOLDER_EMAIL_DOMAIN = "phone.farmacykart.com";

const normalizePhone = (phone) => {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
};

const buildPlaceholderEmail = (phone) => {
  const p = normalizePhone(phone);
  return `${p || Date.now()}@${PLACEHOLDER_EMAIL_DOMAIN}`;
};

const isPlaceholderEmail = (email) =>
  !!email && String(email).toLowerCase().endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`);

const computeProfileComplete = (customer) => {
  if (!customer) return false;
  const hasName =
    customer.name &&
    customer.name.trim().length > 1 &&
    !/^user\s+\d+$/i.test(customer.name.trim());
  const hasPhone = !!normalizePhone(customer.phone);
  const hasAddress =
    !!(customer.address && String(customer.address).trim()) ||
    (Array.isArray(customer.shippingAddress) && customer.shippingAddress.length > 0);
  return !!(hasName && hasPhone && hasAddress);
};

const sendCustomerAuthResponse = async (res, customer, message, extra = {}) => {
  const customerWithCart = await Customer.findById(customer._id).populate({
    path: "cart.productId",
    select: "title prices image slug",
  });

  const profileComplete =
    customerWithCart.profileComplete === true ||
    computeProfileComplete(customerWithCart);

  if (customerWithCart.profileComplete !== profileComplete) {
    customerWithCart.profileComplete = profileComplete;
    await customerWithCart.save();
  }

  res.send({
    token: signInToken(customerWithCart),
    _id: customerWithCart._id,
    name: customerWithCart.name,
    email: customerWithCart.email,
    address: customerWithCart.address,
    phone: customerWithCart.phone,
    image: customerWithCart.image,
    role: customerWithCart.role || "customer",
    cart: customerWithCart.cart,
    phoneVerified: !!customerWithCart.phoneVerified,
    emailVerified: !!customerWithCart.emailVerified,
    profileComplete,
    message,
    ...extra,
  });
};

const verifyEmailAddress = async (req, res) => {
  const isAdded = await Customer.findOne({ email: req.body.email });
  if (isAdded) {
    return res.status(403).send({
      message: "This Email already Added!",
    });
  } else {
    const token = tokenForVerify(req.body);
    const globalSetting = await Setting.findOne({ name: "globalSetting" });
    const option = {
      name: req.body.name,
      email: req.body.email,
      token: token,
      shop_name: globalSetting?.setting?.shop_name || "Farmacykart",
    };
    const { html, text } = simpleVerifyEmail(option);
    const body = {
      to: `${req.body.email}`,
      subject: `Complete your ${option.shop_name} signup`,
      html,
      text,
      emailType: "signup-verify",
    };

    const message = "Please check your email to verify your account!";
    try {
      await sendEmail(body);
      res.send({ message });
    } catch (emailErr) {
      console.error("Email send failed (non-blocking):", emailErr.message || emailErr);
      res.status(200).send({ message, emailError: emailErr.message || String(emailErr) });
    }
  }
};

const verifyPhoneNumber = async (req, res) => {
  const phoneNumber = req.body.phone;

  if (!phoneNumber) {
    return res.status(400).send({
      message: "Phone number is required.",
    });
  }

  try {
    // Check if the phone number is already associated with an existing customer
    const isAdded = await Customer.findOne({ phone: phoneNumber });

    if (isAdded) {
      return res.status(403).send({
        message: "This phone number is already added.",
      });
    }

    // Generate a random 6-digit verification code
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    // Send verification code via SMS
    const sent = await sendVerificationCode(phoneNumber, verificationCode);

    if (!sent) {
      return res.status(500).send({
        message: "Failed to send verification code.",
      });
    }

    const message = "Please check your phone for the verification code!";
    return res.send({ message });
  } catch (err) {
    console.error("Error during phone verification:", err);
    res.status(500).send({
      message: err.message,
    });
  }
};

const findCustomerByPhone = async (phoneNumber) => {
  const phoneNorm = normalizePhone(phoneNumber);
  if (!phoneNorm || phoneNorm.length < 10) return null;
  return Customer.findOne({
    $or: [{ phone: phoneNorm }, { phone: String(phoneNumber).replace(/\D/g, "") }],
  });
};

const sendPhoneEmailOTP = async (req, res) => {
  try {
    const { phoneNumber, intent: rawIntent } = req.body;
    const intent = rawIntent === "signup" ? "signup" : "login";

    if (!phoneNumber) {
      return res.status(400).send({ message: "Phone number is required." });
    }

    const phoneNorm = normalizePhone(phoneNumber);
    if (!phoneNorm || phoneNorm.length < 10) {
      return res.status(400).send({ message: "Valid 10-digit phone number is required." });
    }

    let user = await findCustomerByPhone(phoneNumber);

    if (intent === "signup" && user) {
      return res.status(409).send({
        message: "This mobile number is already registered. Please login instead.",
        code: "PHONE_ALREADY_REGISTERED",
      });
    }

    if (intent === "login" && !user) {
      return res.status(404).send({
        message: "No account found with this number. Please sign up first.",
        code: "PHONE_NOT_REGISTERED",
      });
    }

    if (!user && intent === "signup") {
      user = new Customer({
        name: `User ${phoneNorm.slice(-4)}`,
        email: buildPlaceholderEmail(phoneNorm),
        phone: phoneNorm,
        phoneVerified: false,
        authProvider: "phone",
        profileComplete: false,
      });
      await user.save();
    }

    // Check resend cooldown (60 seconds)
    if (user.lastLoginOtpSentAt && (Date.now() - user.lastLoginOtpSentAt < 60 * 1000)) {
      const remainingSeconds = Math.ceil(60 - (Date.now() - user.lastLoginOtpSentAt) / 1000);
      return res.status(429).send({
        message: `Please wait ${remainingSeconds} seconds before requesting a new OTP.`,
      });
    }

    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const hashedOtp = bcrypt.hashSync(otp, 10);
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.loginOtp = hashedOtp;
    user.loginOtpExpires = otpExpires;
    user.loginOtpAttempts = 0; // Reset attempts on new OTP request
    user.lastLoginOtpSentAt = new Date();
    await user.save();

    // Send OTP to registered email
    const globalSetting = await Setting.findOne({ name: "globalSetting" });
    const option = {
      name: user.name,
      email: user.email,
      otp: otp,
      shop_name: globalSetting?.setting?.shop_name || "Farmacykart",
    };

    const otpMail = simpleOtpEmail({
      ...option,
      purpose: "login",
      expiresMinutes: 10,
    });
    const body = {
      to: user.email,
      subject: `${option.shop_name} login code`,
      html: otpMail.html,
      text: otpMail.text,
      emailType: "login-otp",
    };

    const smsPhone = user.phone || phoneNumber;
    const smsResult = await sendLoginOtpSms(smsPhone, otp);

    if (!smsResult.ok) {
      console.warn("[OTP] SMS failed, falling back to email:", smsResult.error);
      try {
        await sendEmail(body);
        return res.send({
          message: `SMS could not be sent. 4-digit OTP sent to your email: ${user.email.replace(/(.{2})(.*)(@.*)/, "$1***$3")}`,
          channel: "email",
          email: user.email,
          resendAfter: 60,
        });
      } catch (emailErr) {
        console.error("[OTP] Email fallback failed:", emailErr.message);
        return res.status(500).send({
          message: "Could not send OTP by SMS or email. Please try again later.",
        });
      }
    }

    const maskedPhone = String(smsPhone).replace(/\d(?=\d{4})/g, "*");
    res.send({
      message: `4-digit OTP sent to +91${String(smsPhone).replace(/\D/g, "").slice(-10)}`,
      channel: "sms",
      phone: smsPhone,
      resendAfter: 60,
    });

  } catch (err) {
    console.error("sendPhoneEmailOTP error:", err);
    res.status(500).send({ message: err.message });
  }
};

const verifyPhoneEmailOTP = async (req, res) => {
  try {
    const { phoneNumber, otp, intent: rawIntent } = req.body;
    const intent = rawIntent === "signup" ? "signup" : "login";

    if (!phoneNumber || !otp) {
      return res.status(400).send({ message: "Phone number and OTP are required." });
    }

    const user = await findCustomerByPhone(phoneNumber);

    if (!user) {
      return res.status(404).send({
        message:
          intent === "login"
            ? "No account found with this number. Please sign up first."
            : "Please request an OTP first.",
        code: intent === "login" ? "PHONE_NOT_REGISTERED" : undefined,
      });
    }

    if (intent === "signup" && user.phoneVerified) {
      return res.status(409).send({
        message: "This mobile number is already registered. Please login instead.",
        code: "PHONE_ALREADY_REGISTERED",
      });
    }

    const wasVerified = !!user.phoneVerified;

    // Check if OTP exists and is not expired
    if (!user.loginOtp || !user.loginOtpExpires || new Date() > user.loginOtpExpires) {
      return res.status(400).send({ message: "OTP has expired or not found. Please request a new one." });
    }

    // Check attempt limits
    if (user.loginOtpAttempts >= 5) {
      return res.status(403).send({ message: "Too many failed attempts. Please request a new OTP." });
    }

    // Verify OTP
    const isMatch = bcrypt.compareSync(otp, user.loginOtp);

    if (!isMatch) {
      user.loginOtpAttempts += 1;
      await user.save();
      return res.status(400).send({ message: "Invalid OTP code." });
    }

    // Success! Clear OTP fields
    user.loginOtp = undefined;
    user.loginOtpExpires = undefined;
    user.loginOtpAttempts = 0;
    user.phoneVerified = true;
    user.lastLogin = new Date();
    await user.save();

    const isNewUser = !wasVerified;
    await sendCustomerAuthResponse(
      res,
      user,
      isNewUser ? "Account created!" : "Login Successful!",
      { isNewUser }
    );
  } catch (err) {
    console.error("verifyPhoneEmailOTP error:", err);
    res.status(500).send({ message: err.message });
  }
};

const loginWithPhone = async (req, res) => {
  // Keeping this for potential legacy or external use, but marking as deprecated if needed.
  // Actually, I'll just keep it but the new flow won't use it.
  try {
    const { phoneNumber, idToken } = req.body;

    if (!phoneNumber) {
      return res.status(400).send({
        message: "Phone number is required.",
      });
    }

    if (!idToken) {
      return res.status(400).send({
        message: "Firebase ID token is required.",
      });
    }

    // Verify Firebase ID Token
    let decodedToken;
    try {
      const admin = require("../config/firebase-admin");
      if (admin.apps.length > 0) {
        decodedToken = await admin.auth().verifyIdToken(idToken);
        const firebasePhone = decodedToken.phone_number;

        // Security check: ensure the token belongs to the phone number being logged in
        if (firebasePhone !== phoneNumber) {
          return res.status(401).send({
            message: "Token phone number mismatch. Verification failed.",
          });
        }
      } else {
        console.warn("Firebase Admin not initialized, skipping token verification (Insecure).");
      }
    } catch (verifyErr) {
      console.error("Firebase ID Token verification failed:", verifyErr);
      return res.status(401).send({
        message: "Invalid or expired Firebase token.",
      });
    }

    let user = await Customer.findOne({
      $or: [
        { phone: phoneNumber },
        { phone: phoneNumber.slice(-10) }
      ]
    });

    if (!user) {
      return res.status(404).send({
        message: "Account with this phone number does not exist. Please register first.",
        error: "USER_NOT_FOUND",
      });
    }

    const token = signInToken(user);
    res.send({
      token,
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address || "",
      image: user.image || "",
      message: "Login Successful!",
      role: user.role || "customer",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const registerCustomer = async (req, res) => {
  const token = req.params.token;

  try {
    const { name, email, password } = jwt.decode(token);

    // Check if the user is already registered
    const isAdded = await Customer.findOne({ email });

    if (isAdded) {
      const token = signInToken(isAdded);
      return res.send({
        token,
        _id: isAdded._id,
        name: isAdded.name,
        email: isAdded.email,
        password: password,
        role: isAdded.role || "customer",
        message: "Email Already Verified!",
      });
    }

    if (token) {
      jwt.verify(
        token,
        process.env.JWT_SECRET_FOR_VERIFY || "fallback_jwt_verify_secret",
        async (err, decoded) => {
          if (err) {
            return res.status(401).send({
              message: "Token Expired, Please try again!",
            });
          }

          // Create a new user only if not already registered
          const existingUser = await Customer.findOne({ email });
          console.log("existingUser");

          if (existingUser) {
            return res.status(400).send({ message: "User already exists!" });
          } else {
            const newUser = new Customer({
              name,
              email,
              password: bcrypt.hashSync(password),
            });

            await newUser.save();
            const token = signInToken(newUser);
            res.send({
              token,
              _id: newUser._id,
              name: newUser.name,
              email: newUser.email,
              role: newUser.role || "customer",
              message: "Email Verified, Please Login Now!",
            });
          }
        }
      );
    }
  } catch (error) {
    console.error("Error during email verification:", error);
    res.status(500).send({
      message: "Internal server error. Please try again later.",
    });
  }
};

const registerCustomerDirect = async (req, res) => {
  try {
    const { idToken, name, phone } = req.body;

    if (!idToken) {
      return res.status(400).send({ message: "Firebase ID token is required." });
    }

    const admin = require("../config/firebase-admin");
    let decodedToken;
    try {
      if (!admin.apps.length) throw new Error("Firebase Admin not initialized");
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (verifyErr) {
      return res.status(401).send({ message: "Invalid or expired Firebase token." });
    }

    const { email, uid, phone_number } = decodedToken;
    const finalPhone = phone_number || phone;

    // Optional: block disposable email domains
    const disposableDomains = [
      "tempmail.com", "mailinator.com", "yopmail.com", "10minutemail.com",
      "temp-mail.org", "guerrillamail.com", "sharklasers.com", "dispostable.com"
    ];
    const domain = email?.split("@")[1];
    if (domain && disposableDomains.includes(domain)) {
      return res.status(400).send({
        message: "Disposable email addresses are not allowed. Please use a real email.",
      });
    }

    const isAdded = await Customer.findOne({ $or: [{ email }, { firebaseUid: uid }] });

    if (isAdded) {
      return res.status(403).send({
        message: "Email or Phone is already in use!",
      });
    }

    const newUser = new Customer({
      name,
      email,
      phone: finalPhone,
      firebaseUid: uid,
      role: "customer",
      emailVerified: false,
    });

    await newUser.save();

    // Firebase handles email verification links natively now, so no custom OTP email is sent.
    
    const token = signInToken(newUser);
    res.send({
      token,
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      message: "Registration Successful! Please check your email to verify.",
      requiresVerification: true, // We can still let frontend know to show the verification message
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const verifyEmailOTP = async (req, res) => {
  try {
    const { email, phone, otp } = req.body;
    const user = await Customer.findOne({ $or: [{ email: email || "___" }, { phone: phone || "___" }] });

    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    if (user.emailVerified) {
      return res.status(400).send({ message: "Email is already verified." });
    }

    if (user.emailVerificationOtp !== otp) {
      return res.status(400).send({ message: "Invalid OTP code." });
    }

    if (new Date() > user.emailVerificationExpires) {
      return res.status(400).send({ message: "OTP has expired. Please request a new one." });
    }

    user.emailVerified = true;
    user.emailVerificationOtp = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    const token = signInToken(user);
    res.send({
      token,
      _id: user._id,
      name: user.name,
      email: user.email,
      message: "Email verified successfully! You are now logged in.",
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await Customer.findOne({ email });

    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    if (user.emailVerified) {
      return res.status(400).send({ message: "Email is already verified." });
    }

    // Generate new OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000);

    user.emailVerificationOtp = otp;
    user.emailVerificationExpires = otpExpires;
    await user.save();

    const globalSetting = await Setting.findOne({ name: "globalSetting" });
    const option = {
      name: user.name,
      email: user.email,
      otp: otp,
      shop_name: globalSetting?.setting?.shop_name || "Farmacykart",
    };

    const otpMail = simpleOtpEmail({
      ...option,
      purpose: "email verification",
      expiresMinutes: 15,
    });
    const body = {
      to: user.email,
      subject: `${option.shop_name} verification code`,
      html: otpMail.html,
      text: otpMail.text,
      emailType: "email-verify-otp",
    };

    await sendEmail(body);
    res.send({ message: "A new OTP has been sent to your email." });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// Create wholesaler from frontend form - accepts URLs (preferred) or multipart files
const createWholesaler = async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    const gstNotRequired = req.body.gstNotRequired === 'true' || req.body.gstNotRequired === true || req.body.gstNotRequired === 'on';
    const drugLicenseNotRequired = req.body.drugLicenseNotRequired === 'true' || req.body.drugLicenseNotRequired === true || req.body.drugLicenseNotRequired === 'on';

    if (!name || !email) {
      return res.status(400).send({ message: 'Name and email are required.' });
    }

    // check if email exists
    const existing = await Customer.findOne({ email });
    if (existing) {
      return res.status(400).send({ message: 'Customer with this email already exists.' });
    }

    const files = req.files || {};

    // Basic URL validator
    const isValidUrl = (value) => {
      if (!value) return false;
      try {
        const u = new URL(value);
        return ['http:', 'https:'].includes(u.protocol);
      } catch (e) {
        return false;
      }
    };

    const resolveField = (bodyKey, fileKey) => {
      const bodyVal = req.body[bodyKey] && String(req.body[bodyKey]).trim();
      if (bodyVal) {
        if (!isValidUrl(bodyVal)) {
          return { error: `${bodyKey} must be a valid URL.` };
        }
        return { url: bodyVal };
      }
      if (files[fileKey] && files[fileKey][0]) {
        return { url: `/uploads/wholesaler/${files[fileKey][0].filename}` };
      }
      return { url: null };
    };

    const aadharRes = resolveField('aadharUrl', 'aadhar');
    if (aadharRes.error) return res.status(400).send({ message: aadharRes.error });

    const panRes = resolveField('panUrl', 'pan');
    if (panRes.error) return res.status(400).send({ message: panRes.error });

    const gstRes = resolveField('gstUrl', 'gst');
    if (gstRes.error) return res.status(400).send({ message: gstRes.error });

    const drugRes = resolveField('drugUrl', 'drugLicense');
    if (drugRes.error) return res.status(400).send({ message: drugRes.error });

    // Required validations — only name and email are mandatory from frontend signup
    // (Aadhar/PAN are optional per the updated form)

    const newWholesaler = new Customer({
      name,
      email,
      phone,
      role: 'wholesaler',
      password: req.body.password ? bcrypt.hashSync(req.body.password) : undefined,
      aadhar: aadharRes.url,
      aadharPublicId: req.body.aadharPublicId || (files.aadhar && files.aadhar[0] ? files.aadhar[0].filename.split('.').slice(0, -1).join('.') : null),
      aadharDeleteToken: req.body.aadharDeleteToken || null,
      pan: panRes.url,
      panPublicId: req.body.panPublicId || (files.pan && files.pan[0] ? files.pan[0].filename.split('.').slice(0, -1).join('.') : null),
      panDeleteToken: req.body.panDeleteToken || null,
      gst: gstRes.url,
      gstPublicId: req.body.gstPublicId || (files.gst && files.gst[0] ? files.gst[0].filename.split('.').slice(0, -1).join('.') : null),
      gstDeleteToken: req.body.gstDeleteToken || null,
      drugLicense: drugRes.url,
      drugLicensePublicId: req.body.drugPublicId || (files.drugLicense && files.drugLicense[0] ? files.drugLicense[0].filename.split('.').slice(0, -1).join('.') : null),
      drugLicenseDeleteToken: req.body.drugDeleteToken || null,
      gstNotRequired,
      drugLicenseNotRequired,
      wholesalerStatus: 'pending',
      // New shop fields from updated signup form
      hasShop: req.body.hasShop === true || req.body.hasShop === 'true' || false,
      shopName: req.body.shopName || null,
      gstNumber: req.body.gstNumber || null,
      drugLicenseNumber: req.body.drugLicenseNumber || null,
      shopImageUrl: req.body.shopImageUrl || null,
      shopImagePublicId: req.body.shopImagePublicId || null,
      shopImageDeleteToken: req.body.shopImageDeleteToken || null,
      businessDocUrl: req.body.businessDocUrl || null,
      businessDocPublicId: req.body.businessDocPublicId || null,
      businessDocDeleteToken: req.body.businessDocDeleteToken || null,
    });

    await newWholesaler.save();

    res.send({ message: 'Wholesaler submitted successfully', wholesaler: newWholesaler });
  } catch (err) {
    console.error('createWholesaler error:', err);
    res.status(500).send({ message: err.message });
  }
};

// Delete Cloudinary asset by public id
const deleteCloudinaryAsset = async (req, res) => {
  try {
    const { publicId } = req.body;
    if (!publicId) {
      return res.status(400).send({ message: 'publicId is required' });
    }

    // Validate Cloudinary credentials exist
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.error('Cloudinary credentials missing');
      return res.status(500).send({ message: 'Cloudinary credentials are not configured on the server. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.' });
    }

    const cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    // Attempt deletion. Some files (like PDFs) are stored as resource_type 'raw', so try default and fallback to 'raw'.
    const tryDestroy = (id, options = {}) =>
      new Promise((resolve, reject) => {
        cloudinary.uploader.destroy(id, options, function (error, result) {
          if (error) return reject(error);
          return resolve(result);
        });
      });

    try {
      const result = await tryDestroy(publicId);
      // cloudinary returns { result: 'not found' } when missing
      if (result && result.result && result.result !== 'ok' && result.result !== 'deleted') {
        // try raw
        const rawResult = await tryDestroy(publicId, { resource_type: 'raw' });
        return res.send({ message: 'Deleted successfully', result: rawResult });
      }

      return res.send({ message: 'Deleted successfully', result });
    } catch (err) {
      console.warn('First destroy attempt failed, trying raw resource_type:', err?.message || err);
      try {
        const rawResult = await tryDestroy(publicId, { resource_type: 'raw' });
        return res.send({ message: 'Deleted successfully (raw)', result: rawResult });
      } catch (err2) {
        console.error('cloudinary destroy error:', err2);
        return res.status(500).send({ message: 'Failed to delete file from Cloudinary', detail: err2?.message || err2 });
      }
    }
  } catch (err) {
    console.error('deleteCloudinaryAsset error:', err);
    res.status(500).send({ message: err.message });
  }
};

// Simple server-side upload endpoint that accepts a data URL (base64) and uploads to Cloudinary
const cloudinaryUpload = async (req, res) => {
  try {
    const { file, publicId, folder = 'wholesaler' } = req.body;
    if (!file) return res.status(400).send({ message: 'file (data URL) is required' });

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.error('Cloudinary credentials missing for upload');
      return res.status(503).send({ message: 'Cloudinary credentials are not configured on the server. Uploads unavailable.' });
    }

    const cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const options = { folder, resource_type: 'auto' };
    if (publicId) options.public_id = publicId;
    // request delete token since this is a signed upload
    options.return_delete_token = true;

    const result = await cloudinary.uploader.upload(file, options);
    return res.send({ url: result.secure_url, publicId: result.public_id, deleteToken: result.delete_token || null, raw: result });
  } catch (err) {
    console.error('cloudinaryUpload error:', err);
    res.status(500).send({ message: err.message });
  }
};

// Create signature for signed uploads so client can request delete_token and perform client-side deletion
const cloudinarySign = async (req, res) => {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.warn('Cloudinary credentials missing for signing');
      return res.send({ signingAvailable: false, message: 'Cloudinary not configured on server.' });
    }

    const crypto = require('crypto');
    const { publicId, folder } = req.body || {};
    const timestamp = Math.floor(Date.now() / 1000);

    // Include return_delete_token to request delete token in response
    const params = { timestamp };
    if (publicId) params.public_id = publicId;
    if (folder) params.folder = folder;
    params.return_delete_token = true;
    console.log('cloudinarySign params:',);
    // Build string to sign (sorted by keys)
    const toSign = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join('&');

    const signature = crypto
      .createHash('sha1')
      .update(toSign + process.env.CLOUDINARY_API_SECRET)
      .digest('hex');

    return res.send({ signature, timestamp, apiKey: process.env.CLOUDINARY_API_KEY, cloudName: process.env.CLOUDINARY_CLOUD_NAME });
  } catch (err) {
    console.error('cloudinarySign error:', err);
    res.status(500).send({ message: err.message });
  }
};

const cloudinaryStatus = async (req, res) => {
  try {
    const signingAvailable = !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );
    return res.send({ signingAvailable, cloudName: process.env.CLOUDINARY_CLOUD_NAME || null });
  } catch (err) {
    console.error('cloudinaryStatus error:', err);
    res.status(500).send({ message: err.message });
  }
};

const addAllCustomers = async (req, res) => {
  try {
    await Customer.deleteMany();
    await Customer.insertMany(req.body);
    res.send({
      message: "Added all users successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const loginCustomer = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).send({ message: "Firebase ID token is required." });
    }

    const admin = require("../config/firebase-admin");
    let decodedToken;
    try {
      if (!admin.apps.length) {
        throw new Error("Firebase Admin not initialized.");
      }
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (verifyErr) {
      console.error("Firebase ID Token verification failed:", verifyErr);
      return res.status(401).send({ message: "Invalid or expired Firebase token." });
    }

    const { email, phone_number: phone, uid } = decodedToken;

    // Try to find the user by Firebase UID, email, or phone
    const queryConds = [];
    if (uid) queryConds.push({ firebaseUid: uid });
    if (email) queryConds.push({ email: email });
    if (phone) queryConds.push({ phone: phone });
    if (phone) queryConds.push({ phone: phone.slice(-10) });

    let customer = await Customer.findOne({ $or: queryConds });

    if (!customer) {
      return res.status(404).send({
        message: "Account does not exist. Please register first.",
        error: "USER_NOT_FOUND",
      });
    }

    // Update firebaseUid if it was missing (for migration of existing users)
    if (!customer.firebaseUid) {
      customer.firebaseUid = uid;
    }

    // If the account is a wholesaler, check approval status
    if (customer.role === 'wholesaler') {
      if (customer.wholesalerStatus === 'pending') {
        return res.status(403).send({
          message: 'Your account is currently under verification. You will be notified once approved by our team.',
          wholesalerStatus: 'pending',
        });
      }
      if (customer.wholesalerStatus === 'rejected') {
        return res.status(403).send({
          message: 'Your wholesaler application has been rejected. Please contact support for more information.',
          wholesalerStatus: 'rejected',
        });
      }
    }
    
    // Update lastLogin timestamp
    customer.lastLogin = new Date();
    await customer.save();

    // Fetch fresh customer data with populated cart to ensure we have latest details
    await sendCustomerAuthResponse(res, customer, "Login Successful!");
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const signupPhone = async (req, res) => {
  try {
    const { idToken, intent: rawIntent } = req.body;
    const intent = rawIntent === "signup" ? "signup" : "login";

    if (!idToken) {
      return res.status(400).send({ message: "Firebase ID token is required." });
    }

    const admin = require("../config/firebase-admin");
    let decodedToken;
    try {
      if (!admin.apps.length) throw new Error("Firebase Admin not initialized");
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (verifyErr) {
      return res.status(401).send({ message: "Invalid or expired Firebase token." });
    }

    const { email: tokenEmail, phone_number: tokenPhone, uid } = decodedToken;
    const phoneNorm = normalizePhone(tokenPhone || req.body.phone);
    if (!phoneNorm || phoneNorm.length < 10) {
      return res.status(400).send({ message: "Valid phone number is required." });
    }

    const queryConds = [{ firebaseUid: uid }, { phone: phoneNorm }];
    if (tokenEmail) queryConds.push({ email: tokenEmail.toLowerCase() });
    queryConds.push({ email: buildPlaceholderEmail(phoneNorm) });

    let customer = await Customer.findOne({ $or: queryConds });
    let isNewUser = false;

    if (intent === "signup" && customer) {
      return res.status(409).send({
        message: "This mobile number is already registered. Please login instead.",
        code: "PHONE_ALREADY_REGISTERED",
      });
    }

    if (intent === "login" && !customer) {
      return res.status(404).send({
        message: "No account found with this number. Please sign up first.",
        code: "PHONE_NOT_REGISTERED",
      });
    }

    if (!customer) {
      isNewUser = true;
      customer = new Customer({
        name: `User ${phoneNorm.slice(-4)}`,
        email: buildPlaceholderEmail(phoneNorm),
        phone: phoneNorm,
        firebaseUid: uid,
        role: "customer",
        phoneVerified: true,
        profileComplete: false,
        authProvider: "phone",
        emailVerified: false,
      });
      await customer.save();
    } else {
      customer.firebaseUid = uid;
      customer.phoneVerified = true;
      if (!customer.phone) customer.phone = phoneNorm;
      if (!customer.authProvider) customer.authProvider = "phone";
      customer.lastLogin = new Date();
      await customer.save();
    }

    if (customer.role === "wholesaler") {
      if (customer.wholesalerStatus === "pending") {
        return res.status(403).send({
          message:
            "Your account is currently under verification. You will be notified once approved.",
          wholesalerStatus: "pending",
        });
      }
      if (customer.wholesalerStatus === "rejected") {
        return res.status(403).send({
          message: "Your wholesaler application has been rejected.",
          wholesalerStatus: "rejected",
        });
      }
    }

    await sendCustomerAuthResponse(res, customer, isNewUser ? "Account created!" : "Login Successful!", {
      isNewUser,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(403).send({ message: "Phone or email already registered." });
    }
    res.status(500).send({ message: err.message });
  }
};

const sendProfileEmailOtp = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).send({ message: "Unauthorized" });
    }

    const { email } = req.body;
    if (!email || !String(email).trim()) {
      return res.status(400).send({ message: "Email is required." });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    if (isPlaceholderEmail(normalizedEmail)) {
      return res.status(400).send({ message: "Please enter a valid email address." });
    }

    const customer = await Customer.findById(userId);
    if (!customer) {
      return res.status(404).send({ message: "Customer not found." });
    }

    if (
      customer.emailVerified &&
      customer.email === normalizedEmail &&
      !isPlaceholderEmail(customer.email)
    ) {
      return res.status(400).send({ message: "This email is already verified on your account." });
    }

    const existingEmail = await Customer.findOne({
      email: normalizedEmail,
      _id: { $ne: customer._id },
    });
    if (existingEmail) {
      return res.status(400).send({ message: "Email already in use by another account." });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000);

    customer.pendingEmail = normalizedEmail;
    customer.emailVerificationOtp = otp;
    customer.emailVerificationExpires = otpExpires;
    await customer.save();

    const globalSetting = await Setting.findOne({ name: "globalSetting" });
    const shopName = globalSetting?.setting?.shop_name || "Farmacykart";
    const otpMail = simpleOtpEmail({
      name: customer.name,
      email: normalizedEmail,
      otp,
      shop_name: shopName,
      purpose: "email verification",
      expiresMinutes: 15,
    });

    await sendEmail({
      to: normalizedEmail,
      subject: `${shopName} verification code`,
      html: otpMail.html,
      text: otpMail.text,
      emailType: "profile-email-verify-otp",
    });

    res.send({ message: "Verification code sent to your email." });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const verifyProfileEmailOtp = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).send({ message: "Unauthorized" });
    }

    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).send({ message: "Email and verification code are required." });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const customer = await Customer.findById(userId);
    if (!customer) {
      return res.status(404).send({ message: "Customer not found." });
    }

    const pending = (customer.pendingEmail || "").toLowerCase();
    if (!pending || pending !== normalizedEmail) {
      return res.status(400).send({
        message: "Please request a verification code for this email first.",
      });
    }

    if (customer.emailVerificationOtp !== String(otp).trim()) {
      return res.status(400).send({ message: "Invalid verification code." });
    }

    if (!customer.emailVerificationExpires || new Date() > customer.emailVerificationExpires) {
      return res.status(400).send({ message: "Code expired. Please request a new one." });
    }

    const existingEmail = await Customer.findOne({
      email: normalizedEmail,
      _id: { $ne: customer._id },
    });
    if (existingEmail) {
      return res.status(400).send({ message: "Email already in use." });
    }

    customer.email = normalizedEmail;
    customer.emailVerified = true;
    customer.pendingEmail = undefined;
    customer.emailVerificationOtp = undefined;
    customer.emailVerificationExpires = undefined;
    await customer.save();

    res.send({
      message: "Email verified successfully!",
      email: customer.email,
      emailVerified: true,
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const completeProfile = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).send({ message: "Unauthorized" });
    }

    const { name, email, address, phone, city, zipCode, country } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).send({ message: "Name is required." });
    }
    if (!address || !String(address).trim()) {
      return res.status(400).send({ message: "Address is required." });
    }
    if (!phone || !normalizePhone(phone)) {
      return res.status(400).send({ message: "Valid phone number is required." });
    }

    const customer = await Customer.findById(userId);
    if (!customer) {
      return res.status(404).send({ message: "Customer not found." });
    }

    const emailInput = email ? String(email).toLowerCase().trim() : "";
    if (emailInput) {
      if (isPlaceholderEmail(emailInput)) {
        return res.status(400).send({ message: "Please enter a valid email address." });
      }
      if (!customer.emailVerified || customer.email !== emailInput) {
        return res.status(400).send({
          message: "Please verify your email with the code we sent before saving.",
          code: "EMAIL_NOT_VERIFIED",
        });
      }
    }

    customer.name = String(name).trim();
    customer.address = String(address).trim();
    if (phone) customer.phone = normalizePhone(phone);
    if (city) customer.city = city;
    if (country) customer.country = country;
    if (zipCode) customer.zipCode = zipCode;

    const shipPhone = normalizePhone(phone) || customer.phone;
    if (!customer.shippingAddress?.length) {
      customer.shippingAddress = [
        {
          name: customer.name,
          address: customer.address,
          city: city || customer.city || "",
          country: country || customer.country || "India",
          zipCode: zipCode || "",
          phone: shipPhone,
          isDefault: true,
          addressType: "Home",
        },
      ];
    }

    customer.profileComplete = computeProfileComplete(customer);
    customer.lastLogin = new Date();
    await customer.save();

    await sendCustomerAuthResponse(res, customer, "Profile completed successfully!");
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const forgetPassword = async (req, res) => {
  const isAdded = await Customer.findOne({ email: req.body.email });
  if (!isAdded) {
    return res.status(404).send({
      message: "User Not found with this email!",
    });
  } else {
    const token = tokenForVerify(isAdded);
    const globalSetting = await Setting.findOne({ name: "globalSetting" });

    const option = {
      name: isAdded.name,
      email: req.body.email,
      token: token,
      shop_name: globalSetting?.setting?.shop_name || "Farmacykart",
    };

    const { html, text } = simpleResetPasswordEmail(option);
    const body = {
      to: `${req.body.email}`,
      subject: `${option.shop_name} password reset`,
      html,
      text,
      emailType: "password-reset",
    };

    const message = "Please check your email to reset password!";
    try {
      await sendEmail(body);
      res.send({ message });
    } catch (emailErr) {
      console.error("Email send failed (non-blocking):", emailErr.message || emailErr);
      res.status(200).send({ message, emailError: emailErr.message || String(emailErr) });
    }
  }
};

const resetPassword = async (req, res) => {
  const token = req.body.token;
  const { email } = jwt.decode(token);
  const customer = await Customer.findOne({ email: email });

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET_FOR_VERIFY || "fallback_jwt_verify_secret", (err, decoded) => {
      if (err) {
        return res.status(500).send({
          message: "Token expired, please try again!",
        });
      } else {
        customer.password = bcrypt.hashSync(req.body.newPassword);
        customer.save();
        res.send({
          message: "Your password change successful, you can login now!",
        });
      }
    });
  }
};

// Send credentials email to wholesaler (admin action)
const sendCredentials = async (req, res) => {
  try {
    const id = req.params.id;
    const { password } = req.body;

    const customer = await Customer.findById(id);
    if (!customer) return res.status(404).send({ message: 'Wholesaler not found' });

    // Require client to provide plaintext password (do not generate on server)
    if (!password || String(password).trim().length === 0) {
      return res.status(400).send({ message: 'Password is required. Generate it from the admin UI and send it.' });
    }
    const plainPassword = String(password);
    const frontendUrl = process.env.FRONTEND_URL || process.env.STORE_URL || 'http://localhost:3000';
    const mailBody = {
      to: customer.email,
      subject: 'Farmacykart – Your wholesaler login details',
      html: `<p>Hi ${customer.name || 'Wholesaler'},</p>
             <p>Your wholesaler panel login credentials are below:</p>
             <p><strong>Email:</strong> ${customer.email}</p>
             <p><strong>Password:</strong> ${plainPassword}</p>
             <p>Login here: <a href="${frontendUrl}">${frontendUrl}</a></p>
             <p>Regards,<br/>Farmacykart Team</p>`,
    };

    try {
      await sendEmail(mailBody);
      customer.password = bcrypt.hashSync(plainPassword);
      customer.credentialEmailCount = (customer.credentialEmailCount || 0) + 1;
      customer.lastCredentialEmailSentAt = new Date();
      await customer.save();
      return res.send({
        message: 'Credentials emailed successfully',
        credentialEmailCount: customer.credentialEmailCount,
        lastCredentialEmailSentAt: customer.lastCredentialEmailSentAt,
      });
    } catch (err) {
      console.error('sendCredentials email send error:', err);
      return res.status(403).send({ message: `Error sending email: ${err.message}` });
    }
  } catch (err) {
    console.error('sendCredentials error:', err);
    res.status(500).send({ message: err.message });
  }
};

const changePassword = async (req, res) => {
  try {
    // console.log("changePassword", req.body);
    const customer = await Customer.findOne({ email: req.body.email });
    if (!customer.password) {
      return res.status(403).send({
        message:
          "For change password,You need to sign up with email & password!",
      });
    } else if (
      customer &&
      bcrypt.compareSync(req.body.currentPassword, customer.password)
    ) {
      customer.password = bcrypt.hashSync(req.body.newPassword);
      await customer.save();
      res.send({
        message: "Your password change successfully!",
      });
    } else {
      res.status(401).send({
        message: "Invalid email or current password!",
      });
    }
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const signUpWithProvider = async (req, res) => {
  try {
    // const { user } = jwt.decode(req.body.params);
    const user = jwt.decode(req.params.token);

    // console.log("user", user);
    const isAdded = await Customer.findOne({ email: user.email });
    if (isAdded) {
      const token = signInToken(isAdded);
      res.send({
        token,
        _id: isAdded._id,
        name: isAdded.name,
        email: isAdded.email,
        address: isAdded.address,
        phone: isAdded.phone,
        image: isAdded.image,
        role: isAdded.role || "customer",
      });
    } else {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpires = new Date(Date.now() + 15 * 60 * 1000);
      const newUser = new Customer({
        name: user.name,
        email: user.email,
        image: user.picture,
        emailVerified: false, emailVerificationOtp: otp, emailVerificationExpires: otpExpires, // OAuth emails are pre-verified
      });

      const signUpCustomer = await newUser.save();
      const token = signInToken(signUpCustomer);
      res.send({
        token,
        _id: signUpCustomer._id,
        name: signUpCustomer.name,
        email: signUpCustomer.email,
        image: signUpCustomer.image,
        role: signUpCustomer.role || "customer",
      });
    }
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const signUpWithOauthProvider = async (req, res) => {
  try {
    // console.log("user", user);
    // console.log("signUpWithOauthProvider", req.body);
    const isAdded = await Customer.findOne({ email: req.body.email });
    if (isAdded) {
      const token = signInToken(isAdded);
      res.send({
        token,
        _id: isAdded._id,
        name: isAdded.name,
        email: isAdded.email,
        address: isAdded.address,
        phone: isAdded.phone,
        image: isAdded.image,
        role: isAdded.role || "customer",
      });
    } else {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpires = new Date(Date.now() + 15 * 60 * 1000);
      const newUser = new Customer({
        name: req.body.name,
        email: req.body.email,
        image: req.body.image,
        emailVerified: false, emailVerificationOtp: otp, emailVerificationExpires: otpExpires,
      });

      const signUpCustomer = await newUser.save();
      const token = signInToken(signUpCustomer);
      res.send({
        token,
        _id: signUpCustomer._id,
        name: signUpCustomer.name,
        email: signUpCustomer.email,
        image: signUpCustomer.image,
        role: signUpCustomer.role || "customer",
      });
    }
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getAllCustomers = async (req, res) => {
  try {
    const { searchText = "", filterType = "" } = req.query;
    let query = {};

    // Calculate 30 days ago date
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // This month's date range
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    // Apply filter based on filterType
    if (filterType) {
      switch (filterType) {
        case "newSignUpsToday":
          query.createdAt = {
            $gte: today,
            $lt: tomorrow,
          };
          break;

        case "newSignUpsThisMonth":
          query.createdAt = {
            $gte: startOfMonth,
            $lte: endOfMonth,
          };
          break;

        case "activeByLogin":
          query.$and = [
            {
              lastLogin: {
                $gte: thirtyDaysAgo,
              },
            },
          ];
          break;

        case "activeByOrder":
          // Get customer IDs who placed orders in last 30 days
          const recentOrderUsers = await Order.distinct("user", {
            createdAt: {
              $gte: thirtyDaysAgo,
            },
            user: { $ne: null },
          });
          query._id = { $in: recentOrderUsers };
          break;

        case "inactiveByNoLogin":
          query.$and = [
            {
              $or: [
                { blocked: { $exists: false } },
                { blocked: false },
                { blocked: null },
              ],
            },
            {
              $or: [
                { lastLogin: null },
                { lastLogin: { $lt: thirtyDaysAgo } },
                { lastLogin: { $exists: false } },
              ],
            },
          ];
          break;

        case "inactiveByNoOrder":
          // Get customer IDs who placed orders in last 30 days
          const orderUsers = await Order.distinct("user", {
            createdAt: {
              $gte: thirtyDaysAgo,
            },
            user: { $ne: null },
          });
          query.$and = [
            {
              $or: [
                { blocked: { $exists: false } },
                { blocked: false },
                { blocked: null },
              ],
            },
            {
              _id: { $nin: orderUsers },
            },
          ];
          break;

        default:
          // No additional filter for "all"
          break;
      }
    }

    // Apply search text filter if provided
    if (searchText) {
      query.$or = [
        { name: { $regex: searchText, $options: "i" } },
        { email: { $regex: searchText, $options: "i" } },
        { phone: { $regex: searchText, $options: "i" } },
      ];
    }

    const users = await Customer.find(query).sort({ createdAt: -1 });
    res.send(users);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// Get only wholesalers
const getAllWholesalers = async (req, res) => {
  try {
    const { searchText = "", wholesalerStatus = "" } = req.query;
    let query = { role: "wholesaler" };

    if (wholesalerStatus) {
      query.wholesalerStatus = wholesalerStatus;
    }

    if (searchText) {
      query.$or = [
        { name: { $regex: searchText, $options: "i" } },
        { email: { $regex: searchText, $options: "i" } },
        { phone: { $regex: searchText, $options: "i" } },
      ];
    }

    const wholesalers = await Customer.find(query).sort({ createdAt: -1 });
    res.send(wholesalers);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const getCustomerById = async (req, res) => {
  try {
    // Populate cart.productId with prices and wholesaler metadata so admin/frontend can determine effective price
    const customer = await Customer.findById(req.params.id).populate({
      path: "cart.productId",
      select: "title prices image slug wholePrice minQuantity",
    });
    // console.log("getCustomerById cart:", JSON.stringify(customer?.cart, null, 2));
    res.send(customer);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

// Shipping address create or update - supports multiple addresses
const addShippingAddress = async (req, res) => {
  try {
    const customerId = req.params.id;
    const newShippingAddress = req.body;

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).send({ message: "Customer not found." });
    }

    // Ensure shippingAddress is an array (handle migration from Object to Array)
    if (!Array.isArray(customer.shippingAddress)) {
      // If it's an object, convert to array
      if (customer.shippingAddress && typeof customer.shippingAddress === 'object' && Object.keys(customer.shippingAddress).length > 0) {
        customer.shippingAddress = [customer.shippingAddress];
      } else {
        customer.shippingAddress = [];
      }
    }

    // If this is set as default, unset all other defaults
    if (newShippingAddress.isDefault) {
      customer.shippingAddress.forEach(addr => {
        addr.isDefault = false;
      });
    }

    // Add new address to array
    customer.shippingAddress.push(newShippingAddress);
    await customer.save();

    return res.send({
      message: "Shipping address added successfully.",
      success: true,
      shippingAddress: customer.shippingAddress,
    });
  } catch (err) {
    console.error("addShippingAddress error:", err);
    res.status(500).send({
      message: err.message || "Failed to add shipping address",
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

const getShippingAddress = async (req, res) => {
  try {
    const customerId = req.params.id;
    const addressId = req.query.id;

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).send({ message: "Customer not found." });
    }

    // Normalize shippingAddress to array
    let addresses = [];
    if (Array.isArray(customer.shippingAddress)) {
      addresses = customer.shippingAddress;
    } else if (customer.shippingAddress && typeof customer.shippingAddress === 'object' && Object.keys(customer.shippingAddress).length > 0) {
      // Convert old object format to array
      addresses = [customer.shippingAddress];
    }

    // If specific address ID requested
    if (addressId) {
      const address = addresses.find(
        (addr) => addr._id && addr._id.toString() === addressId.toString()
      );

      if (!address) {
        return res.status(404).send({
          message: "Shipping address not found!",
        });
      }

      return res.send({ shippingAddress: address });
    }

    // Return all addresses
    res.send({
      shippingAddress: addresses,
      success: true
    });
  } catch (err) {
    console.error("getShippingAddress error:", err);
    res.status(500).send({
      message: err.message || "Failed to get shipping address",
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

const updateShippingAddress = async (req, res) => {
  try {
    const { userId, shippingId } = req.params;
    const updatedAddress = req.body;

    const customer = await Customer.findById(userId);
    if (!customer) {
      return res.status(404).send({ message: "Customer not found." });
    }

    // Ensure shippingAddress is an array
    if (!Array.isArray(customer.shippingAddress)) {
      if (customer.shippingAddress && typeof customer.shippingAddress === 'object' && Object.keys(customer.shippingAddress).length > 0) {
        customer.shippingAddress = [customer.shippingAddress];
      } else {
        customer.shippingAddress = [];
      }
    }

    // Find the address index
    const addressIndex = customer.shippingAddress.findIndex(
      (addr) => addr._id && addr._id.toString() === shippingId.toString()
    );

    if (addressIndex === -1) {
      return res.status(404).send({ message: "Shipping address not found." });
    }

    // If this is set as default, unset all other defaults
    if (updatedAddress.isDefault) {
      customer.shippingAddress.forEach((addr, index) => {
        if (index !== addressIndex) {
          addr.isDefault = false;
        }
      });
    }

    // Update the address
    customer.shippingAddress[addressIndex] = {
      ...customer.shippingAddress[addressIndex].toObject(),
      ...updatedAddress,
    };

    await customer.save();

    res.send({
      message: "Shipping address updated successfully.",
      success: true,
      shippingAddress: customer.shippingAddress
    });
  } catch (err) {
    console.error("updateShippingAddress error:", err);
    res.status(500).send({
      message: err.message || "Failed to update shipping address",
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

const deleteShippingAddress = async (req, res) => {
  try {
    const { userId, shippingId } = req.params;

    const customer = await Customer.findById(userId);
    if (!customer) {
      return res.status(404).send({ message: "Customer not found." });
    }

    // Ensure shippingAddress is an array
    if (!Array.isArray(customer.shippingAddress)) {
      if (customer.shippingAddress && typeof customer.shippingAddress === 'object' && Object.keys(customer.shippingAddress).length > 0) {
        customer.shippingAddress = [customer.shippingAddress];
      } else {
        customer.shippingAddress = [];
      }
    }

    // Remove the address
    customer.shippingAddress = customer.shippingAddress.filter(
      (addr) => addr._id && addr._id.toString() !== shippingId.toString()
    );

    await customer.save();

    res.send({
      message: "Shipping Address Deleted Successfully!",
      success: true
    });
  } catch (err) {
    console.error("deleteShippingAddress error:", err);
    res.status(500).send({
      message: err.message || "Failed to delete shipping address",
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

const updateCustomer = async (req, res) => {
  try {
    // Validate the input
    const { name, email, address, phone, image, cart } = req.body;

    // Find the customer by ID
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).send({
        message: "Customer not found!",
      });
    }

    // Email can only be changed via profile email OTP verification
    if (email) {
      const normalizedEmail = String(email).toLowerCase().trim();
      if (normalizedEmail !== String(customer.email).toLowerCase()) {
        return res.status(400).send({
          message: "Verify your new email with the code we sent before saving.",
          code: "EMAIL_CHANGE_REQUIRES_VERIFICATION",
        });
      }
    }

    // Update customer details
    if (name) customer.name = name;
    if (address) customer.address = address;
    if (phone) customer.phone = phone;
    if (image) customer.image = image;
    if (cart) customer.cart = cart;
    console.log("req.body", req.body);
    // Allow updating document fields and delete tokens
    if (req.body.aadhar !== undefined) customer.aadhar = req.body.aadhar;
    if (req.body.aadharPublicId !== undefined) customer.aadharPublicId = req.body.aadharPublicId;
    if (req.body.aadharDeleteToken !== undefined) customer.aadharDeleteToken = req.body.aadharDeleteToken;

    if (req.body.pan !== undefined) customer.pan = req.body.pan;
    if (req.body.panPublicId !== undefined) customer.panPublicId = req.body.panPublicId;
    if (req.body.panDeleteToken !== undefined) customer.panDeleteToken = req.body.panDeleteToken;

    if (req.body.gst !== undefined) customer.gst = req.body.gst;
    if (req.body.gstPublicId !== undefined) customer.gstPublicId = req.body.gstPublicId;
    if (req.body.gstDeleteToken !== undefined) customer.gstDeleteToken = req.body.gstDeleteToken;

    if (req.body.drugLicense !== undefined) customer.drugLicense = req.body.drugLicense;
    if (req.body.drugLicensePublicId !== undefined) customer.drugLicensePublicId = req.body.drugLicensePublicId;
    if (req.body.drugLicenseDeleteToken !== undefined) customer.drugLicenseDeleteToken = req.body.drugLicenseDeleteToken;

    // Allow admin to set/update password for wholesaler
    if (req.body.password && typeof req.body.password === 'string' && req.body.password.trim().length > 0) {
      customer.password = bcrypt.hashSync(req.body.password);
    }

    // Allow admin to update wholesaler approval status
    if (req.body.wholesalerStatus !== undefined) {
      const validStatuses = ['pending', 'approved', 'rejected'];
      if (validStatuses.includes(req.body.wholesalerStatus)) {
        customer.wholesalerStatus = req.body.wholesalerStatus;
      }
    }

    // Save the updated customer
    const updatedUser = await customer.save();

    // Generate a new token
    const token = signInToken(updatedUser);

    // Send the updated customer data with the new token
    res.send({
      token,
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      address: updatedUser.address,
      phone: updatedUser.phone,
      image: updatedUser.image,
      role: updatedUser.role || "customer",
      emailVerified: !!updatedUser.emailVerified,
      message: "Customer updated successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const deleteCustomer = (req, res) => {
  Customer.deleteOne({ _id: req.params.id }, (err) => {
    if (err) {
      res.status(500).send({
        message: err.message,
      });
    } else {
      res.status(200).send({
        message: "User Deleted Successfully!",
      });
    }
  });
};

// Get customer statistics
const getCustomerStatistics = async (req, res) => {
  try {
    // Total customers
    const totalCustomers = await Customer.countDocuments();

    // Today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // This month's date range
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    // Today signups
    const todaySignups = await Customer.countDocuments({
      createdAt: {
        $gte: today,
        $lt: tomorrow,
      },
    });

    // This month signups
    const thisMonthSignups = await Customer.countDocuments({
      createdAt: {
        $gte: startOfMonth,
        $lte: endOfMonth,
      },
    });

    // Active customers - Last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Active customers based on login (lastLogin within last 30 days)
    const activeCustomersByLogin = await Customer.countDocuments({
      lastLogin: {
        $gte: thirtyDaysAgo,
      },
    });

    // Active customers based on orders (customers who placed order within last 30 days)
    // Get distinct customer IDs who placed orders in last 30 days
    const recentOrderUsers = await Order.distinct("user", {
      createdAt: {
        $gte: thirtyDaysAgo,
      },
      user: { $ne: null }, // Exclude null/undefined users
    });

    // Count unique customers who placed orders
    const activeCustomersByOrder = recentOrderUsers.length;

    // Inactive customers by no login: NOT blocked AND (no login OR login > 30 days ago)
    const inactiveCustomersByNoLogin = await Customer.countDocuments({
      $and: [
        {
          // NOT blocked
          $or: [
            { blocked: { $exists: false } },
            { blocked: false },
            { blocked: null },
          ],
        },
        {
          // No login OR login > 30 days ago
          $or: [
            { lastLogin: null },
            { lastLogin: { $lt: thirtyDaysAgo } },
            { lastLogin: { $exists: false } },
          ],
        },
      ],
    });

    // Inactive customers by no order: NOT blocked AND no order in last 30 days
    const inactiveCustomersByNoOrder = await Customer.countDocuments({
      $and: [
        {
          // NOT blocked
          $or: [
            { blocked: { $exists: false } },
            { blocked: false },
            { blocked: null },
          ],
        },
        {
          // No order in last 30 days (customer ID not in recentOrderUsers)
          _id: { $nin: recentOrderUsers },
        },
      ],
    });

    res.send({
      totalCustomers,
      todaySignups,
      thisMonthSignups,
      activeCustomersByLogin,
      activeCustomersByOrder,
      inactiveCustomersByNoLogin,
      inactiveCustomersByNoOrder,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

// ─── CART MANAGEMENT ──────────────────────────────────────────────────────────

/**
 * GET /customer/cart/:customerId
 * Returns the customer's cart with populated product details.
 */
const getCart = async (req, res) => {
  try {
    const { customerId } = req.params;
    const customer = await Customer.findById(customerId).populate({
      path: "cart.productId",
      select: "title prices image slug wholePrice minQuantity stock variants",
    });
    if (!customer) {
      return res.status(404).send({ message: "Customer not found." });
    }
    res.send({ cart: customer.cart });
  } catch (err) {
    console.error("getCart error:", err);
    res.status(500).send({ message: err.message });
  }
};

/**
 * POST /customer/cart/:customerId/add
 * Body: { productId, quantity }
 * Upserts a product into the customer's cart.
 */
const addToCart = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).send({ message: "productId is required." });
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).send({ message: "Customer not found." });
    }

    const qty = Math.max(1, Number(quantity));
    const existingItem = customer.cart.find(
      (c) => c.productId && c.productId.toString() === productId.toString()
    );

    if (existingItem) {
      existingItem.quantity = existingItem.quantity + qty;
    } else {
      customer.cart.push({ productId, quantity: qty });
    }

    await customer.save();

    // Return populated cart
    const updated = await Customer.findById(customerId).populate({
      path: "cart.productId",
      select: "title prices image slug wholePrice minQuantity stock variants",
    });

    res.send({ message: "Cart updated successfully.", cart: updated.cart });
  } catch (err) {
    console.error("addToCart error:", err);
    res.status(500).send({ message: err.message });
  }
};

/**
 * PUT /customer/cart/:customerId/update
 * Body: { productId, quantity }
 * Sets the quantity for an existing cart item. Removes it if quantity <= 0.
 */
const updateCartItem = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { productId, quantity } = req.body;

    if (!productId) {
      return res.status(400).send({ message: "productId is required." });
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).send({ message: "Customer not found." });
    }

    const qty = Number(quantity);

    if (qty <= 0) {
      // Remove item
      customer.cart = customer.cart.filter(
        (c) => c.productId && c.productId.toString() !== productId.toString()
      );
    } else {
      const item = customer.cart.find(
        (c) => c.productId && c.productId.toString() === productId.toString()
      );
      if (item) {
        item.quantity = qty;
      } else {
        customer.cart.push({ productId, quantity: qty });
      }
    }

    await customer.save();

    const updated = await Customer.findById(customerId).populate({
      path: "cart.productId",
      select: "title prices image slug wholePrice minQuantity stock variants",
    });

    res.send({ message: "Cart item updated.", cart: updated.cart });
  } catch (err) {
    console.error("updateCartItem error:", err);
    res.status(500).send({ message: err.message });
  }
};

/**
 * DELETE /customer/cart/:customerId/remove/:productId
 * Removes a specific product from the customer's cart.
 */
const removeFromCart = async (req, res) => {
  try {
    const { customerId, productId } = req.params;

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).send({ message: "Customer not found." });
    }

    customer.cart = customer.cart.filter(
      (c) => c.productId && c.productId.toString() !== productId.toString()
    );

    await customer.save();
    res.send({ message: "Item removed from cart.", cart: customer.cart });
  } catch (err) {
    console.error("removeFromCart error:", err);
    res.status(500).send({ message: err.message });
  }
};

/**
 * DELETE /customer/cart/:customerId/clear
 * Clears all items from the customer's cart.
 */
const clearCart = async (req, res) => {
  try {
    const { customerId } = req.params;

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).send({ message: "Customer not found." });
    }

    customer.cart = [];
    await customer.save();
    res.send({ message: "Cart cleared.", cart: [] });
  } catch (err) {
    console.error("clearCart error:", err);
    res.status(500).send({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────

const checkCustomerExistance = async (req, res) => {
  try {
    const { email, phone } = req.body;

    if (!email && !phone) {
      return res.status(400).send({ message: "Email or Phone is required" });
    }

    let customer = null;
    if (phone) {
      customer = await findCustomerByPhone(phone);
    } else if (email) {
      customer = await Customer.findOne({ email: String(email).toLowerCase().trim() });
    }

    if (customer) {
      return res.send({ exists: true, name: customer.name });
    }
    return res.send({ exists: false });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const updateFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    await Customer.findByIdAndUpdate(req.params.id, { $set: { fcmToken } });
    res.status(200).send({
      message: "FCM Token updated successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

module.exports = {
  checkCustomerExistance,
  loginCustomer,
  signupPhone,
  completeProfile,
  sendProfileEmailOtp,
  verifyProfileEmailOtp,
  // ... rest of exports
  loginWithPhone,
  verifyPhoneNumber,
  registerCustomer,
  registerCustomerDirect,
  addAllCustomers,
  signUpWithProvider,
  signUpWithOauthProvider,
  verifyEmailAddress,
  forgetPassword,
  changePassword,
  resetPassword,
  getAllCustomers,
  getAllWholesalers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  addShippingAddress,
  getShippingAddress,
  updateShippingAddress,
  deleteShippingAddress,
  getCustomerStatistics,
  createWholesaler,
  deleteCloudinaryAsset,
  cloudinarySign,
  cloudinaryStatus,
  cloudinaryUpload,
  sendCredentials,
  // Cart management
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  updateFcmToken,
  verifyEmailOTP,
  resendVerificationEmail,
  sendPhoneEmailOTP,
  verifyPhoneEmailOTP,
};
