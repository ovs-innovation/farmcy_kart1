import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import dayjs from "dayjs";
import { useEffect } from "react";

Font.register({
  family: "Open Sans",
  fonts: [
    {
      src: "https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-regular.ttf",
    },
    {
      src: "https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-600.ttf",
      fontWeight: 600,
    },
  ],
});
Font.register({
  family: "DejaVu Sans",
  fonts: [
    {
      src: "https://kendo.cdn.telerik.com/2017.2.621/styles/fonts/DejaVu/DejaVuSans.ttf",
    },
    {
      src: "https://kendo.cdn.telerik.com/2017.2.621/styles/fonts/DejaVu/DejaVuSans-Bold.ttf",
    },
  ],
});
const styles = StyleSheet.create({
  page: {
    marginRight: 10,
    marginBottom: 20,
    marginLeft: 10,
    paddingTop: 10,
    paddingLeft: 10,
    paddingRight: 29,
    lineHeight: 1.5,
  },
  table: {
    display: "table",
    width: "auto",
    color: "#4b5563",
    marginRight: 0,
    marginBottom: 10,
    marginLeft: 0,
    marginTop: 0,
    borderRadius: "8px",
    borderColor: "#e9e9e9",
    borderStyle: "solid",
    borderWidth: 0.5,
    padding: 0,
    textAlign: "left",
  },
  tableRow: {
    // margin: 'auto',
    flexDirection: "row",
    paddingBottom: 1,
    paddingTop: 1,
    textAlign: "left",
    borderWidth: 0.8,
    borderColor: "#E5E7EB",
    borderBottom: "0",
  },
  tableRowHeder: {
    flexDirection: "row",
    backgroundColor: "#006E44",
    paddingBottom: 1,
    paddingTop: 1,
    paddingLeft: 0,
    borderBottomWidth: 0.8,
    borderColor: "#006E44",
    borderStyle: "solid",
    textTransform: "uppercase",
    textAlign: "left",
  },
  tableCol: {
    width: "11%",
    textAlign: "left",
  },
  tableColProduct: {
    width: "28%",
    textAlign: "left",
  },
  tableColMfg: {
    width: "15%",
    textAlign: "left",
  },
  tableColHsn: {
    width: "7%",
    textAlign: "left",
  },
  tableColSmall: {
    width: "8%",
    textAlign: "left",
  },
  tableColQty: {
    width: "5%",
    textAlign: "left",
  },
  tableColSr: {
    width: "5%",
    textAlign: "left",
  },
  tableCell: {
    margin: "auto",
    marginTop: 1,
    fontSize: 6,
    paddingLeft: "0",
    paddingRight: "0",
    marginLeft: "8",
    marginRight: "8",
  },

  tableCellNumeric: {
    margin: "auto",
    marginTop: 1,
    fontSize: 6,
    paddingLeft: "0",
    paddingRight: "0",
    marginLeft: "8",
    marginRight: "8",
    fontFamily: "DejaVu Sans",
    whiteSpace: "nowrap",
  },

  invoiceFirst: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 18,
    paddingLeft: 10,
    paddingRight: 10,
    borderBottom: 1,
    borderColor: "#f3f4f6",
    // backgroundColor:'#EEF2FF',
  },
  invoiceSecond: {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingTop: 20,
    paddingBottom: 10,
    paddingLeft: 10,
    paddingRight: 10,
  },
  invoiceSecondLeft: {
    flex: 1,
  },
  invoiceSecondRight: {
    flex: 1,
    alignItems: "flex-end",
    textAlign: "right",
  },
  lightLine: {
    borderBottomWidth: 0.7,
    borderColor: "#e5e7eb",
    marginVertical: 4,
    width: "100%",
  },
  invoiceThird: {
    display: "flex",
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingTop: 20,
    paddingBottom: 20,
    paddingLeft: 10,
    paddingRight: 10,
    borderTop: 1,
    borderColor: "#ffffff",
    backgroundColor: "#f4f5f7",
    borderRadius: 12,
    marginLeft: "13",
    marginRight: "13",

    // backgroundColor:'#F2FCF9',
  },
  logo: {
    width: 64,
    height: 25,
    bottom: 5,
    right: 10,
    marginBottom: 10,
    textAlign: "right",
    color: "#4b5563",
    fontFamily: "Open Sans",
    fontWeight: "bold",
    fontSize: 10.3,

    marginRight: "39%",
    textTransform: "uppercase",
  },
  title: {
    color: "#2f3032",
    fontFamily: "Open Sans",
    fontWeight: "bold",
    fontSize: 8.1,
    textTransform: "uppercase",
  },
  info: {
    fontSize: 9,
    color: "#6b7280",
  },
  infoCost: {
    fontSize: 10,
    color: "#6b7280",
    marginLeft: "4%",
    marginTop: "7px",
    textAlign: "left",
    width: "25%",
  },
  invoiceNum: {
    fontSize: 9,
    color: "#6b7280",
    marginLeft: "6%",
  },
  topAddress: {
    fontSize: 10,
    color: "#6b7280",
    width: "100%",
    marginLeft: "20%",

    // textAlign: "right",
    // whiteSapce: "nowrap",
  },
  amount: {
    fontSize: 10,
    color: "#1f2937",
  },
  totalAmount: {
    fontSize: 10,
    color: "#1f2937",
    fontFamily: "Open Sans",
    fontWeight: "bold",
    textTransform: "uppercase",
    textAlign: "right",
  },
  status: {
    color: "#006E44",
  },
  quantity: {
    color: "#1f2937",
    textAlign: "center",
  },
  itemPrice: {
    color: "#1f2937",
    textAlign: "left",
  },
  header: {
    color: "#6b7280",
    fontSize: 4,
    fontFamily: "DejaVu Sans",
    fontWeight: "bold",
    textTransform: "uppercase",
    textAlign: "left",
  },

  thanks: {
    color: "#006E44",
  },
  infoRight: {
    textAlign: "right",
    fontSize: 9,
    color: "#6b7280",
    width: "25%",
    marginRight: "39%",
    fontFamily: "Open Sans",
    fontWeight: "bold",
  },
  titleRight: {
    textAlign: "right",
    fontFamily: "Open Sans",
    fontWeight: "bold",
    fontSize: 8.1,
    width: "25%",
    marginRight: "39%",
    textTransform: "uppercase",
    color: "#2f3032",
  },
  topBg: {
    // backgroundColor:'#EEF2FF',
  },
  invoiceDiv: {
    alignItems: "baseline",
  },
});

