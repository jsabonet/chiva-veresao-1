import Header from '@/components/layout/Header';
import HeroSection from '@/components/sections/HeroSection';
import FeaturedProducts from '@/components/sections/FeaturedProducts';
import BestSellers from '@/components/sections/BestSellers';
import AboutSection from '@/components/sections/AboutSection';
import Footer from '@/components/layout/Footer';

const Home = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <FeaturedProducts />
        <BestSellers />
        <AboutSection />
      </main>
      <Footer />
    </div>
  );
};

export default Home;