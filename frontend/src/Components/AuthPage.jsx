import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "../context/useAuth";

const initialForm = {
  name: "",
  mobile: "",
  email: "",
  password: "",
  role: "USER",
  location: "",
  serviceArea: "",
  mealsCooked: "",
  kitchenName: "",
  kitchenAddress: "",
  dabbaServices: "",
  experience: ""
};

function AuthPage({ mode }) {
  const isRegister = mode === "register";
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      let res;
      if (isRegister) {
        res = await register(form);
      } else {
        res = await login({ email: form.email, password: form.password, role: form.role });
      }
      navigate(res?.payload?.role === "FOOD_PROVIDER" && res?.payload?.providerStatus !== "APPROVED" ? "/profile" : "/menu");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="px-4 py-12 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col justify-center">
          <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-md bg-[#896A67]/10 text-[#3F2A32]">
            <ShieldCheck size={24} />
          </span>
          <h1 className="text-4xl font-black tracking-tight text-[#3F2A32] sm:text-5xl">
            {isRegister ? "Create your meal account" : "Welcome back"}
          </h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-[#7A5C5F]">
            Sign in to skip meals, view your profile, and access provider kitchen tools when your role allows it.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-lg border border-[#6B4D57] bg-white p-6 shadow-sm sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            {isRegister && (
              <>
                <label className="block">
                  <span className="text-sm font-bold text-[#3F2A32]">Name</span>
                  <input name="name" value={form.name} onChange={updateField} required className="mt-2 w-full rounded-md border border-[#896A67] px-4 py-3 outline-none focus:border-[#6B4D57]" />
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-[#3F2A32]">Mobile</span>
                  <input name="mobile" value={form.mobile} onChange={updateField} required pattern="[0-9]{10}" className="mt-2 w-full rounded-md border border-[#896A67] px-4 py-3 outline-none focus:border-[#6B4D57]" />
                </label>
              </>
            )}

            <label className="block sm:col-span-2">
              <span className="text-sm font-bold text-[#3F2A32]">Email</span>
              <input type="email" name="email" value={form.email} onChange={updateField} required className="mt-2 w-full rounded-md border border-[#896A67] px-4 py-3 outline-none focus:border-[#6B4D57]" />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-sm font-bold text-[#3F2A32]">Password</span>
              <input type="password" name="password" value={form.password} onChange={updateField} required minLength={6} className="mt-2 w-full rounded-md border border-[#896A67] px-4 py-3 outline-none focus:border-[#6B4D57]" />
            </label>

            {(isRegister || mode === "login") && (
              <label className="block sm:col-span-2">
                <span className="text-sm font-bold text-[#3F2A32]">Role</span>
                <select name="role" value={form.role} onChange={updateField} className="mt-2 w-full rounded-md border border-[#896A67] px-4 py-3 outline-none focus:border-[#6B4D57]">
                  <option value="USER">Customer</option>
                  <option value="FOOD_PROVIDER">Food provider</option>
                  {!isRegister && <option value="ADMIN">Admin</option>}
                  <option value="DELIVERY">Delivery</option>
                </select>
              </label>
            )}

            {isRegister && form.role === "FOOD_PROVIDER" && (
              <>
                <label className="block">
                  <span className="text-sm font-bold text-[#3F2A32]">Location</span>
                  <input name="location" value={form.location} onChange={updateField} required className="mt-2 w-full rounded-md border border-[#896A67] px-4 py-3 outline-none focus:border-[#6B4D57]" />
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-[#3F2A32]">Service area</span>
                  <input name="serviceArea" value={form.serviceArea} onChange={updateField} required className="mt-2 w-full rounded-md border border-[#896A67] px-4 py-3 outline-none focus:border-[#6B4D57]" />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-sm font-bold text-[#3F2A32]">Kitchen name</span>
                  <input name="kitchenName" value={form.kitchenName} onChange={updateField} required className="mt-2 w-full rounded-md border border-[#896A67] px-4 py-3 outline-none focus:border-[#6B4D57]" />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-sm font-bold text-[#3F2A32]">Kitchen address</span>
                  <textarea name="kitchenAddress" value={form.kitchenAddress} onChange={updateField} required rows={2} className="mt-2 w-full rounded-md border border-[#896A67] px-4 py-3 outline-none focus:border-[#6B4D57]" />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-sm font-bold text-[#3F2A32]">Meals you cook</span>
                  <textarea name="mealsCooked" value={form.mealsCooked} onChange={updateField} required rows={2} placeholder="Breakfast, lunch, dinner, veg thali..." className="mt-2 w-full rounded-md border border-[#896A67] px-4 py-3 outline-none focus:border-[#6B4D57]" />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-sm font-bold text-[#3F2A32]">Dabba services</span>
                  <textarea name="dabbaServices" value={form.dabbaServices} onChange={updateField} required rows={2} placeholder="Daily tiffin, weekly plans, office lunch..." className="mt-2 w-full rounded-md border border-[#896A67] px-4 py-3 outline-none focus:border-[#6B4D57]" />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-sm font-bold text-[#3F2A32]">Experience</span>
                  <input name="experience" value={form.experience} onChange={updateField} placeholder="Example: 3 years" className="mt-2 w-full rounded-md border border-[#896A67] px-4 py-3 outline-none focus:border-[#6B4D57]" />
                </label>
              </>
            )}
          </div>

          {message && <p className="mt-5 rounded-md bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{message}</p>}

          <button type="submit" disabled={isSubmitting} className="mt-6 w-full rounded-md bg-[#3F2A32] px-5 py-3 text-base font-black text-white hover:bg-[#6B4D57] disabled:opacity-60">
            {isSubmitting ? "Please wait..." : isRegister ? "Create Account" : "Login"}
          </button>

          <p className="mt-6 text-center text-sm text-[#7A5C5F]">
            {isRegister ? "Already have an account?" : "Need an account?"}{" "}
            <Link className="font-black text-[#3F2A32]" to={isRegister ? "/login" : "/register"}>
              {isRegister ? "Login" : "Register"}
            </Link>
          </p>
        </form>
      </div>
    </section>
  );
}

export default AuthPage;


