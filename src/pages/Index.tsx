import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import BrandDiagnosticForm from "@/components/BrandDiagnosticForm";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-secondary/20">
      <Header />
      <main className="pb-20">
        <HeroSection />
        <div className="container mx-auto px-4">
          <BrandDiagnosticForm />
        </div>
      </main>
    </div>
  );
};

export default Index;
