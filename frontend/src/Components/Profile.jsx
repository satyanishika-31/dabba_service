import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Mail,
  MapPin,
  PackageCheck,
  Phone,
  Save,
  ShoppingBag,
  Truck,
  UserCircle,
  CalendarCheck
} from "lucide-react";
import { Navigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/useAuth";

const deliveryStatuses = ["ASSIGNED", "PICKED", "REACHED", "DELIVERED", "FAILED"];

function formatDate(value) {
  if (!value) return "Not recorded";
  return new Date(value).toLocaleString();
}

function Profile() {
  const { user, isAuthenticated, updateProfile } = useAuth();
  const [form, setForm] = useState(null);
  const [orders, setOrders] = useState([]);
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [kitchens, setKitchens] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [reachedOrderForPopup, setReachedOrderForPopup] = useState(null);
  const [dismissedReachedOrderIds, setDismissedReachedOrderIds] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [planAddressForm, setPlanAddressForm] = useState("");
  const [showAddressModal, setShowAddressModal] = useState(null); // stores planName when subscribing

  const canViewMyOrders = user?.role === "USER";
  const canWorkDeliveries = user?.role === "DELIVERY" || user?.role === "ADMIN";
  const canUpdateDeliveryStatus = user?.role === "DELIVERY";
  const canViewKitchens = user?.role === "FOOD_PROVIDER" || user?.role === "ADMIN";

  const savedProfile = useMemo(() => ({
    name: user?.name || "",
    email: user?.email || "",
    mobile: user?.mobile || ""
  }), [user?.email, user?.mobile, user?.name]);

  const profileForm = form || savedProfile;

  const visibleOrders = useMemo(() => (
    orders.filter((order) => {
      const isUserConfirmed = order.delivery?.userConfirmed || false;
      const deliveryStatus = order.delivery?.status || "ASSIGNED";
      
      const hasMismatch = (isUserConfirmed && deliveryStatus !== "DELIVERED") || 
                          (!isUserConfirmed && deliveryStatus === "DELIVERED");
                          
      if (hasMismatch) {
        return true;
      }
      
      if (isUserConfirmed && deliveryStatus === "DELIVERED") {
        return false;
      }
      
      return true;
    })
  ), [orders]);

  const visibleDeliveryOrders = useMemo(() => (
    deliveryOrders.filter((order) => {
      const isUserConfirmed = order.delivery?.userConfirmed || false;
      const deliveryStatus = order.delivery?.status || "ASSIGNED";
      
      const hasMismatch = (isUserConfirmed && deliveryStatus !== "DELIVERED") || 
                          (!isUserConfirmed && deliveryStatus === "DELIVERED");
                          
      if (hasMismatch) {
        return true;
      }
      
      if (isUserConfirmed && deliveryStatus === "DELIVERED") {
        return false;
      }
      
      return true;
    })
  ), [deliveryOrders]);

  const stats = useMemo(() => {
    const activeOrders = visibleOrders.filter((order) => order.status !== "CANCELLED").length;
    const pendingDeliveries = visibleDeliveryOrders.filter((order) => order.delivery?.status !== "DELIVERED").length;
    return [
      ["Role", user?.role || "USER"],
      ["My orders", visibleOrders.length],
      ["Active orders", activeOrders],
      ["Deliveries", visibleDeliveryOrders.length || pendingDeliveries]
    ];
  }, [visibleDeliveryOrders, user?.role, visibleOrders]);

  const loadProfileData = async () => {
    if (!user) return;
    setLoading(true);
    setMessage("");
    try {
      const requests = [];

      if (canViewMyOrders) requests.push(api.getMyOrders());
      else requests.push(Promise.resolve({ payload: [] }));

      if (canWorkDeliveries) requests.push(api.getDeliveryOrders());
      else requests.push(Promise.resolve({ payload: [] }));

      if (canViewKitchens) requests.push(api.getKitchens());
      else requests.push(Promise.resolve({ payload: [] }));

      const [orderRes, deliveryRes, kitchenRes] = await Promise.all(requests);
      const ordersList = orderRes.payload || [];
      setOrders(ordersList);
      setDeliveryOrders(deliveryRes.payload || []);
      setKitchens(kitchenRes.payload || []);

      if (canViewMyOrders) {
        const subRes = await api.getMySubscriptions();
        setSubscription(subRes.payload || null);

        const reached = ordersList.find(
          (order) => (order.delivery?.status === "PICKED" || order.delivery?.status === "REACHED") && 
                     !order.delivery?.userConfirmed && 
                     !dismissedReachedOrderIds.includes(order._id)
        );
        setReachedOrderForPopup(reached || null);
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();
    const interval = setInterval(() => {
      loadProfileData();
    }, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role, user?._id, dismissedReachedOrderIds]);

  const updateField = (event) => {
    setForm((current) => ({ ...(current || savedProfile), [event.target.name]: event.target.value }));
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setMessage("");
    try {
      await updateProfile(profileForm);
      setForm(null);
      setMessage("Profile details saved.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const updateDeliveryStatus = async (id, status) => {
    setMessage("");
    try {
      await api.updateDeliveryStatus(id, status);
      await loadProfileData();
      setMessage("Delivery status updated.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const subscribeToPlan = async (planName, address) => {
    setMessage("");
    try {
      await api.createSubscription({ planName, deliveryAddress: address });
      setPlanAddressForm("");
      setShowAddressModal(null);
      setMessage(`Successfully subscribed to ${planName} Plan!`);
      await loadProfileData();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const cancelSubscription = async (id) => {
    setMessage("");
    try {
      await api.cancelSubscription(id);
      setMessage("Subscription cancelled successfully.");
      await loadProfileData();
    } catch (error) {
      setMessage(error.message);
    }
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-[#896A67]">Account profile</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-[#3F2A32]">{user?.name || "My profile"}</h1>
          <p className="mt-2 text-[#7A5C5F]">Your account data, orders, and delivery records stay together here.</p>
        </div>
        {loading && <p className="text-sm font-semibold text-[#7A5C5F]">Loading...</p>}
      </div>

      {message && <p className="mb-6 rounded-md border border-[#6B4D57] bg-white px-4 py-3 text-sm font-semibold text-[#3F2A32]">{message}</p>}

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.35fr]">
        <aside className="space-y-6">
          <form onSubmit={saveProfile} className="rounded-lg border border-[#6B4D57] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              {user?.profileImage ? (
                <img src={user.profileImage} alt={user.name} className="h-16 w-16 rounded-md object-cover" />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded-md bg-[#896A67]/10 text-[#6B4D57]">
                  <UserCircle size={34} />
                </span>
              )}
              <div>
                <h2 className="text-xl font-black text-[#3F2A32]">Personal data</h2>
                <p className="mt-1 text-sm font-semibold text-[#7A5C5F]">{user?.role}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              <input name="name" value={profileForm.name} onChange={updateField} required placeholder="Name" className="rounded-md border border-[#896A67] px-4 py-3" />
              <input name="email" value={profileForm.email} onChange={updateField} required type="email" placeholder="Email" className="rounded-md border border-[#896A67] px-4 py-3" />
              <input name="mobile" value={profileForm.mobile} onChange={updateField} required pattern="[0-9]{10}" placeholder="Mobile number" className="rounded-md border border-[#896A67] px-4 py-3" />
            </div>

            <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-[#3F2A32] px-4 py-3 font-black text-white hover:bg-[#6B4D57]">
              <Save size={17} /> Save profile
            </button>
          </form>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {stats.map(([label, value]) => (
              <div key={label} className="rounded-lg border border-[#6B4D57] bg-white p-5 shadow-sm">
                <p className="text-sm font-bold text-[#7A5C5F]">{label}</p>
                <p className="mt-2 text-2xl font-black text-[#3F2A32]">{value}</p>
              </div>
            ))}
          </div>
        </aside>

        <div className="space-y-6">
          <section className="rounded-lg border border-[#6B4D57] bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-black text-[#3F2A32]">
              <Mail size={19} /> Saved account details
            </h2>
            <div className="mt-5 grid gap-3 text-sm text-[#3F2A32] sm:grid-cols-3">
              <p className="flex items-center gap-2 rounded-md bg-[#896A67]/10 px-3 py-3"><UserCircle size={16} /> {user?.name}</p>
              <p className="flex items-center gap-2 rounded-md bg-[#896A67]/10 px-3 py-3"><Mail size={16} /> {user?.email}</p>
              <p className="flex items-center gap-2 rounded-md bg-[#896A67]/10 px-3 py-3"><Phone size={16} /> {user?.mobile}</p>
            </div>
          </section>

          {canViewMyOrders && (
            <section className="rounded-lg border border-[#6B4D57] bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-black text-[#3F2A32]">
                <CalendarCheck size={19} /> My Subscription Plan
              </h2>
              {subscription ? (
                <div className="mt-5 rounded-md bg-[#896A67]/10 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-[#896A67]">Active Plan</p>
                      <h3 className="mt-1 text-2xl font-black text-[#3F2A32]">{subscription.planName} Plan</h3>
                      <p className="mt-1 text-sm text-[#7A5C5F]">Started: {formatDate(subscription.startDate)}</p>
                      <p className="mt-2 flex gap-2 text-sm text-[#3F2A32] font-semibold"><MapPin size={16} /> Delivery Address: {subscription.deliveryAddress}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => cancelSubscription(subscription._id)}
                      className="rounded-md bg-red-600 px-4 py-2.5 text-xs font-black text-white hover:bg-red-700"
                    >
                      Cancel Subscription
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-5">
                  <p className="text-sm text-[#7A5C5F] mb-4">You do not have an active subscription. Choose a plan below to start receiving daily home-style meals automatically:</p>
                  <div className="grid gap-4 sm:grid-cols-3">
                    {[
                      { name: "Student", price: "1999", detail: "One home-style meal every weekday." },
                      { name: "Office", price: "3499", detail: "Lunch and dinner with skip controls." },
                      { name: "Family", price: "6499", detail: "Shared subscription for daily household meals." }
                    ].map((plan) => (
                      <div key={plan.name} className="flex flex-col justify-between rounded-md border border-[#896A67]/35 p-4 bg-white hover:border-[#6B4D57] transition">
                        <div>
                          <h4 className="font-black text-[#3F2A32]">{plan.name}</h4>
                          <p className="mt-2 text-lg font-black text-[#3F2A32]">Rs. {plan.price}</p>
                          <p className="mt-1 text-xs text-[#7A5C5F] leading-relaxed">{plan.detail}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddressModal(plan.name);
                            setPlanAddressForm("");
                          }}
                          className="mt-4 w-full rounded bg-[#3F2A32] py-2 text-xs font-bold text-white hover:bg-[#6B4D57]"
                        >
                          Subscribe
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {canViewMyOrders && (
            <section className="rounded-lg border border-[#6B4D57] bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-black text-[#3F2A32]">
                <ShoppingBag size={19} /> My orders and deliveries
              </h2>
              <div className="mt-5 space-y-4">
                {visibleOrders.map((order) => {
                  const isUserConfirmed = order.delivery?.userConfirmed || false;
                  const deliveryStatus = order.delivery?.status || "ASSIGNED";
                  const hasMismatch = (isUserConfirmed && deliveryStatus !== "DELIVERED") || 
                                      (!isUserConfirmed && deliveryStatus === "DELIVERED");
                  const shouldShowComplaint = hasMismatch || deliveryStatus === "FAILED";

                  return (
                    <article key={order._id} className="rounded-md bg-[#896A67]/10 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-[#896A67]">{formatDate(order.createdAt)}</p>
                          <h3 className="mt-1 text-lg font-black text-[#3F2A32]">{order.mealSnapshot?.name}</h3>
                          <p className="mt-1 text-sm text-[#7A5C5F]">Qty {order.quantity} / Rs. {order.totalAmount}</p>
                        </div>
                        <p className="rounded-md bg-white px-3 py-2 text-xs font-black text-[#3F2A32]">
                          {order.status} / {deliveryStatus}
                        </p>
                      </div>
                      <p className="mt-3 flex gap-2 text-sm text-[#7A5C5F]"><MapPin size={16} /> {order.customerSnapshot?.address || "No delivery address recorded"}</p>
                      
                      {shouldShowComplaint && (
                        <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-4">
                          {order.complaint ? (
                            <p className="text-sm font-bold text-red-700">
                              Complaint: "{order.complaint.description}" (Pending)
                            </p>
                          ) : (
                            <div>
                              <p className="text-sm font-bold text-red-700 mb-2">Something went wrong with this delivery. Please file a complaint:</p>
                              <form
                                onSubmit={async (e) => {
                                  e.preventDefault();
                                  const desc = e.target.elements.complaintDesc.value;
                                  if (!desc.trim()) return;
                                  try {
                                    await api.raiseComplaint(order._id, { description: desc });
                                    setMessage("Complaint submitted successfully.");
                                    e.target.reset();
                                    await loadProfileData();
                                  } catch (err) {
                                    setMessage(err.message);
                                  }
                                }}
                                className="flex flex-col gap-2"
                              >
                                <textarea
                                  name="complaintDesc"
                                  required
                                  placeholder="Describe the complaint..."
                                  className="w-full rounded-md border border-red-300 p-2 text-sm text-gray-900 outline-none focus:border-red-500"
                                  rows={2}
                                />
                                <button
                                  type="submit"
                                  className="self-end rounded bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
                                >
                                  Submit Complaint
                                </button>
                              </form>
                            </div>
                          )}
                        </div>
                      )}

                      {!isUserConfirmed && deliveryStatus === "REACHED" && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await api.confirmDelivered(order._id);
                              setMessage("Pickup confirmed successfully.");
                              await loadProfileData();
                            } catch (err) {
                              setMessage(err.message);
                            }
                          }}
                          className="mt-3 rounded-md bg-[#3F2A32] px-4 py-2 text-xs font-black text-white hover:bg-[#6B4D57]"
                        >
                          Confirm Pickup
                        </button>
                      )}
                    </article>
                  );
                })}
                {!visibleOrders.length && <p className="text-sm text-[#7A5C5F]">No active orders yet. Orders placed from the Menu page will appear here.</p>}
              </div>
            </section>
          )}

          {canWorkDeliveries && (
            <section className="rounded-lg border border-[#6B4D57] bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-black text-[#3F2A32]">
                <Truck size={19} /> Delivery records
              </h2>
              <div className="mt-5 space-y-4">
                {visibleDeliveryOrders.map((order) => {
                  const isUserConfirmed = order.delivery?.userConfirmed || false;
                  const deliveryStatus = order.delivery?.status || "ASSIGNED";
                  const hasMismatch = (isUserConfirmed && deliveryStatus !== "DELIVERED") || 
                                      (!isUserConfirmed && deliveryStatus === "DELIVERED");

                  return (
                    <article key={order._id} className="rounded-md bg-[#896A67]/10 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-[#896A67]">{order.mealSnapshot?.day} / {order.mealSnapshot?.mealTime}</p>
                          <h3 className="mt-1 text-lg font-black text-[#3F2A32]">{order.mealSnapshot?.name}</h3>
                          <p className="mt-1 text-sm text-[#7A5C5F]">{order.customerSnapshot?.name} / {order.customerSnapshot?.mobile}</p>
                        </div>
                        <p className="rounded-md bg-white px-3 py-2 text-xs font-black text-[#3F2A32]">{deliveryStatus} {isUserConfirmed && "(Confirmed)"}</p>
                      </div>
                      <p className="mt-3 flex gap-2 text-sm text-[#7A5C5F]"><MapPin size={16} /> {order.customerSnapshot?.address || "No address added"}</p>
                      
                      {hasMismatch && (
                        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 animate-pulse">
                          Please contact customer care at +91 78956623145
                        </p>
                      )}

                      {canUpdateDeliveryStatus && (
                        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                          {deliveryStatuses.map((status) => (
                            <button key={status} type="button" onClick={() => updateDeliveryStatus(order._id, status)} className="rounded-md border border-[#896A67] bg-white px-3 py-2 text-xs font-black text-[#3F2A32] hover:bg-[#896A67]/10">
                              {status}
                            </button>
                          ))}
                        </div>
                      )}
                    </article>
                  );
                })}
                {!visibleDeliveryOrders.length && <p className="text-sm text-[#7A5C5F]">No delivery records yet.</p>}
              </div>
            </section>
          )}

          {canViewKitchens && (
            <section className="rounded-lg border border-[#6B4D57] bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-black text-[#3F2A32]">
                <Building2 size={19} /> Kitchen data
              </h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {kitchens.map((kitchen) => (
                  <article key={kitchen._id} className="rounded-md bg-[#896A67]/10 p-4">
                    <h3 className="font-black text-[#3F2A32]">{kitchen.name}</h3>
                    <p className="mt-1 text-sm text-[#7A5C5F]">{kitchen.city}</p>
                    <p className="mt-2 text-sm text-[#7A5C5F]">{kitchen.addressLine || "No address recorded"}</p>
                  </article>
                ))}
                {!kitchens.length && <p className="text-sm text-[#7A5C5F]">No kitchens registered yet.</p>}
              </div>
            </section>
          )}

          {!canViewMyOrders && !canWorkDeliveries && !canViewKitchens && (
            <section className="rounded-lg border border-[#6B4D57] bg-white p-6 text-[#7A5C5F] shadow-sm">
              <PackageCheck className="mb-4 text-[#6B4D57]" size={34} />
              Profile records will appear here as this account creates orders, kitchens, or deliveries.
            </section>
          )}
        </div>
      </div>
      {reachedOrderForPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-[#6B4D57] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#896A67]">Delivery Reached</p>
                <h3 className="mt-1 text-2xl font-black text-[#3F2A32]">Confirm Your Pickup</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDismissedReachedOrderIds((prev) => [...prev, reachedOrderForPopup._id]);
                  setReachedOrderForPopup(null);
                }}
                className="rounded-md p-1.5 text-[#7A5C5F] hover:bg-[#896A67]/10 hover:text-[#3F2A32]"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 border-y border-[#896A67]/20 py-4">
              <div className="flex gap-4">
                {reachedOrderForPopup.mealSnapshot?.imageUrl && (
                  <img
                    src={reachedOrderForPopup.mealSnapshot.imageUrl}
                    alt={reachedOrderForPopup.mealSnapshot.name}
                    className="h-16 w-16 rounded-md object-cover border border-[#6B4D57]/20"
                  />
                )}
                <div>
                  <h4 className="font-bold text-[#3F2A32]">{reachedOrderForPopup.mealSnapshot?.name}</h4>
                  <p className="text-sm text-[#7A5C5F]">Qty {reachedOrderForPopup.quantity} / Rs. {reachedOrderForPopup.totalAmount}</p>
                  <p className="mt-1 text-xs text-[#7A5C5F]">Kitchen: {reachedOrderForPopup.mealSnapshot?.kitchenName}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setDismissedReachedOrderIds((prev) => [...prev, reachedOrderForPopup._id]);
                  setReachedOrderForPopup(null);
                }}
                className="flex-1 rounded-md border border-[#896A67] py-2.5 text-sm font-bold text-[#3F2A32] hover:bg-[#896A67]/10"
              >
                Close
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await api.confirmDelivered(reachedOrderForPopup._id);
                    setMessage("Pickup confirmed successfully.");
                    await loadProfileData();
                  } catch (err) {
                    setMessage(err.message);
                  }
                }}
                className="flex-1 rounded-md bg-[#3F2A32] py-2.5 text-sm font-black text-white hover:bg-[#6B4D57]"
              >
                Confirm Pickup
              </button>
            </div>
          </div>
        </div>
      )}
      {showAddressModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-[#6B4D57] bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#896A67]">Subscribe to {showAddressModal} Plan</p>
              <h3 className="mt-1 text-2xl font-black text-[#3F2A32]">Enter Delivery Address</h3>
              <p className="mt-1 text-sm text-[#7A5C5F]">Please enter the address where your daily meals should be delivered.</p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!planAddressForm.trim()) return;
                subscribeToPlan(showAddressModal, planAddressForm);
              }}
              className="mt-4 space-y-4"
            >
              <textarea
                value={planAddressForm}
                onChange={(e) => setPlanAddressForm(e.target.value)}
                required
                placeholder="Complete delivery address..."
                className="w-full rounded-md border border-[#896A67] px-4 py-3 outline-none focus:border-[#6B4D57]"
                rows={3}
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddressModal(null)}
                  className="flex-1 rounded-md border border-[#896A67] py-2.5 text-sm font-bold text-[#3F2A32] hover:bg-[#896A67]/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-md bg-[#3F2A32] py-2.5 text-sm font-black text-white hover:bg-[#6B4D57]"
                >
                  Confirm Subscription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default Profile;


