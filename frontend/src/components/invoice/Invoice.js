import dayjs from "dayjs";
import React, { useEffect, useState, useContext } from "react";
import Link from "next/link";
import Image from "next/image";
//internal import
import OrderTable from "@components/order/OrderTable";
import useUtilsFunction from "@hooks/useUtilsFunction";
import useGetSetting from "@hooks/useGetSetting";
import { pickBrandLogo } from "@utils/brandAssets";
import { UserContext } from "@context/UserContext";
import { calculateInvoiceTotals } from "@utils/invoiceCalc";

const Invoice = ({ data, printRef, globalSetting, currency }) => {
  // console.log('invoice data',data)

  const { getNumberTwo } = useUtilsFunction();
  const { storeCustomizationSetting } = useGetSetting();
  const { state } = useContext(UserContext) || {};
  const isWholesaler = state?.userInfo?.role && state.userInfo.role.toString().toLowerCase() === "wholesaler";
  const storeColor = storeCustomizationSetting?.theme?.color || "green";

  // Aggregate values for summary box using centralized calculation utility
  const totals = calculateInvoiceTotals(data, isWholesaler);
  const mrpTotal = totals.mrpTotal;
  const totalDiscount = totals.totalDiscount;
  const totalGst = totals.totalGst;
  const shippingCharge = totals.shippingCost;
  const payableAmount = totals.payableAmount;

  const formatInvoiceNumber = (invoice, createdAt) => {
    if (!invoice) return "-";
    const invStr = String(invoice).trim();

    // If already formatted like FK/2026/0892, return as-is
    if (invStr.startsWith("FK/")) return invStr;

    const year = createdAt
      ? dayjs(createdAt).format("YYYY")
      : dayjs().format("YYYY");

    return `FK/${year}/${invStr}`;
  };


  return (
    <div ref={printRef} className=" ">
      <div className="  px-4 pb-1 pt-4 rounded-t-xl">
        {/* Invoice Title Bar */}
        <div className="flex justify-between items-center pb-3 border-b border-gray-100">
          <h1 className="text-xl font-serif font-bold text-store-800 tracking-wide">
            TAX INVOICE
          </h1>
          <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2.5 py-1 rounded">
            Prices inclusive of applicable GST
          </span>
        </div>

        <div className=" flex gap-x-5 pt-3 pb-4 border-b border-gray-50 items-start">
          {/* Logo + Company on left */}
          <div className="text-left flex flex-col items-start gap-0 hidden lg:block">
            <h2 className="text-lg font-serif font-semibold">
              <Link href="/">
                <Image
                  width={120}
                  height={40}
                  src={pickBrandLogo(
                    storeCustomizationSetting?.navbar?.logo,
                    storeCustomizationSetting?.footer?.block4_logo 
                  )}
                  alt="logo"
                />
              </Link>
            </h2>
              
              {/* Bill From - from common settings */}
              <div className="flex-1 min-w-[0] items-start">
                
                <p className="text-semibold md:text-base font-semibold text-gray-900">
                  {globalSetting?.company_name || "AQOSU FARMACYKART PRIVATE LIMITED"}
                </p>
                <p className=" text-sm text-gray-600 leading-snug">
                  {globalSetting?.address ||
                    "GF D-90, KH NO-1100, RAJNAGAR COLONY, BEHTA HAJIPUR, LONI BORDER, LONI, GHAZIABAD, UTTAR PRADESH, Landmark: NEAR MUNISH PUBLIC, Pin: 201102"}
                </p>
                {/* Email */}
               <div  className="flex gap-x-3">
                  <div className="flex gap-x-2 text-sm text-gray-600 leading-snug mt-0.5">
                    <div className="font-semibold">Email:</div>
                    <div>{globalSetting?.email || "farmacykart@gmail.com"}</div>
                  </div>

                  <div className="flex gap-x-2 text-sm text-gray-600 leading-snug mt-0.5">
                    <div className="font-semibold">Phone No:</div>
                    <div>{globalSetting?.contact || "07112255930"}</div>
                  </div>
               </div>
               
                <div className="flex gap-x-2">
                  {/* GST */}
                  <div className="flex gap-x-2 text-sm text-gray-600 leading-snug mt-0.5">
                    <div className="font-semibold">GST NO.:</div>
                    <div>{globalSetting?.gstin || "09AAZCA5886C1ZV"}</div>
                  </div>
                  {/* CIN */}
                  {globalSetting?.cin && (
                    <div className="flex gap-x-2 text-sm text-gray-600 leading-snug mt-0.5">
                      <div className="font-semibold">CIN:</div>
                      <div>{globalSetting.cin}</div>
                    </div>
                  )}
                </div>
                {/* DL */}
                <div className="flex gap-x-2 text-sm text-gray-600 leading-snug mt-0.5">
                  <div className="font-semibold">DL No:</div>
                  <div>{globalSetting?.dl_number || "UP14200002337, UP14210002215"}</div>
                </div>
                
              </div>
          </div>

          <div className="flex flex-col gap-y-6 hidden lg:block flex-1">
            <div className="flex flex-row text-sm md:text-base gap-x-6 text-store-700 bg-store-50 p-2.5 rounded-lg border border-store-100">
              <div className="pl-1">
                <span className="font-semibold text-gray-800">Invoice No:</span>{" "}
                <span className="font-bold text-store-700">{formatInvoiceNumber(data?.invoice, data?.createdAt)}</span>
              </div>
              <div className="border-l border-store-300 pl-4">
                <span className="font-semibold text-gray-800">Order ID:</span>{" "}
                <span className="text-gray-700">{data?._id || data?.orderId || "-"}</span>
              </div>
              <div className="border-l border-store-300 pl-4">
                <span className="font-semibold text-gray-800">Date:</span>{" "}
                <span className="text-gray-700">
                  {data?.createdAt
                    ? dayjs(data.createdAt).format("DD MMM YYYY")
                    : "-"}
                </span>
              </div>
            </div>

            <div className=" border-l-4 border-store-600 bg-white px-5 py-2 flex flex-row flex-wrap items-center justify-between gap-2 shadow-sm rounded-r-lg border border-gray-100">
              {/* Bill To - user address details */}
              <div className="flex-1 min-w-[0]">
                <span className="font-bold font-serif text-xs md:text-sm uppercase text-store-700 block">
                  Bill To:
                </span>
                <div className="mt-1 text-xs md:text-sm text-gray-700 leading-relaxed space-y-0.5">
                  <p>
                    <span className="font-semibold text-gray-800">
                      Customer Name:
                    </span>{" "}
                    <span>{data?.user_info?.name || "-"}</span>
                  </p>

                  <p>
                    <span className="font-semibold text-gray-800">Email:</span>{" "}
                    <span>{data?.user_info?.email || "-"}</span> 
                    {data?.user_info?.contact && (
                      <span className="ml-3">
                        <span className="font-semibold text-gray-800">Phone:</span>{" "}
                        {data.user_info.contact}
                      </span>
                    )}
                  </p>

                  {(data?.user_info?.address || data?.user_info?.city || data?.user_info?.country || data?.user_info?.zipCode) && (
                    <p>
                      <span className="font-semibold text-gray-800">
                        Address:
                      </span>{" "}
                      <span>
                        {data?.user_info?.address}
                        {data?.user_info?.address && (data?.user_info?.city || data?.user_info?.country || data?.user_info?.zipCode) ? ", " : ""}
                        {data?.user_info?.city}
                        {data?.user_info?.city && (data?.user_info?.country || data?.user_info?.zipCode) ? ", " : ""}
                        {data?.user_info?.country}
                        {data?.user_info?.country && data?.user_info?.zipCode ? ", " : ""}
                        {data?.user_info?.zipCode}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="s border-t-4 mx-4 border-store-800">
        {/* Desktop / Tablet view: product table with standard invoice columns */}
        <div className="hidden md:block print:block overflow-hidden lg:overflow-visible">
          <div className="-my-2 overflow-x-auto print:overflow-visible">
            <table className="table-auto min-w-full border border-gray-200 print:table-fixed">
              <thead>
                <tr className="text-xs bg-store-700 text-white">
                  <th className="font-serif font-semibold px-3 py-2 uppercase tracking-wider text-left w-10">
                    Sr.
                  </th>
                  <th className="font-serif font-semibold px-3 py-2 uppercase tracking-wider text-left w-64">
                    Product Name
                  </th>
                  <th className="font-serif font-semibold px-2 py-2 uppercase tracking-wider text-center w-20">
                    HSN
                  </th>
                  <th className="font-serif font-semibold px-2 py-2 uppercase tracking-wider text-center w-24">
                    Batch
                  </th>
                  <th className="font-serif font-semibold px-2 py-2 uppercase tracking-wider text-center w-24">
                    Expiry
                  </th>
                  <th className="font-serif font-semibold px-2 py-2 uppercase tracking-wider text-center w-14">
                    Qty
                  </th>
                  <th className="font-serif font-semibold px-2 py-2 uppercase tracking-wider text-center w-24">
                    {isWholesaler ? "Price" : "MRP"}
                  </th>
                  <th className="font-serif font-semibold px-2 py-2 uppercase tracking-wider text-center w-24">
                    Discount
                  </th>
                  <th className="font-serif font-semibold px-2 py-2 uppercase tracking-wider text-center w-28">
                    Selling Price
                  </th>
                  <th className="font-serif font-semibold px-3 py-2 uppercase tracking-wider text-right w-28">
                    Total
                  </th>
                </tr>
              </thead>
              <OrderTable data={data} currency={currency} />
            </table>
          </div>
        </div>

        {/* Mobile view: responsive two-column cards */}
        <div className="block md:hidden print:hidden my-8">
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
            {totals?.cart?.map((item, index) => (
              <div
                key={index}
                className="bg-white border border-gray-100 rounded-lg p-3 shadow-sm"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-500">
                    #{index + 1}
                  </span>
                  <span className="text-xs font-semibold text-gray-500">
                    Qty: {item.quantity}
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-800 line-clamp-2 mb-1">
                  {item.title}
                </p>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-gray-600">
                    MRP: {currency}{getNumberTwo(item.unitMrp)}
                  </span>
                  <span className="text-gray-600">
                    Price: {currency}{getNumberTwo(item.unitSellingPrice)}
                  </span>
                  <span className="font-semibold text-gray-800">
                    Total: {currency}{getNumberTwo(item.linePayable)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payment Information + Registered Pharmacist + Financial Summary */}
      <div className="px-4 pb-6 pt-4 flex flex-col md:flex-row items-start lg:justify-between gap-4">
        {/* Left: Payment Info & Pharmacist tag */}
        <div className="flex flex-col gap-3 w-full md:w-auto flex-1">
          {/* Payment Information Box */}
          <div className="border border-gray-200 bg-gray-50 rounded-md p-3 text-xs md:text-sm text-gray-800">
            <h3 className="font-bold text-gray-900 uppercase text-xs mb-2 tracking-wider">
              Payment Information
            </h3>
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              <div>
                <span className="font-semibold text-gray-600">Payment Method:</span>{" "}
                <span className="font-bold text-gray-800">{data?.paymentMethod || "COD"}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-600">Payment Status:</span>{" "}
                <span className={`font-bold ${data?.paymentStatus === "Paid" ? "text-green-600" : "text-orange-600"}`}>
                  {data?.paymentStatus || (data?.paymentMethod === "Cash" || data?.paymentMethod === "Cash On Delivery" || data?.paymentMethod === "COD" ? "Pending" : "Paid")}
                </span>
              </div>
            </div>
          </div>

          {/* Pharmacist / Regulatory Info */}
          <div className="border border-gray-200 rounded-md px-3 py-2 text-xs md:text-sm text-gray-800 hidden md:block">
            <div className="w-full md:w-64 flex flex-col items-start text-xs md:text-sm space-y-0.5">
              <p className="font-semibold text-gray-700 leading-snug">
                {globalSetting?.pharmacist_name || "Registered Pharmacist"}
              </p>
              <p className="text-[11px] text-gray-500 leading-snug">
                {globalSetting?.company_name || "Farmacykart"}
              </p>
              {globalSetting?.website && (
                <p className="text-[11px] text-store-600 leading-snug">
                  {globalSetting.website}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right: Authoritative Financial Summary */}
        <div className="invoice-amount-summary md:w-[480px] lg:w-[540px] w-full">
          <div className="bg-white border border-gray-200 rounded-md text-xs md:text-sm text-gray-800 divide-y divide-gray-100 shadow-sm">
            <div className="flex items-center justify-between px-3 py-1.5">
              <span>{isWholesaler ? "Total Price" : "MRP Total"}</span>
              <span className="font-DejaVu font-medium">
                {currency}
                {getNumberTwo(isWholesaler ? totals.sellingTotal : totals.mrpTotal)}
              </span>
            </div>

            {!isWholesaler && (
              <div className="flex items-center justify-between px-3 py-1.5">
                <span>Total Discount</span>
                <span className="font-DejaVu text-green-600 font-medium">
                  -{currency}{getNumberTwo(totals.totalDiscount)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50">
              <span className="font-semibold text-gray-700">Subtotal / Selling Price</span>
              <span className="font-DejaVu font-semibold text-gray-800">
                {currency}{getNumberTwo(totals.sellingTotal)}
              </span>
            </div>

            {totals.couponDiscount > 0 && (
              <div className="flex items-center justify-between px-3 py-1.5 bg-green-50">
                <span className="text-green-700">
                  Coupon Applied: <span className="font-semibold">{data?.coupon?.couponCode || "COUPON"}</span>
                </span>
                <span className="font-DejaVu text-green-600 font-semibold">
                  -{currency}{getNumberTwo(totals.couponDiscount)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between px-3 py-1.5">
              <span>GST</span>
              <span className="text-xs font-medium text-gray-600">
                Included in MRP
              </span>
            </div>

            <div className="flex items-center justify-between px-3 py-1.5">
              <span>Shipping Cost</span>
              <span className="font-DejaVu text-green-600 font-medium">
                {totals.shippingCost > 0 ? `${currency}${getNumberTwo(totals.shippingCost)}` : "FREE"}
              </span>
            </div>

            <div className="flex items-center justify-between px-3 py-2.5 bg-store-50 border-t-2 border-store-600 font-bold text-sm md:text-base text-store-900">
              <span>Grand Total</span>
              <span className="font-DejaVu">
                {currency}{getNumberTwo(totals.grandTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Invoice;



