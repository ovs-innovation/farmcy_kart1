import requests from "./httpServices";

const OrderServices = {
  checkStock: async (body) => {
    return requests.post("/order/check-stock", body);
  },

  addOrder: async (body, headers) => {
    return requests.post("/order/add", body, headers);
  },

  retryShiprocketSync: async (id) => {
    return requests.post(`/order/${id}/retry-shiprocket`);
  },

  createPaymentIntent: async (body) => {
    return requests.post("/order/create-payment-intent", body);
  },

  addRazorpayOrder: async (body, headers) => {
    return requests.post("/order/add/razorpay", body, headers);
  },

  createOrderByRazorPay: async (body) => {
    return requests.post("/order/create/razorpay", body);
  },

  getOrderCustomer: async ({ page = 1, limit = 8 }) => {
    return requests.get(`/order?limit=${limit}&page=${page}`);
  },
  getOrderById: async (id, body) => {
    return requests.get(`/order/${id}`, body);
  },

  //for sending email invoice to customer
  sendEmailInvoiceToCustomer: async (body) => {
    return requests.post("/order/customer/invoice", body);
  },

  requestRefund: async (id, body) => {
    return requests.put(`/order/refund/${id}`, body);
  },
};

export default OrderServices;
