import { Outlet } from "react-router-dom";
import Footer from "./Footer";
import Header from "./Header";
import { pageBackground } from "../styles/Common";

function RootLayout() {
  return (
    <div className={pageBackground}>
      <Header />
      <main className="min-h-screen">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default RootLayout;



