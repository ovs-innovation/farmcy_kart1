const Prescription = require("../models/Prescription");
const Notification = require("../models/Notification");
const Customer = require("../models/Customer");
const Product = require("../models/Product");
const { sendEmail } = require("../lib/email-sender/sender");
const prescriptionStatusEmailBody = require("../lib/email-sender/templates/prescription-status");

// Upload prescription files (accepts already uploaded Cloudinary URLs from frontend)
const uploadPrescription = async (req, res) => {
  try {
    const { files, userId, notes } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({
        message: "Please provide at least one file to upload",
      });
    }

    const uploadedFiles = [];

    // Process each file
    for (const fileData of files) {
      // Only accept files that have already been uploaded (have a url)
      if (fileData.url) {
        // Validate file type
        const type = ["image", "pdf"].includes(fileData.fileType)
          ? fileData.fileType
          : "image";

        uploadedFiles.push({
          url: fileData.url,
          type: type,
          fileName: fileData.fileName || "Prescription",
          fileSize: fileData.fileSize || 0,
        });
      }
    }

    if (uploadedFiles.length === 0) {
      return res.status(400).json({
        message: "No valid files provided",
      });
    }

    // Create prescription record
    const prescription = new Prescription({
      user: userId || null,
      files: uploadedFiles,
      notes: notes || "",
      status: "pending",
    });

    await prescription.save();

    // Create Admin Notification
    const notification = new Notification({
      message: `New Prescription Uploaded by User ${userId || "Guest"}`,
      prescriptionId: prescription._id,
      status: "unread",
      image: uploadedFiles[0].url,
    });
    await notification.save();

    res.status(201).json({
      message: "Prescription uploaded successfully",
      prescription: prescription,
    });
  } catch (error) {
    console.error("Error uploading prescription:", error);
    res.status(500).json({
      message: "Error uploading prescription",
      error: error.message,
    });
  }
};

// Get all prescriptions (for admin)
const getAllPrescriptions = async (req, res) => {
  try {
    const prescriptions = await Prescription.find()
      .populate("user", "name email phone role")
      .sort({ createdAt: -1 });

    res.status(200).json({
      prescriptions: prescriptions,
    });
  } catch (error) {
    console.error("Error fetching prescriptions:", error);
    res.status(500).json({
      message: "Error fetching prescriptions",
      error: error.message,
    });
  }
};

// Get prescriptions by user
const getUserPrescriptions = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    const prescriptions = await Prescription.find({ user: userId })
      .sort({ createdAt: -1 });

    res.status(200).json({
      prescriptions: prescriptions,
    });
  } catch (error) {
    console.error("Error fetching user prescriptions:", error);
    res.status(500).json({
      message: "Error fetching user prescriptions",
      error: error.message,
    });
  }
};

// Get prescription by ID
const getPrescriptionById = async (req, res) => {
  try {
    const { id } = req.params;

    const prescription = await Prescription.findById(id).populate(
      "user",
      "name email phone role"
    );

    if (!prescription) {
      return res.status(404).json({
        message: "Prescription not found",
      });
    }

    res.status(200).json({
      prescription: prescription,
    });
  } catch (error) {
    console.error("Error fetching prescription:", error);
    res.status(500).json({
      message: "Error fetching prescription",
      error: error.message,
    });
  }
};

