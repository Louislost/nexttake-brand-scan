const HeroSection = () => {
  return (
    <section className="pt-32 pb-12 px-4 animate-fade-in">
      <div className="container mx-auto max-w-4xl text-center">
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight">
          Brand Awareness &<br />
          Influencer Readiness<br />
          <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Diagnostic
          </span>
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
          Enter your brand information below to generate your instant analysis.
        </p>
      </div>
    </section>
  );
};

export default HeroSection;
