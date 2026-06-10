import { createBrowserRouter, RouterProvider } from "react-router-dom"
import RootLayout from "./Components/RootLayout"
import Home from "./Components/home"
import Menu from "./Components/Menu"
import Kitchen from "./Components/Kitchen"
import AuthPage from "./Components/AuthPage"
import Delivery from "./Components/Delivery"
import Profile from "./Components/Profile"

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: "menu", element: <Menu /> },
      { path: "kitchen", element: <Kitchen /> },
      { path: "delivery", element: <Delivery /> },
      { path: "profile", element: <Profile /> },
      { path: "login", element: <AuthPage mode="login" /> },
      { path: "register", element: <AuthPage mode="register" /> },
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
