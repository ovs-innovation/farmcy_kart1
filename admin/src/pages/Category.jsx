import {
  Button,
  Card,
  CardBody,
  Input,
  Pagination,
  Table,
  TableCell,
  TableContainer,
  TableFooter,
  TableHeader,
} from "@windmill/react-ui";
import { useContext, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { FiEdit, FiGrid, FiPlus, FiTrash2, FiSearch, FiCheck } from "react-icons/fi";
import Uploader from "@/components/image-uploader/Uploader";

//internal import
import useAsync from "@/hooks/useAsync";
import { SidebarContext } from "@/context/SidebarContext";
import CategoryServices from "@/services/CategoryServices";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import useFilter from "@/hooks/useFilter";
import DeleteModal from "@/components/modal/DeleteModal";
import BulkActionDrawer from "@/components/drawer/BulkActionDrawer";
import PageTitle from "@/components/Typography/PageTitle";
import MainDrawer from "@/components/drawer/MainDrawer";
import CategoryDrawer from "@/components/drawer/CategoryDrawer";
import TableLoading from "@/components/preloader/TableLoading";
import CategoryTable from "@/components/category/CategoryTable";
import NotFound from "@/components/table/NotFound";
import AnimatedContent from "@/components/common/AnimatedContent";
import { notifySuccess, notifyError } from "@/utils/toast";

const Category = () => {
  const { toggleDrawer, lang, setIsUpdate } = useContext(SidebarContext);

  const { data, loading, error } = useAsync(CategoryServices.getAllCategory);

  const { handleDeleteMany, allId, handleUpdate, serviceId, handleModalOpen } =
    useToggleDrawer();

  const { t } = useTranslation();

  const getLevel1Categories = (categories) => {
    if (!categories || !Array.isArray(categories) || categories.length === 0) return [];
    const homeRoot = categories.find(cat =>
      cat.id === "Root" ||
      (cat.name?.en || cat.name?.default || (typeof cat.name === 'string' && cat.name))?.toLowerCase() === "home"
    );
    if (homeRoot && homeRoot.children && homeRoot.children.length > 0) return homeRoot.children;
    return categories;
  };

  const {
    handleSubmitCategory,
    categoryRef,
    totalResults,
    resultsPerPage,
    dataTable,
    serviceData,
    handleChangePage,
    setSearchCategory,
  } = useFilter(getLevel1Categories(data));

  // local state for form
  const [name, setName] = useState({ default: "", en: "", ar: "" });
  const [priority, setPriority] = useState("Normal");
  const [image, setImage] = useState([]);
  const [activeTab, setActiveTab] = useState("Default");

  // Notification State
  const [alert, setAlert] = useState({ show: false, message: "", type: "success" });

  const showAlert = (msg, type = "success") => {
    setAlert({ show: true, message: msg, type: type });
    setTimeout(() => setAlert({ show: false, message: "", type: "success" }), 3500);
  };

  const handleResetField = () => {
    setName({ default: "", en: "", ar: "" });
    setPriority("Normal");
    setImage([]);
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!name.default && !name.en) return showAlert("Category name is required!", "error");

    try {
      const categoryData = {
        name: {
          default: name.default || name.en,
          en: name.en || name.default,
          ar: name.ar
        },
        priority,
        icon: image?.length > 0 ? image[0] : "https://res.cloudinary.com/ahossain/image/upload/v1655097002/placeholder_kvepfp.png",
        images: image || [],
        status: "show"
      };

      const res = await CategoryServices.addCategory(categoryData);
      setIsUpdate(true);
      showAlert(res.message, "success");
      handleResetField();
    } catch (err) {
      showAlert(err ? err?.response?.data?.message : err?.message, "error");
    }
  };

  return (
    <>
      <AnimatedContent>
        <div className="flex items-center gap-2 mb-4">
          <FiGrid className="text-orange-400 text-xl" />
          <h1 className="text-lg font-bold text-gray-800 dark:text-gray-200">Add New Category</h1>
        </div>

        <DeleteModal id={serviceId} category={true} />

        <MainDrawer>
          <CategoryDrawer id={serviceId} data={data} lang={lang} />
        </MainDrawer>

        <Card className="min-w-0 shadow-sm overflow-hidden bg-white dark:bg-gray-800 mb-6 rounded-2xl border border-gray-100 dark:border-gray-700">
          <CardBody className="p-0">
            <form onSubmit={handleAddCategory} className="p-6 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                {/* Left Side */}
                <div className="md:col-span-8 flex flex-col gap-8">
                  {/* Tabs */}
                  <div className="flex gap-3 text-sm font-bold bg-gray-50/50 dark:bg-gray-800/50 p-1.5 rounded-2xl w-fit border border-gray-100 dark:border-gray-700">
                    {["Default", "English(EN)"].map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`px-5 py-2.5 rounded-xl transition-all duration-300 ${activeTab === tab
                          ? "bg-white dark:bg-gray-700 text-teal-600 dark:text-teal-400 shadow-[0_2px_10px_rgba(0,0,0,0.06)] ring-1 ring-gray-100 dark:ring-gray-600"
                          : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50"
                          }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="flex flex-col gap-2 relative">
                      <label className="text-[11px] font-extrabold uppercase text-gray-500 dark:text-gray-400 tracking-wider">
                        Name ({activeTab}) <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        value={
                          activeTab === "Default" ? name.default :
                            activeTab === "English(EN)" ? name.en : name.ar
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (activeTab === "Default") setName({ ...name, default: val });
                          if (activeTab === "English(EN)") setName({ ...name, en: val });
                          if (activeTab === "Arabic(AR)") setName({ ...name, ar: val });
                        }}
                        className="w-full h-12 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm px-4 dark:text-gray-200"
                        placeholder={`Category name in ${activeTab}`}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[11px] font-extrabold uppercase text-gray-500 dark:text-gray-400 tracking-wider">
                        Priority
                      </label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className="w-full h-12 text-sm border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none px-4 transition-all cursor-pointer appearance-none dark:text-gray-200"
                      >
                        <option value="Normal">Normal</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Right Side: Image Upload Box */}
                <div className="md:col-span-4 flex flex-col items-center justify-start bg-gray-50/30 dark:bg-gray-800/30 p-6 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                  <label className="text-[11px] font-extrabold uppercase text-gray-500 dark:text-gray-400 mb-4 tracking-wider text-center w-full flex items-center justify-center gap-2">
                    Category Images
                    <span className="bg-emerald-50 text-emerald-500 px-2 py-0.5 rounded text-[9px] font-black tracking-widest">(Multiple)</span>
                  </label>
                  <Uploader
                    imageUrl={image}
                    setImageUrl={setImage}
                    folder="category"
                    product={true}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                <Button
                  type="button"
                  onClick={handleResetField}
                  className="h-11 px-8 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-xl font-bold text-xs uppercase tracking-widest transition-all border-none"
                >
                  Reset
                </Button>
                <Button
                  type="submit"
                  className="h-11 px-10 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-md shadow-teal-700/20 active:scale-95 border-none flex items-center gap-2"
                >
                  <FiPlus className="w-4 h-4" />
                  Save Category
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <Card className="min-w-0 shadow-sm overflow-hidden bg-white dark:bg-gray-800 mb-8 rounded-2xl border border-gray-100 dark:border-gray-700">
          <CardBody className="p-0">
            <div className="px-6 py-5 border-b border-gray-50 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
                  Category List
                </h2>
                <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[11px] font-extrabold px-3 py-1 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm">
                  {totalResults || 0}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <div className="relative group w-full sm:w-64">
                  <Input
                    type="search"
                    onChange={(e) => setSearchCategory(e.target.value)}
                    placeholder="Search categories"
                    className="pl-4 pr-12 border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 rounded-xl text-sm h-11 focus:bg-white dark:focus:bg-gray-700 transition-all w-full dark:text-gray-200"
                  />
                  <div className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center bg-teal-800 dark:bg-teal-700 text-white rounded-r-xl cursor-pointer pointer-events-none hover:bg-teal-900 transition-colors">
                    <FiSearch size={16} />
                  </div>
                </div>

              </div>
            </div>

            <TableContainer className="rounded-none shadow-none border-none">
              <Table>
                <TableHeader className="bg-gray-50/50 dark:bg-gray-700/50 border-b border-gray-50 dark:border-gray-700">
                  <tr className="text-gray-500 dark:text-gray-400 text-[10px] font-extrabold uppercase tracking-[0.1em]">
                    <TableCell className="py-4">Sl</TableCell>
                    <TableCell className="py-4">Id</TableCell>
                    <TableCell className="py-4 text-center">Icon</TableCell>
                    <TableCell className="py-4">Name</TableCell>
                    <TableCell className="py-4">Status</TableCell>
                    <TableCell className="py-4">Featured</TableCell>
                    <TableCell className="py-4">Priority</TableCell>
                    <TableCell className="py-4">Action</TableCell>
                  </tr>
                </TableHeader>

                <CategoryTable
                  categories={dataTable}
                  lang={lang}
                  handleUpdate={handleUpdate}
                  handleModalOpen={handleModalOpen}
                />
              </Table>

              <TableFooter className="bg-white dark:bg-gray-800 border-t border-gray-50 dark:border-gray-700 px-6 py-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                    Total {totalResults} Categories
                  </span>
                  <Pagination
                    totalResults={totalResults}
                    resultsPerPage={resultsPerPage}
                    onChange={handleChangePage}
                    label="Table navigation"
                    className="custom-pagination"
                  />
                </div>
              </TableFooter>
            </TableContainer>
          </CardBody>
        </Card>

        {/* Custom Professional Notification Banner */}
        {alert.show && createPortal(
          <div className={`fixed top-12 left-1/2 -translate-x-1/2 z-[9999] max-w-sm w-full px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex items-center gap-4 border backdrop-blur-md animate-in slide-in-from-top-10 duration-500 ${alert.type === 'success' ? 'bg-teal-600/95 border-teal-500 text-white' : 'bg-red-600/95 border-red-500 text-white'}`}>
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              {alert.type === 'success' ? <FiCheck size={20} /> : <FiSearch size={20} />}
            </div>
            <div className="flex-1 text-left">
              <p className="font-extrabold text-[15px]">{alert.type === 'success' ? 'Success ✓' : 'Action Required'}</p>
              <p className="text-[13px] opacity-90 font-medium">{alert.message}</p>
            </div>
          </div>,
          document.body
        )}
      </AnimatedContent >
    </>
  );
};

export default Category;
