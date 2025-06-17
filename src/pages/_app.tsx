import { Toaster } from "sonner";
import type { AppProps } from "next/app";
import "@/styles/globals.css";
import useAccessToken from "@/stores/useAccessToken";
import { useEffect } from "react";


export default function App({ Component, pageProps }: AppProps) {
  const generateToken = useAccessToken((s) => s.generateToken);

  useEffect(() => {
    generateToken(); 
  }, [generateToken]);
  return (
    <>
      <Component {...pageProps} />
      <Toaster position="top-center" richColors />
      </>
  );
}
