import { PDFDownloadLink } from "@react-pdf/renderer";
import dynamic from "next/dynamic";
import { useRef, useEffect, useState, useContext } from "react";
import { IoCloudDownloadOutline, IoPrintOutline, IoCopyOutline } from "react-icons/io5";
import { FiTruck, FiExternalLink } from "react-icons/fi";
import { notifySuccess } from "@utils/toast";
import ReactToPrint from "react-to-print";
import { useQuery } from "@tanstack/react-query";
import Cookies from "js-cookie";

//internal import

import Layout from "@layout/Layout";
import useGetSetting from "@hooks/useGetSetting";
import Invoice from "@components/invoice/Invoice";
import Loading from "@components/preloader/Loading";
import OrderServices from "@services/OrderServices";
import RefundServices from "@services/RefundServices";
import useUtilsFunction from "@hooks/useUtilsFunction";
import InvoiceForDownload from "@components/invoice/InvoiceForDownload";
import OrderTracking from "@components/order/OrderTracking";
import { setToken } from "@services/httpServices";
import { UserContext } from "@context/UserContext";

const Order = ({ params }) => {
  const printRef = useRef();
  const orderId = params.id;
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
  const [refundReasons, setRefundReasons] = useState([]);
  const [refundMode, setRefundMode] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [refundNote, setRefundNote] = useState("");

  useEffect(() => {
    RefundServices.getRefundData().then((res) => {
      if (res && res.reasons) {
        setRefundReasons(res.reasons.filter((r) => r.status?.toLowerCase() === "show"));
      }
      if (res && res.refundMode !== undefined) {
        setRefundMode(res.refundMode);
      }
    });
  }, []);

  const handleRefundSubmit = async () => {
    if (!selectedReason) return notifyError("Please select a reason");
    try {
      const res = await OrderServices.requestRefund(orderId, {
        reason: selectedReason,
        note: refundNote,
      });
      notifySuccess(res.message);
      setIsRefundModalOpen(false);
      window.location.reload();
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    }
  };

  const { data, error, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
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
    <Layout title="Invoice" description="order confirmation page">
      {isLoading ? (
        <Loading loading={isLoading} />
      ) : error ? (
        <h2 className="text-xl text-center my-10 mx-auto w-11/12 text-red-400">
          {error?.response?.data?.message || error?.message || String(error)}
        </h2>
      ) : (
        <div className="max-w-screen-2xl mx-auto py-10 px-3 sm:px-6">
          <div className="bg-store-100 rounded-md mb-5 px-4 py-3">
            <label>
              {showingTranslateValue(
                storeCustomizationSetting?.dashboard?.invoice_message_first
              )}{" "}
              <span className="font-bold text-store-600">
                {data?.user_info?.name},
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
                 fileName={`Invoice-${data.invoice}`}
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

               {data.trackingNumber && (
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

               {data?.status === "Delivered" && refundMode && (
                 <button
                   onClick={() => setIsRefundModalOpen(true)}
                   className="flex items-center justify-center bg-red-500 text-white transition-all font-serif text-sm font-semibold h-10 py-2 px-5 rounded-md hover:bg-red-600 shadow-sm"
                 >
                   Request Refund
                 </button>
               )}
            </div>

            {/* Live Tracking Section */}
            {(data.trackingNumber || data.status === "Shipped" || data.status === "OutForDelivery") && (
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
