import { Link } from "react-router-dom";

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-white font-bold text-lg">NT</span>
            </div>
            <span className="text-2xl font-bold">Next Take</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/about" className="text-foreground hover:text-primary transition-colors">
              About
            </Link>
            <Link to="/contact" className="text-foreground hover:text-primary transition-colors">
              Contact
            </Link>
            <Link 
              to="/" 
              className="px-5 py-2.5 rounded-full bg-secondary hover:bg-secondary/80 text-foreground font-medium transition-all hover:scale-105"
            >
              Start New Scan
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
