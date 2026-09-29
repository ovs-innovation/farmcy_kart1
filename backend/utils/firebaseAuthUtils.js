const admin = require("../config/firebase-admin");

/**
 * Securely verifies a Firebase ID Token using Firebase Admin SDK.
 * Never performs insecure decoding of unsigned JWT payloads.
 * 
 * @param {string} idToken - Firebase ID Token provided by client
 * @returns {Promise<{ ok: boolean, decodedToken?: object, uid?: string, phone_number?: string, email?: string, status?: number, message?: string, code?: string }>}
 */
const verifyFirebaseIdToken = async (idToken) => {
  if (!idToken || typeof idToken !== "string" || !idToken.trim()) {
    return {
      ok: false,
      status: 400,
      message: "Firebase ID token is required.",
      code: "ID_TOKEN_REQUIRED",
    };
  }

  if (!admin.apps || admin.apps.length === 0) {
    console.error("[AUTH_SECURITY] Firebase Admin SDK is not initialized. Token verification rejected.");
    return {
      ok: false,
      status: 503,
      message: "Authentication service is temporarily unavailable. Please contact support.",
      code: "FIREBASE_NOT_CONFIGURED",
    };
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken.trim());
    return {
      ok: true,
      decodedToken,
      uid: decodedToken.uid,
      phone_number: decodedToken.phone_number,
      email: decodedToken.email,
    };
  } catch (err) {
    console.warn("[AUTH_SECURITY] Firebase ID token verification failed:", err.message);
    return {
      ok: false,
      status: 401,
      message: "Invalid or expired authentication token. Please request a new OTP.",
      code: "INVALID_AUTH_TOKEN",
    };
  }
};

module.exports = {
  verifyFirebaseIdToken,
};
