import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, IndianRupee, Plus, ShoppingBag, Store, Trash2, Upload, UtensilsCrossed, X } from "lucide-react";
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

function isSameId(left, right) {
  return normalizeId(left)?.toString() === normalizeId(right)?.toString();
}

function createPackId() {
  const id = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36);
  return `pack-${id}`;
}

function Menu() {
  const { user, isAuthenticated } = useAuth();
  const [menus, setMenus] = useState([]);
  const [skips, setSkips] = useState([]);
  const [orders, setOrders] = useState([]);
  const [kitchens, setKitchens] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [mealQuantities, setMealQuantities] = useState({});
  const [selectedMeals, setSelectedMeals] = useState([]);
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
  const [orderForm, setOrderForm] = useState({ deliveryAddress: "" });
  const [skipForm, setSkipForm] = useState({ date: new Date().toISOString().slice(0, 10), reason: "" });
  const [message, setMessage] = useState("");
  const [orderConfirmation, setOrderConfirmation] = useState(null);
  const [loading, setLoading] = useState(true);

  const canManageMeals = user?.role === "FOOD_PROVIDER" || user?.role === "ADMIN";
  const canDeleteAnyMeal = user?.role === "ADMIN";
  const canOrder = user?.role === "USER";
  const isStudentPlan = subscription?.planName?.toLowerCase() === "student";
  const isFamilyPlan = subscription?.planName?.toLowerCase() === "family";
  const subscriptionQuantityMax = isFamilyPlan ? 4 : undefined;

  const selectedMealsTotal = selectedMeals.reduce(
    (sum, meal) => sum + Number(meal.price || 0) * Number(meal.quantity || 1),
    0
  );

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
      const [menuRes, skipRes, subRes, orderRes] = await Promise.all([
        api.getMenu(),
        canOrder ? api.getSkippedMeals() : Promise.resolve({ payload: [] }),
        canOrder ? api.getMySubscriptions() : Promise.resolve({ payload: null }),
        canOrder ? api.getMyOrders() : Promise.resolve({ payload: [] })
      ]);
      setMenus(menuRes.payload || []);
      setSkips(skipRes.payload || []);
      setSubscription(subRes?.payload || null);
      setOrders(orderRes.payload || []);

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

  const selectRegularMeal = (menuId, item) => {
    setMessage("");
    setOrderConfirmation(null);
    setSelectedMeals((current) => {
      const alreadySelected = current.some((meal) => (
        isSameId(meal.menuId, menuId) && isSameId(meal.itemId, item._id)
      ));

      if (alreadySelected) return current;

      return [
        ...current,
        {
          menuId,
          itemId: item._id,
          name: item.name,
          mealTime: item.mealTime,
          price: item.price,
          quantity: 1
        }
      ];
    });
  };

  const removeRegularMeal = (menuId, itemId) => {
    setSelectedMeals((current) => current.filter((meal) => (
      !isSameId(meal.menuId, menuId) || !isSameId(meal.itemId, itemId)
    )));
  };

  const updateRegularMealQuantity = (menuId, itemId, quantity) => {
    setSelectedMeals((current) => current.map((meal) => (
      isSameId(meal.menuId, menuId) && isSameId(meal.itemId, itemId)
        ? { ...meal, quantity: Math.max(1, Number(quantity || 1)) }
        : meal
    )));
  };

  const placeSelectedOrders = async () => {
    setMessage("");
    setOrderConfirmation(null);

    if (!selectedMeals.length) {
      setMessage("Select at least one meal before ordering.");
      return;
    }

    if (!orderForm.deliveryAddress.trim()) {
      setMessage("Delivery address is required.");
      return;
    }

    try {
      const packId = createPackId();
      await Promise.all(selectedMeals.map((meal) => api.placeOrder({
        menuId: meal.menuId,
        itemId: meal.itemId,
        quantity: Number(meal.quantity || 1),
        deliveryAddress: orderForm.deliveryAddress,
        packId
      })));

      const orderedCount = selectedMeals.length;
      const orderedQuantity = selectedMeals.reduce((sum, meal) => sum + Number(meal.quantity || 1), 0);
      setSelectedMeals([]);
      await loadData();
      const successMessage = orderedCount === 1
        ? "Order placed. Delivery can now track it."
        : `${orderedCount} orders placed. Delivery can now track them.`;
      setMessage(successMessage);
      setOrderConfirmation({
        title: "Order confirmed",
        message: successMessage,
        mealName: orderedCount === 1 ? "Selected meal" : "Selected meals",
        quantity: orderedQuantity
      });
    } catch (error) {
      setMessage(error.message);
    }
  };

  const selectSubscriptionMeal = async (menuId, item) => {
    setMessage("");
    setOrderConfirmation(null);
    try {
      const requestedQuantity = Math.max(1, Number(mealQuantities[item._id] || 1));
      const quantity = isStudentPlan ? 1 : Math.min(subscriptionQuantityMax || requestedQuantity, requestedQuantity);
      await api.placeOrder({
        menuId,
        itemId: item._id,
        quantity,
        deliveryAddress: subscription.deliveryAddress
      });
      setMealQuantities((current) => ({ ...current, [item._id]: 1 }));
      await loadData();
      const successMessage = "Meal selected for your subscription.";
      setMessage(successMessage);
      setOrderConfirmation({
        title: "Meal selected",
        message: successMessage,
        mealName: item.name || "Your meal",
        quantity
      });
    } catch (error) {
      setMessage(error.message);
    }
  };

  const orderExtraMeal = async (menuId, item) => {
    setMessage("");
    setOrderConfirmation(null);
    try {
      await api.placeOrder({
        menuId,
        itemId: item._id,
        quantity: 1,
        deliveryAddress: subscription.deliveryAddress
      });
      await loadData();
      const successMessage = "Extra meal ordered separately.";
      setMessage(successMessage);
      setOrderConfirmation({
        title: "Extra order placed",
        message: successMessage,
        mealName: item.name || "Your meal",
        quantity: 1
      });
    } catch (error) {
      setMessage(error.message);
    }
  };

  const cancelSelectedMeal = async (id) => {
    setMessage("");
    try {
      await api.cancelOrder(id);
      await loadData();
      setMessage("Selected meal cancelled.");
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
      {orderConfirmation && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-[#3F2A32]/45 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="order-confirmation-title">
          <div className="w-full max-w-md rounded-lg border border-[#6B4D57] bg-white p-6 text-[#3F2A32] shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#896A67]/15 text-[#3F2A32]">
                  <CheckCircle2 size={26} />
                </span>
                <div>
                  <h2 id="order-confirmation-title" className="text-2xl font-black">{orderConfirmation.title}</h2>
                  <p className="mt-2 text-sm font-semibold text-[#7A5C5F]">{orderConfirmation.message}</p>
                </div>
              </div>
              <button type="button" onClick={() => setOrderConfirmation(null)} title="Close" aria-label="Close order confirmation" className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[#896A67] bg-white text-[#3F2A32] hover:bg-[#896A67]/10">
                <X size={17} />
              </button>
            </div>
            <div className="mt-5 rounded-md bg-[#896A67]/10 px-4 py-3 text-sm font-bold text-[#3F2A32]">
              {orderConfirmation.mealName} / Qty {orderConfirmation.quantity}
            </div>
            <button type="button" onClick={() => setOrderConfirmation(null)} className="mt-5 w-full rounded-md bg-[#3F2A32] px-4 py-3 font-black text-white hover:bg-[#6B4D57]">
              Done
            </button>
          </div>
        </div>
      )}

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
                {items.map((item) => {
                  const isSubscribed = Boolean(canOrder && subscription);
                  const selectedOrder = orders.find((order) => (
                    isSameId(order.menuId, item.menuId || menu._id)
                    && isSameId(order.itemId, item._id)
                    && order.status === "ORDERED"
                  ));
                  const selectedRegularMeal = selectedMeals.find((meal) => (
                    isSameId(meal.menuId, item.menuId || menu._id)
                    && isSameId(meal.itemId, item._id)
                  ));
                  const itemQuantity = mealQuantities[item._id] || 1;

                  return (
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
                        
                        {isSubscribed ? (
                          <div className="mt-4 space-y-2">
                            {selectedOrder ? (
                              <div>
                                <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-center text-xs font-bold text-green-700">
                                  Selected ({item.mealTime}) / Qty {selectedOrder.quantity || 1}
                                </div>
                                {isStudentPlan && (
                                  <button
                                    type="button"
                                    onClick={() => orderExtraMeal(item.menuId || menu._id, item)}
                                    className="mt-2 w-full rounded-md border border-[#896A67] bg-white px-3 py-2 text-xs font-black text-[#3F2A32] hover:bg-[#896A67]/10"
                                  >
                                    Order extra separately
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => cancelSelectedMeal(selectedOrder._id)}
                                  className="mt-2 w-full rounded-md bg-[#7A5C5F] px-3 py-2 text-xs font-black text-white hover:bg-[#6B4D57]"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div>
                                {isStudentPlan ? (
                                  <div className="rounded-md border border-[#896A67]/30 bg-white px-3 py-2 text-xs font-bold text-[#7A5C5F]">
                                    Student plan meals are fixed at Qty 1.
                                  </div>
                                ) : (
                                  <label className="text-xs font-black uppercase tracking-wide text-[#896A67]">
                                    Quantity
                                    <input
                                      type="number"
                                      min="1"
                                      max={subscriptionQuantityMax}
                                      value={itemQuantity}
                                      onChange={(event) => setMealQuantities((current) => ({
                                        ...current,
                                        [item._id]: Math.min(
                                          subscriptionQuantityMax || Number(event.target.value || 1),
                                          Math.max(1, Number(event.target.value || 1))
                                        )
                                      }))}
                                      className="mt-2 w-full rounded-md border border-[#896A67] bg-white px-3 py-2 text-sm font-bold text-[#3F2A32]"
                                    />
                                    {isFamilyPlan && <span className="mt-1 block text-xs font-bold normal-case tracking-normal text-[#7A5C5F]">Maximum 4 per meal.</span>}
                                  </label>
                                )}
                                <button
                                  type="button"
                                  onClick={() => selectSubscriptionMeal(item.menuId || menu._id, item)}
                                  className="mt-2 w-full rounded-md bg-[#3F2A32] px-3 py-2 text-xs font-black text-white hover:bg-[#6B4D57]"
                                >
                                  Select
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          canOrder && (
                            selectedRegularMeal ? (
                              <div className="mt-4">
                                <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-center text-xs font-bold text-green-700">
                                  Selected / Qty {selectedRegularMeal.quantity || 1}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeRegularMeal(item.menuId || menu._id, item._id)}
                                  className="mt-2 w-full rounded-md bg-[#7A5C5F] px-3 py-2 text-xs font-black text-white hover:bg-[#6B4D57]"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button type="button" onClick={() => selectRegularMeal(item.menuId || menu._id, item)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-[#3F2A32] px-4 py-3 text-sm font-black text-white hover:bg-[#6B4D57]">
                                <ShoppingBag size={17} /> Select
                              </button>
                            )
                          )
                        )}
                      </div>
                    </article>
                  );
                })}
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
            subscription ? (
              <div className="rounded-lg border border-[#6B4D57] bg-white p-5 shadow-sm space-y-4">
                <h2 className="flex items-center gap-2 text-lg font-black text-[#3F2A32]">
                  <CalendarDays size={19} /> Plan Active
                </h2>
                <div className="rounded-md bg-[#896A67]/10 p-4">
                  <p className="font-black text-[#3F2A32]">{subscription.planName} Plan</p>
                  <p className="mt-1 text-sm text-[#7A5C5F]">Selected meals will be delivered to:</p>
                  <p className="mt-2 text-sm font-semibold text-[#3F2A32]">{subscription.deliveryAddress}</p>
                </div>
                <p className="text-xs text-[#7A5C5F] italic">
                  Use Select and Cancel on each meal to manage what you want delivered under your plan.
                </p>
                {orders.filter((order) => order.status === "ORDERED").length > 0 && (
                  <div className="border-t border-[#896A67]/20 pt-4">
                    <h3 className="text-sm font-bold text-[#3F2A32] mb-3">Selected Meals:</h3>
                    <div className="space-y-2">
                      {orders.filter((order) => order.status === "ORDERED").map((order) => (
                        <div key={order._id} className="flex items-center justify-between gap-3 rounded-md bg-[#896A67]/10 px-3 py-2 text-sm">
                          <span>{order.mealSnapshot?.name} / Qty {order.quantity || 1}</span>
                          <button type="button" onClick={() => cancelSelectedMeal(order._id)} title="Cancel selected meal" className="text-[#3F2A32] hover:text-red-600">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="rounded-lg border border-[#6B4D57] bg-white p-5 shadow-sm">
                  <h2 className="flex items-center gap-2 text-lg font-black text-[#3F2A32]">
                    <ShoppingBag size={19} /> Selected order
                  </h2>
                  <input value={orderForm.deliveryAddress} onChange={(event) => setOrderForm({ ...orderForm, deliveryAddress: event.target.value })} required placeholder="Delivery address" className="mt-5 w-full rounded-md border border-[#896A67] px-4 py-3" />
                  <div className="mt-4 space-y-3">
                    {selectedMeals.length ? (
                      selectedMeals.map((meal) => (
                        <div key={`${meal.menuId}-${meal.itemId}`} className="rounded-md bg-[#896A67]/10 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-black text-[#3F2A32]">{meal.name}</p>
                              <p className="mt-1 text-xs font-bold text-[#7A5C5F]">{meal.mealTime} / Rs. {meal.price}</p>
                            </div>
                            <button type="button" onClick={() => removeRegularMeal(meal.menuId, meal.itemId)} title="Remove selected meal" className="text-[#3F2A32] hover:text-red-600">
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <label className="mt-3 block text-xs font-black uppercase tracking-wide text-[#896A67]">
                            Quantity
                            <input
                              type="number"
                              min="1"
                              value={meal.quantity}
                              onChange={(event) => updateRegularMealQuantity(meal.menuId, meal.itemId, event.target.value)}
                              className="mt-2 w-full rounded-md border border-[#896A67] bg-white px-3 py-2 text-sm font-bold text-[#3F2A32]"
                            />
                          </label>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-md bg-[#896A67]/10 px-4 py-3 text-sm font-semibold text-[#7A5C5F]">
                        Select meals from the menu. They will appear here before you order.
                      </p>
                    )}
                  </div>
                  {selectedMeals.length > 0 && (
                    <>
                      <div className="mt-4 flex items-center justify-between border-t border-[#896A67]/20 pt-4 text-sm font-black text-[#3F2A32]">
                        <span>Total</span>
                        <span>Rs. {selectedMealsTotal}</span>
                      </div>
                      <button type="button" onClick={placeSelectedOrders} className="mt-4 w-full rounded-md bg-[#3F2A32] px-4 py-3 font-black text-white hover:bg-[#6B4D57]">
                        Order selected meals
                      </button>
                    </>
                  )}
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
            )
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
