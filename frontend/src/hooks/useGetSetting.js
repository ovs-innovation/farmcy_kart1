import Cookies from "js-cookie";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

// internal import
import SettingServices from "@services/SettingServices";
import { storeCustomization } from "@utils/storeCustomizationSetting";

// Stateless hook: derive settings directly from react-query results
const useGetSetting = () => {
  const lang = Cookies.get("_lang");

  const {
    data: globalSetting,
    error: globalError,
    isLoading: loadingGlobal,
  } = useQuery({
    queryKey: ["globalSetting"],
    queryFn: async () => await SettingServices.getGlobalSetting(),
    staleTime: 10 * 60 * 1000, // cache for 10 minutes
    gcTime: 15 * 60 * 1000,
  });

  const {
    data: customizationData,
    error: customizationError,
    isFetched,
    isLoading: loadingCustomization,
  } = useQuery({
    queryKey: ["storeCustomization"],
    queryFn: async () => await SettingServices.getStoreCustomizationSetting(),
    staleTime: 20 * 60 * 1000, // cache for 20 minutes
    gcTime: 25 * 60 * 1000,
  });

  // Ensure language cookie
  useEffect(() => {
    if (!lang) {
      Cookies.set("_lang", "en", {
        sameSite: "None",
        secure: true,
      });
    }
  }, [lang]);

  // derive without local setState to avoid render loops
  const resolvedCustomization =
    isFetched && customizationData ? customizationData : storeCustomization;

  const rawColor = resolvedCustomization?.theme?.color;
  const storeCustomizationSetting = {
    ...resolvedCustomization,
    theme: {
      ...resolvedCustomization?.theme,
      color:
        !rawColor || rawColor === "pink" || rawColor === "#EC4899" || rawColor === "#ec4899"
          ? "green"
          : rawColor,
    },
  };

  return {
    lang,
    error: customizationError || globalError,
    loading: loadingGlobal || loadingCustomization,
    globalSetting,
    storeCustomizationSetting,
  };
};

export default useGetSetting;
