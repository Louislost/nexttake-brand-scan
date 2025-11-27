import { Link } from "react-router-dom";
import nextTakeLogo from "@/assets/nextTakeLogo.png";

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/80 border-b border-border/50 h-[70px] flex items-center shadow-sm transition-all duration-300">
      <div className="container mx-auto px-6 sm:px-8">
        <Link to="/" className="flex items-center group">
          <img 
            src={nextTakeLogo} 
            alt="Next Take" 
            className="h-12 w-12 transition-transform duration-300 group-hover:scale-105" 
          />
        </Link>
      </div>
    </header>
  );
};

export default Header;
