import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getUserSession } from "@lib/auth";
import { setToken } from "@services/httpServices";
import Dashboard from "@pages/user/dashboard";
import OrderServices from "@services/OrderServices";
import RecentOrder from "@pages/user/recent-order";

const RecentOrdersPage = () => {
  const userInfo = getUserSession();
  const userId = userInfo?._id || userInfo?.id;

  useEffect(() => {
    if (userInfo?.token) {
      setToken(userInfo.token);
    }
  }, [userInfo?.token]);

  const {
    data,
    error,
    isLoading: loading,
  } = useQuery({
    queryKey: ["recent-orders-page", { user: userId }],
    queryFn: async () =>
      await OrderServices.getOrderCustomer({
        page: 1,
        limit: 5,
      }),
    enabled: !!userId && !!userInfo?.token,
  });

  return (
    <Dashboard
      title="Recent Orders"
      description="View your 5 most recent orders"
    >
      <RecentOrder data={data} loading={loading} error={error} isStandalonePage={true} />
    </Dashboard>
  );
};

export default RecentOrdersPage;
