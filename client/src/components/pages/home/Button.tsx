import React from "react";
const Button = ({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline";
}) => {
  const baseStyles =
    "inline-flex items-center justify-center px-6 py-3 rounded-full font-medium transition-all duration-300 transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variants = {
    primary:
      "bg-yellow-400 text-black hover:bg-yellow-300 focus:ring-yellow-400 shadow-lg shadow-yellow-400/30 border border-transparent",
    secondary:
      "bg-white text-gray-900 hover:bg-gray-50 focus:ring-gray-200 border border-gray-200 shadow-md",
    outline: "bg-transparent border hover:bg-white/10",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
