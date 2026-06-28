import { useEffect, useState } from "react";
import { Building2, ChefHat, Plus, Trash2, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../context/useAuth";

function Kitchen() {
  const { user, isAuthenticated } = useAuth();
  const [today, setToday] = useState(null);
  const [kitchens, setKitchens] = useState([]);
  const [pendingProviders, setPendingProviders] = useState([]);
  const [form, setForm] = useState({ name: "", city: "", addressLine: "", contactNumber: "", serviceArea: "", mealsCooked: "", dabbaServices: "", description: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [complaints, setComplaints] = useState([]);

  const isApprovedProvider = user?.role === "FOOD_PROVIDER" && user?.providerStatus === "APPROVED";
  const isAdmin = user?.role === "ADMIN";
  const canManageKitchen = isApprovedProvider || isAdmin;

  const loadKitchen = async () => {
    if (!canManageKitchen) return;
    setLoading(true);
    setMessage("");
    try {
      if (isAdmin) {
        const [providersRes, kitchensRes] = await Promise.all([
          api.getProviders(),
          api.getKitchens()
        ]);
        setPendingProviders((providersRes.payload || []).filter((provider) => provider.providerStatus === "PENDING"));
        setKitchens(kitchensRes.payload || []);
        setToday(null);
        setComplaints([]);
        return;
      }

      const [todayRes, kitchensRes, complaintsRes] = await Promise.all([
        api.getKitchenTodayCount(),
        api.getKitchens(),
        api.getProviderComplaints()
      ]);
      setToday(todayRes.payload);
      setKitchens(kitchensRes.payload || []);
      setComplaints(complaintsRes.payload || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProviderStatus = async (id, status) => {
    setMessage("");
    try {
      await api.updateProviderStatus(id, status);
      await loadKitchen();
      setMessage(status === "APPROVED" ? "Food provider approved." : "Food provider rejected.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleAcceptComplaint = async (id) => {
    setMessage("");
    try {
      await api.acceptComplaint(id);
      await loadKitchen();
      setMessage("Complaint accepted and resolved. Order removed from active lists.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  useEffect(() => {
    // The kitchen dashboard refreshes when role access changes after auth resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadKitchen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManageKitchen]);

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const createKitchen = async (event) => {
    event.preventDefault();
    setMessage("");
    try {
      await api.createKitchen(form);
      setForm({ name: "", city: "", addressLine: "", contactNumber: "", serviceArea: "", mealsCooked: "", dabbaServices: "", description: "" });
      await loadKitchen();
      setMessage("Kitchen saved.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const deleteKitchen = async (id) => {
    setMessage("");
    try {
      await api.deleteKitchen(id);
      await loadKitchen();
      setMessage("Kitchen deleted.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  if (!isAuthenticated) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
        <ChefHat className="mx-auto text-[#6B4D57]" size={42} />
        <h1 className="mt-5 text-4xl font-black text-[#3F2A32]">Login required</h1>
        <p className="mt-4 text-[#7A5C5F]">Kitchen reporting and profile tools are available after login.</p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-[#896A67]">Signed in as {user?.role}</p>
          <h1 className="mt-2 text-4xl font-black text-[#3F2A32]">{user?.name || "Kitchen dashboard"}</h1>
          <p className="mt-2 text-[#7A5C5F]">{user?.email}</p>
        </div>
        {loading && <p className="text-sm font-semibold text-[#7A5C5F]">Loading...</p>}
      </div>

      {message && <p className="mb-6 rounded-md border border-[#6B4D57] bg-white px-4 py-3 text-sm font-semibold text-[#3F2A32]">{message}</p>}

      {user?.role === "FOOD_PROVIDER" && user?.providerStatus !== "APPROVED" && (
        <div className="mb-6 rounded-lg border border-[#6B4D57] bg-white p-6 shadow-sm">
          <p className="text-sm font-black uppercase tracking-wide text-[#896A67]">Approval pending</p>
          <h2 className="mt-2 text-2xl font-black text-[#3F2A32]">Admin approval is required before kitchen access.</h2>
          <p className="mt-2 text-sm leading-6 text-[#7A5C5F]">
            You can log in and update your provider profile, but kitchen registration and meal publishing open after approval.
          </p>
        </div>
      )}

      {canManageKitchen ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="space-y-6">
            {!isAdmin && <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["Meals today", today?.count ?? 0],
                ["Active subs", today?.totalSubs ?? 0],
                ["Skipped today", today?.skips ?? 0]
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-[#6B4D57] bg-white p-5 shadow-sm">
                  <p className="text-sm font-bold text-[#7A5C5F]">{label}</p>
                  <p className="mt-3 text-4xl font-black text-[#3F2A32]">{value}</p>
                </div>
              ))}
            </div>}

            {isAdmin && (
              <div className="rounded-lg border border-[#6B4D57] bg-white p-5 shadow-sm">
                <h2 className="flex items-center gap-2 text-lg font-black text-[#3F2A32]">
                  <ChefHat size={19} /> Food providers needing approval
                </h2>
                <div className="mt-5 space-y-4">
                  {pendingProviders.map((provider) => {
                    const details = provider.providerDetails || {};
                    return (
                      <div key={provider._id} className="rounded-md border border-[#896A67]/40 bg-[#896A67]/10 p-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-xs font-black uppercase tracking-wide text-[#896A67]">Pending approval</p>
                            <h3 className="mt-1 text-lg font-black text-[#3F2A32]">{provider.name}</h3>
                            <p className="text-sm text-[#7A5C5F]">{provider.email} | {provider.mobile}</p>
                            <div className="mt-3 grid gap-2 text-sm text-[#3F2A32] sm:grid-cols-2">
                              <p><span className="font-black">Kitchen:</span> {details.kitchenName || "Not provided"}</p>
                              <p><span className="font-black">Location:</span> {details.location || "Not provided"}</p>
                              <p><span className="font-black">Service area:</span> {details.serviceArea || "Not provided"}</p>
                              <p><span className="font-black">Experience:</span> {details.experience || "Not provided"}</p>
                              <p className="sm:col-span-2"><span className="font-black">Address:</span> {details.kitchenAddress || "Not provided"}</p>
                              <p className="sm:col-span-2"><span className="font-black">Meals:</span> {details.mealsCooked || "Not provided"}</p>
                              <p className="sm:col-span-2"><span className="font-black">Dabba services:</span> {details.dabbaServices || "Not provided"}</p>
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              onClick={() => handleProviderStatus(provider._id, "APPROVED")}
                              className="inline-flex items-center gap-2 rounded-md bg-green-700 px-3 py-2 text-sm font-black text-white hover:bg-green-800"
                            >
                              <CheckCircle2 size={16} /> Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleProviderStatus(provider._id, "REJECTED")}
                              className="inline-flex items-center gap-2 rounded-md bg-red-700 px-3 py-2 text-sm font-black text-white hover:bg-red-800"
                            >
                              <XCircle size={16} /> Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {!pendingProviders.length && <p className="text-sm text-[#7A5C5F]">No food providers are waiting for approval.</p>}
                </div>
              </div>
            )}

            {!isAdmin && <div className="rounded-lg border border-[#6B4D57] bg-white p-5 shadow-sm">
                <h2 className="flex items-center gap-2 text-lg font-black text-[#3F2A32]">
                  <AlertCircle size={19} /> Customer Complaints
                </h2>
                <div className="mt-5 space-y-4">
                  {complaints.map((comp) => (
                    <div key={comp._id} className="rounded-md bg-red-50 border border-red-200 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-red-600">Complaint</p>
                          <h3 className="mt-1 text-md font-bold text-[#3F2A32]">{comp.orderId?.mealSnapshot?.name || "Order meal"}</h3>
                          <p className="text-xs text-[#7A5C5F]">Customer: {comp.customerId?.name} ({comp.customerId?.mobile})</p>
                          <p className="mt-2 text-sm text-[#3F2A32] bg-white border border-red-100 rounded p-2 italic">
                            "{comp.description}"
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAcceptComplaint(comp._id)}
                          className="rounded bg-red-600 px-3 py-2 text-xs font-black text-white hover:bg-red-700 whitespace-nowrap self-start"
                        >
                          Accept & Resolve
                        </button>
                      </div>
                    </div>
                  ))}
                  {!complaints.length && <p className="text-sm text-[#7A5C5F]">No active customer complaints.</p>}
                </div>
              </div>}
            </div>

            <aside className="space-y-6">
              <form onSubmit={createKitchen} className="rounded-lg border border-[#6B4D57] bg-white p-5 shadow-sm">
                <h2 className="flex items-center gap-2 text-lg font-black text-[#3F2A32]">
                  <Plus size={19} /> Register kitchen
                </h2>
                <div className="mt-5 grid gap-4">
                  <input name="name" value={form.name} onChange={updateField} required placeholder="Kitchen name" className="rounded-md border border-[#896A67] px-4 py-3" />
                  <input name="city" value={form.city} onChange={updateField} required placeholder="City" className="rounded-md border border-[#896A67] px-4 py-3" />
                  <input name="addressLine" value={form.addressLine} onChange={updateField} placeholder="Address" className="rounded-md border border-[#896A67] px-4 py-3" />
                  <input name="serviceArea" value={form.serviceArea || ""} onChange={updateField} placeholder="Service area" className="rounded-md border border-[#896A67] px-4 py-3" />
                  <input name="contactNumber" value={form.contactNumber} onChange={updateField} pattern="[0-9]{10}" placeholder="Contact number" className="rounded-md border border-[#896A67] px-4 py-3" />
                  <textarea name="mealsCooked" value={form.mealsCooked || ""} onChange={updateField} rows={3} placeholder="Meals you cook" className="rounded-md border border-[#896A67] px-4 py-3" />
                  <textarea name="dabbaServices" value={form.dabbaServices || ""} onChange={updateField} rows={3} placeholder="Dabba services" className="rounded-md border border-[#896A67] px-4 py-3" />
                  <textarea name="description" value={form.description} onChange={updateField} rows={3} placeholder="Description" className="rounded-md border border-[#896A67] px-4 py-3" />
                </div>
                <button className="mt-4 w-full rounded-md bg-[#3F2A32] px-4 py-3 font-black text-white hover:bg-[#6B4D57]">Save kitchen</button>
              </form>

              <div className="rounded-lg border border-[#6B4D57] bg-white p-5 shadow-sm">
                <h2 className="flex items-center gap-2 text-lg font-black text-[#3F2A32]">
                  <Building2 size={19} /> Kitchens
                </h2>
                <div className="mt-5 space-y-3">
                  {kitchens.map((kitchen) => (
                    <div key={kitchen._id} className="flex items-start justify-between gap-3 rounded-md bg-[#896A67]/10 px-4 py-3">
                      <div>
                        <p className="font-black text-[#3F2A32]">{kitchen.name}</p>
                        <p className="text-sm text-[#7A5C5F]">{kitchen.city}</p>
                        {kitchen.serviceArea && <p className="text-sm text-[#7A5C5F]">Area: {kitchen.serviceArea}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteKitchen(kitchen._id)}
                        aria-label={`Delete ${kitchen.name}`}
                        title="Delete kitchen"
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[#896A67] bg-white text-[#3F2A32] hover:bg-[#896A67]/10"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {!kitchens.length && <p className="text-sm text-[#7A5C5F]">No kitchens registered yet.</p>}
                </div>
              </div>
            </aside>
          </div>
          ) : (
          <div className="rounded-lg border border-[#6B4D57] bg-white p-6 text-[#7A5C5F] shadow-sm">
            Customer accounts can manage meal skips from the menu page. Provider kitchen metrics are reserved for food providers and admins.
          </div>
          )}
        </section>
      );
}

      export default Kitchen;
