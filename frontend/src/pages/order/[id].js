import { PDFDownloadLink } from "@react-pdf/renderer";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef, useEffect, useState, useContext } from "react";
import { IoCloudDownloadOutline, IoPrintOutline, IoCopyOutline } from "react-icons/io5";
import { FiTruck, FiExternalLink, FiShoppingBag, FiList, FiHome } from "react-icons/fi";
import { notifySuccess, notifyError } from "@utils/toast";
import ReactToPrint from "react-to-print";
import { useQuery } from "@tanstack/react-query";
import Cookies from "js-cookie";
import { useRouter } from "next/router";

//internal import

import Layout from "@layout/Layout";
import useGetSetting from "@hooks/useGetSetting";
import Invoice from "@components/invoice/Invoice";
import Loading from "@components/preloader/Loading";
import OrderServices from "@services/OrderServices";
import useUtilsFunction from "@hooks/useUtilsFunction";
import InvoiceForDownload from "@components/invoice/InvoiceForDownload";
import OrderTracking from "@components/order/OrderTracking";
import { setToken } from "@services/httpServices";
import { UserContext } from "@context/UserContext";

const DEFAULT_REFUND_REASONS = [
  { _id: "1", title: "Damaged or defective product" },
  { _id: "2", title: "Incorrect item received" },
  { _id: "3", title: "Expired medicine/product" },
  { _id: "4", title: "Quality issue" },
  { _id: "5", title: "Other" },
];

