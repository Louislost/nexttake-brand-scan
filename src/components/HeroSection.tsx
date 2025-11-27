const HeroSection = () => {
  return (
    <section className="pt-36 pb-16 px-4 animate-fade-in">
      <div className="container mx-auto max-w-5xl text-center">
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold mb-8 leading-tight tracking-tight">
          <span className="text-primary">Brand Awareness</span>
          {" & "}
          <span className="text-foreground">Influencer Readiness</span>
          <br />
          <span className="text-foreground">Diagnostic</span>
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto font-light">
          Enter your brand information below to generate your instant analysis.
        </p>
      </div>
    </section>
  );
};
export default HeroSection;