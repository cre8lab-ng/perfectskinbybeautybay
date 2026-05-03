import Footer from "@/components/footer";
import Header from "@/components/header";
import WebPageTitle from "@/components/webpagetitle";
import Link from "next/link";
import React from "react";

export default function NotFound() {
  return (
    <>
      <WebPageTitle title="Perfect Skin By BeautyHub | 404 Page " />
      <Header />

      {/* Main 404 Content */}
      <section className="relative bg-gradient-to-br from-white via-pink-50/30 to-purple-50/20 py-20 px-4 md:px-12 text-center min-h-[80vh] flex items-center justify-center overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-[#f847b4]/10 to-transparent rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-purple-200/20 to-pink-200/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-[#f847b4]/5 to-transparent rounded-full"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto">
          {/* Elegant 404 Display */}
          <div className="mb-12">
            <div className="relative inline-block mb-8">
              <h1 className="text-9xl md:text-[12rem] font-black bg-gradient-to-br from-[#f847b4] via-[#ff6b9d] to-[#8b5cf6] bg-clip-text text-transparent leading-none tracking-tight drop-shadow-sm">
                404
              </h1>
              <div className="absolute inset-0 text-9xl md:text-[12rem] font-black text-[#f847b4]/10 blur-sm leading-none tracking-tight">
                404
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-3xl md:text-5xl font-bold text-gray-800 leading-tight">
                Page Not Found
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-[#f847b4] to-[#ff6b9d] mx-auto rounded-full"></div>
              <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed font-light">
                This page seems to have stepped out of our AI skin analysis routine. 
               
              </p>
              <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed font-light">
                Let&apos;s get you back to your personalized glow journey with advanced skincare insights.
              </p>
            </div>
          </div>

          {/* Premium Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/" className="group relative px-8 py-4 bg-gradient-to-r from-[#f847b4] to-[#ff6b9d] text-white font-semibold rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 min-w-[200px] inline-block">
              <span className="relative z-10">Return Home</span>
              <div className="absolute inset-0 bg-gradient-to-r from-[#ff6b9d] to-[#f847b4] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </Link>
            
            <Link href="/skin-analysis" className="group px-8 py-4 bg-white text-[#f847b4] font-semibold rounded-full border-2 border-[#f847b4] hover:bg-[#f847b4] hover:text-white shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 min-w-[200px] inline-block">
              Start Analysis
            </Link>
          </div>

          {/* Floating Elements */}
          <div className="absolute top-1/4 left-1/4 w-3 h-3 bg-[#f847b4] rounded-full opacity-60 animate-bounce delay-300"></div>
          <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-purple-400 rounded-full opacity-40 animate-bounce delay-700"></div>
          <div className="absolute bottom-1/4 left-1/3 w-4 h-4 bg-pink-300 rounded-full opacity-50 animate-bounce delay-500"></div>
        </div>
      </section>

      <Footer />
    </>
  );
}
