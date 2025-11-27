const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-background">
      {/* Blob 1 - Soft Blue */}
      <div
        className="absolute top-[10%] left-[15%] w-[500px] h-[500px] rounded-full blur-3xl opacity-40 animate-blob-float-1"
        style={{ background: `hsl(var(--blob-blue))` }}
      />
      
      {/* Blob 2 - Violet */}
      <div
        className="absolute top-[40%] right-[10%] w-[600px] h-[600px] rounded-full blur-3xl opacity-40 animate-blob-float-2"
        style={{ background: `hsl(var(--blob-violet))` }}
      />
      
      {/* Blob 3 - Peach */}
      <div
        className="absolute bottom-[15%] left-[25%] w-[550px] h-[550px] rounded-full blur-3xl opacity-50 animate-blob-float-3"
        style={{ background: `hsl(var(--blob-peach))` }}
      />
      
      {/* Blob 4 - Mint */}
      <div
        className="absolute bottom-[25%] right-[20%] w-[450px] h-[450px] rounded-full blur-3xl opacity-40 animate-blob-float-1 animation-delay-2000"
        style={{ background: `hsl(var(--blob-mint))` }}
      />
      
      {/* Blob 5 - Soft Blue (Secondary) */}
      <div
        className="absolute top-[60%] left-[50%] w-[400px] h-[400px] rounded-full blur-3xl opacity-35 animate-subtle-pulse"
        style={{ background: `hsl(var(--blob-blue))` }}
      />
    </div>
  );
};

export default AnimatedBackground;
