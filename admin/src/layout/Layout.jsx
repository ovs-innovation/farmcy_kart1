import React, { useContext, Suspense, useEffect, lazy } from "react";
import { Switch, Route, Redirect, useLocation } from "react-router-dom";
import { FiCheck, FiAlertCircle, FiMessageSquare } from "react-icons/fi";

//internal import
import Main from "@/layout/Main";
import Header from "@/components/header/Header";
import Sidebar from "@/components/sidebar/Sidebar";
import { SidebarContext } from "@/context/SidebarContext";
import ThemeSuspense from "@/components/theme/ThemeSuspense";
import { routes } from "@/routes";
import SettingServices from "@/services/SettingServices";
import { getPalette } from "@/utils/themeColors";
const Page404 = lazy(() => import("@/pages/404"));

const Layout = () => {
  const { isSidebarOpen, closeSidebar, navBar, alert, showAlert } = useContext(SidebarContext);
  let location = useLocation();

  const isOnline = navigator.onLine;

  useEffect(() => {
    closeSidebar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const res = await SettingServices.getStoreSetting();
        const themeColor = res?.theme_color || "green";
        const palette = getPalette(themeColor);

        const root = document.documentElement;
        Object.entries(palette).forEach(([shade, color]) => {
          root.style.setProperty(`--store-color-${shade}`, color);
        });
      } catch (err) {
        console.error("Error fetching theme:", err);
      }
    };
    fetchTheme();
  }, []);

  return (
    <>
      {!isOnline && (
        <div className="flex justify-center bg-red-600 text-white">
          You are in offline mode!{" "}
        </div>
      )}
      <div
        className={`flex h-screen bg-gray-50 dark:bg-gray-900 ${isSidebarOpen && "overflow-hidden"
          }`}
      >
        {navBar && <Sidebar />}

        <div className="flex flex-col flex-1 w-full">
          <Header />
          <Main>
            <Suspense fallback={<ThemeSuspense />}>
              <Switch>
                {routes.map((route, i) => {
                  return route.component ? (
                    <Route
                      key={i}
                      exact={true}
                      path={`${route.path}`}
                      render={(props) => <route.component {...props} />}
                    />
                  ) : null;
                })}
                <Redirect exact from="/" to="/dashboard" />
                <Route component={Page404} />
              </Switch>
            </Suspense>
          </Main>
        </div>
      </div>
      <GlobalAlert />
    </>
  );
};

const GlobalAlert = () => {
  const { alert } = useContext(SidebarContext);
  if (!alert.show) return null;

  return (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] max-w-md w-[calc(100%-2rem)] sm:w-max px-6 py-4 rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.3)] flex items-center gap-4 border backdrop-blur-2xl animate-in fade-in slide-in-from-top-full duration-700 ${alert.type === 'success' ? 'bg-emerald-600/90 border-emerald-400/30 text-white' : 'bg-red-600/90 border-red-400/30 text-white'}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${alert.type === 'success' ? 'bg-emerald-400/30' : 'bg-red-400/30'}`}>
         {alert.type === 'success' ? <FiCheck size={20} className="text-white" /> : <FiAlertCircle size={20} className="text-white" />}
      </div>
      <div className="flex flex-col pr-4">
         <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-0.5">{alert.type === 'success' ? 'System Confirmed' : 'System Alert'}</span>
         <p className="text-[14px] font-bold leading-tight">{alert.message}</p>
      </div>
    </div>
  );
};

export default Layout;
