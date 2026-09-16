import React, { useState, useCallback, useEffect, useContext } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import { IoDocumentTextOutline, IoClose, IoImageOutline } from "react-icons/io5";
import { FiUploadCloud, FiX } from "react-icons/fi";
import MainModal from "@components/modal/MainModal";
import PrescriptionServices from "@services/PrescriptionServices";
import { notifyError, notifySuccess } from "@utils/toast";
import useGetSetting from "@hooks/useGetSetting";
import Image from "next/image";
import { UserContext } from "@context/UserContext";
import { useSession } from "next-auth/react";

const PrescriptionUploadModal = ({ modalOpen, setModalOpen }) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState("");
  const { storeCustomizationSetting } = useGetSetting();
  const { data: session } = useSession();
  const {
    state: { userInfo },
  } = useContext(UserContext);

  // Use session user if available, otherwise fallback to context user
  const user = session?.user || userInfo;

  // Determine file type
  const getFileType = (file) => {
    if (file.type.startsWith("image/")) {
      return "image";
    } else if (file.type === "application/pdf") {
      return "pdf";
    }
    return null;
  };

  // Handle file drop
  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    const validFiles = acceptedFiles.filter((file) => {
      const fileType = getFileType(file);
      if (!fileType) {
        notifyError(`${file.name} is not a valid image or PDF file`);
        return false;
      }
      // Max file size: 10MB
      if (file.size > 10 * 1024 * 1024) {
        notifyError(`${file.name} is too large. Maximum size is 10MB`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setUploading(true);
    try {
      const filesToUpload = await Promise.all(
        validFiles.map(async (file) => {
          // Show local preview immediately for images
          let localPreview = null;
          if (file.type.startsWith("image/")) {
            localPreview = URL.createObjectURL(file);
          }

          const formData = new FormData();
          formData.append("file", file);
          formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET);
          formData.append("folder", "prescriptions");

          // Use valid Cloudinary upload endpoint (image/upload or raw/upload for PDFs)
          const rawEnvUrl = process.env.NEXT_PUBLIC_CLOUDINARY_URL || "https://api.cloudinary.com/v1_1/gzpiju8x/image/upload";
          const cleanEnvUrl = rawEnvUrl.includes("http") ? rawEnvUrl.substring(rawEnvUrl.indexOf("http")) : rawEnvUrl;

          let res;
          try {
            res = await axios.post(cleanEnvUrl, formData);
          } catch (uploadErr) {
            // If image/upload fails for PDF, try raw/upload endpoint
            if (file.type === "application/pdf" && cleanEnvUrl.includes("/image/upload")) {
              const rawUrl = cleanEnvUrl.replace("/image/upload", "/raw/upload");
              res = await axios.post(rawUrl, formData);
            } else {
              throw uploadErr;
            }
          }

          const fileType = getFileType(file);
          const uploadedFile = {
            url: res.data.secure_url,
            fileName: file.name,
            fileType: fileType,
            fileSize: file.size,
            preview: localPreview, // Keep local preview for faster display
          };

          // Revoke local preview after a delay to allow it to be used
          if (localPreview) {
            setTimeout(() => URL.revokeObjectURL(localPreview), 1000);
          }

          return uploadedFile;
        })
      );

      // Add to uploaded files list with preview
      setUploadedFiles((prev) => [
        ...filesToUpload.map((f) => ({
          ...f,
          id: Date.now() + Math.random(),
        })),
        ...prev,
      ]);

      notifySuccess(`${filesToUpload.length} file(s) uploaded successfully!`);
    } catch (error) {
      console.error("Error uploading prescription:", error);
      const errorMessage =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        "Failed to upload prescription";
      notifyError(errorMessage);
    } finally {
      setUploading(false);
    }
  }, []);

  const handleSubmit = async () => {
    if (!user) {
      notifyError("Please login to upload prescription");
      return;
    }

    const customerId = user?._id || user?.id;

    if (!customerId) {
      notifyError("User session invalid. Please login again.");
      return;
    }

    if (uploadedFiles.length === 0) {
      notifyError("Please upload at least one file");
      return;
    }

    setLoading(true);
    try {
      const response = await PrescriptionServices.uploadPrescription({
        files: uploadedFiles,
        userId: customerId,
        notes: notes,
      });

      if (response) {
        notifySuccess("Prescription submitted successfully!");
        setUploadedFiles([]);
        setNotes("");
        setModalOpen(false);
      }
    } catch (error) {
      console.error("Error submitting prescription:", error);
      notifyError(
        error?.response?.data?.message || "Failed to submit prescription"
      );
    } finally {
      setLoading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
      "application/pdf": [".pdf"],
    },
    multiple: true,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  // Fetch prescriptions (for demo, can be updated to fetch user-specific)
  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      // For now, we'll show uploaded files in the current session
      // Can be updated to fetch from API if needed
    } catch (error) {
      console.error("Error fetching prescriptions:", error);
    } finally {
      setLoading(false);
    }
  };

  // Remove uploaded file from preview
  const removeFile = (id) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== id));
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  return (
    <MainModal modalOpen={modalOpen} setModalOpen={setModalOpen}>
      <div className="inline-block w-full max-w-2xl p-6 my-8 text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Upload Prescription
          </h3>
        </div>

        {/* Upload Area */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive
              ? "border-store-500 bg-store-50"
              : "border-gray-300 hover:border-store-400"
            } ${uploading ? "opacity-50 pointer-events-none" : ""}`}
        >
          <input {...getInputProps()} />
          <FiUploadCloud className="mx-auto text-4xl text-store-500 mb-4" />
          {uploading ? (
            <p className="text-gray-600">Uploading...</p>
          ) : isDragActive ? (
            <p className="text-store-600 font-medium">
              Drop files here to upload
            </p>
          ) : (
            <>
              <p className="text-gray-700 font-medium mb-2">
                Drag and drop files here, or click to select
              </p>
              <p className="text-sm text-gray-500">
                Supports PDF and Image files (JPEG, PNG, WebP)
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Maximum file size: 10MB per file
              </p>
            </>
          )}
        </div>

        {/* Uploaded Files Preview */}
        {uploadedFiles.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Uploaded Files ({uploadedFiles.length})
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="relative border-2 border-green-200 rounded-lg p-2 bg-green-50 hover:border-green-300 transition-colors"
                >
                  <button
                    onClick={() => removeFile(file.id)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors z-10 shadow-md"
                    title="Remove file"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                  {file.type === "image" ? (
                    <div className="relative w-full aspect-square rounded overflow-hidden bg-white border border-gray-200">
                      <Image
                        src={file.preview || file.url}
                        alt={file.fileName}
                        fill
                        className="object-contain"
                        sizes="(max-width: 768px) 100vw, 33vw"
                        onError={(e) => {
                          // Fallback to URL if preview fails
                          if (file.preview && file.preview !== file.url) {
                            e.target.src = file.url;
                          }
                        }}
                      />
                      <div className="absolute top-1 left-1 bg-green-500 text-white text-xs px-2 py-0.5 rounded">
                        ✓ Uploaded
                      </div>
                    </div>
                  ) : (
                    <div className="w-full aspect-square rounded bg-red-50 border border-red-200 flex flex-col items-center justify-center relative">
                      <IoDocumentTextOutline className="text-5xl text-red-500 mb-2" />
                      <span className="text-xs text-red-600 font-medium">PDF</span>
                      <div className="absolute top-1 left-1 bg-green-500 text-white text-xs px-2 py-0.5 rounded">
                        ✓ Uploaded
                      </div>
                    </div>
                  )}
                  <div className="mt-2 text-xs text-gray-700 font-medium truncate" title={file.fileName}>
                    {file.fileName}
                  </div>
                  {file.fileSize > 0 && (
                    <div className="text-xs text-gray-500">
                      {formatFileSize(file.fileSize)}
                    </div>
                  )}
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-store-600 hover:text-store-700 mt-1 inline-block font-medium"
                  >
                    View Full →
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Message */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Your prescription will be reviewed by our
            team. You will be contacted soon for order confirmation.
          </p>
        </div>

        {/* Notes Input */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Additional Notes (Optional)
          </label>
          <textarea
            rows="3"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-store-500 focus:ring-store-500 sm:text-sm p-2 border"
            placeholder="Any specific instructions..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          ></textarea>
        </div>

        {/* Submit Button */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || uploading || uploadedFiles.length === 0}
            className={`inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-store-600 border border-transparent rounded-md hover:bg-store-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-store-500 ${(loading || uploading || uploadedFiles.length === 0)
                ? "opacity-50 cursor-not-allowed"
                : ""
              }`}
          >
            {loading ? "Submitting..." : "Submit Prescription"}
          </button>
        </div>
      </div>
    </MainModal>
  );
};

export default PrescriptionUploadModal;

