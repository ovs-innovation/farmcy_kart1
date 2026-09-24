import { TableBody, TableCell, TableRow, Badge } from "@windmill/react-ui";
import { useTranslation } from "react-i18next";
import { FiFileText, FiTrash2 } from "react-icons/fi";
import { Link } from "react-router-dom";
import Tooltip from "@/components/tooltip/Tooltip";
import useUtilsFunction from "@/hooks/useUtilsFunction";

const PrescriptionTable = ({ prescriptions, handleDelete }) => {
  const { t } = useTranslation();
  const { showDateTimeFormat } = useUtilsFunction();

  return (
    <TableBody className="dark:bg-gray-900">
      {prescriptions?.map((prescription, i) => (
        <TableRow key={prescription?._id || i + 1}>
          <TableCell>
            <span className="font-semibold uppercase text-xs">
              {prescription?._id ? prescription._id.substring(prescription._id.length - 4).toUpperCase() : ""}
            </span>
          </TableCell>

          <TableCell>
            <span className="text-sm">
              {showDateTimeFormat(prescription?.createdAt)}
            </span>
          </TableCell>

          <TableCell>
            <span className="text-sm">{prescription?.user?.name || "Guest"}</span>
          </TableCell>

          <TableCell>
            <span className="text-sm">{prescription?.user?.email || "N/A"}</span>
          </TableCell>

          <TableCell>
            <span className="text-sm">
              {prescription?.user?.role || "N/A"}
            </span>
          </TableCell>

          <TableCell className="text-center">
            <span className="font-serif">
              {prescription?.status === "pending" && (
                <Badge type="warning">Pending</Badge>
              )}
              {prescription?.status === "processed" && (
                <Badge type="success">Approved</Badge>
              )}
              {prescription?.status === "rejected" && (
                <Badge type="danger">Rejected</Badge>
              )}
            </span>
          </TableCell>

          <TableCell className="text-right flex justify-end">
            <div className="flex justify-end text-right gap-2">
              <Link
                to={`/prescriptions/${prescription._id}`}
                className="p-2 cursor-pointer text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-150 focus:outline-none"
                aria-label={t("ViewPrescription", "View Prescription")}
              >
                <Tooltip
                  id={`view-${prescription._id || i}`}
                  Icon={FiFileText}
                  title={t("ViewPrescription", "View Prescription")}
                  bgColor="#10B981"
                />
              </Link>
              <button
                type="button"
                onClick={() => handleDelete(prescription._id)}
                className="p-2 cursor-pointer text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-150 focus:outline-none bg-transparent border-0"
                aria-label={t("Delete")}
              >
                <Tooltip
                  id={`delete-${prescription._id || i}`}
                  Icon={FiTrash2}
                  title={t("Delete")}
                  bgColor="#EF4444"
                />
              </button>
            </div>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
};

export default PrescriptionTable;
