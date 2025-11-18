const HeroSection = () => {
  return (
    <section className="pt-32 pb-12 px-4 animate-fade-in">
      <div className="container mx-auto max-w-4xl text-left">
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-black mb-6 leading-[1.1] uppercase">
          <span className="inline-block bg-secondary px-4 py-2">
            Brand Awareness &
          </span>
          <br />
          <span className="inline-block bg-secondary px-4 py-2 ml-8 md:ml-16">
            Influencer Readiness
          </span>
          <br />
          <span className="inline-block bg-secondary px-4 py-2">
            Diagnostic
          </span>
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl">
          Enter your brand information below to generate your instant analysis.
        </p>
      </div>
    </section>
  );
};

export default HeroSection;
