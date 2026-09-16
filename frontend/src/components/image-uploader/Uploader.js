import React, { useEffect, useState } from "react";
import axios from "axios";
import { useDropzone } from "react-dropzone";
import { FiUploadCloud, FiX } from "react-icons/fi";
import useGetSetting from "@hooks/useGetSetting";
import { notifySuccess, notifyError } from "@utils/toast";

const Uploader = ({
  setImageUrl,
  imageUrl,
  folder,
  accept,
  maxSize = 5000000,
  uniquePublicId = false,
  onUploadComplete,
  onRemove,
  compact = false,
}) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const uploadUrl = process.env.NEXT_PUBLIC_CLOUDINARY_URL;
  const upload_Preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  const { storeCustomizationSetting } = useGetSetting();
  const storeColor = storeCustomizationSetting?.theme?.color || "green";

  const { getRootProps, getInputProps } = useDropzone({
    accept:
      accept ||
      {
        "image/jpeg": [".jpeg", ".jpg"],
        "image/png": [".png"],
        "image/webp": [".webp"],
      },
    multiple: false,
    maxSize,
    onDrop: (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles && rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors[0]?.code === "file-too-large") {
          notifyError("File size is too large");
        } else if (rejection.errors[0]?.code === "file-invalid-type") {
          notifyError("Invalid file type");
        } else {
          notifyError("File upload failed. Please try again.");
        }
        return;
      }

      if (acceptedFiles && acceptedFiles.length > 0) {
        setFiles(
          acceptedFiles.map((file) =>
            Object.assign(file, {
              preview: URL.createObjectURL(file),
            })
          )
        );
        notifySuccess("File selected! Uploading...");
      }
    },
  });

  const thumbs = files.map((file) => (
    <div key={file.name} className="relative inline-block mr-2">
      {file?.type === "application/pdf" ? (
        <a
          className="inline-flex border-2 border-gray-100 w-24 h-24 rounded-full items-center justify-center text-xs underline bg-white"
          href={file.preview}
          target="_blank"
          rel="noreferrer"
        >
          PDF
        </a>
      ) : (
        <img
          className="inline-flex border-2 border-gray-100 w-24 h-24 object-cover rounded-full"
          src={file.preview}
          alt={file.name}
        />
      )}
      {uploading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-full">
          <div className="text-white text-xs text-center">
            <div className="animate-spin mb-1">⏳</div>
            <div>{uploadProgress}%</div>
          </div>
        </div>
      )}
    </div>
  ));

  useEffect(() => {
    const rawUploadURL = uploadUrl || "https://api.cloudinary.com/v1_1/gzpiju8x/image/upload";
    const cleanUploadURL = typeof rawUploadURL === "string" && rawUploadURL.includes("http")
      ? rawUploadURL.substring(rawUploadURL.indexOf("http"))
      : rawUploadURL;
    const uploadPreset = upload_Preset;
    
    if (files && files.length > 0 && !uploading) {
      const file = files[0];

      const resolvedUploadURL = cleanUploadURL;

      const name = String(file?.name || "file")
        .replaceAll(/\s/g, "")
        .replaceAll(/[^a-zA-Z0-9.-]/g, "");
      const basePublicId = name?.includes(".")
        ? name.substring(0, name.lastIndexOf("."))
        : name;
      const public_id = uniquePublicId ? `${basePublicId}_${Date.now()}` : basePublicId;

      setUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);
      if (folder) {
        formData.append("folder", folder);
      }
      if (public_id) {
        formData.append("public_id", public_id);
      }

      // Simulate progress (Cloudinary doesn't provide progress events easily)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev < 90) return prev + 10;
          return prev;
        });
      }, 200);

      axios({
        url: resolvedUploadURL,
        method: "POST",
        headers: {
          "Content-Type": "multipart/form-data",
        },
        data: formData,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        },
      })
        .then((res) => {
          clearInterval(progressInterval);
          setUploadProgress(100);
          if (res.data && res.data.secure_url) {
            setImageUrl(res.data.secure_url);
            notifySuccess("File uploaded successfully!");
            if (typeof onUploadComplete === "function") {
              onUploadComplete(res.data);
            }
            // Clear files after successful upload to show the uploaded image
            setTimeout(() => {
              setFiles([]);
              setUploading(false);
            }, 500);
          } else {
            throw new Error("Invalid response from server");
          }
        })
        .catch((err) => {
          clearInterval(progressInterval);
          setUploading(false);
          setFiles([]);
          console.error("Upload error:", err);
          notifyError(err?.response?.data?.error?.message || "Failed to upload image. Please try again.");
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  useEffect(
    () => () => {
      // Make sure to revoke the data uris to avoid memory leaks
      files.forEach((file) => URL.revokeObjectURL(file.preview));
    },
    [files]
  );

  const handleRemoveImage = async (e) => {
    e.stopPropagation();
    try {
      if (typeof onRemove === "function") {
        await onRemove(imageUrl);
      }
      setImageUrl("");
      setFiles([]);
      notifySuccess("Removed");
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message || "Failed to remove");
    }
  };

  return (
    <div className={compact ? "w-full" : "w-full text-center"}>
      <div className={compact ? "flex items-center gap-3" : ""}>
        <div
          className={`border-2 border-dashed rounded-md transition-all ${
            uploading
              ? "border-store-500 bg-store-50 cursor-wait"
              : "border-gray-300 hover:border-store-500 hover:bg-gray-50 cursor-pointer"
          } ${
            compact
              ? "px-3 py-2 flex items-center justify-center gap-2 w-full max-w-xs"
              : "px-6 pt-5 pb-6"
          }`}
          {...getRootProps()}
        >
          <input {...getInputProps()} disabled={uploading} />
          <span className={compact ? "flex items-center" : "mx-auto flex justify-center"}>
            {uploading ? (
              <div className="relative">
                <FiUploadCloud
                  className={`${compact ? "text-xl" : "text-3xl"} text-store-500 animate-pulse`}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className={`${compact ? "w-4 h-4" : "w-6 h-6"} border-2 border-store-500 border-t-transparent rounded-full animate-spin`}
                  ></div>
                </div>
              </div>
            ) : (
              <FiUploadCloud className={`${compact ? "text-xl" : "text-3xl"} text-store-500`} />
            )}
          </span>

          {uploading ? (
            compact ? (
              <span className="text-xs font-medium text-store-600">{uploadProgress}%</span>
            ) : (
              <>
                <p className="text-sm mt-2 font-medium text-store-600">
                  Uploading... {uploadProgress}%
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2 max-w-xs mx-auto">
                  <div
                    className="bg-store-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </>
            )
          ) : compact ? (
            <span className="text-xs text-gray-600">Upload</span>
          ) : (
            <>
              <p className="text-sm mt-2 text-gray-700">Drag your image here</p>
              <p className="text-xs text-gray-500 mt-1">or click to browse</p>
              <em className="text-xs text-gray-400 block mt-1">
                (Only *.jpeg, *.png, *.webp images, max 5MB)
              </em>
            </>
          )}
        </div>

        {compact && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {imageUrl && !uploading ? (
              <div className="relative">
                {typeof imageUrl === "string" && /\.pdf(\?|$)/i.test(imageUrl) ? (
                  <a
                    className="inline-flex border border-gray-200 rounded-md w-14 h-14 items-center justify-center text-xs underline bg-white"
                    href={imageUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    PDF
                  </a>
                ) : (
                  <img
                    className="inline-flex border border-gray-200 rounded-md w-14 h-14 object-cover"
                    src={imageUrl}
                    alt="Uploaded"
                  />
                )}
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow"
                  title="Remove"
                >
                  <FiX className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <>{!imageUrl && thumbs}</>
            )}
          </div>
        )}
      </div>

      {!compact && (
        <aside className="flex flex-row flex-wrap mt-4 justify-center items-center gap-3">
          {imageUrl && !uploading && (
            <div className="relative inline-block">
              {typeof imageUrl === "string" && /\.pdf(\?|$)/i.test(imageUrl) ? (
                <a
                  className="inline-flex border-2 border-gray-200 rounded-full w-32 h-32 items-center justify-center text-sm underline bg-white shadow-md"
                  href={imageUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  PDF
                </a>
              ) : (
                <img
                  className="inline-flex border-2 border-gray-200 rounded-full w-32 h-32 object-cover shadow-md"
                  src={imageUrl}
                  alt="Uploaded profile"
                />
              )}
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-lg"
                title="Remove image"
              >
                <FiX className="w-4 h-4" />
              </button>
              <p className="text-xs mt-1" style={{ color: "#006E44" }}>
                ✓ Uploaded
              </p>
            </div>
          )}
          {!imageUrl && thumbs}
          {uploading && thumbs}
        </aside>
      )}
    </div>
  );
};

export default Uploader;

