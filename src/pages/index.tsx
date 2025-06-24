import Footer from "@/components/footer";
import Header from "@/components/header";
import PremiumSkincareSection from "@/components/PremiumSkincareSection";
import WebPageTitle from "@/components/webpagetitle";
import Image from "next/image";

export default function Home() {
  return (
    <>
      <WebPageTitle title="Perfect Skin By BeautyHub" />
      <Header />
      <PremiumSkincareSection />

      {/* Steps */}
      <section className="bg-white py-12 px-4 md:px-12 text-center">
        <h2 className="text-2xl md:text-4xl font-bold mb-4">
          YOUR PERSONAL SKIN ANALYSIS IN THREE EASY STEPS
        </h2>
        <p className="text-gray-600 text-base md:text-lg mb-10 max-w-2xl mx-auto">
          Discover your skin’s unique needs and get personalized product
          recommendations in minutes.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Step 1 */}
          <div className="flex flex-col items-center">
            <div className="relative w-64 h-96">
              <Image
                src="/images/step-1.png"
                alt="Step 1 - Upload Selfie"
                layout="fill"
                objectFit="contain"
              />
            </div>
            <p className="mt-6 text-lg font-semibold">
              UPLOAD OR TAKE A SELFIE
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Snap or upload a clear photo—no filters needed. Our AI reads
              natural skin features from front and side views.
            </p>
          </div>

          <div className="flex flex-col items-center">
            <div className="relative w-64 h-96">
              <Image
                src="/images/step-2.png"
                alt="Step 2 - Skin Analysis"
                layout="fill"
                objectFit="contain"
              />
            </div>
            <p className="mt-6 text-lg font-semibold">COMPLETE YOUR ANALYSIS</p>
            <p className="text-sm text-gray-600 mt-2">
              In seconds, the AI scans your face for up to 15 skin concerns,
              including texture, pores, acne, and dark spots.
            </p>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center">
            <div className="relative w-64 h-96">
              <Image
                src="/images/step-3.png"
                alt="Step 3 - Discover Routine"
                layout="fill"
                objectFit="contain"
              />
            </div>
            <p className="mt-6 text-lg font-semibold">DISCOVER YOUR ROUTINE</p>
            <p className="text-sm text-gray-600 mt-2">
              Receive a personalized skincare routine tailored to your skin’s
              unique needs, backed by advanced AI insights.
            </p>
          </div>
        </div>
      </section>

      {/* Behind the tech */}
      <section className="bg-white text-gray-800 py-12 px-6 md:px-12">
        <div className="max-w-5xl mx-auto space-y-12">
          {/* Title */}
          <div className="text-center space-y-2">
            <h2 className="text-3xl md:text-4xl font-bold text-[#f847b4]">
              Behind the Tech
            </h2>
            <p className="text-base md:text-lg text-gray-600">
              Advanced AI. Proven Accuracy. Personalized for You.
            </p>
          </div>

          {/* Highlights Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm md:text-base text-gray-700">
            <div className="p-4 bg-[#fef6fb] rounded-xl shadow-sm">
              <h3 className="font-semibold text-[#f847b4] mb-1">
                HD Skin Analysis
              </h3>
              <p>2× sharper AI for ultra-precise detection and diagnostics.</p>
            </div>

            <div className="p-4 bg-[#fef6fb] rounded-xl shadow-sm">
              <h3 className="font-semibold text-[#f847b4] mb-1">
                Targeted Zones
              </h3>
              <p>Focuses on T-zone, U-zone & more for personalized care.</p>
            </div>

            <div className="p-4 bg-[#fef6fb] rounded-xl shadow-sm">
              <h3 className="font-semibold text-[#f847b4] mb-1">AI Insights</h3>
              <p>50K+ skin images power 95%+ diagnostic accuracy.</p>
            </div>

            <div className="p-4 bg-[#fef6fb] rounded-xl shadow-sm">
              <h3 className="font-semibold text-[#f847b4] mb-1">
                Real-Time Results
              </h3>
              <p>Instant analysis, clinically validated by dermatologists.</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
