import { DATA } from "../../layouts/constants";
import Button from "./Button";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <section className="relative pt-24 pb-20 lg:pt-32 lg:pb-32 overflow-hidden bg-slate-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full background-image: radial-gradient(circle at center, var(--tw-gradient-stops)) from-yellow-200/40 via-slate-50 to-slate-50 dark:from-yellow-500/20 dark:via-gray-900 dark:to-gray-900"></div>
        <img
          src="https://picsum.photos/1920/1080?blur=4"
          alt="Background"
          className="w-full h-full object-cover opacity-15 dark:opacity-20 mix-blend-overlay"
        />
      </div>

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-slate-900 dark:text-white mb-6 leading-tight">
          <span className="block">Kết nối Cảm Xúc,</span>
          <span className="text-transparent bg-clip-text bg-linear-to-r from-yellow-500 to-pink-600 dark:from-yellow-400 dark:to-pink-500">
            Chia sẻ Khoảnh Khắc
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-600 dark:text-gray-300 mb-10 leading-relaxed">
          {DATA.hero.subheadline}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/signup">
            <Button
              variant="primary"
              className="w-full sm:w-auto text-lg px-8 py-4 font-bold shadow-lg shadow-yellow-500/20"
            >
              {DATA.hero.ctaPrimary}
            </Button>
          </Link>
          <Link to="https://github.com/AnNguyenVan123/BTL_web">
            <Button
              variant="outline"
              className="w-full sm:w-auto text-lg px-8 py-4 bg-white/50 hover:bg-white dark:bg-transparent dark:text-white dark:border-white/20 dark:hover:bg-white/10"
            >
              {DATA.hero.ctaSecondary}
            </Button>
          </Link>
        </div>

        <div className="mt-20 relative mx-auto max-w-4xl">
          <div className="relative rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 p-2 backdrop-blur-md shadow-2xl dark:shadow-none">
            <img
              src="https://picsum.photos/1200/600"
              alt="App Screenshot"
              className="rounded-xl w-full h-auto opacity-100 dark:opacity-90"
            />
            <div className="absolute -top-10 -left-10 w-24 h-24 bg-yellow-400 dark:bg-yellow-500 rounded-full blur-3xl opacity-30 dark:opacity-20 mix-blend-multiply dark:mix-blend-normal"></div>
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-pink-400 dark:bg-pink-500 rounded-full blur-3xl opacity-30 dark:opacity-20 mix-blend-multiply dark:mix-blend-normal"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