import { calculateInvoiceTotals } from "@utils/invoiceCalc";

const InvoiceForDownload = ({
  data,
  currency,
  globalSetting,
  getNumberTwo,
  logo,
  isWholesaler,
}) => {
  const totals = calculateInvoiceTotals(data, isWholesaler);
  const mrpTotal = totals.mrpTotal;
  const totalDiscount = totals.totalDiscount;
  const totalGst = totals.totalGst;
  const shippingCost = totals.shippingCost;
  const payableAmount = totals.payableAmount;

  const formatInvoiceNumber = (invoice, createdAt) => {
    if (!invoice) return "-";
    const invStr = String(invoice).trim();
    if (invStr.startsWith("FK/")) return invStr;
    const year = createdAt
      ? dayjs(createdAt).format("YYYY")
      : dayjs().format("YYYY");
    return `FK/${year}/${invStr}`;
  };


  return (
    <>
      <Document>
        <Page size="A4" style={styles.page}>
          {/* Top Section: Logo + Company (Left), Invoice Details + Bill To + QR (Right) */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 2, borderBottom: 1, borderColor: "#e5e7eb", marginBottom:0 }}>
            {/* Left - Logo and Company Info */}
            <View style={{ width: "34%", paddingRight: 10 }}>
              {/* Original Logo */}
              {logo && (
                <Image
                  src={logo}
                  style={{ width: 90, height: 35, marginBottom: 4, objectFit: "contain" }}
                />
              )}

              <Text style={{ fontSize: 9, fontWeight: "bold", color: "#111827", marginBottom: 2 }}>
                {globalSetting?.company_name || "Farmacykart Private Limited"}
              </Text>
              <Text style={{ fontSize: 7, color: "#4b5563", lineHeight: 1.3, marginBottom: 3 }}>
                {globalSetting?.address || "C-39, Basement, Block-5, Okhla Industrial Area-2, New Delhi, Delhi-110020"}
              </Text>

              {/* Email & Phone - Side by Side */}
              {(globalSetting?.email || globalSetting?.contact) && (
                <View style={{ flexDirection: "row", gap: 3, marginBottom: 1}}>
                  {globalSetting?.email && (
                    <View style={{ flexDirection: "row", gap: 2 }}>
                      <Text style={{ fontSize: 7, fontWeight: "bold", color: "#1f2937" }}>Email:</Text>
                      <Text style={{ fontSize: 7, color: "#4b5563" }}>{globalSetting.email}</Text>
                    </View>
                  )}
                  {globalSetting?.contact && (
                    <View style={{ flexDirection: "row", gap: 2 }}>
                      <Text style={{ fontSize: 7, fontWeight: "bold", color: "#1f2937" }}>Phone No:</Text>
                      <Text style={{ fontSize: 7, color: "#4b5563" }}>{globalSetting.contact}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* GST & CIN - Side by Side */}
              {(globalSetting?.gstin || globalSetting?.cin) && (
                <View style={{ flexDirection: "column", gap:0, marginTop: 1 }}>
                  {globalSetting?.gstin && (
                    <View style={{ flexDirection: "row", gap: 1 }}>
                      <Text style={{ fontSize: 7, fontWeight: "bold", color: "#1f2937" }}>GST NO.:</Text>
                      <Text style={{ fontSize: 7, color: "#374151" }}>{globalSetting.gstin}</Text>
                    </View>
                  )}
                  {globalSetting?.cin && (
                    <View style={{ flexDirection: "row", gap: 1 }}>
                      <Text style={{ fontSize: 7, fontWeight: "bold", color: "#1f2937" }}>CIN:</Text>
                      <Text style={{ fontSize: 7, color: "#374151" }}>{globalSetting.cin}</Text>
                    </View>
                  )}
                </View>
              )}
              
              {/* DL No - Separate line */}
              {globalSetting?.dl_number && (
                <View style={{ flexDirection: "row", gap: 1, marginTop: 1 }}>
                  <Text style={{ fontSize: 7, fontWeight: "bold", color: "#1f2937" }}>DL No:</Text>
                  <Text style={{ fontSize: 7, color: "#374151" }}>{globalSetting.dl_number}</Text>
                </View>
              )}
            </View>

            {/* Right - Invoice Details, Bill To, and QR Code */}
            <View style={{ width: "62%", flexDirection: "column" }}>
              {/* Top Row: Invoice Details */}
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                {/* Invoice No - Smaller width */}
                <View style={{ width: "25%", borderLeft: 1, borderColor: "#006E44", paddingLeft: 10, paddingRight: 5 }}>
                  <Text style={{ fontSize: 9, fontWeight: "bold", color: "#111827", marginBottom: 1 }}>Invoice No :</Text>
                  <Text style={{ fontSize: 9, color: "#4b5563" }}>
                    {formatInvoiceNumber(data?.invoice, data?.createdAt)}
                  </Text>
                </View>

                {/* Order ID - Larger width */}
                <View style={{ width: "50%", borderLeft: 1, borderColor: "#006E44", paddingLeft: 10, paddingRight: 5 }}>
                  <Text style={{ fontSize: 9, fontWeight: "bold", color: "#111827", marginBottom: 1 }}>Order ID :</Text>
                  <Text style={{ fontSize: 9, color: "#4b5563" }}>
                    {data?._id || data?.orderId || "-"}
                  </Text>
                </View>

                {/* Date - Smaller width */}
                <View style={{ width: "25%", borderLeft: 1, borderColor: "#006E44", paddingLeft: 10, paddingRight: 5 }}>
                  <Text style={{ fontSize: 9, fontWeight: "bold", color: "#111827", marginBottom: 1 }}>Date:</Text>
                  <Text style={{ fontSize: 9, color: "#4b5563" }}>
                    {data?.createdAt ? dayjs(data.createdAt).format("DD MMM YYYY") : "-"}
                  </Text>
                </View>
              </View>

              {/* Bottom Row: Bill To and QR Code */}
              <View style={{ flexDirection: "row", justifyContent: "space-between",borderTop: 1, borderLeft:1, borderColor: "#006E44" }}>
                {/* Bill To */}
                <View style={{ width: "75%", paddingRight: 10, paddingLeft: 10 , paddingTop:5 }}>
                  <Text style={{ fontSize: 6, fontWeight: "bold", color: "#006E44", textTransform: "uppercase", marginBottom: 3 }}>
                    BILL TO:
                  </Text>
                  <View style={{ fontSize: 8, color: "#374151" }}>
                    <View style={{ marginBottom: 2 }}>
                      <Text>
                        <Text style={{ fontWeight: "bold", color: "#1f2937" }}>Order Placed By: </Text>
                        <Text>{data?.user_info?.name || "-"}</Text>
                      </Text>
                    </View>
                    <View style={{ marginBottom: 2 }}>
                      <Text>
                        <Text style={{ fontWeight: "bold", color: "#1f2937" }}>Email: </Text>
                        <Text>{data?.user_info?.email || "-"}</Text>
                        {data?.user_info?.contact && (
                          <>
                            <Text style={{ fontWeight: "bold", color: "#1f2937" }}>  Phone: </Text>
                            <Text>{data.user_info.contact}</Text>
                          </>
                        )}
                      </Text>
                    </View>
                    {(data?.user_info?.address || data?.user_info?.city || data?.user_info?.country || data?.user_info?.zipCode) && (
                      <View style={{ marginBottom: 2 }}>
                        <Text>
                          <Text style={{ fontWeight: "bold", color: "#1f2937" }}>Address: </Text>
                          {data?.user_info?.address && `${data.user_info.address}${data?.user_info?.city ? ", " : ""}`}
                          {data?.user_info?.city && `${data.user_info.city}${data?.user_info?.country ? ", " : ""}`}
                          {data?.user_info?.country && `${data.user_info.country}${data?.user_info?.zipCode ? ", " : ""}`}
                          {data?.user_info?.zipCode && data.user_info.zipCode}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

              </View>
            </View>
          </View>

          {/* Product Table */}
          <View style={{ marginTop: 0 }}>
            <View style={styles.table}>
              <View style={styles.tableRowHeder}>
                <View style={{ width: "100%", paddingLeft: "3px", paddingRight: "3px", paddingTop:"2px" }}>
                  <Text  >
                    <Text style={[styles.header,{color:"#fff"}]}>product details:</Text>
                  </Text>
                </View>
              </View>
              <View style={styles.tableRow}>
                <View style={styles.tableColSr}>
                  <Text style={styles.tableCell}>
                    <Text style={styles.header}>Sr.</Text>
                  </Text>
                </View>
                <View style={styles.tableColProduct}>
                  <Text style={styles.tableCell}>
                    <Text style={styles.header}>product name</Text>
                  </Text>
                </View>
                {/* <View style={styles.tableColMfg}>
                  <Text style={styles.tableCell}>
                    <Text style={styles.header}>manufacturer name</Text>
                  </Text>
                </View> */}
                <View style={styles.tableColHsn}>
                  <Text style={styles.tableCell}>
                    <Text style={styles.header}>hsn</Text>
                  </Text>
                </View>
                <View style={styles.tableColSmall}>
                  <Text style={styles.tableCell}>
                    <Text style={styles.header}>batch</Text>
                  </Text>
                </View>
                <View style={styles.tableColSmall}>
                  <Text style={styles.tableCell}>
                    <Text style={styles.header}>expiry</Text>
                  </Text>
                </View>
                <View style={styles.tableColQty}>
                  <Text style={styles.tableCell}>
                    <Text style={styles.header}>qty</Text>
                  </Text>
                </View>
                <View style={styles.tableColSmall}>
                  <Text style={styles.tableCell}>
                    <Text style={styles.header}>{isWholesaler ? "price" : "mrp"}</Text>
                  </Text>
                </View>
                <View style={styles.tableColSmall}>
                  <Text style={styles.tableCell}>
                    <Text style={styles.header}>discount</Text>
                  </Text>
                </View>
                <View style={styles.tableColHsn}>
                  <Text style={styles.tableCell}>
                    <Text style={styles.header}>gst %</Text>
                  </Text>
                </View>
                <View style={styles.tableColSmall}>
                  <Text style={styles.tableCell}>
                    <Text style={styles.header}>gst amt</Text>
                  </Text>
                </View>
                <View style={styles.tableColSmall}>
                  <Text style={styles.tableCell}>
                    <Text style={styles.header}>Pay. AMT</Text>
                  </Text>
                </View>
              </View>
            {totals?.cart?.map((item, i) => {
              return (
                <View key={i} style={styles.tableRow}>
                  <View style={styles.tableColSr}>
                    <Text style={styles.tableCellNumeric}>{i + 1}</Text>
                  </View>
                  <View style={styles.tableColProduct}>
                    <Text style={styles.tableCell}>{item.title}</Text>
                  </View>
                  <View style={styles.tableColHsn}>
                    <Text style={styles.tableCell}>
                      {item.hsn || "-"}
                    </Text>
                  </View>
                  <View style={styles.tableColSmall}>
                    <Text style={styles.tableCell}>
                      {item.batchNo || "-"}
                    </Text>
                  </View>
                  <View style={styles.tableColSmall}>
                    <Text style={styles.tableCell}>
                      {item.formattedExpDate}
                    </Text>
                  </View>
                  <View style={styles.tableColQty}>
                    <Text style={styles.tableCellNumeric}>
                      {item.quantity}
                    </Text>
                  </View>
                  <View style={styles.tableColSmall}>
                    <Text style={styles.tableCellNumeric}>
                      {currency}{getNumberTwo(isWholesaler ? item.unitSellingPrice : item.unitMrp)}
                    </Text>
                  </View>
                  <View style={styles.tableColSmall}>
                    <Text style={styles.tableCellNumeric}>
                      {isWholesaler ? `${currency}0.00` : `${currency}${getNumberTwo(item.lineDiscount)}`}
                    </Text>
                  </View>
                  <View style={styles.tableColHsn}>
                    <Text style={styles.tableCellNumeric}>
                      {item.gstRate}%
                    </Text>
                  </View>
                  <View style={styles.tableColSmall}>
                    <Text style={styles.tableCellNumeric}>
                      {`${currency}${getNumberTwo(item.lineGst)}`}
                    </Text>
                  </View>
                  <View style={styles.tableColSmall}>
                    <Text style={styles.tableCellNumeric}>
                      {currency}{getNumberTwo(item.linePayable)}
                    </Text>
                  </View>
                </View>
              );
            })}
            </View>
          </View>

          {/* Bottom Section: Terms & Conditions + Price Summary */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 0, paddingHorizontal: 5 }}>
            {/* Left: Terms and Conditions */}
            <View style={{ width: "55%", paddingRight: 10 }}>
              <Text style={{ fontSize: 7, fontWeight: "bold", color: "#1f2937", marginBottom: 0 }}>
                Registered Pharmacist
              </Text>
              <Text style={{ fontSize: 7, color: "#006E44", marginBottom: 0 }}>
                {globalSetting?.company_name || "Farmacykart Private Limited"}
              </Text>
              <Text style={{ fontSize: 7, color: "#006E44" }}>
                {globalSetting?.website || "www.farmacykart.com"}
              </Text>
            </View>

            {/* Right: Price Summary */}
            <View style={{ width: "40%", borderLeft: 1, borderColor: "#e5e7eb", paddingLeft: 10 }}>
              {/* MRP Total */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 0 }}>
                <Text style={{ fontSize: 7, color: "#374151" }}>{isWholesaler ? "Total Price" : "MRP Total"}</Text>
                <Text style={{ fontSize: 7, color: "#374151", fontWeight: "bold", fontFamily: "DejaVu Sans" }}>
                  {currency}{getNumberTwo(mrpTotal)}
                </Text>
              </View>
              
              {/* Total Discount */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 0 }}>
                <Text style={{ fontSize: 7, color: "#374151" }}>Total Discount</Text>
                <Text style={{ fontSize: 7, color: "#16a34a", fontWeight: "bold", fontFamily: "DejaVu Sans" }}>
                  -{currency}{getNumberTwo(isWholesaler ? 0 : totalDiscount)}
                </Text>
              </View>
              
              {/* Coupon Applied */}
              {data?.coupon?.couponCode && (
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 0, backgroundColor: "#f0fdf4", padding: 2, borderRadius: 1 }}>
                  <Text style={{ fontSize: 7, color: "#15803d" }}>
                    Coupon: <Text style={{ fontWeight: "bold" }}>{data.coupon.couponCode}</Text>
                  </Text>
                  <Text style={{ fontSize: 7, color: "#16a34a", fontWeight: "bold", fontFamily: "DejaVu Sans" }}>
                    -{currency}{getNumberTwo(Math.abs(data?.coupon?.discountAmount || data?.discount || 0))}
                  </Text>
                </View>
              )}
              
              {/* GST */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 0 }}>
                <Text style={{ fontSize: 7, color: "#374151" }}>GST</Text>
                <Text style={{ fontSize: 7, color: "#374151", fontWeight: "bold", fontFamily: "DejaVu Sans" }}>
                  {currency}{getNumberTwo(totalGst)}
                </Text>
              </View>
              
              {/* Shipping Cost */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 0 }}>
                <Text style={{ fontSize: 7, color: "#374151" }}>Shipping Cost</Text>
                <Text style={{ fontSize: 7, color: shippingCost > 0 ? "#374151" : "#16a34a", fontWeight: "bold", fontFamily: "DejaVu Sans" }}>
                  {shippingCost > 0 ? `${currency}${getNumberTwo(shippingCost)}` : "FREE"}
                </Text>
              </View>
              
              {/* Estimated Payable */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: "#f3f4f6", padding: 4, borderRadius: 2 }}>
                <Text style={{ fontSize: 8, color: "#1f2937", fontWeight: "bold" }}>Estimated Payable</Text>
                <Text style={{ fontSize: 8, color: "#1f2937", fontWeight: "bold", fontFamily: "DejaVu Sans" }}>
                  {currency}{getNumberTwo(payableAmount)}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.lightLine} />

          
        </Page>
      </Document>
    </>
  );
};

export default InvoiceForDownload;
