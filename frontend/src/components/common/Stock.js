import useTranslation from "next-translate/useTranslation";

const Stock = ({ stock, card }) => {
  const { t } = useTranslation();

  const getLabel = (val, fallback) => {
    if (typeof val === "string") return val;
    if (typeof val === "object" && val !== null) {
      return val.en || Object.values(val).find(v => typeof v === "string") || fallback;
    }
    return fallback;
  };

  const stockOutText = getLabel(t("stockOut"), "Stock Out");
  const stockText = getLabel(t("stock"), "Stock");

  return (
    <>
      {stock <= 0 ? (
        <span className="bg-red-100 absolute z-10 text-red-700 rounded-full inline-flex items-center justify-center px-2 py-0 text-xs font-medium font-serif">
          {stockOutText}
        </span>
      ) : (
        <>
          <span
            className={`${
              card
                ? "bg-gray-100 absolute z-10 text-store-500 rounded-full text-xs px-2 py-0 font-medium"
                : "bg-store-100 text-store-500 rounded-full inline-flex items-center justify-center px-2 py-0 text-xs font-semibold font-serif"
            }`}
          >
            {stockText} :
            <span className={`pl-1 font-bold ${stock <= 10 ? "text-red-500" : "text-orange-700"}`}>
              {Math.max(0, stock)}{" "}
            </span>
            {stock <= 10 && (
              <span className="text-[10px] text-red-600 ml-1 font-bold animate-pulse">
                (Low Stock)
              </span>
            )}
          </span>
        </>
      )}
    </>
  );
};

export default Stock;
