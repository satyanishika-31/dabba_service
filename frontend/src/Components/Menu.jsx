import { useEffect, useMemo, useState } from "react";
import { CalendarDays, IndianRupee, Plus, ShoppingBag, Store, Trash2, Upload, UtensilsCrossed } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../context/useAuth";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const mealTimes = ["MORNING", "AFTERNOON", "EVENING"];

function normalizeDay(day) {
  return day?.toString().trim().toLowerCase();
}

function normalizeId(value) {
  return value?._id || value?.id || value?.toString?.() || value;
}

function Menu() {
  const { user, isAuthenticated } = useAuth();
  const [menus, setMenus] = useState([]);
  const [skips, setSkips] = useState([]);
  const [kitchens, setKitchens] = useState([]);
  const [mealForm, setMealForm] = useState({
    day: "Monday",
    mealTime: "MORNING",
    name: "",
    description: "",
    price: "",
    kitchenId: "",
    image: null,
    imageUrl: ""
  });
  const [imageInputKey, setImageInputKey] = useState(0);
  const [orderForm, setOrderForm] = useState({ deliveryAddress: "", quantity: 1 });
  const [skipForm, setSkipForm] = useState({ date: new Date().toISOString().slice(0, 10), reason: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const canManageMeals = user?.role === "FOOD_PROVIDER" || user?.role === "ADMIN";
  const canDeleteAnyMeal = user?.role === "ADMIN";
  const canOrder = user?.role === "USER";

  const menuByDay = useMemo(() => {
    const map = new Map();

    menus.forEach((menu) => {
      const key = normalizeDay(menu.day);
      if (!key) return;

      const current = map.get(key) || { ...menu, items: [] };
      map.set(key, {
        ...current,
        items: [
          ...current.items,
          ...(menu.items || []).map((item) => ({ ...item, menuId: menu._id }))
        ]
      });
    });

    return days.map((day) => {
      const menu = map.get(normalizeDay(day));
      return { day, menu, items: menu?.items || [] };
    });
  }, [menus]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [menuRes, skipRes] = await Promise.all([
        api.getMenu(),
        canOrder ? api.getSkippedMeals() : Promise.resolve({ payload: [] })
      ]);
      setMenus(menuRes.payload || []);
      setSkips(skipRes.payload || []);

      if (canManageMeals) {
        const kitchenRes = await api.getKitchens();
        const providerKitchens = kitchenRes.payload || [];
        setKitchens(providerKitchens);
        setMealForm((current) => ({
          ...current,
          kitchenId: current.kitchenId || providerKitchens[0]?._id || ""
        }));
      } else {
        setKitchens([]);
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Refresh menu and customer-only data when auth role resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canOrder, canManageMeals]);

  const updateMealForm = (event) => {
    const { name, value, files } = event.target;
    setMealForm((current) => ({ ...current, [name]: files ? files[0] : value }));
  };

  const createMeal = async (event) => {
    event.preventDefault();
    setMessage("");
    const imageUrl = mealForm.imageUrl.trim();
    if (!mealForm.image && !imageUrl) {
      setMessage("Upload a meal photo or paste an image link.");
      return;
    }

    try {
      const payload = new FormData();
      payload.append("day", mealForm.day);
      payload.append("mealTime", mealForm.mealTime);
      payload.append("name", mealForm.name);
      payload.append("description", mealForm.description);
      payload.append("price", mealForm.price);
      payload.append("kitchenId", mealForm.kitchenId);
      if (mealForm.image) payload.append("image", mealForm.image);
      if (imageUrl) payload.append("imageUrl", imageUrl);

      await api.createMenu(payload);
      setMealForm({ ...mealForm, name: "", description: "", price: "", image: null, imageUrl: "" });
      setImageInputKey((current) => current + 1);
      await loadData();
      setMessage("Meal added to menu.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const placeOrder = async (menuId, itemId) => {
    setMessage("");
    try {
      await api.placeOrder({
        menuId,
        itemId,
        quantity: Number(orderForm.quantity),
        deliveryAddress: orderForm.deliveryAddress
      });
      await loadData();
      setMessage("Order placed. Delivery can now track it.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const deleteMeal = async (menuId, itemId) => {
    setMessage("");
    try {
      await api.deleteMenuItem(menuId, itemId);
      await loadData();
      setMessage("Meal deleted from menu.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const deleteMenu = async (menuId, day) => {
    setMessage("");
    try {
      await api.deleteMenu(menuId);
      await loadData();
      setMessage(`${day} menu deleted.`);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const skipMeal = async (event) => {
    event.preventDefault();
    setMessage("");
    try {
      await api.skipMeal(skipForm);
      setSkipForm({ date: skipForm.date, reason: "" });
      await loadData();
      setMessage("Meal skip recorded.");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const undoSkip = async (id) => {
    setMessage("");
    try {
      await api.undoSkipMeal(id);
      await loadData();
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-[#6B4D57]">Menu and ordering</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-[#3F2A32]">Meals by day and time</h1>
        </div>
        {loading && <p className="text-sm font-semibold text-[#7A5C5F]">Loading...</p>}
      </div>

      {message && <p className="mb-6 rounded-md border border-[#6B4D57] bg-white px-4 py-3 text-sm font-semibold text-[#3F2A32]">{message}</p>}

      <div className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
        <div className="space-y-5">
          {menuByDay.map(({ day, menu, items }) => (
            <section key={day} className="rounded-lg border border-[#6B4D57] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3 text-[#3F2A32]">
                <div className="flex items-center gap-3">
                  <CalendarDays size={20} />
                  <h2 className="text-xl font-black">{day}</h2>
                </div>
                {canDeleteAnyMeal && menu?._id && (
                  <button
                    type="button"
                    onClick={() => deleteMenu(menu._id, day)}
                    title="Delete menu"
                    aria-label={`Delete ${day} menu`}
                    className="grid h-9 w-9 place-items-center rounded-md border border-[#896A67] bg-white text-[#3F2A32] hover:bg-[#896A67]/10"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => (
                  <article key={item._id} className="overflow-hidden rounded-lg border border-[#6B4D57] bg-[#896A67]/10">
                    <img src={item.imageUrl} alt={item.name} className="h-40 w-full object-cover" />
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-[#896A67]">{item.mealTime}</p>
                          <h3 className="mt-1 text-lg font-black text-[#3F2A32]">{item.name}</h3>
                          <p className="mt-1 flex items-center gap-1 text-xs font-bold text-[#7A5C5F]">
                            <Store size={13} /> {item.kitchenName || item.kitchenId?.name || "Kitchen"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center text-sm font-black text-[#3F2A32]">
                            <IndianRupee size={14} /> {item.price}
                          </span>
                          {(canDeleteAnyMeal || (canManageMeals && normalizeId(item.providerId) === normalizeId(user))) && (
                            <button
                              type="button"
                              onClick={() => deleteMeal(item.menuId || menu._id, item._id)}
                              title="Delete meal"
                              aria-label={`Delete ${item.name}`}
                              className="grid h-8 w-8 place-items-center rounded-md border border-[#896A67] bg-white text-[#3F2A32] hover:bg-[#896A67]/10"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="mt-3 min-h-12 text-sm leading-6 text-[#7A5C5F]">{item.description || "Fresh home-style meal."}</p>
                      {canOrder && (
                        <button type="button" onClick={() => placeOrder(item.menuId || menu._id, item._id)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-[#3F2A32] px-4 py-3 text-sm font-black text-white hover:bg-[#6B4D57]">
                          <ShoppingBag size={17} /> Order
                        </button>
                      )}
                    </div>
                  </article>
                ))}
                {!items.length && <p className="text-sm text-[#7A5C5F]">No meals added for this day yet.</p>}
              </div>
            </section>
          ))}
        </div>

        <aside className="space-y-6">
          {canManageMeals && (
            <form onSubmit={createMeal} className="rounded-lg border border-[#6B4D57] bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-black text-[#3F2A32]">
                <Plus size={19} /> Add food item
              </h2>
              {!kitchens.length && (
                <p className="mt-4 rounded-md bg-[#896A67]/10 px-4 py-3 text-sm font-semibold text-[#896A67]">
                  Register a kitchen first from the Kitchen page.
                </p>
              )}
              <div className="mt-5 grid gap-4">
                <select name="kitchenId" value={mealForm.kitchenId} onChange={updateMealForm} required className="rounded-md border border-[#896A67] px-4 py-3">
                  <option value="">Select kitchen</option>
                  {kitchens.map((kitchen) => <option key={kitchen._id} value={kitchen._id}>{kitchen.name}</option>)}
                </select>
                <select name="day" value={mealForm.day} onChange={updateMealForm} className="rounded-md border border-[#896A67] px-4 py-3">
                  {days.map((day) => <option key={day}>{day}</option>)}
                </select>
                <select name="mealTime" value={mealForm.mealTime} onChange={updateMealForm} className="rounded-md border border-[#896A67] px-4 py-3">
                  {mealTimes.map((time) => <option key={time} value={time}>{time}</option>)}
                </select>
                <input name="name" value={mealForm.name} onChange={updateMealForm} required placeholder="Meal name" className="rounded-md border border-[#896A67] px-4 py-3" />
                <input name="price" value={mealForm.price} onChange={updateMealForm} required type="number" min="0" placeholder="Price" className="rounded-md border border-[#896A67] px-4 py-3" />
                <label className="rounded-md border border-dashed border-[#896A67] px-4 py-3 text-sm font-semibold text-[#7A5C5F]">
                  <span className="flex items-center gap-2"><Upload size={17} /> Upload meal photo</span>
                  <input key={imageInputKey} name="image" type="file" accept="image/*" onChange={updateMealForm} className="mt-3 block w-full text-sm" />
                </label>
                <input name="imageUrl" value={mealForm.imageUrl} onChange={updateMealForm} placeholder="Or paste image link" className="rounded-md border border-[#896A67] px-4 py-3" />
                <textarea name="description" value={mealForm.description} onChange={updateMealForm} rows={3} placeholder="What is included?" className="rounded-md border border-[#896A67] px-4 py-3" />
              </div>
              <button disabled={!kitchens.length} className="mt-4 w-full rounded-md bg-[#3F2A32] px-4 py-3 font-black text-white hover:bg-[#6B4D57] disabled:opacity-60">Add meal</button>
            </form>
          )}

          {canOrder && (
            <>
              <div className="rounded-lg border border-[#6B4D57] bg-white p-5 shadow-sm">
                <h2 className="flex items-center gap-2 text-lg font-black text-[#3F2A32]">
                  <ShoppingBag size={19} /> Order details
                </h2>
                <input value={orderForm.deliveryAddress} onChange={(event) => setOrderForm({ ...orderForm, deliveryAddress: event.target.value })} placeholder="Delivery address" className="mt-5 w-full rounded-md border border-[#896A67] px-4 py-3" />
                <input type="number" min="1" value={orderForm.quantity} onChange={(event) => setOrderForm({ ...orderForm, quantity: event.target.value })} className="mt-4 w-full rounded-md border border-[#896A67] px-4 py-3" />
              </div>

              <form onSubmit={skipMeal} className="rounded-lg border border-[#6B4D57] bg-white p-5 shadow-sm">
                <h2 className="flex items-center gap-2 text-lg font-black text-[#3F2A32]">
                  <UtensilsCrossed size={19} /> Skip a meal
                </h2>
                <input type="date" value={skipForm.date} onChange={(event) => setSkipForm({ ...skipForm, date: event.target.value })} className="mt-5 w-full rounded-md border border-[#896A67] px-4 py-3" />
                <input value={skipForm.reason} onChange={(event) => setSkipForm({ ...skipForm, reason: event.target.value })} placeholder="Reason" className="mt-4 w-full rounded-md border border-[#896A67] px-4 py-3" />
                <button className="mt-4 w-full rounded-md bg-[#7A5C5F] px-4 py-3 font-black text-white hover:bg-[#6B4D57]">Submit skip</button>
                <div className="mt-5 space-y-3">
                  {skips.map((skip) => (
                    <div key={skip._id} className="flex items-center justify-between rounded-md bg-[#896A67]/10 px-3 py-3 text-sm">
                      <span>{new Date(skip.date).toLocaleDateString()} {skip.reason ? `- ${skip.reason}` : ""}</span>
                      <button type="button" onClick={() => undoSkip(skip._id)} title="Undo skip" className="text-[#3F2A32]">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </form>
            </>
          )}

          {!isAuthenticated && (
            <div className="rounded-lg border border-[#6B4D57] bg-white p-5 text-sm text-[#7A5C5F]">
              Login as a customer to order meals, or as a food provider to add meals.
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

export default Menu;