// Update prescription status
const updatePrescriptionStatus = async (req, res) => {
  console.log("updatePrescriptionStatus called");
  try {
    const { id } = req.params;
    const { status, notes, medicines } = req.body;

    if (!status || !["pending", "processed", "rejected"].includes(status)) {
      return res.status(400).json({
        message: "Valid status is required (pending, processed, rejected)",
      });
    }

    const updateData = { status };
    if (notes !== undefined) {
      updateData.notes = notes;
    }
    if (medicines !== undefined) {
      updateData.medicines = medicines;
    }

    const prescription = await Prescription.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate("user", "name email phone role");

    if (!prescription) {
      return res.status(404).json({
        message: "Prescription not found",
      });
    }

    // If status is processed, add medicines to customer cart
    if (status === "processed" && medicines && medicines.length > 0 && prescription.user) {
      try {
        const customer = await Customer.findById(prescription.user._id);
        if (customer) {
          let cart = customer.cart || [];

          // Prevent duplicate medicines in the same request by grouping by productId
          // Enforce minimum quantity per product server-side to avoid client-side bypass
          const medicineMap = new Map();
          for (const medicine of medicines) {
            const productIdStr = medicine.productId.toString();
            let qty = medicine.quantity || 1;
            try {
              const prod = await Product.findById(medicine.productId).select("minQuantity");
              // Enforce minQuantity only for wholesaler users
              const isWholesalerUser = prescription.user && prescription.user.role && String(prescription.user.role).toLowerCase() === 'wholesaler';
              const minQ = isWholesalerUser ? (prod?.minQuantity || 1) : 1;
              if (isWholesalerUser && prod?.minQuantity && Number(prod.minQuantity) > 0 && qty < Number(prod.minQuantity)) {
                console.info(`[Prescriptions] Enforcing minQuantity for wholesaler user ${prescription.user._id} for product ${medicine.productId}: setting qty ${Number(prod.minQuantity)}`);
              }
              qty = Math.max(qty, minQ);
            } catch (err) {
              // ignore and keep provided qty
            }

            if (medicineMap.has(productIdStr)) {
              medicineMap.set(productIdStr, {
                productId: medicine.productId,
                quantity: medicineMap.get(productIdStr).quantity + qty,
              });
            } else {
              medicineMap.set(productIdStr, {
                productId: medicine.productId,
                quantity: qty,
              });
            }
          }

          // Now add/update items in cart
          medicineMap.forEach((medicine) => {
            const existingItemIndex = cart.findIndex(
              (item) => item.productId.toString() === medicine.productId.toString()
            );

            if (existingItemIndex > -1) {
              cart[existingItemIndex].quantity += medicine.quantity;
            } else {
              cart.push({
                productId: medicine.productId,
                quantity: medicine.quantity,
              });
            }
          });

          customer.cart = cart;
          await customer.save();
        }
      } catch (cartError) {
        console.error("Error updating customer cart:", cartError);
      }
    }

    // Send Email to User
    if (prescription.user && prescription.user.email) {
      const emailBody = prescriptionStatusEmailBody({
        name: prescription.user.name,
        date: new Date(prescription.createdAt).toLocaleDateString(),
        status: prescription.status,
        medicines: prescription.medicines || [],
        notes: prescription.notes,
        company_name: "FarmcyKart",
      });

      try {
        await sendEmail({
          to: prescription.user.email,
          subject: `Farmacykart – Prescription ${prescription.status === "processed" ? "approved" : "update"
            }`,
          html: emailBody,
        });
        res.status(200).json({
          message: "Prescription status updated successfully",
          prescription: prescription,
        });
      } catch (emailErr) {
        console.error("Email send failed (non-blocking):", emailErr.message || emailErr);
        res.status(200).json({
          message: "Prescription status updated successfully (email failed)",
          prescription: prescription,
          emailError: emailErr.message || String(emailErr),
        });
      }
    } else {
      res.status(200).json({
        message: "Prescription status updated successfully",
        prescription: prescription,
      });
    }
  } catch (error) {
    console.error("Error updating prescription status:", error);
    res.status(500).json({
      message: "Error updating prescription status",
      error: error.message,
    });
  }
};

// Delete prescription
const deletePrescription = async (req, res) => {
  try {
    const { id } = req.params;

    const prescription = await Prescription.findByIdAndDelete(id);

    if (!prescription) {
      return res.status(404).json({
        message: "Prescription not found",
      });
    }

    res.status(200).json({
      message: "Prescription deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting prescription:", error);
    res.status(500).json({
      message: "Error deleting prescription",
      error: error.message,
    });
  }
};

// Mark prescription as added to cart
const markAsAddedToCart = async (req, res) => {
  try {
    const { id } = req.params;

    const prescription = await Prescription.findByIdAndUpdate(
      id,
      { isAddedToCart: true },
      { new: true }
    );

    if (!prescription) {
      return res.status(404).json({
        message: "Prescription not found",
      });
    }

    res.status(200).json({
      message: "Prescription marked as added to cart",
      prescription: prescription,
    });
  } catch (error) {
    console.error("Error marking prescription as added to cart:", error);
    res.status(500).json({
      message: "Error updating prescription",
      error: error.message,
    });
  }
};

module.exports = {
  uploadPrescription,
  getAllPrescriptions,
  getUserPrescriptions,
  getPrescriptionById,
  updatePrescriptionStatus,
  deletePrescription,
  markAsAddedToCart,
};

