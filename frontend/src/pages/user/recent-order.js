import React, { useContext, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { IoBagHandle, IoRefreshOutline, IoTimeOutline } from "react-icons/io5";
import { FiEye, FiStar, FiPackage, FiTruck, FiCheck, FiX, FiClock, FiShoppingCart } from "react-icons/fi";
import ReactPaginate from "react-paginate";
import dayjs from "dayjs";
import { SidebarContext } from "@context/SidebarContext";
import { UserContext } from "@context/UserContext";
import { notifySuccess, notifyError } from "@utils/toast";

import useGetSetting from "@hooks/useGetSetting";
import useUtilsFunction from "@hooks/useUtilsFunction";
import ReviewModal from "@components/reviews/ReviewModal";
import CMSkeletonTwo from "@components/preloader/CMSkeletonTwo";
import useCartDB from "@hooks/useCartDB";
import RecentOrdersPage from "./recent-orders";

/* ─── Status badge ─── */
const StatusBadge = ({ status }) => {
  const map = {
    Delivered: { bg: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
    Pending: { bg: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
    Processing: { bg: "bg-indigo-100 text-indigo-700 border-indigo-200", dot: "bg-indigo-500" },
    Cancel: { bg: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500" },
  };
  const s = map[status] || map.Pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${s.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status || "Pending"}
    </span>
  );
};

/* ─── Product thumbnail strip ─── */
const ProductStrip = ({ cart = [] }) => {
  const visible = cart.slice(0, 3);
  const extra = cart.length - visible.length;
  return (
    <div className="flex items-center gap-1">
      {visible.map((item, i) => {
        const img = item.image ||
          (Array.isArray(item.productId?.image) ? item.productId.image[0] : item.productId?.image) || "";
        return (
          <div key={i} className="w-8 h-8 rounded-md border border-gray-200 overflow-hidden bg-gray-50 flex-shrink-0">
            {img
              ? <img src={img} alt={item.title || "product"} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-gray-300"><FiPackage size={12} /></div>
            }
          </div>
        );
      })}
      {extra > 0 && (
        <span className="w-8 h-8 rounded-md border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-xs text-gray-500 font-semibold flex-shrink-0">
          +{extra}
        </span>
      )}
    </div>
  );
};

/* ─── Main Component ─── */
const RecentOrder = (props) => {
  // If rendered directly as a Next.js page route without props, delegate to RecentOrdersPage
  if (!props.data && !props.loading && props.error === undefined) {
    return <RecentOrdersPage />;
  }

  const { data, loading, error } = props;
  const router = useRouter();
  const { handleChangePage, currentPage, setCartDrawerOpen } = useContext(SidebarContext);
  const { storeCustomizationSetting } = useGetSetting();
  const { showingTranslateValue, currency } = useUtilsFunction();
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedProductForReview, setSelectedProductForReview] = useState(null);
  const [reorderingId, setReorderingId] = useState(null);

  const { addItemWithDB, clearCartWithDB } = useCartDB();
  const pageCount = Math.ceil(data?.totalDoc / 10);
  const displayOrders = data?.orders ? data.orders.slice(0, 5) : [];

  /* ─── Re-order handler ─── */
  const handleReorder = async (order) => {
    if (!order?.cart || !Array.isArray(order.cart) || order.cart.length === 0) {
      notifyError("No items found in this order.");
      return;
    }
    setReorderingId(order._id);
    try {
      // Clear local cart (and DB cart if user is logged in)
      await clearCartWithDB();
      let addedCount = 0;
      for (const item of order.cart) {
        const product = item.productId || item;
        const productId = product?._id || item._id || item.id;
        if (!productId) continue;
        const img = Array.isArray(product.image) ? product.image[0] : product.image || item.image || "";
        await addItemWithDB({
          id: String(productId),
          title: product.title?.en || product.title || item.title || "Product",
          price: item.price || product.prices?.price || product.prices?.originalPrice || 0,
          image: img,
          slug: product.slug || item.slug || "",
          quantity: item.quantity || 1,
          stock: product.stock,
          minQuantity: product.minQuantity,
        }, item.quantity || 1);
        addedCount++;
      }
      if (addedCount > 0) {
        notifySuccess(`${addedCount} item${addedCount > 1 ? "s" : ""} added! You can now adjust your cart.`);
        setCartDrawerOpen(true);
      } else {
        notifyError("Could not add items — product data may be unavailable.");
      }
    } catch (err) {
      notifyError("Something went wrong. Please try again.");
    } finally {
      setReorderingId(null);
    }
  };

  return (
    <>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-50 mt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-800 font-serif flex items-center gap-2">
            {showingTranslateValue(storeCustomizationSetting?.dashboard?.recent_order) || "Recent Orders"}
          </h3>
          <Link href="/user/my-orders" className="text-sm text-store-600 hover:underline font-semibold">
            View all →
          </Link>
        </div>

        {loading ? (
          <CMSkeletonTwo count={10} width={100} error={error} loading={loading} />
        ) : displayOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 bg-store-50 rounded-full flex items-center justify-center mb-4">
              <IoBagHandle className="text-store-400 text-2xl" />
            </div>
            <p className="text-sm text-gray-500 mb-4">No orders placed yet!</p>
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-store-600 hover:underline">
              <FiShoppingCart size={12} /> Start Shopping
            </Link>
          </div>
        ) : (
          <>
            {/* ── Desktop Table ── */}
            <div className="hidden sm:block overflow-x-auto rounded-xl">
              <table className="min-w-full divide-y divide-gray-100">
                <thead>
                  <tr className="bg-gray-50">
                    {["Order ID", "Date", "Items", "Status", "Total", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {displayOrders.map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-mono text-xs font-bold text-store-600 bg-store-50 px-2 py-0.5 rounded">
                          #{order?._id?.slice(-6).toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="text-xs text-gray-600 font-medium">{dayjs(order.createdAt).format("DD MMM YYYY")}</div>
                        <div className="text-xs text-gray-400">{dayjs(order.createdAt).format("hh:mm A")}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <ProductStrip cart={order.cart} />
                        <span className="text-xs text-gray-400">{order.cart?.length || 0} item{(order.cart?.length || 0) !== 1 ? "s" : ""}</span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-sm font-bold text-gray-800">{currency}{parseFloat(order?.total || 0).toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Link href={`/order/${order._id}`} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 text-gray-600 hover:bg-store-500 hover:text-white transition-all">
                            <FiEye size={10} /> View
                          </Link>
                          <Link href={`/order/${order._id}`} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-store-50 text-store-600 hover:bg-store-500 hover:text-white transition-all">
                            <FiTruck size={10} /> Track
                          </Link>
                          <button
                            type="button"
                            disabled={reorderingId === order._id}
                            onClick={() => handleReorder(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-store-500 text-white hover:bg-store-600 disabled:opacity-60 transition-all"
                          >
                            {reorderingId === order._id
                              ? <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                              : <IoRefreshOutline size={10} />
                            }
                            Re-order
                          </button>
                          {order.status === "Delivered" && order?.cart?.[0]?.slug && (
                            <button type="button" onClick={() => { setSelectedProductForReview(order.cart[0]); setReviewModalOpen(true); }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white transition-all">
                              <FiStar size={10} /> Rate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Mobile Cards ── */}
            <div className="sm:hidden space-y-3">
              {displayOrders.map((order) => (
                <div key={order._id} className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 border-b border-gray-100">
                    <span className="font-mono text-xs font-bold text-store-600">
                      #{order?._id?.slice(-6).toUpperCase()}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="px-3 py-2.5">
                    <div className="flex items-center justify-between mb-2">
                      <ProductStrip cart={order.cart} />
                      <span className="text-sm font-bold text-gray-800">{currency}{parseFloat(order?.total || 0).toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <IoTimeOutline size={11} />
                      {dayjs(order.createdAt).format("DD MMM YYYY · hh:mm A")}
                    </p>
                  </div>
                  <div className="px-3 py-2.5 bg-gray-50 border-t border-gray-100 flex gap-2">
                    <Link href={`/order/${order._id}`} className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 text-xs font-semibold rounded-lg bg-white border border-gray-200 text-gray-600 hover:border-store-400 hover:text-store-600 transition-all">
                      <FiTruck size={11} /> Track
                    </Link>
                    <button type="button" disabled={reorderingId === order._id} onClick={() => handleReorder(order)}
                      className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 text-xs font-semibold rounded-lg bg-store-500 text-white hover:bg-store-600 disabled:opacity-60 transition-all">
                      {reorderingId === order._id
                        ? <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                        : <IoRefreshOutline size={11} />
                      }
                      Re-order
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Pagination ── */}
            {data?.totalDoc > 10 && (
              <div className="paginationOrder mt-5">
                <ReactPaginate
                  breakLabel="..."
                  nextLabel="Next →"
                  onPageChange={(e) => handleChangePage(e.selected + 1)}
                  pageRangeDisplayed={3}
                  pageCount={pageCount}
                  previousLabel="← Prev"
                  renderOnZeroPageCount={null}
                  pageClassName="page--item"
                  pageLinkClassName="page--link"
                  previousClassName="page-item"
                  previousLinkClassName="page-previous-link"
                  nextClassName="page-item"
                  nextLinkClassName="page-next-link"
                  breakClassName="page--item"
                  breakLinkClassName="page--link"
                  containerClassName="pagination"
                  activeClassName="activePagination"
                  forcePage={currentPage - 1}
                />
              </div>
            )}
          </>
        )}
      </div>

      {reviewModalOpen && selectedProductForReview && (
        <ReviewModal
          open={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          productSnapshot={selectedProductForReview}
        />
      )}
    </>
  );
};

export default RecentOrder;
