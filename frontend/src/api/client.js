const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {})
    },
    ...options
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : { message: await response.text() };

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

export const api = {
  register: (payload) => request("/auth/users", {
    method: "POST",
    body: JSON.stringify(payload)
  }),
  login: (payload) => request("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  }),
  logout: () => request("/auth/logout"),
  checkAuth: () => request("/auth/check-auth"),
  getProfile: () => request("/auth/profile"),
  updateProfile: (payload) => request("/auth/profile", {
    method: "PUT",
    body: payload instanceof FormData ? payload : JSON.stringify(payload)
  }),
  getProviders: () => request("/admin-api/providers"),
  updateProviderStatus: (id, status) => request(`/admin-api/providers/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status })
  }),
  getMenu: () => request("/menu"),
  createMenu: (payload) => request("/menu", {
    method: "POST",
    body: payload instanceof FormData ? payload : JSON.stringify(payload)
  }),
  updateMenu: (id, payload) => request(`/menu/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  }),
  deleteMenu: (id) => request(`/menu/${id}`, {
    method: "DELETE"
  }),
  deleteMenuItem: (menuId, itemId) => request(`/menu/${menuId}/items/${itemId}`, {
    method: "DELETE"
  }),
  getSkippedMeals: () => request("/skip-meal"),
  skipMeal: (payload) => request("/skip-meal", {
    method: "POST",
    body: JSON.stringify(payload)
  }),
  undoSkipMeal: (id) => request(`/skip-meal/${id}`, {
    method: "DELETE"
  }),
  getKitchenTodayCount: () => request("/kitchen/today-count"),
  getKitchenWeeklyReport: () => request("/kitchen/weekly-report"),
  getKitchens: () => request("/auth/kitchens"),
  createKitchen: (payload) => request("/auth/kitchens", {
    method: "POST",
    body: JSON.stringify(payload)
  }),
  deleteKitchen: (id) => request(`/auth/kitchens/${id}`, {
    method: "DELETE"
  }),
  placeOrder: (payload) => request("/orders", {
    method: "POST",
    body: JSON.stringify(payload)
  }),
  getMyOrders: () => request("/orders/mine"),
  cancelOrder: (id) => request(`/orders/${id}`, {
    method: "DELETE"
  }),
  getDeliveryOrders: () => request("/orders/delivery"),
  updateDeliveryStatus: (id, status) => request(`/orders/${id}/delivery-status`, {
    method: "PUT",
    body: JSON.stringify({ status })
  }),
  confirmDelivered: (id) => request(`/orders/${id}/confirm-delivered`, {
    method: "PUT"
  }),
  raiseComplaint: (orderId, payload) => request(`/orders/${orderId}/complaint`, {
    method: "POST",
    body: JSON.stringify(payload)
  }),
  getProviderComplaints: () => request("/orders/provider/complaints"),
  acceptComplaint: (id) => request(`/orders/complaints/${id}`, {
    method: "DELETE"
  }),
  createSubscription: (payload) => request("/auth/subscriptions", {
    method: "POST",
    body: JSON.stringify(payload)
  }),
  getMySubscriptions: () => request("/auth/subscriptions/mine"),
  cancelSubscription: (id) => request(`/auth/subscriptions/${id}/cancel`, {
    method: "PUT"
  })
};
