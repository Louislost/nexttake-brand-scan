import { Link } from "react-router-dom";

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background h-[60px] flex items-center">
      <div className="container mx-auto px-4 sm:px-6">
        <Link to="/" className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <span className="text-white font-bold text-lg">NT</span>
          </div>
        </Link>
      </div>
    </header>
  );
};

export default Header;
