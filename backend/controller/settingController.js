//models
const Setting = require("../models/Setting");

//global setting controller
const addGlobalSetting = async (req, res) => {
  try {
    const newGlobalSetting = new Setting(req.body);
    await newGlobalSetting.save();
    res.send({
      message: "Global Setting Added Successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getGlobalSetting = async (req, res) => {
  try {
    const globalSetting = await Setting.findOne({ name: "globalSetting" });
    if (!globalSetting) {
      return res.send({});
    }
    const setting = globalSetting.setting || {};
    setting.default_currency = "₹";
    setting.company_name = "AQOSU FARMACYKART PRIVATE LIMITED";
    setting.address = "GF D-90, KH NO-1100, RAJNAGAR COLONY, BEHTA HAJIPUR, LONI BORDER, LONI, GHAZIABAD, UTTAR PRADESH, Landmark: NEAR MUNISH PUBLIC, Pin: 201102";
    setting.shop_name = "Farmacykart";
    setting.vat_number = "09AAZCA5886C1ZV";
    setting.post_code = "201102";
    setting.contact = "07112255930";
    setting.email = "info.farmacykart@gmail.com";
    setting.website = "farmacykart.com";
    setting.gstin = "09AAZCA5886C1ZV";
    setting.dl_number = "UP14200002337, UP14210002215";
    // Build an absolute URL for the logo so both admin and frontend
    // can display it without needing the file in their own public dirs.
    const protocol = req.protocol || "http";
    const host = req.get("host") || "localhost:5000";
    setting.logo = `${protocol}://${host}/logo/logo.png`;
    res.send(setting);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const updateGlobalSetting = async (req, res) => {
  try {
    const { setting } = req.body;

    // Construct the $set object dynamically
    const setObject = Object.keys(setting).reduce((acc, key) => {
      acc[`setting.${key}`] = setting[key];
      return acc;
    }, {});

    const globalSetting = await Setting.findOneAndUpdate(
      { name: "globalSetting" },
      { $set: setObject },
      { new: true, upsert: true }
    );

    res.send({
      data: globalSetting,
      message: "Global Setting Update Successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

//store setting controller
const addStoreSetting = async (req, res) => {
  try {
    const newStoreSetting = new Setting(req.body);
    await newStoreSetting.save();
    res.send({
      message: "Store Setting Added Successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getStoreSetting = async (req, res) => {
  try {
    const storeSetting = await Setting.findOne({ name: "storeSetting" });
    if (!storeSetting) {
      return res.send({});
    }
    res.send(storeSetting.setting);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const updateStoreSetting = async (req, res) => {
  try {
    const { setting } = req.body;

    // Dynamically build the update fields
    const updateFields = Object.keys(setting).reduce((acc, key) => {
      acc[`setting.${key}`] = setting[key];
      return acc;
    }, {});
    // Update the online store setting document
    const storeSetting = await Setting.findOneAndUpdate(
      { name: "storeSetting" },
      { $set: updateFields },
      { new: true, upsert: true } // upsert to create the document if it doesn't exist
    );

    res.send({
      data: storeSetting,
      message: "Store Setting Update Successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

//vendor setting controller
const addVendorSetting = async (req, res) => {
  try {
    const newVendorSetting = new Setting(req.body);
    await newVendorSetting.save();
    res.send({
      message: "Vendor Setting Added Successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getVendorSetting = async (req, res) => {
  try {
    const vendorSetting = await Setting.findOne({ name: "vendorSetting" });
    if (!vendorSetting) {
      return res.send({});
    }
    res.send(vendorSetting.setting);
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const updateVendorSetting = async (req, res) => {
  try {
    const { setting } = req.body;
    const updateFields = Object.keys(setting).reduce((acc, key) => {
      acc[`setting.${key}`] = setting[key];
      return acc;
    }, {});
    const vendorSetting = await Setting.findOneAndUpdate(
      { name: "vendorSetting" },
      { $set: updateFields },
      { new: true, upsert: true }
    );
    res.send({
      data: vendorSetting,
      message: "Vendor Setting Update Successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

//online store customization controller
const addStoreCustomizationSetting = async (req, res) => {
  try {
    const newStoreCustomizationSetting = new Setting(req.body);
    const storeCustomizationSetting = await newStoreCustomizationSetting.save();

    res.send({
      data: storeCustomizationSetting,
      message: "Online Store Customization Setting Added Successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getStoreCustomizationSetting = async (req, res) => {
  try {
    const { key, keyTwo } = req.query;

    let projection = {};
    if (key) {
      projection[`setting.${key}`] = 1;
    }
    if (keyTwo) {
      projection[`setting.${keyTwo}`] = 1;
    }

    // If neither key nor keyTwo is provided, fetch all settings
    if (!key && !keyTwo) {
      projection = { setting: 1 };
    }

    const storeCustomizationSetting = await Setting.findOne(
      { name: "storeCustomizationSetting" },
      projection
    );

    if (!storeCustomizationSetting) {
      return res.send({});
    }

    const setting = storeCustomizationSetting.setting || {};
    const protocol = req.protocol || "http";
    const host = req.get("host") || "localhost:5000";
    const logoUrl = `${protocol}://${host}/logo/logo.png`;
    if (setting.navbar) {
      setting.navbar.logo = logoUrl;
    }
    if (setting.footer) {
      setting.footer.block4_logo = logoUrl;
    }
    if (
      !setting.theme ||
      !setting.theme.color ||
      setting.theme.color === "pink" ||
      setting.theme.color === "#EC4899" ||
      setting.theme.color === "#ec4899" ||
      setting.theme.color === "store"
    ) {
      setting.theme = { ...(setting.theme || {}), color: "green" };
    }

    res.send(setting);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const getStoreSeoSetting = async (req, res) => {
  try {
    const storeCustomizationSetting = await Setting.findOne(
      {
        name: "storeCustomizationSetting",
      },
      { "setting.seo": 1, _id: 0 }
    );
    res.send(storeCustomizationSetting?.setting || {});
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const updateStoreCustomizationSetting = async (req, res) => {
  try {
    const { setting } = req.body;

    // Dynamically build the update fields
    const updateFields = Object.keys(setting).reduce((acc, key) => {
      acc[`setting.${key}`] = setting[key];
      return acc;
    }, {});
    // Update the online store setting document
    const storeCustomizationSetting = await Setting.findOneAndUpdate(
      { name: "storeCustomizationSetting" },
      { $set: updateFields },
      { new: true, upsert: true } // upsert to create the document if it doesn't exist
    );

    res.send({
      data: storeCustomizationSetting,
      message: "Online Store Customization Setting Update Successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

// deliveryman setting
const addDeliverymanSetting = async (req, res) => {
  try {
    const newSetting = new Setting(req.body);
    await newSetting.save();
    res.status(200).send({
      message: "Deliveryman setting added successfully!",
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const getDeliverymanSetting = async (req, res) => {
  try {
    const setting = await Setting.findOne({ name: "deliverymanSetting" });
    res.send(setting?.setting || {});
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

const updateDeliverymanSetting = async (req, res) => {
  try {
    const setting = await Setting.findOneAndUpdate(
      { name: "deliverymanSetting" },
      {
        $set: {
          setting: req.body,
        },
      },
      {
        new: true,
      }
    );
    res.send({
      message: "Deliveryman setting updated successfully!",
      setting: setting.setting,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

module.exports = {
  addGlobalSetting,
  getGlobalSetting,
  updateGlobalSetting,
  addStoreSetting,
  getStoreSetting,
  updateStoreSetting,
  getStoreSeoSetting,
  addStoreCustomizationSetting,
  getStoreCustomizationSetting,
  updateStoreCustomizationSetting,
  addVendorSetting,
  getVendorSetting,
  updateVendorSetting,
  addDeliverymanSetting,
  getDeliverymanSetting,
  updateDeliverymanSetting,
};
