import "@styles/custom.css";
import "@lib/firebase";
import "react-toastify/dist/ReactToastify.css";
import CartProviderWrapper from "@components/common/CartProviderWrapper";
import { PersistGate } from "redux-persist/integration/react";
import { persistStore } from "redux-persist";
import { Provider } from "react-redux";
import ReactGA from "react-ga4";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TawkMessengerReact from "@tawk.to/tawk-messenger-react";

// Internal imports
import store from "@redux/store";
import { handlePageView } from "@lib/analytics";
import { UserProvider } from "@context/UserContext";
import DefaultSeo from "@components/common/DefaultSeo";
import { SidebarProvider } from "@context/SidebarContext";
import SettingServices from "@services/SettingServices";
import FcmTokenHandler from "@components/FcmTokenHandler";
import { AnnouncementsProvider } from "@context/AnnouncementsContext";
import { fetchWebsiteAnnouncements } from "@lib/fetchAnnouncements";

let persistor = persistStore(store);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function MyApp({ Component, pageProps, announcements = [] }) {
  const router = useRouter();
  const [storeSetting, setStoreSetting] = useState(null);

  // Dev safety: unregister any previously installed PWA service workers.
  // Old SWs can cache API/HTML and cause "backend content" to appear after refresh.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    (async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      } catch (_) {}

      try {
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch (_) {}
    })();
  }, []);

  useEffect(() => {
    const fetchStoreSettings = async () => {
      try {
        const settings = await queryClient.fetchQuery({
          queryKey: ["storeSetting"],
          queryFn: async () => await SettingServices.getStoreSetting(),
          staleTime: 4 * 60 * 1000, // Cache data for 4 minutes
        });

        setStoreSetting(settings);

        // Initialize Google Analytics
        if (settings?.google_analytic_status) {
          ReactGA.initialize(settings?.google_analytic_key || "");
          handlePageView();

          const handleRouteChange = (url) => {
            handlePageView(`/${router.pathname}`, "Farmacykart");
          };

          router.events.on("routeChangeComplete", handleRouteChange);
          return () => {
            router.events.off("routeChangeComplete", handleRouteChange);
          };
        }
      } catch (error) {
        console.error("Failed to fetch store settings:", error);
      }
    };

    fetchStoreSettings();
  }, [router]);

  return (
    <>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <UserProvider>
            <Provider store={store}>
              <PersistGate loading={null} persistor={persistor}>
                <SidebarProvider>
                  <AnnouncementsProvider announcements={announcements}>
                    <CartProviderWrapper>
                      <DefaultSeo />
                      <FcmTokenHandler />
                      <Component {...pageProps} />
                    </CartProviderWrapper>
                  </AnnouncementsProvider>
                </SidebarProvider>
              </PersistGate>
            </Provider>
          </UserProvider>
        </SessionProvider>
      </QueryClientProvider>
      {/* Render TawkMessengerReact only if tawk_chat_status is enabled */}
      {storeSetting?.tawk_chat_status && (
        <TawkMessengerReact
          propertyId={storeSetting?.tawk_chat_property_id || ""}
          widgetId={storeSetting?.tawk_chat_widget_id || ""}
        />
      )}
    </>
  );
}

MyApp.getInitialProps = async () => {
  const announcements = await fetchWebsiteAnnouncements(5);
  return { announcements };
};

export default MyApp;
