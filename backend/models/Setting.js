const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    setting: {},
  },
  {
    timestamps: true,
  }
);

settingSchema.post("init", function(doc) {
  if (doc) {
    if (doc.name === "globalSetting" && doc.setting) {
      doc.setting.default_currency = "₹";
      doc.setting.company_name = "AQOSU FARMACYKART PRIVATE LIMITED";
      doc.setting.address = "GF D-90, KH NO-1100, RAJNAGAR COLONY, BEHTA HAJIPUR, LONI BORDER, LONI, GHAZIABAD, UTTAR PRADESH, Landmark: NEAR MUNISH PUBLIC, Pin: 201102";
      doc.setting.shop_name = "Farmacykart";
      doc.setting.vat_number = "09AAZCA5886C1ZV";
      doc.setting.post_code = "201102";
      doc.setting.contact = "07112255930";
      doc.setting.email = "info.farmacykart@gmail.com";
      doc.setting.website = "farmacykart.com";
      doc.setting.gstin = "09AAZCA5886C1ZV";
      doc.setting.dl_number = "UP14200002337, UP14210002215";
      doc.setting.logo = "/logo/logo.png";
    }
    if (doc.name === "storeCustomizationSetting" && doc.setting) {
      if (doc.setting.navbar) {
        doc.setting.navbar.logo = "/logo/logo.png";
      }
      if (doc.setting.footer) {
        doc.setting.footer.block4_logo = "/logo/logo.png";
      }
    }
  }
});

// module.exports = settingSchema;

const Setting = mongoose.model("Setting", settingSchema);

module.exports = Setting;
