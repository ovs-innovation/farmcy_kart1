import { useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "@layout/Layout";
import AuthPageShell from "@components/auth/AuthPageShell";
import PhoneLoginForm from "@components/auth/PhoneLoginForm";
import useCustomerAuth from "@hooks/useCustomerAuth";
import LoadingForSession from "@components/preloader/LoadingForSession";
import { getSafeRedirectUrl } from "@utils/redirect";

const SignUp = () => {
  const router = useRouter();
  const { isLoggedIn, isAuthLoading, authStatus } = useCustomerAuth();

  useEffect(() => {
    if (authStatus === "loading") return;

    if (isLoggedIn) {
      const target = getSafeRedirectUrl(router.query.redirectUrl || router.query.next, "/user/dashboard");
      router.replace(target);
    }
  }, [isLoggedIn, authStatus, router]);

  if (isAuthLoading || authStatus === "loading") {
    return (
      <Layout title="Sign up">
        <LoadingForSession />
      </Layout>
    );
  }

  if (isLoggedIn) {
    return null;
  }

  return (
    <Layout title="Sign up">
      <AuthPageShell
        title="Create your account"
        subtitle="New customers only. Verify your mobile with OTP — it takes less than a minute."
        alternateLink={{
          text: "Already registered?",
          label: "Login here",
          href: { pathname: "/auth/login", query: { ...router.query } },
        }}
      >
        <PhoneLoginForm variant="signup" />
      </AuthPageShell>
    </Layout>
  );
};

export default SignUp;

