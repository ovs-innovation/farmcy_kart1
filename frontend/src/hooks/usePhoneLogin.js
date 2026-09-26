import { useState, useCallback } from "react";
import CustomerServices from "@services/CustomerServices";
import useFirebasePhoneOtp from "@hooks/useFirebasePhoneOtp";

/** Firebase SMS = 6 digits (reliable). MSG91 backend = 4 digits. */
const USE_FIREBASE_SMS = false;

export const PHONE_OTP_LENGTH = USE_FIREBASE_SMS ? 6 : 4;
export const EMPTY_OTP = Array(PHONE_OTP_LENGTH).fill("");

const parseAuthError = (err, fallback) => {
  const data = err?.response?.data;
  const message = data?.message || err?.message || fallback;
  const code = data?.code || err?.code || null;
  const error = new Error(message);
  error.code = code;
  return error;
};

/** @param {'login'|'signup'} authIntent */
export default function usePhoneLogin(authIntent = "login") {
  const intent = authIntent === "signup" ? "signup" : "login";
  const [mode, setMode] = useState(USE_FIREBASE_SMS ? "firebase" : "msg91");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState(null);
  const {
    sendOtp: firebaseSendOtp,
    verifyOtp: firebaseVerifyOtp,
    loading: firebaseLoading,
    error: firebaseError,
    setError: setFirebaseError,
    resetOtpSession,
  } = useFirebasePhoneOtp();

  const setAuthError = useCallback(
    (msg, code = null) => {
      setError(msg);
      setErrorCode(code);
      setFirebaseError(msg);
    },
    [setFirebaseError]
  );

  const assertPhoneIntent = useCallback(
    async (phoneNumber) => {
      const check = await CustomerServices.checkPhoneRegistered(phoneNumber);
      if (intent === "signup" && check?.exists) {
        const err = new Error(
          "This mobile number is already registered. Please login instead."
        );
        err.code = "PHONE_ALREADY_REGISTERED";
        throw err;
      }
      if (intent === "login" && !check?.exists) {
        const err = new Error(
          "No account found with this number. Please sign up first."
        );
        err.code = "PHONE_NOT_REGISTERED";
        throw err;
      }
    },
    [intent]
  );

  const sendOtp = useCallback(
    async (phoneNumber) => {
      setLoading(true);
      setError("");
      setErrorCode(null);
      try {
        await assertPhoneIntent(phoneNumber);

        if (mode === "firebase") {
          await firebaseSendOtp(phoneNumber);
          return {
            message: "Otp sent successfully",
            channel: "firebase",
            otpLength: 6,
          };
        }
        const response = await CustomerServices.sendPhoneOtp({
          phoneNumber,
          intent,
        });
        return { ...response, otpLength: 4, channel: response?.channel || "msg91" };
      } catch (err) {
        const parsed =
          err?.code && err?.message
            ? err
            : parseAuthError(err, "Failed to send OTP");
        setAuthError(parsed.message, parsed.code);
        throw parsed;
      } finally {
        setLoading(false);
      }
    },
    [mode, firebaseSendOtp, intent, setAuthError, assertPhoneIntent]
  );

  const verifyOtp = useCallback(
    async (phoneNumber, otpCode) => {
      setLoading(true);
      setError("");
      setErrorCode(null);
      try {
        if (mode === "firebase") {
          const { idToken } = await firebaseVerifyOtp(otpCode);
          return await CustomerServices.signupPhone({ idToken, intent });
        }
        return await CustomerServices.verifyPhoneOtp({
          phoneNumber,
          otp: otpCode,
          intent,
        });
      } catch (err) {
        const parsed = parseAuthError(err, "OTP verification failed");
        setAuthError(parsed.message, parsed.code);
        throw parsed;
      } finally {
        setLoading(false);
      }
    },
    [mode, firebaseVerifyOtp, intent, setAuthError]
  );

  const switchToMsg91 = useCallback(() => {
    setMode("msg91");
    setError("");
    setErrorCode(null);
    resetOtpSession();
  }, [resetOtpSession]);

  const switchToFirebase = useCallback(() => {
    setMode("firebase");
    setError("");
    setErrorCode(null);
  }, []);

  const resetSession = useCallback(() => {
    setError("");
    setErrorCode(null);
    resetOtpSession();
  }, [resetOtpSession]);

  return {
    sendOtp,
    verifyOtp,
    loading: loading || firebaseLoading,
    error: error || firebaseError,
    errorCode,
    setError: setAuthError,
    resetOtpSession: resetSession,
    mode,
    switchToMsg91,
    switchToFirebase,
    otpLength: mode === "firebase" ? 6 : 4,
    isFirebase: mode === "firebase",
    intent,
  };
}
