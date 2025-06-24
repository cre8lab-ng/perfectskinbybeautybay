import { Toaster } from "sonner";
import type { AppProps } from "next/app";
import "@/styles/globals.css";
import useAccessToken from "@/stores/useAccessToken";
import { useEffect } from "react";
import { getOrCreateDeviceId } from "@/util/getOrCreateDeviceId";

export default function App({ Component, pageProps }: AppProps) {
  const generateToken = useAccessToken((s) => s.generateToken);

  useEffect(() => {
    generateToken();
  }, [generateToken]);

  useEffect(() => {
    getOrCreateDeviceId();
  }, []);
  return (
    <>
      <Component {...pageProps} />
      <Toaster position="top-center" richColors />
    </>
  );
}
