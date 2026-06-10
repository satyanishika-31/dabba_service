import { useEffect, useState } from "react";
import { Building2, ChefHat, LineChart, Plus, Trash2 } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../context/useAuth";

function Kitchen() {
  const { user, isAuthenticated } = useAuth();
  const [today, setToday] = useState(null);
  const [report, setReport] = useState([]);
  const [kitchens, setKitchens] = useState([]);
  const [form, setForm] = useState({ name: "", city: "", addressLine: "", contactNumber: "", description: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const canManageKitchen = user?.role === "FOOD_PROVIDER" || user?.role === "ADMIN";

  const loadKitchen = async () => {
    if (!canManageKitchen) return;
    setLoading(true);
    setMessage("");
    try {
      const [todayRes, reportRes, kitchensRes] = await Promise.all([
        api.getKitchenTodayCount(),
        api.getKitchenWeeklyReport(),
        api.getKitchens()
      ]);
      setToday(todayRes.payload);
      setReport(reportRes.payload || []);
      setKitchens(kitchensRes.payload || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
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
      setForm({ name: "", city: "", addressLine: "", contactNumber: "", description: "" });
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

      {canManageKitchen ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
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
            </div>

            <div className="rounded-lg border border-[#6B4D57] bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-black text-[#3F2A32]">
                <LineChart size={19} /> Weekly report
              </h2>
              <div className="mt-5 space-y-3">
                {report.map((day) => (
                  <div key={day.date} className="grid grid-cols-[1fr_auto] items-center gap-4">
                    <div>
                      <p className="text-sm font-bold text-[#3F2A32]">{day.date}</p>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#896A67]">
                        <div className="h-full rounded-full bg-[#6B4D57]" style={{ width: `${Math.min(100, day.meals * 10)}%` }} />
                      </div>
                    </div>
                    <span className="text-sm font-black text-[#3F2A32]">{day.meals} meals</span>
                  </div>
                ))}
                {!report.length && <p className="text-sm text-[#7A5C5F]">No report data yet.</p>}
              </div>
            </div>
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
                <input name="contactNumber" value={form.contactNumber} onChange={updateField} pattern="[0-9]{10}" placeholder="Contact number" className="rounded-md border border-[#896A67] px-4 py-3" />
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


