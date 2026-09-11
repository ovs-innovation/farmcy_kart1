const bcrypt = require("bcryptjs");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
dayjs.extend(utc);
const jwt = require("jsonwebtoken");
const {
  signInToken,
  tokenForVerify,
  handleEncryptData,
} = require("../config/auth");
const { mergeAccessList } = require("../config/adminAccessList");
const { sendEmail } = require("../lib/email-sender/sender");
const Admin = require("../models/Admin");
const Setting = require("../models/Setting");
const { simpleResetPasswordEmail } = require("../lib/email-sender/simple-templates");
const {
  addStaffEmailBody,
} = require("../lib/email-sender/templates/add-staff");

const registerAdmin = async (req, res) => {
  try {
    const isAdded = await Admin.findOne({ email: req.body.email });
    if (isAdded) {
      return res.status(403).send({
        message: "This Email already Added!",
      });
    } else {
      const newStaff = new Admin({
        name: req.body.name,
        email: req.body.email,
        role: req.body.role,
        password: bcrypt.hashSync(req.body.password),
      });
      const staff = await newStaff.save();
      const token = signInToken(staff);
      res.send({
        token,
        _id: staff._id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        joiningData: Date.now(),
      });
    }
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const loginAdmin = async (req, res) => {
  try {
    const admin = await Admin.findOne({ email: req.body.email });


console.log("Request Body:", req.body);
console.log("Admin:", admin);

    
    if (admin && bcrypt.compareSync(req.body.password, admin.password)) {
      if (admin?.status === "Inactive") {
        return res.status(403).send({
          message:
            "Sorry, you don't have the access right now, please contact with Super Admin.",
        });
      }
      const token = signInToken(admin);

      const effectiveAccess = mergeAccessList(admin.role, admin?.access_list);
      const { data, iv } = handleEncryptData([...effectiveAccess, admin.role]);
      res.send({
        token,
        _id: admin._id,
        name: admin.name,
        phone: admin.phone,
        email: admin.email,
        image: admin.image,
        iv,
        data,
      });
    } else {
      res.status(401).send({
        message: "Invalid Email or password!",
      });
    }
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const forgetPassword = async (req, res) => {
  const isAdded = await Admin.findOne({ email: req.body.verifyEmail });
  if (!isAdded) {
    return res.status(404).send({
      message: "Admin/Staff Not found with this email!",
    });
  } else {
    const token = tokenForVerify(isAdded);
    const globalSetting = await Setting.findOne({ name: "globalSetting" });

    const option = {
      name: isAdded.name,
      email: req.body.verifyEmail,
      contact_email: globalSetting?.setting?.email || "support@Farmacykart.com",
      token: token,
      shop_name: globalSetting?.setting?.shop_name || "Farmacykart",
    };

    const { html, text } = simpleResetPasswordEmail({
      ...option,
      email: req.body.verifyEmail,
    });
    const body = {
      to: `${req.body.verifyEmail}`,
      subject: "Farmacykart admin password reset",
      html,
      text,
      emailType: "admin-password-reset",
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
  const staff = await Admin.findOne({ email: email });

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET_FOR_VERIFY || "fallback_jwt_verify_secret", (err, decoded) => {
      if (err) {
        return res.status(500).send({
          message: "Token expired, please try again!",
        });
      } else {
        staff.password = bcrypt.hashSync(req.body.newPassword);
        staff.save();
        res.send({
          message: "Your password change successful, you can login now!",
        });
      }
    });
  }
};

const addStaff = async (req, res) => {
  // console.log("add staf....", req.body.staffData);
  try {
    const isAdded = await Admin.findOne({ email: req.body.email });
    if (isAdded) {
      return res.status(500).send({
        message: "This Email already Added!",
      });
    } else {
      const newStaff = new Admin({
        name: { ...req.body.name },
        email: req.body.email,
        password: bcrypt.hashSync(req.body.password),
        phone: req.body.phone,
        joiningDate: req.body.joiningDate,
        role: req.body.role,
        image: req.body.image,
        access_list: req.body.access_list,
      });
      await newStaff.save();

      const globalSetting = await Setting.findOne({ name: "globalSetting" });
      const option = {
        name: req.body.name,
        email: req.body.email,
        contact_email: globalSetting?.setting?.email || "support@Farmacykart.com",
        password: req.body.password,
        shop_name: globalSetting?.setting?.shop_name || "Farmacykart",
      };

      const staffHtml = addStaffEmailBody(option);
      const body = {
        to: `${req.body.email}`,
        subject: "Your Farmacykart staff account",
        html: staffHtml,
        text: `Hello,\n\nYour ${option.shop_name} staff account is ready.\nEmail: ${option.email}\n\nLogin at the admin panel.\n\n— ${option.shop_name}`,
        emailType: "staff-welcome",
      };

      try {
        await sendEmail(body);
        res.send({ message: "Staff Added Successfully!" });
      } catch (emailErr) {
        console.error("Email send failed (non-blocking):", emailErr.message || emailErr);
        res.status(200).send({ message: "Staff Added Successfully!", emailError: emailErr.message || String(emailErr) });
      }
    }
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
    // console.log("error", err);
  }
};

const getAllStaff = async (req, res) => {
  try {
    const { searchText, role } = req.query;
    let query = {};

    if (role && role !== "All") {
      query.role = role;
    }

    if (searchText) {
      query.$or = [
        { "name.en": { $regex: searchText, $options: "i" } },
        { "name.default": { $regex: searchText, $options: "i" } },
        { email: { $regex: searchText, $options: "i" } },
        { phone: { $regex: searchText, $options: "i" } },
      ];
    }

    const admins = await Admin.find(query).sort({ createdAt: -1 });
    res.send(admins);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getStaffById = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    res.send(admin);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const updateStaff = async (req, res) => {
  try {
    const admin = await Admin.findOne({ _id: req.params.id });

    if (admin) {
      admin.name = { ...admin.name, ...req.body.name };
      admin.email = req.body.email;
      admin.phone = req.body.phone;
      admin.role = req.body.role;
      admin.access_list = req.body.access_list;
      admin.joiningData = req.body.joiningDate;
      // admin.password =
      //   req.body.password !== undefined
      //     ? bcrypt.hashSync(req.body.password)
      //     : admin.password;

      admin.image = req.body.image;
      const updatedAdmin = await admin.save();
      const token = signInToken(updatedAdmin);

      const { data, iv } = handleEncryptData([
        ...updatedAdmin?.access_list,
        updatedAdmin.role,
      ]);
      res.send({
        token,
        _id: updatedAdmin._id,
        name: updatedAdmin.name,
        email: updatedAdmin.email,
        image: updatedAdmin.image,
        data,
        iv,
      });
    } else {
      res.status(404).send({
        message: "This Staff not found!",
      });
    }
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const deleteStaff = (req, res) => {
  Admin.deleteOne({ _id: req.params.id }, (err) => {
    if (err) {
      res.status(500).send({
        message: err.message,
      });
    } else {
      res.status(200).send({
        message: "Admin Deleted Successfully!",
      });
    }
  });
};

const updatedStatus = async (req, res) => {
  try {
    const newStatus = req.body.status;

    await Admin.updateOne(
      { _id: req.params.id },
      {
        $set: {
          status: newStatus,
        },
      }
    );
    res.send({
      message: `Staff ${newStatus} Successfully!`,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const updateFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    await Admin.findByIdAndUpdate(req.params.id, { $set: { fcmToken } });
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
  registerAdmin,
  loginAdmin,
  forgetPassword,
  resetPassword,
  addStaff,
  getAllStaff,
  getStaffById,
  updateStaff,
  deleteStaff,
  updatedStatus,
  updateFcmToken,
};
