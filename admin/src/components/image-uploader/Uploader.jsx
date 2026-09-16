import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { t } from "i18next";
import axios from "axios";
import { useDropzone } from "react-dropzone";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { FiUploadCloud, FiXCircle, FiSearch, FiAlertCircle } from "react-icons/fi";
import Pica from "pica";

// Internal imports
import useUtilsFunction from "@/hooks/useUtilsFunction";
import Container from "@/components/image-uploader/Container";
import { FiCheck } from "react-icons/fi";
import requests from "@/services/httpService";
import { resolveCloudinaryUrl } from "@/utils/cloudinaryUrl";

const getCloudinaryErrorMessage = (err) => {
  const apiMessage = err?.response?.data?.error?.message;
  if (apiMessage) return apiMessage;
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.message) return err.message;
  return "Error uploading image";
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const uploadViaBackend = async (file, folder, publicId) => {
  const dataUrl = await fileToDataUrl(file);
  const res = await requests.post("/customer/cloudinary-upload", {
    file: dataUrl,
    folder,
    publicId: publicId ? `${folder}/${publicId}` : undefined,
  });
  return {
    secure_url: res.url,
    public_id: res.publicId,
  };
};

const Uploader = ({
  setImageUrl,
  imageUrl,
  product,
  folder = "farmacykart",
  targetWidth = 800, // Set default fixed width
  targetHeight = 800, // Set default fixed height
  useOriginalSize = false,
  accept,
  maxSize = 20971520,
  uniquePublicId = false,
  onUploadComplete,
  onRemove,
}) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setError] = useState("");
  const pica = Pica(); // Initialize Pica instance
  const { globalSetting } = useUtilsFunction();

  // Notification State
  const [alert, setAlert] = useState({ show: false, message: "", type: "success" });

  const showAlert = (msg, type = "success") => {
    setAlert({ show: true, message: msg, type: type });
    setTimeout(() => setAlert({ show: false, message: "", type: "success" }), 3500);
  };

  const { getRootProps, getInputProps, fileRejections } = useDropzone({
    accept:
      accept ||
      {
        "image/*": [".jpeg", ".jpg", ".png", ".webp"],
      },
    multiple: product ? true : false,
    maxSize,
    maxFiles: globalSetting?.number_of_image_per_product || 2,
    onDrop: async (acceptedFiles) => {
      let filesToUpload;

      filesToUpload = await Promise.all(
        acceptedFiles.map((file) => {
          if (useOriginalSize) return file;
          if (file?.type && file.type.startsWith("image/")) {
            return resizeImageToFixedDimensions(file, targetWidth, targetHeight);
          }
          return file;
        })
      );

      setFiles(
        filesToUpload.map((file) =>
          Object.assign(file, {
            preview: URL.createObjectURL(file),
          })
        )
      );
    },
  });

  const resizeImageToFixedDimensions = async (file, width, height) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);

    await img.decode();

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    return new Promise((resolve) => {
      pica
        .resize(img, canvas, {
          unsharpAmount: 80,
          unsharpRadius: 0.6,
          unsharpThreshold: 2,
        })
        .then((result) => pica.toBlob(result, file.type, 0.9))
        .then((blob) => {
          const resizedFile = new File([blob], file.name, { type: file.type });
          resolve(resizedFile);
        });
    });
  };

  useEffect(() => {
    if (fileRejections) {
      fileRejections.map(({ file, errors }) => (
        <li key={file.path}>
          {file.path} - {file.size} bytes
          <ul>
            {errors.map((e) => (
              <li key={e.code}>
                {e.code === "too-many-files"
                  ? showAlert(
                      `Maximum ${globalSetting?.number_of_image_per_product} Image Can be Upload!`, "error"
                    )
                  : showAlert(e.message, "error")}
              </li>
            ))}
          </ul>
        </li>
      ));
    }

    if (files) {
      files.forEach((file) => {
        if (
          product &&
          imageUrl?.length + files?.length >
            globalSetting?.number_of_image_per_product
        ) {
          return showAlert(
            `Maximum ${globalSetting?.number_of_image_per_product} Image Can be Upload!`, "error"
          );
        }

        const uploadPreset = import.meta.env.VITE_APP_CLOUDINARY_UPLOAD_PRESET;
        const rawBaseUrl = import.meta.env.VITE_APP_CLOUDINARY_URL || "https://api.cloudinary.com/v1_1/gzpiju8x/image/upload";
        const baseUrl = typeof rawBaseUrl === "string" && rawBaseUrl.includes("http")
          ? rawBaseUrl.substring(rawBaseUrl.indexOf("http"))
          : rawBaseUrl;

        if (!uploadPreset || !baseUrl) {
          showAlert(
            "Cloudinary is not configured. Set VITE_APP_CLOUDINARY_UPLOAD_PRESET and VITE_APP_CLOUDINARY_URL in admin/.env",
            "error"
          );
          return;
        }

        setLoading(true);
        setError("Uploading....");

        const safeFolder = folder && folder !== "undefined" ? folder : "farmacykart";
        const name = file.name.replaceAll(/\s/g, "");
        const basePublicId = name?.substring(0, name.lastIndexOf("."));
        const public_id = uniquePublicId ? `${basePublicId}_${Date.now()}` : basePublicId;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", uploadPreset);
        formData.append("folder", safeFolder);
        if (public_id) {
          formData.append("public_id", public_id);
        }

        const uploadUrl = baseUrl;

        const finishUpload = (payload) => {
          showAlert("Image Uploaded successfully!", "success");
          setLoading(false);
          setFiles([]);
          if (typeof onUploadComplete === "function") {
            onUploadComplete(payload);
          }
          if (product) {
            setImageUrl((imgUrl) => [...imgUrl, payload.secure_url]);
          } else {
            setImageUrl(payload.secure_url);
          }
        };

        axios({
          url: uploadUrl,
          method: "POST",
          data: formData,
        })
          .then((res) => finishUpload(res.data))
          .catch(async (err) => {
            const msg = err?.response?.data?.error?.message || "";
            const presetMissing =
              msg.toLowerCase().includes("preset") ||
              err?.response?.status === 400;

            if (presetMissing) {
              try {
                const payload = await uploadViaBackend(file, safeFolder, public_id);
                return finishUpload(payload);
              } catch (backendErr) {
                console.error("Backend Cloudinary upload error:", backendErr);
                showAlert(
                  getCloudinaryErrorMessage(backendErr) +
                    " — Run: node script/ensureCloudinaryPreset.js in backend folder.",
                  "error"
                );
              }
            } else {
              console.error("Cloudinary upload error:", err?.response?.data || err);
              showAlert(getCloudinaryErrorMessage(err), "error");
            }
            setLoading(false);
            setFiles([]);
          });
      });
    }
  }, [files]);

  const thumbs = files.map((file) => (
    <div key={file.name}>
      <div>
        <img
          className="inline-flex border-2 border-gray-100 w-24 max-h-24"
          src={file.preview}
          alt={file.name}
        />
      </div>
    </div>
  ));

  useEffect(
    () => () => {
      files.forEach((file) => URL.revokeObjectURL(file.preview));
    },
    [files]
  );

  const handleRemoveImage = async (img, idx) => {
    try {
      setLoading(false);
      showAlert("Image deleted successfully!", "success");
      if (typeof onRemove === "function") {
        await onRemove(img);
      }
      if (product) {
        setImageUrl((prev) => {
          if (idx !== undefined && typeof idx === 'number') {
            return prev.filter((_, i) => i !== idx);
          }
          return prev?.filter((i) => i !== img) || [];
        });
      } else {
        setImageUrl("");
      }
    } catch (err) {
      console.error("err", err);
      showAlert(err.Message || "Error deleting image", "error");
      setLoading(false);
    }
  };

  return (
    <div className="w-full text-center">
      <div
        className="border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md cursor-pointer px-6 pt-5 pb-6"
        {...getRootProps()}
      >
        <input {...getInputProps()} />
        <span className="mx-auto flex justify-center">
          <FiUploadCloud className="text-3xl text-store-500" />
        </span>
        <p className="text-sm mt-2">{t("DragYourImage")}</p>
        <em className="text-xs text-gray-400">
          {t("imageFormat")}
          {useOriginalSize ? " (Original Size)" : ` (${targetWidth}x${targetHeight})`}
        </em>
      </div>

      <div className="text-store-500">{loading && err}</div>
      <aside className="flex flex-row flex-wrap mt-4">
        {product ? (
          <DndProvider backend={HTML5Backend}>
            <Container
              setImageUrl={setImageUrl}
              imageUrl={imageUrl}
              handleRemoveImage={handleRemoveImage}
            />
          </DndProvider>
        ) : !product && imageUrl ? (
          <div className="relative">
            {typeof imageUrl === "string" && /\.pdf(\?|$)/i.test(imageUrl) ? (
              <a
                className="inline-flex border rounded-md border-gray-100 dark:border-gray-600 w-24 max-h-24 p-2 items-center justify-center text-sm underline"
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
              >
                PDF
              </a>
            ) : (
              <img
                className="inline-flex border rounded-md border-gray-100 dark:border-gray-600 w-24 max-h-24 p-2"
                src={resolveCloudinaryUrl(imageUrl) || "/favicon-transparent.png"}
                alt="product"
              />
            )}
            <button
              type="button"
              className="absolute top-0 right-0 text-red-500 focus:outline-none"
              onClick={() => handleRemoveImage(imageUrl)}
            >
              <FiXCircle />
            </button>
          </div>
        ) : (
          thumbs
        )}
      </aside>

      {/* Custom Professional Notification Banner */}
      {alert.show && createPortal(
        <div className={`fixed top-12 left-1/2 -translate-x-1/2 z-[9999] max-w-sm w-full px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex items-center gap-4 border backdrop-blur-md animate-in slide-in-from-top-10 duration-500 ${alert.type === 'success' ? 'bg-teal-600/95 border-teal-500 text-white' : 'bg-red-600/95 border-red-500 text-white'}`}>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
             {alert.type === 'success' ? <FiCheck size={20} /> : <FiAlertCircle size={20} />}
          </div>
          <div className="flex-1 text-left">
             <p className="font-extrabold text-[15px]">{alert.type === 'success' ? 'Success ✓' : 'Action Required'}</p>
             <p className="text-[13px] opacity-90 font-medium">{alert.message}</p>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Uploader;
