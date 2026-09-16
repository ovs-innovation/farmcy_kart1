import React, { useState } from "react";
import MainModal from "@components/modal/MainModal";
import CustomerServices from "@services/CustomerServices";
import { notifyError, notifySuccess } from "@utils/toast";
import axios from "axios";

const WholesalerModal = ({ modalOpen, setModalOpen }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [aadharFile, setAadharFile] = useState(null);
  const [panFile, setPanFile] = useState(null);
  const [gstFile, setGstFile] = useState(null);
  const [drugFile, setDrugFile] = useState(null);
  const [aadharUrl, setAadharUrl] = useState("");
  const [panUrl, setPanUrl] = useState("");
  const [gstUrl, setGstUrl] = useState("");
  const [drugUrl, setDrugUrl] = useState("");
  const [aadharPublicId, setAadharPublicId] = useState("");
  const [panPublicId, setPanPublicId] = useState("");
  const [gstPublicId, setGstPublicId] = useState("");
  const [drugPublicId, setDrugPublicId] = useState("");
  const [aadharUploading, setAadharUploading] = useState(false);
  const [panUploading, setPanUploading] = useState(false);
  const [gstUploading, setGstUploading] = useState(false);
  const [drugUploading, setDrugUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [aadharDeleteToken, setAadharDeleteToken] = useState("");
  const [panDeleteToken, setPanDeleteToken] = useState("");
  const [gstDeleteToken, setGstDeleteToken] = useState("");
  const [drugDeleteToken, setDrugDeleteToken] = useState("");
  const [aadharPreview, setAadharPreview] = useState("");
  const [panPreview, setPanPreview] = useState("");
  const [gstPreview, setGstPreview] = useState("");
  const [drugPreview, setDrugPreview] = useState("");

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setAadharFile(null);
    setPanFile(null);
    setGstFile(null);
    setDrugFile(null);
    setAadharUrl("");
    setPanUrl("");
    setGstUrl("");
    setDrugUrl("");

  };

  // Upload helper
  const uploadToCloudinary = async (file, folder = "wholesaler") => {
    // quick validation
    if (!process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || !process.env.NEXT_PUBLIC_CLOUDINARY_URL) {
      notifyError("Cloudinary is not configured. Please set NEXT_PUBLIC_CLOUDINARY_URL and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.");
      console.error("Missing Cloudinary env vars", {
        upload_preset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
        cloudinary_url: process.env.NEXT_PUBLIC_CLOUDINARY_URL,
      });
      throw new Error('Cloudinary not configured');
    }

    const formData = new FormData();
    formData.append("file", file);
    const publicIdCandidate = `${file.name.replace(/\.[^/.]+$/, "")}__${Date.now()}`;
    formData.append("public_id", publicIdCandidate);
    formData.append("folder", folder);

    // Try obtaining a signature from server so we can request delete_token
    let signed = false;
    try {
      const signRes = await axios.post(`/api/customer/cloudinary-sign`, { publicId: publicIdCandidate, folder });
      if (signRes && signRes.data && signRes.data.signature) {
        const { signature, timestamp, apiKey } = signRes.data;
        formData.append('timestamp', timestamp);
        formData.append('api_key', apiKey);
        formData.append('signature', signature);
        // request delete token in signed upload
        formData.append('return_delete_token', 'true');
        signed = true;
      }
    } catch (err) {
      console.warn('Cloudinary signing unavailable, falling back to unsigned upload:', err?.response?.data || err?.message || err);
      formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET);
    }

    // Clean Cloudinary upload URL
    const rawEnvUrl = process.env.NEXT_PUBLIC_CLOUDINARY_URL || "https://api.cloudinary.com/v1_1/gzpiju8x/image/upload";
    const cloudinaryUrl = rawEnvUrl.includes("http") ? rawEnvUrl.substring(rawEnvUrl.indexOf("http")) : rawEnvUrl;
    
    let res;
    try {
      res = await axios.post(cloudinaryUrl, formData, { headers: { 'Content-Type': 'multipart/form-data' }});
    } catch (uploadErr) {
      if (file.type === "application/pdf" && cloudinaryUrl.includes("/image/upload")) {
        const rawUrl = cloudinaryUrl.replace("/image/upload", "/raw/upload");
        res = await axios.post(rawUrl, formData, { headers: { 'Content-Type': 'multipart/form-data' }});
      } else {
        throw uploadErr;
      }
    }
    // return both secure_url, public_id and delete token (if present)
    return { url: res.data.secure_url, publicId: res.data.public_id, deleteToken: res.data.delete_token || res.data.deleteToken || null };
  };

  const handleFileSelect = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    handleUpload(file, type);
  };

  const handleDrop = (e, type) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    handleUpload(file, type);
  };

  const handleUpload = async (file, type) => {
    try {
      // set specific uploading flag
      if (type === "aadhar") setAadharUploading(true);
      if (type === "pan") setPanUploading(true);
      if (type === "gst") setGstUploading(true);
      if (type === "drug") setDrugUploading(true);

      // quick local preview for images
      let localPreview = null;
      if (file.type && file.type.startsWith('image/')) {
        localPreview = URL.createObjectURL(file);
        if (type === "aadhar") setAadharPreview(localPreview);
        if (type === "pan") setPanPreview(localPreview);
        if (type === "gst") setGstPreview(localPreview);
        if (type === "drug") setDrugPreview(localPreview);
      }

      const { url, publicId, deleteToken } = await uploadToCloudinary(file);

      if (type === "aadhar") {
        setAadharUrl(url);
        setAadharPublicId(publicId);
        setAadharDeleteToken(deleteToken || "");
        setAadharFile(file);
        setAadharPreview(url);
      } else if (type === "pan") {
        setPanUrl(url);
        setPanPublicId(publicId);
        setPanDeleteToken(deleteToken || "");
        setPanFile(file);
        setPanPreview(url);
      } else if (type === "gst") {
        setGstUrl(url);
        setGstPublicId(publicId);
        setGstDeleteToken(deleteToken || "");
        setGstFile(file);
        setGstPreview(url);
      } else if (type === "drug") {
        setDrugUrl(url);
        setDrugPublicId(publicId);
        setDrugDeleteToken(deleteToken || "");
        setDrugFile(file);
        setDrugPreview(url);
      }

      // revoke local preview once cloud url is set
      if (localPreview) URL.revokeObjectURL(localPreview);
    } catch (err) {
      console.error("Cloudinary upload error:", err);
      const msg = err?.response?.data?.message || err?.message || "File upload failed. Please try again.";
      if (String(msg).includes("Return delete token parameter is not allowed")) {
        notifyError("Cloudinary rejected return_delete_token for unsigned uploads. Delete tokens require signed uploads; upload may succeed without delete token support.");
      } else {
        notifyError(msg);
      }
    } finally {
      setAadharUploading(false);
      setPanUploading(false);
      setGstUploading(false);
      setDrugUploading(false);
    }
  };

  const removeFile = async (type) => {
    // Determine which publicId/url/deleteToken to remove
    let publicId = null;
    let deleteToken = null;

    if (type === 'aadhar') {
      publicId = aadharPublicId;
      deleteToken = aadharDeleteToken;
    }
    if (type === 'pan') {
      publicId = panPublicId;
      deleteToken = panDeleteToken;
    }
    if (type === 'gst') {
      publicId = gstPublicId;
      deleteToken = gstDeleteToken;
    }
    if (type === 'drug') {
      publicId = drugPublicId;
      deleteToken = drugDeleteToken;
    }

    // If no publicId, just clear states
    if (!publicId) {
      if (type === 'aadhar') {
        setAadharUrl('');
        setAadharPublicId('');
        setAadharFile(null);
        setAadharPreview('');
        setAadharDeleteToken('');
      }
      if (type === 'pan') {
        setPanUrl('');
        setPanPublicId('');
        setPanFile(null);
        setPanPreview('');
        setPanDeleteToken('');
      }
      if (type === 'gst') {
        setGstUrl('');
        setGstPublicId('');
        setGstFile(null);
        setGstPreview('');
        setGstDeleteToken('');
      }
      if (type === 'drug') {
        setDrugUrl('');
        setDrugPublicId('');
        setDrugFile(null);
        setDrugPreview('');
        setDrugDeleteToken('');
      }
      return;
    }

    try {
      // If we have a delete token, try client-side delete (no server secret required)
      if (deleteToken) {
        try {
          const cloudinaryDeleteUrl = process.env.NEXT_PUBLIC_CLOUDINARY_URL.replace('/image/upload', '/delete_by_token');
          await axios.post(cloudinaryDeleteUrl, { token: deleteToken });
          notifySuccess('Deleted from Cloudinary');
        } catch (err) {
          console.warn('Client-side delete failed:', err?.message || err);
          notifyError('Client deletion failed. Please try again or contact admin.');
        }
      } else {
        // No delete token available for this asset - client cannot delete directly.
        notifyError('This file was uploaded unsigned and cannot be deleted directly from the frontend. Please delete it from the admin panel or re-upload using the signed upload option.');
        return;
      }

      // clear state on success
      if (type === 'aadhar') {
        setAadharUrl('');
        setAadharPublicId('');
        setAadharFile(null);
        setAadharPreview('');
        setAadharDeleteToken('');
      }
      if (type === 'pan') {
        setPanUrl('');
        setPanPublicId('');
        setPanFile(null);
        setPanPreview('');
        setPanDeleteToken('');
      }
      if (type === 'gst') {
        setGstUrl('');
        setGstPublicId('');
        setGstFile(null);
        setGstPreview('');
        setGstDeleteToken('');
      }
      if (type === 'drug') {
        setDrugUrl('');
        setDrugPublicId('');
        setDrugFile(null);
        setDrugPreview('');
        setDrugDeleteToken('');
      }
      notifySuccess('File removed');
    } catch (err) {
      console.error('Error deleting file:', err);
      notifyError('Failed to delete file.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name || !email) {
      return notifyError("Name and Email are required");
    }

    // required URLs (uploaded to cloudinary)
    if (!aadharUrl) {
      return notifyError("Aadhar upload is required");
    }
    if (!panUrl) {
      return notifyError("PAN upload is required");
    }

    const payload = {
      name,
      email,
      phone,
      // user-facing "not required" options removed; send explicit false so server treats these as not set
      gstNotRequired: false,
      drugLicenseNotRequired: false,
      aadharUrl,
      panUrl,
      gstUrl: gstUrl || null,
      drugUrl: drugUrl || null,
      aadharPublicId,
      panPublicId,
      gstPublicId,
      drugPublicId,
      aadharDeleteToken,
      panDeleteToken,
      gstDeleteToken,
      drugDeleteToken,
    };

    try {
      setSubmitting(true);
      const res = await CustomerServices.createWholesaler(payload);
      notifySuccess(res.message || "Submitted successfully");
      resetForm();
      setModalOpen(false);
    } catch (err) {
      console.error("Wholesaler submit error:", err);
      notifyError(err?.response?.data?.message || err.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MainModal modalOpen={modalOpen} setModalOpen={setModalOpen}>
      <div className="inline-block w-full max-w-2xl p-6 my-8 text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Wholesaler Registration</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full border border-gray-200 rounded-md px-3 py-2"
              placeholder="Name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email *</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="mt-1 block w-full border border-gray-200 rounded-md px-3 py-2"
              placeholder="Email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 block w-full border border-gray-200 rounded-md px-3 py-2"
              placeholder="Mobile number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Aadhar (Required)</label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleDrop(e, 'aadhar'); }}
              className="mt-1 border-dashed border-2 border-gray-300 rounded-md p-4 text-center cursor-pointer"
              onClick={() => document.getElementById('aadharInput')?.click()}
            >
              <input
                id="aadharInput"
                onChange={(e) => handleFileSelect(e, "aadhar")}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
              />
              <div className="text-sm text-gray-500">Drag & drop Aadhar here or click to select</div>
            </div>
            <div className="mt-2 text-xs text-gray-600">
              {aadharUploading ? (
                <span>Uploading...</span>
              ) : (aadharPreview || aadharUrl) ? (
                <div className="flex items-center justify-between">
                  {( /\.pdf(\?|$)/i.test(aadharPreview || aadharUrl) ) ? (
                    <a href={aadharPreview || aadharUrl} target="_blank" rel="noreferrer" className="text-store-600 underline">View Aadhar PDF</a>
                  ) : (
                    <div className="flex items-center gap-3">
                      <img src={aadharPreview || aadharUrl} alt="aadhar" className="w-20 h-20 object-cover rounded" />
                      <div>
                        <div className="text-sm text-store-600">Aadhar uploaded</div>
                        <button type="button" onClick={() => removeFile('aadhar')} className="text-red-500 text-sm mt-1">Remove</button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <span>No file uploaded</span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">PAN (Required)</label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleDrop(e, 'pan'); }}
              className="mt-1 border-dashed border-2 border-gray-300 rounded-md p-4 text-center cursor-pointer"
              onClick={() => document.getElementById('panInput')?.click()}
            >
              <input
                id="panInput"
                onChange={(e) => handleFileSelect(e, "pan")}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
              />
              <div className="text-sm text-gray-500">Drag & drop PAN here or click to select</div>
            </div>
            <div className="mt-2 text-xs text-gray-600">
              {panUploading ? (
                <span>Uploading...</span>
              ) : (panPreview || panUrl) ? (
                <div className="flex items-center justify-between">
                  {( /\.pdf(\?|$)/i.test(panPreview || panUrl) ) ? (
                    <a href={panPreview || panUrl} target="_blank" rel="noreferrer" className="text-store-600 underline">View PAN PDF</a>
                  ) : (
                    <div className="flex items-center gap-3">
                      <img src={panPreview || panUrl} alt="pan" className="w-20 h-20 object-cover rounded" />
                      <div>
                        <div className="text-sm text-store-600">PAN uploaded</div>
                        <button type="button" onClick={() => removeFile('pan')} className="text-red-500 text-sm mt-1">Remove</button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <span>No file uploaded</span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">GST (Optional)</label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleDrop(e, 'gst'); }}
              className="mt-1 border-dashed border-2 border-gray-300 rounded-md p-4 text-center cursor-pointer"
              onClick={() => document.getElementById('gstInput')?.click()}
            >
              <input
                id="gstInput"
                onChange={(e) => handleFileSelect(e, "gst")}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
              />
              <div className="text-sm text-gray-500">Drag & drop GST here or click to select</div>
            </div>
            <div className="mt-2 text-xs text-gray-600">
              {gstUploading ? (
                <span>Uploading...</span>
              ) : (gstPreview || gstUrl) ? (
                <div className="flex items-center justify-between">
                  {( /\.pdf(\?|$)/i.test(gstPreview || gstUrl) ) ? (
                    <a href={gstPreview || gstUrl} target="_blank" rel="noreferrer" className="text-store-600 underline">View GST PDF</a>
                  ) : (
                    <div className="flex items-center gap-3">
                      <img src={gstPreview || gstUrl} alt="gst" className="w-20 h-20 object-cover rounded" />
                      <div>
                        <div className="text-sm text-store-600">GST uploaded</div>
                        <button type="button" onClick={() => removeFile('gst')} className="text-red-500 text-sm mt-1">Remove</button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <span>No file uploaded</span>
              )}
            </div>

          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Drug License (Optional)</label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleDrop(e, 'drug'); }}
              className="mt-1 border-dashed border-2 border-gray-300 rounded-md p-4 text-center cursor-pointer"
              onClick={() => document.getElementById('drugInput')?.click()}
            >
              <input
                id="drugInput"
                onChange={(e) => handleFileSelect(e, "drug")}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
              />
              <div className="text-sm text-gray-500">Drag & drop Drug License here or click to select</div>
            </div>
            <div className="mt-2 text-xs text-gray-600">
              {drugUploading ? (
                <span>Uploading...</span>
              ) : (drugPreview || drugUrl) ? (
                <div className="flex items-center justify-between">
                  {( /\.pdf(\?|$)/i.test(drugPreview || drugUrl) ) ? (
                    <a href={drugPreview || drugUrl} target="_blank" rel="noreferrer" className="text-store-600 underline">View Drug License PDF</a>
                  ) : (
                    <div className="flex items-center gap-3">
                      <img src={drugPreview || drugUrl} alt="drug" className="w-20 h-20 object-cover rounded" />
                      <div>
                        <div className="text-sm text-store-600">Drug License uploaded</div>
                        <button type="button" onClick={() => removeFile('drug')} className="text-red-500 text-sm mt-1">Remove</button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <span>No file uploaded</span>
              )}
            </div>

          </div>

          <div className="flex items-center justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 border rounded-md"
            >
              Cancel
            </button>
            <button
              disabled={submitting}
              type="submit"
              className="px-4 py-2 bg-store-500 text-white rounded-md"
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </MainModal>
  );
};

export default WholesalerModal;
