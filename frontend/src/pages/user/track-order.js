import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { FiTruck, FiSearch, FiPackage, FiArrowRight, FiMapPin, FiShoppingBag, FiExternalLink } from 'react-icons/fi';
import Cookies from 'js-cookie';

// internal imports
import Dashboard from '@pages/user/dashboard';
import OrderServices from '@services/OrderServices';
import OrderTracking from '@components/order/OrderTracking';
import Loading from '@components/preloader/Loading';
import { setToken } from '@services/httpServices';

const TrackOrder = () => {
  const router = useRouter();
  const { id } = router.query;
  const [orderIdInput, setOrderIdInput] = useState(id || '');

  useEffect(() => {
    const userInfo = Cookies.get('userInfo');
    if (userInfo) {
      const parsedUser = JSON.parse(userInfo);
      if (parsedUser?.token) {
        setToken(parsedUser.token);
      }
    }
  }, []);

  const { data: order, isLoading, error, refetch } = useOrderQuery(id);

  const handleSearch = (e) => {
    e.preventDefault();
    if (orderIdInput.trim()) {
      router.push(`/user/track-order?id=${orderIdInput.trim()}`);
    }
  };

  return (
    <Dashboard title="Track Order" description="Track your order status and delivery updates">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-serif font-bold text-gray-800 flex items-center gap-2">
            <FiTruck className="text-store-500" /> Track Your Order
          </h1>
          <p className="text-sm text-gray-500 mt-1">Enter your Order ID to see real-time updates on your delivery.</p>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FiSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                value={orderIdInput}
                onChange={(e) => setOrderIdInput(e.target.value)}
                placeholder="Enter Order ID (e.g. 69ff59d0...)"
                className="block w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-store-500 focus:border-transparent transition-all"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-store-500 text-white rounded-xl font-bold hover:bg-store-600 transition-all shadow-md flex items-center gap-2"
            >
              Track Now <FiArrowRight />
            </button>
          </form>
        </div>

        {/* Results Section */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-store-100 border-t-store-500 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500 font-bold animate-pulse uppercase tracking-widest text-[10px]">Fetching real-time updates...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-100 p-8 rounded-3xl text-center shadow-sm">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiSearch className="text-red-500 text-3xl" />
            </div>
            <h3 className="text-xl font-bold text-red-800">Order Not Found</h3>
            <p className="text-sm text-red-600 mt-2 max-w-sm mx-auto leading-relaxed">
              We couldn't find an order with ID <span className="font-mono font-bold">"{orderIdInput}"</span>. 
              Please verify the ID from your "My Orders" section or confirmation email.
            </p>
          </div>
        ) : order ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
             {/* Order Identity Card */}
             <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-store-50 rounded-xl flex items-center justify-center">
                    <FiPackage className="text-store-500 text-xl" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Order ID</p>
                    <p className="text-sm font-mono font-bold text-gray-800">#{order._id}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 md:gap-8">
                  <div>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Placed On</p>
                    <p className="text-sm font-bold text-gray-800">{new Date(order.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Payment</p>
                    <p className="text-sm font-bold text-gray-800">{order.paymentMethod}</p>
                  </div>
                </div>
             </div>
             
             {/* Main Tracker */}
             <OrderTracking order={order} />
             
             {/* Detailed Info Grid */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Shipping Details */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                   <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                     <FiMapPin className="text-store-500" /> Delivery Address
                   </h4>
                   <div className="space-y-1">
                      <p className="text-sm font-bold text-gray-800">{order.user_info?.name}</p>
                      <p className="text-sm text-gray-500 leading-relaxed">{order.user_info?.address}</p>
                      <p className="text-sm text-gray-500">{order.user_info?.city}, {order.user_info?.zipCode}</p>
                      <p className="text-sm text-gray-500 mt-2 font-bold">{order.user_info?.contact}</p>
                   </div>
                </div>

                {/* Items Summary */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                   <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                     <FiShoppingBag className="text-store-500" /> Order Summary
                   </h4>
                   <div className="space-y-4 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                      {order.cart?.map((item, idx) => (
                        <div key={idx} className="flex gap-3 items-center">
                          <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0">
                            <img src={item.image} alt={getSafeString(item?.title, null, "Product")} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-800 truncate">{getSafeString(item?.title, null, "Product")}</p>
                            <p className="text-xs text-gray-500">Qty: {item.quantity} · ₹{parseFloat(item.price).toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                   </div>
                   <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
                      <span className="text-xs text-gray-400 font-bold uppercase">Total Amount</span>
                      <span className="text-lg font-black text-store-600">₹{parseFloat(order.total).toFixed(2)}</span>
                   </div>
                </div>
             </div>

             <div className="flex justify-center mt-8">
                <button 
                  onClick={() => router.push(`/order/${order._id}`)}
                  className="px-8 py-3 bg-white border-2 border-store-100 text-store-600 rounded-2xl text-sm font-black hover:bg-store-50 hover:border-store-500 transition-all shadow-sm flex items-center gap-2 group"
                >
                   View Official Invoice <FiExternalLink className="group-hover:translate-x-1 transition-transform" />
                </button>
             </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-100 p-16 rounded-[2.5rem] text-center shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-store-50 rounded-bl-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700"></div>
            <div className="w-24 h-24 bg-store-50 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner transform -rotate-6 group-hover:rotate-0 transition-transform duration-500">
              <FiPackage className="text-store-400 text-4xl" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800">Track Your Parcel</h3>
            <p className="text-sm text-gray-500 mt-3 max-w-xs mx-auto leading-relaxed">
              Enter your tracking number above to see exactly where your FarmacyKart order is.
            </p>
          </div>
        )}
      </div>
    </Dashboard>
  );
};

// Add polling logic to the query
const useOrderQuery = (id) => {
  return useQuery({
    queryKey: ['order', id],
    queryFn: async () => await OrderServices.getOrderById(id),
    enabled: !!id,
    refetchInterval: 30000, // Poll every 30 seconds
    refetchIntervalInBackground: false,
  });
};

export default dynamic(() => Promise.resolve(TrackOrder), { ssr: false });
