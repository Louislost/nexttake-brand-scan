import { Link } from "react-router-dom";
import nextTakeLogo from "@/assets/nextTakeLogo.png";

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background h-[60px] flex items-center">
      <div className="container mx-auto px-4 sm:px-6">
        <Link to="/" className="flex items-center">
          <img src={nextTakeLogo} alt="Next Take" className="h-12 w-12" />
        </Link>
      </div>
    </header>
  );
};

export default Header;
