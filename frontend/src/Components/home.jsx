import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { CalendarCheck, Clock, MapPin, ShieldCheck, ShoppingBag, Utensils } from "lucide-react";
import heroImage from "../assets/hero.png";
import { useAuth } from "../context/useAuth";
import { api } from "../api/client";

const plans = [
  { name: "Student", price: "1999", detail: "Create a plan, then choose meals from the menu." },
  { name: "Office", price: "3499", detail: "Select separate meals and quantities as needed." },
  { name: "Family", price: "6499", detail: "Add only the meals your household wants, up to 4 per order." }
];

function Home() {
  const { isAuthenticated, user } = useAuth();
  const [selectedMeals, setSelectedMeals] = useState([]);
  const subscriptionPath = isAuthenticated ? "/profile" : "/register";

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "USER") {
      setSelectedMeals([]);
      return;
    }

    api.getMyOrders()
      .then((res) => {
        setSelectedMeals((res.payload || []).filter((order) => order.status === "ORDERED"));
      })
      .catch(() => setSelectedMeals([]));
  }, [isAuthenticated, user?.role]);

  return (
    <>
      <section className="bg-[#896A67]/10 px-4 py-8 sm:px-6">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1fr_0.95fr]">
          <div className="py-8">
            <p className="text-sm font-black uppercase tracking-wide text-[#896A67]">Daily dabba service</p>
            <h1 className="mt-4 max-w-3xl text-5xl font-black tracking-tight text-[#3F2A32] sm:text-6xl">
              Fresh home-style meals managed from one dashboard.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#7A5C5F]">
              Customers can register, view the menu, and select only the meals they want. Providers can manage kitchens after admin approval.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={subscriptionPath} className="rounded-md bg-[#3F2A32] px-5 py-3 text-sm font-black text-white hover:bg-[#6B4D57]">
                Start subscription
              </Link>
              <Link to="/menu" className="rounded-md border border-[#896A67] px-5 py-3 text-sm font-black text-[#3F2A32] hover:bg-white">
                View weekly menu
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-[#6B4D57] bg-white shadow-sm">
            <img src={heroImage} alt="Fresh dabba meal" className="h-[420px] w-full object-cover" />
          </div>
        </div>
      </section>

      <section className="border-y border-[#6B4D57] bg-[#896A67]/10 px-4 py-10 sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [Utensils, "Weekly menus", "Admin-published notes for each day."],
            [CalendarCheck, "Select meals", "Customers choose meals one by one."],
            [Clock, "Today count", "Kitchen providers see meals due today."],
            [ShieldCheck, "Role access", "Cookie auth protects user and admin flows."]
          ].map(([Icon, title, text]) => (
            <div key={title} className="rounded-lg bg-white p-5 shadow-sm">
              <Icon className="text-[#6B4D57]" size={23} />
              <h2 className="mt-4 text-lg font-black text-[#3F2A32]">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#7A5C5F]">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-[#896A67]">Plans</p>
            <h2 className="mt-2 text-3xl font-black text-[#3F2A32]">Built for daily routines</h2>
          </div>
          <MapPin className="hidden text-[#6B4D57] sm:block" size={30} />
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.name} className="rounded-lg border border-[#6B4D57] bg-white p-6 shadow-sm">
              <h3 className="text-xl font-black text-[#3F2A32]">{plan.name}</h3>
              <p className="mt-4 text-4xl font-black text-[#3F2A32]">Rs. {plan.price}</p>
              <p className="mt-3 text-sm leading-6 text-[#7A5C5F]">{plan.detail}</p>
              <Link to={subscriptionPath} className="mt-6 inline-flex rounded-md bg-[#3F2A32] px-4 py-2 text-sm font-black text-white hover:bg-[#6B4D57]">
                Choose plan
              </Link>
            </article>
          ))}
        </div>
      </section>

      
      
    </>
  );
}

export default Home;

