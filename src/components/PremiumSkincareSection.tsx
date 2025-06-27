import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

const PremiumSkincareSection = () => {
  const router = useRouter();

  return (
    <section className="relative w-full  py-24 overflow-hidden bg-gradient-to-br from-pink-50 via-white to-pink-100">
      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-20 px-6 lg:px-12">
        {/* Text Side */}
        <div className="w-full lg:w-1/2 text-center lg:text-left space-y-8 animate-fade-in">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/25 backdrop-blur-md border border-pink-200/50 text-sm font-medium text-pink-800 mb-6">
            <span className="w-2 h-2 bg-pink-500 rounded-full mr-2 animate-pulse"></span>
            AI-Powered Analysis
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl lg:text-7xl font-black leading-tight text-gray-900 tracking-tight">
            Your Skin.
            <br />
            <span className="bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 bg-clip-text text-transparent animate-pulse">
              Perfectly
              <br />
              Analyzed.
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-xl lg:text-2xl text-gray-600 max-w-lg mx-auto lg:mx-0 leading-relaxed font-light">
            Scan the QR to start your AI-powered skincare journey 
            <span className="font-semibold text-pink-700 ml-2">
              100% personalized
            </span>
            , just for you.
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap gap-3 justify-center lg:justify-start mt-8">
            <span className="px-4 py-2 rounded-full bg-white/25 backdrop-blur-md text-sm font-medium text-gray-700 border border-white/30">
              ✨ Instant Analysis
            </span>
            <span className="px-4 py-2 rounded-full bg-white/25 backdrop-blur-md text-sm font-medium text-gray-700 border border-white/30">
              🔬 AI Technology
            </span>
            <span className="px-4 py-2 rounded-full bg-white/25 backdrop-blur-md text-sm font-medium text-gray-700 border border-white/30">
              💫 Personalized Results
            </span>
          </div>

          {/* CTA Button */}
          <div className="pt-6" onClick={() => router.push("/skin-analysis")}>
            <button className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-semibold rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg">
              <span>Get Started</span>
              <svg
                className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                ></path>
              </svg>
            </button>
          </div>
        </div>

        {/* Phone Preview */}
        <div className="w-full lg:w-1/2 flex items-center justify-center relative animate-fade-in-delay">
          <div className="relative transform hover:scale-105 transition-transform duration-700 ease-out">
            {/* Phone Device */}
            <div className="relative w-[320px] h-[640px] bg-black rounded-[3rem] p-3 shadow-2xl shadow-pink-500/20">
              {/* Screen */}
              <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden relative">
                {/* Video Content */}
                <video
                  src="https://res.cloudinary.com/debcfaccq/video/upload/v1751058191/Untitled_design_zgl0lx.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                />

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>

                {/* QR Code */}
                <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-xl border border-pink-100 rounded-2xl shadow-2xl p-3 animate-bounce">
                  <div className="w-20 h-20 rounded-xl flex items-center justify-center">
                    <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
                      {/* Simple QR Pattern */}
                      <Image
                        src="/images/qr-perfectskin-pink-transparent.png"
                        alt="QR Code"
                        width={80}
                        height={80}
                        className="rounded-md"
                        style={{ backgroundColor: "transparent" }}
                      />
                    </div>
                  </div>
                  {/* Status Indicator */}
                  <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                    <svg
                      className="w-3 h-3 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      ></path>
                    </svg>
                  </div>
                </div>

                {/* Scan Indicator */}
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-white/25 backdrop-blur-md px-4 py-2 rounded-full border border-white/30">
                  <div className="flex items-center space-x-2 text-white">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">Scan to Analyze</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 w-12 h-12 bg-gradient-to-br from-pink-400 to-rose-400 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
              <span className="text-white text-xl">✨</span>
            </div>

            <div className="absolute -bottom-4 -left-4 w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center shadow-2xl animate-bounce">
              <span className="text-white text-lg">🔬</span>
            </div>

            <div className="absolute top-1/2 -left-8 w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-400 rounded-full flex items-center justify-center shadow-2xl animate-ping">
              <span className="text-white text-sm">💫</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white/50 to-transparent"></div>

      <style jsx>{`
        .animate-fade-in {
          animation: fadeIn 1s ease-out;
        }

        .animate-fade-in-delay {
          animation: fadeIn 1s ease-out 0.3s both;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
};

export default PremiumSkincareSection;
