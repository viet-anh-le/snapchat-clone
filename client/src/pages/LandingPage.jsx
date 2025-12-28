import Hero from "../components/pages/home/Hero";
import Features from "../components/pages/home/Features";
import Testimonials from "../components/pages/home/Testimonials";
import About from "../components/pages/home/About";
import CTA from "../components/pages/home/CTA";

const LandingPage = () => {
  return (
    <>
      <Hero />
      <Features />
      <Testimonials />
      <About />
      <CTA />
    </>
  );
};

export default LandingPage;
