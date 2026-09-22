import React from "react";
import { calculateInvoiceTotals } from "../../utils/invoiceCalc";

// Order items table for invoice layout (admin)
const InvoiceOrderTable = ({ data, currency, getNumberTwo }) => {
  const userRole = data?.user_info?.role?.toString().toLowerCase().trim() || 
                   data?.user?.role?.toString().toLowerCase().trim() ||
                   data?.role?.toString().toLowerCase().trim() || '';
  
  const firstItem = data?.cart?.[0];
  const isWholesaler = userRole === "wholesaler" || 
                       userRole.includes("wholesale") ||
                       (firstItem?.wholePrice > 0);

  const totals = calculateInvoiceTotals(data, isWholesaler);

  return (
    <tbody className="bg-white text-serif text-sm print:bg-white">
      {totals?.cart?.map((item, i) => {
        return (
          <tr
            key={i}
            className={`${
              i % 2 === 0 ? "bg-white" : "bg-gray-50"
            } border-t border-gray-100 print:bg-white print:border-gray-300`}
          >
            <th className="px-2 py-1 whitespace-nowrap font-normal text-gray-700 text-left border-r border-gray-200 print:px-1 print:py-1 print:text-xs">
              {i + 1}
            </th>
            <td className="product-column px-2 py-1 font-normal text-gray-700 border-r border-gray-200 print:px-1 print:py-1 print:text-xs print:break-words">
              {item.title}
            </td>
            <td className="px-2 py-1 whitespace-nowrap font-normal text-gray-700 text-center border-r border-gray-200 print:px-1 print:py-1 print:text-xs">
              {item.hsn || "-"}
            </td>
            <td className="px-2 py-1 whitespace-nowrap font-normal text-gray-700 text-center border-r border-gray-200 print:px-1 print:py-1 print:text-xs">
              {item.batchNo || "-"}
            </td>
            <td className="px-2 py-1 whitespace-nowrap font-normal text-gray-700 text-center border-r border-gray-200 print:px-1 print:py-1 print:text-xs">
              {item.formattedExpDate}
            </td>
            <td className="px-2 py-1 whitespace-nowrap font-bold text-center border-r border-gray-200 print:px-1 print:py-1 print:text-xs">
              {item.quantity}
            </td>
            <td className="px-2 py-1 whitespace-nowrap font-bold text-center font-DejaVu border-r border-gray-200 print:px-1 print:py-1 print:text-xs">
              {currency}
              {getNumberTwo(isWholesaler ? item.unitSellingPrice : item.unitMrp)}
            </td>
            <td className="px-2 py-1 whitespace-nowrap text-center font-normal border-r border-gray-200 print:px-1 print:py-1 print:text-xs">
              {isWholesaler 
                ? `${currency}0.00`
                : `${currency}${getNumberTwo(item.lineDiscount)}`}
            </td>
            <td className="px-2 py-1 whitespace-nowrap text-center font-normal border-r border-gray-200 print:px-1 print:py-1 print:text-xs">
              {item.gstRate}%
            </td>
            <td className="px-2 py-1 whitespace-nowrap text-center font-normal border-r border-gray-200 print:px-1 print:py-1 print:text-xs">
              {currency}{getNumberTwo(item.lineGst)}
            </td>
            <td className="px-2 py-1 whitespace-nowrap text-right font-bold font-DejaVu text-gray-600 print:px-1 print:py-1 print:text-xs">
              {currency}{getNumberTwo(item.linePayable)}
            </td>
          </tr>
        );
      })}
    </tbody>
  );
};

export default InvoiceOrderTable;
