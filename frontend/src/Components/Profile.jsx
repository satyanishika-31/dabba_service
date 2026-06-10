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
  UserCircle
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
    orders.filter((order) => (
      order.status !== "DELIVERED" &&
      order.status !== "REACHED" &&
      order.delivery?.status !== "DELIVERED" &&
      order.delivery?.status !== "REACHED"
    ))
  ), [orders]);

  const stats = useMemo(() => {
    const activeOrders = visibleOrders.filter((order) => order.status !== "CANCELLED").length;
    const pendingDeliveries = deliveryOrders.filter((order) => order.delivery?.status !== "DELIVERED").length;
    return [
      ["Role", user?.role || "USER"],
      ["My orders", visibleOrders.length],
      ["Active orders", activeOrders],
      ["Deliveries", deliveryOrders.length || pendingDeliveries]
    ];
  }, [deliveryOrders, user?.role, visibleOrders]);

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
      setOrders(orderRes.payload || []);
      setDeliveryOrders(deliveryRes.payload || []);
      setKitchens(kitchenRes.payload || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load role-specific records after the authenticated user has resolved.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProfileData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role, user?._id]);

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
                <ShoppingBag size={19} /> My orders and deliveries
              </h2>
              <div className="mt-5 space-y-4">
                {visibleOrders.map((order) => (
                  <article key={order._id} className="rounded-md bg-[#896A67]/10 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-[#896A67]">{formatDate(order.createdAt)}</p>
                        <h3 className="mt-1 text-lg font-black text-[#3F2A32]">{order.mealSnapshot?.name}</h3>
                        <p className="mt-1 text-sm text-[#7A5C5F]">Qty {order.quantity} / Rs. {order.totalAmount}</p>
                      </div>
                      <p className="rounded-md bg-white px-3 py-2 text-xs font-black text-[#3F2A32]">
                        {order.status} / {order.delivery?.status || "ASSIGNED"}
                      </p>
                    </div>
                    <p className="mt-3 flex gap-2 text-sm text-[#7A5C5F]"><MapPin size={16} /> {order.customerSnapshot?.address || "No delivery address recorded"}</p>
                  </article>
                ))}
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
                {deliveryOrders.map((order) => (
                  <article key={order._id} className="rounded-md bg-[#896A67]/10 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-[#896A67]">{order.mealSnapshot?.day} / {order.mealSnapshot?.mealTime}</p>
                        <h3 className="mt-1 text-lg font-black text-[#3F2A32]">{order.mealSnapshot?.name}</h3>
                        <p className="mt-1 text-sm text-[#7A5C5F]">{order.customerSnapshot?.name} / {order.customerSnapshot?.mobile}</p>
                      </div>
                      <p className="rounded-md bg-white px-3 py-2 text-xs font-black text-[#3F2A32]">{order.delivery?.status || "ASSIGNED"}</p>
                    </div>
                    <p className="mt-3 flex gap-2 text-sm text-[#7A5C5F]"><MapPin size={16} /> {order.customerSnapshot?.address || "No address added"}</p>
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
                ))}
                {!deliveryOrders.length && <p className="text-sm text-[#7A5C5F]">No delivery records yet.</p>}
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
    </section>
  );
}

export default Profile;