const Order = ({ params }) => {
  const router = useRouter();
  const printRef = useRef();
  const orderId = params?.id;
  const { state } = useContext(UserContext) || {};
  const isWholesaler = state?.userInfo?.role && state.userInfo.role.toString().toLowerCase() === "wholesaler";

  // Set auth token before fetching order
  useEffect(() => {
    const userInfo = Cookies.get("userInfo");
    if (userInfo) {
      const parsedUser = JSON.parse(userInfo);
      if (parsedUser?.token) {
        setToken(parsedUser.token);
      }
    }
  }, []);

  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundReasons] = useState(DEFAULT_REFUND_REASONS);
  const [selectedReason, setSelectedReason] = useState("");
  const [refundNote, setRefundNote] = useState("");

  const handleRefundSubmit = async () => {
    if (!selectedReason) return notifyError("Please select a reason");
    try {
      const res = await OrderServices.requestRefund(orderId, {
        reason: selectedReason,
        note: refundNote,
      });
      notifySuccess(res?.message || "Refund request submitted successfully!");
      setIsRefundModalOpen(false);
      window.location.reload();
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message || "Failed to submit refund request");
    }
  };

  const { data, error, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      if (!orderId) throw new Error("Order ID is required");
      const userInfo = Cookies.get("userInfo");
      if (userInfo) {
        const parsedUser = JSON.parse(userInfo);
        if (parsedUser?.token) {
          setToken(parsedUser.token);
        }
      }
      return await OrderServices.getOrderById(orderId);
    },
    enabled: !!orderId,
  });

  const { showingTranslateValue, getNumberTwo, currency } = useUtilsFunction();
  const { storeCustomizationSetting, globalSetting } = useGetSetting();

  const handleCopyTracking = (num) => {
    navigator.clipboard.writeText(num);
    notifySuccess("Tracking number copied!");
  };

  return (
    <Layout title="Invoice" description="Order confirmation page">
      {isLoading ? (
        <Loading loading={isLoading} />
      ) : error ? (
        <div className="max-w-screen-2xl mx-auto py-16 px-4 text-center">
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 max-w-lg mx-auto shadow-sm">
            <h2 className="text-xl font-bold text-red-700 mb-2">
              Unable to Load Invoice
            </h2>
            <p className="text-sm text-red-600 mb-4">
              {error?.response?.data?.message || error?.message || "An error occurred while retrieving order details."}
            </p>
            <button
              onClick={() => router.push("/user/my-orders")}
              className="px-5 py-2.5 bg-red-600 text-white font-medium text-sm rounded-lg hover:bg-red-700 transition-colors shadow-sm"
            >
              View My Orders
            </button>
          </div>
        </div>
      ) : !data ? (
        <div className="max-w-screen-2xl mx-auto py-16 px-4 text-center">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 max-w-lg mx-auto shadow-sm">
            <h2 className="text-xl font-bold text-yellow-800 mb-2">
              Order Not Found
            </h2>
            <p className="text-sm text-yellow-700 mb-4">
              The requested order could not be located.
            </p>
            <button
              onClick={() => router.push("/user/my-orders")}
              className="px-5 py-2.5 bg-yellow-600 text-white font-medium text-sm rounded-lg hover:bg-yellow-700 transition-colors shadow-sm"
            >
              View My Orders
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-screen-2xl mx-auto py-10 px-3 sm:px-6">
          <div className="bg-store-100 rounded-md mb-5 px-4 py-3">
            <label>
              {showingTranslateValue(
                storeCustomizationSetting?.dashboard?.invoice_message_first
              )}{" "}
              <span className="font-bold text-store-600">
                {data?.user_info?.name || "Customer"},
              </span>{" "}
              {showingTranslateValue(
                storeCustomizationSetting?.dashboard?.invoice_message_last
              )}
            </label>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-8">
            <div className="flex flex-wrap gap-3 mb-8">
              <PDFDownloadLink
                document={
                  <InvoiceForDownload
                    data={data}
                    currency={currency}
                    globalSetting={globalSetting}
                    getNumberTwo={getNumberTwo}
                    logo={storeCustomizationSetting?.navbar?.logo}
                    isWholesaler={isWholesaler}
                  />
                }
                fileName={`Invoice-${data?.invoice || data?._id}`}
              >
                {({ blob, url, loading, error }) =>
                  loading ? (
                    "Loading..."
                  ) : (
                    <button className="flex items-center justify-center bg-store-500 text-white transition-all font-serif text-sm font-semibold h-10 py-2 px-5 rounded-md hover:bg-store-600 shadow-sm">
                      {showingTranslateValue(
                        storeCustomizationSetting?.dashboard?.download_button
                      )}{" "}
                      <span className="ml-2 text-base">
                        <IoCloudDownloadOutline />
                      </span>
                    </button>
                  )
                }
              </PDFDownloadLink>

              {data?.trackingNumber && (
                <>
                  <button
                    onClick={() => router.push(`/user/track-order?id=${data._id}`)}
                    className="flex items-center justify-center bg-blue-500 text-white transition-all font-serif text-sm font-semibold h-10 py-2 px-5 rounded-md hover:bg-blue-600 shadow-sm"
                  >
                    Track Shipment <FiTruck className="ml-2" />
                  </button>

                  <button
                    onClick={() => handleCopyTracking(data.trackingNumber)}
                    className="flex items-center justify-center bg-gray-100 text-gray-700 transition-all font-serif text-sm font-semibold h-10 py-2 px-5 rounded-md hover:bg-gray-200 shadow-sm"
                  >
                    Copy AWB <IoCopyOutline className="ml-2" />
                  </button>

                  {data.trackingUrl && (
                    <a
                      href={data.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center bg-indigo-50 text-indigo-700 transition-all font-serif text-sm font-semibold h-10 py-2 px-5 rounded-md hover:bg-indigo-100 shadow-sm"
                    >
                      Courier Tracking <FiExternalLink className="ml-2" />
                    </a>
                  )}
                </>
              )}

              {data?.status === "Delivered" && (
                <button
                  onClick={() => setIsRefundModalOpen(true)}
                  className="flex items-center justify-center bg-red-500 text-white transition-all font-serif text-sm font-semibold h-10 py-2 px-5 rounded-md hover:bg-red-600 shadow-sm"
                >
                  Request Refund
                </button>
              )}
            </div>

            {/* Live Tracking Section */}
            {(data?.trackingNumber || data?.status === "Shipped" || data?.status === "OutForDelivery") && (
              <div className="mb-10">
                <OrderTracking order={data} />
              </div>
            )}

            <Invoice
              data={data}
              printRef={printRef}
              currency={currency}
              globalSetting={globalSetting}
            />

            {/* Post-Invoice Quick Actions */}
            <div className="mt-8 pt-6 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4 print:hidden">
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <Link
                  href="/search"
                  className="flex-1 sm:flex-none inline-flex items-center justify-center bg-store-500 text-white font-serif text-sm font-semibold h-10 px-5 rounded-md hover:bg-store-600 transition-all shadow-sm"
                >
                  <FiShoppingBag className="mr-2 text-base" />
                  Continue Shopping
                </Link>
                <Link
                  href="/user/my-orders"
                  className="flex-1 sm:flex-none inline-flex items-center justify-center bg-gray-100 text-gray-700 font-serif text-sm font-semibold h-10 px-5 rounded-md hover:bg-gray-200 transition-all shadow-sm"
                >
                  <FiList className="mr-2 text-base" />
                  View My Orders
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <PDFDownloadLink
                  document={
                    <InvoiceForDownload
                      data={data}
                      currency={currency}
                      globalSetting={globalSetting}
                      getNumberTwo={getNumberTwo}
                      logo={storeCustomizationSetting?.navbar?.logo}
                      isWholesaler={isWholesaler}
                    />
                  }
                  fileName={`Invoice-${data?.invoice || data?._id}`}
                >
                  {({ loading }) => (
                    <button
                      disabled={loading}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center bg-blue-600 text-white font-serif text-sm font-semibold h-10 px-5 rounded-md hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50"
                    >
                      <IoCloudDownloadOutline className="mr-2 text-base" />
                      {loading ? "Preparing PDF..." : "Download Invoice"}
                    </button>
                  )}
                </PDFDownloadLink>

                <Link
                  href="/"
                  className="flex-1 sm:flex-none inline-flex items-center justify-center border border-gray-300 text-gray-700 font-serif text-sm font-semibold h-10 px-5 rounded-md hover:bg-gray-50 transition-all shadow-sm"
                >
                  <FiHome className="mr-2 text-base" />
                  Back to Home
                </Link>
              </div>
            </div>
          </div>

          {/* Refund Modal */}
          {isRefundModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                <h2 className="text-xl font-bold mb-4">Request Refund</h2>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Reason</label>
                  <select
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-store-500 focus:ring-store-500 p-2 border"
                    value={selectedReason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                  >
                    <option value="" disabled>Select a reason...</option>
                    {refundReasons.map((r) => (
                      <option key={r._id} value={r.title}>{r.title}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Additional Note (Optional)</label>
                  <textarea
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-store-500 focus:ring-store-500 p-2 border"
                    rows="3"
                    value={refundNote}
                    onChange={(e) => setRefundNote(e.target.value)}
                  ></textarea>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setIsRefundModalOpen(false)}
                    className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRefundSubmit}
                    className="px-4 py-2 bg-store-500 text-white rounded-md hover:bg-store-600"
                  >
                    Submit Request
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
};

export const getServerSideProps = ({ params }) => {
  return {
    props: { params },
  };
};

export default dynamic(() => Promise.resolve(Order), { ssr: false });
