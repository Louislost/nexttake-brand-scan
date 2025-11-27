import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import BrandDiagnosticForm from "@/components/BrandDiagnosticForm";
import AnimatedBackground from "@/components/AnimatedBackground";

const Index = () => {
  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />
      <Header />
      <main className="pb-24 relative z-10">
        <HeroSection />
        <div className="container mx-auto px-4">
          <BrandDiagnosticForm />
        </div>
      </main>
    </div>
  );
};

export default Index;
