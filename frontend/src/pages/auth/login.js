import { useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "@layout/Layout";
import AuthPageShell from "@components/auth/AuthPageShell";
import PhoneLoginForm from "@components/auth/PhoneLoginForm";
import useCustomerAuth from "@hooks/useCustomerAuth";
import LoadingForSession from "@components/preloader/LoadingForSession";
import { getSafeRedirectUrl } from "@utils/redirect";

const Login = () => {
  const router = useRouter();
  const { isLoggedIn, isAuthLoading, authStatus } = useCustomerAuth();

  const isCheckoutReturn =
    router.query.redirectUrl === "checkout" || router.query.next === "checkout";

  useEffect(() => {
    // Strict Guard Rule: NEVER redirect while authStatus is loading
    if (authStatus === "loading") return;

    if (isLoggedIn) {
      const rawTarget = router.query.redirectUrl || router.query.next;
      const target = isCheckoutReturn ? "/checkout" : getSafeRedirectUrl(rawTarget, "/user/dashboard");
      router.replace(target);
    }
  }, [isLoggedIn, authStatus, router, isCheckoutReturn]);

  if (isAuthLoading || authStatus === "loading") {
    return (
      <Layout title="Login">
        <LoadingForSession />
      </Layout>
    );
  }

  if (isLoggedIn) {
    return null;
  }

  return (
    <Layout title="Login">
      <AuthPageShell
        title="Welcome back"
        subtitle={
          isCheckoutReturn
            ? "Sign in with your registered mobile number to complete checkout."
            : "Enter your registered mobile number. We will send a one-time password."
        }
        badge={isCheckoutReturn ? "Checkout" : null}
        alternateLink={{
          text: "New to Farmacykart?",
          label: "Create an account",
          href: { pathname: "/auth/signup", query: { ...router.query } },
        }}
        footer={
          <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-500">
            Browse as guest anytime. Delivery details are collected at checkout.
          </p>
        }
      >
        <PhoneLoginForm variant="login" />
      </AuthPageShell>
    </Layout>
  );
};

export default Login;

