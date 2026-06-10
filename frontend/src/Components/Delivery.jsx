import { useEffect, useState } from "react";
import { MapPin, PackageCheck, Phone, UserRound } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../context/useAuth";

const statuses = ["ASSIGNED", "PICKED", "REACHED", "FAILED"];

function Delivery() {
  const { user, isAuthenticated } = useAuth();
  const [orders, setOrders] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const canDeliver = user?.role === "DELIVERY" || user?.role === "ADMIN";
  const canUpdateDeliveryStatus = user?.role === "DELIVERY";

  const loadOrders = async () => {
    if (!canDeliver) return;
    setLoading(true);
    setMessage("");
    try {
      const res = await api.getDeliveryOrders();
      setOrders(res.payload || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Refresh delivery list after auth role resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canDeliver]);

  const updateStatus = async (id, status) => {
    setMessage("");
    try {
      await api.updateDeliveryStatus(id, status);
      await loadOrders();
      setMessage("Delivery status updated.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  if (!isAuthenticated) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
        <PackageCheck className="mx-auto text-[#6B4D57]" size={42} />
        <h1 className="mt-5 text-4xl font-black text-[#3F2A32]">Login required</h1>
        <p className="mt-4 text-[#7A5C5F]">Delivery orders are available after login.</p>
      </section>
    );
  }

  if (!canDeliver) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
        <PackageCheck className="mx-auto text-[#6B4D57]" size={42} />
        <h1 className="mt-5 text-4xl font-black text-[#3F2A32]">Delivery access only</h1>
        <p className="mt-4 text-[#7A5C5F]">Use a delivery or admin account to view customer delivery details.</p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-[#896A67]">Delivery dashboard</p>
          <h1 className="mt-2 text-4xl font-black text-[#3F2A32]">Customer orders and status</h1>
        </div>
        {loading && <p className="text-sm font-semibold text-[#7A5C5F]">Loading...</p>}
      </div>

      {message && <p className="mb-6 rounded-md border border-[#6B4D57] bg-white px-4 py-3 text-sm font-semibold text-[#3F2A32]">{message}</p>}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {orders.map((order) => (
          <article key={order._id} className="overflow-hidden rounded-lg border border-[#6B4D57] bg-white shadow-sm">
            <img src={order.mealSnapshot?.imageUrl} alt={order.mealSnapshot?.name} className="h-40 w-full object-cover" />
            <div className="p-5">
              <p className="text-xs font-black uppercase tracking-wide text-[#896A67]">{order.mealSnapshot?.day} / {order.mealSnapshot?.mealTime}</p>
              <h2 className="mt-1 text-xl font-black text-[#3F2A32]">{order.mealSnapshot?.name}</h2>
              <p className="mt-1 text-sm font-bold text-[#7A5C5F]">{order.mealSnapshot?.kitchenName || "Kitchen"}</p>
              <p className="mt-2 text-sm text-[#7A5C5F]">Qty {order.quantity} / Rs. {order.totalAmount}</p>

              <div className="mt-5 space-y-2 rounded-md bg-[#896A67]/10 p-3 text-sm text-[#3F2A32]">
                <p className="flex gap-2"><UserRound size={16} /> {order.customerSnapshot?.name}</p>
                <p className="flex gap-2"><Phone size={16} /> {order.customerSnapshot?.mobile}</p>
                <p className="flex gap-2"><MapPin size={16} /> {order.customerSnapshot?.address || "No address added"}</p>
              </div>

              <p className="mt-4 text-sm font-black text-[#3F2A32]">
                Order: {order.status} / Delivery: {order.delivery?.status || "ASSIGNED"}
              </p>

              {canUpdateDeliveryStatus && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {statuses.map((status) => (
                    <button key={status} type="button" onClick={() => updateStatus(order._id, status)} className="rounded-md border border-[#896A67] px-3 py-2 text-xs font-black text-[#3F2A32] hover:bg-[#896A67]/10">
                      {status}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </article>
        ))}
        {!orders.length && <p className="text-sm text-[#7A5C5F]">No delivery orders yet.</p>}
      </div>
    </section>
  );
}

export default Delivery;


