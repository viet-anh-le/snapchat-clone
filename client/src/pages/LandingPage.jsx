import React from "react";
import { Link } from "react-router-dom";
import { Button } from "antd";
import { ArrowRightOutlined, GithubOutlined, CameraOutlined } from "@ant-design/icons";

const LandingPage = () => {
  const teamMembers = [
    { name: "Alex", role: "Backend Lead", initials: "A" },
    { name: "Ben", role: "UI/UX", initials: "B" },
    { name: "Chloe", role: "Mobile Dev", initials: "C" },
    { name: "David", role: "Testing & Docs", initials: "D" },
  ];

  const techStack = [
    { name: 'React', logo: 'https://www.vectorlogo.zone/logos/reactjs/reactjs-icon.svg' },
    { name: 'Node.js', logo: 'https://www.vectorlogo.zone/logos/nodejs/nodejs-icon.svg' },
    { name: 'Firebase', logo: 'https://www.vectorlogo.zone/logos/firebase/firebase-icon.svg' },
    { name: 'Git', logo: 'https://www.vectorlogo.zone/logos/git-scm/git-scm-icon.svg' },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 selection:bg-blue-600 selection:text-white">
      
      {/* --- NAVBAR CHỈ CÓ LOGO --- */}
      <header className="bg-[#0f172a]/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50 w-full h-24">
        {/* flex items-center: Chỉ cần căn giữa theo chiều dọc */}
        {/* px-8: Cách lề trái một chút cho đẹp */}
        <nav className="w-full h-full px-8 flex items-center">
          
          {/* LOGO */}
          <div className="flex items-center gap-3 cursor-pointer hover:scale-105 transition-transform">
            <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
              <CameraOutlined className="text-white text-2xl" />
            </div>
            <span className="text-white text-2xl font-black tracking-tight">SnapProject</span>
          </div>
          {/* --- MENU (Dán vào giữa thẻ nav) --- */}
          {/* absolute left-1/2... : Giúp menu luôn nằm CHÍNH GIỮA màn hình */}
          {/* gap-12 xl:gap-24 : Khoảng cách thoáng (48px trên laptop, 96px trên màn to) */}
          <div className="hidden lg:flex absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 items-center gap-12 xl:gap-24 text-sm font-bold uppercase tracking-[0.2em] z-20 whitespace-nowrap">
            <a href="#features" className="text-slate-400 hover:text-white transition-all duration-300 hover:tracking-[0.25em]">
              Features
            </a>
            <a href="#tech" className="text-slate-400 hover:text-white transition-all duration-300 hover:tracking-[0.25em]">
              Tech Stack
            </a>
            <a href="#team" className="text-slate-400 hover:text-white transition-all duration-300 hover:tracking-[0.25em]">
              Team
            </a>
          </div>
        </nav>
      </header>

      {/* --- HERO SECTION --- */}
      {/* Các phần dưới vẫn giữ max-w-7xl để nội dung tập trung ở giữa, dễ đọc */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[150px] -z-10"></div>
        
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <h1 className="text-6xl md:text-8xl font-black mb-6 text-white leading-tight">
              Share Moments.<br />
              <span className="text-blue-500 underline decoration-blue-900/30">Fast & Secure.</span>
            </h1>
            <p className="text-xl text-slate-400 mb-10 max-w-lg leading-relaxed font-medium">
              Ứng dụng chia sẻ khoảnh khắc với công nghệ mã hóa hiện đại. 
              Hình ảnh tự xóa, không để lại dấu vết.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Link to="/signup">
                 <Button
                  type="primary"
                  size="large"
                  className="bg-blue-600 hover:bg-blue-500 text-white border-0 font-black h-14 px-10 rounded-2xl flex items-center transition-all shadow-xl shadow-blue-600/30"
                >
                  Bắt đầu ngay <ArrowRightOutlined className="ml-2" />
                </Button>
              </Link>
              <a href="https://github.com/AnNguyenVan123/BTL_web" target="_blank" rel="noopener noreferrer">
                <Button size="large" icon={<GithubOutlined />} className="font-bold h-14 px-8 rounded-xl border-2 border-slate-800 text-white hover:border-blue-500 bg-transparent transition-all">
                  Source Code
                </Button>
              </a>
            </div>
          </div>

          <div className="flex justify-center md:justify-end">
            <div className="relative group">
              <div className="absolute -inset-1 bg-blue-600 rounded-[3.5rem] blur opacity-10 group-hover:opacity-30 transition"></div>
              <div className="relative w-72 h-[580px] bg-[#0f172a] rounded-[3.5rem] p-4 border-[12px] border-slate-800 shadow-2xl">
                <div className="bg-[#1e293b] w-full h-full rounded-[2.2rem] flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="text-8xl mb-6 opacity-80 filter drop-shadow-[0_0_20px_rgba(37,99,235,0.3)]">📱</div>
                  <p className="font-black text-white text-2xl tracking-tighter uppercase mb-2">Snap Pro</p>
                  <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Encrypted Session</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- FEATURES --- */}
      <section id="features" className="py-32 bg-[#020617]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-20">
            <div>
              <h2 className="text-4xl font-black text-white uppercase italic">Tính năng <span className="text-blue-500">cốt lõi</span></h2>
            </div>
            <p className="text-slate-500 font-bold hidden md:block tracking-widest uppercase text-xs">Innovation / 2025</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard icon="📷" title="AR Filters" desc="Hiệu ứng thực tế ảo tăng cường xử lý mượt mà trên mọi thiết bị." />
            <FeatureCard icon="🔒" title="Vanish Mode" desc="Bảo mật tuyệt đối, tin nhắn và ảnh tự hủy sau khi người xem đóng ứng dụng." />
            <FeatureCard icon="☁️" title="Fast Sync" desc="Đồng bộ hóa dữ liệu thời gian thực trên nền tảng đám mây Firebase." />
          </div>
        </div>
      </section>

      {/* --- TECH STACK --- */}
      <section id="tech" className="py-32 bg-[#0f172a]/20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-black mb-20 text-white uppercase tracking-widest underline decoration-blue-600 underline-offset-8">Technology</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {techStack.map((tech) => (
              <div key={tech.name} className="p-10 bg-[#0f172a] rounded-[2rem] border border-slate-800 hover:border-blue-500 transition-all group cursor-default">
                <div className="h-16 w-16 mx-auto mb-6 bg-[#1e293b] rounded-2xl p-3 group-hover:bg-blue-600 transition-colors duration-300">
                   <img 
                    src={tech.logo} 
                    alt={tech.name} 
                    className="w-full h-full object-contain brightness-125 contrast-125" 
                   />
                </div>
                <p className="font-bold text-white tracking-wide">{tech.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- TEAM --- */}
      <section id="team" className="py-32">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-black text-center mb-20 text-white italic">The Creators</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
            {teamMembers.map((m, i) => (
              <div key={i} className="text-center group">
                <div className="w-32 h-32 rounded-[2.5rem] bg-[#1e293b] border-2 border-slate-800 flex items-center justify-center text-3xl font-black text-blue-400 mb-6 mx-auto group-hover:bg-blue-600 group-hover:text-white group-hover:-rotate-3 transition-all duration-300">
                  {m.initials}
                </div>
                <h3 className="font-black text-xl text-white mb-1">{m.name}</h3>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{m.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-16 text-center border-t border-slate-900 bg-[#020617]">
        <div className="text-xl font-bold text-white mb-4">📸 SnapProject</div>
        <p className="text-slate-600 text-[11px] font-bold uppercase tracking-[0.3em]">
          University Lab Project — 2025
        </p>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }) => (
  <div className="p-12 bg-[#0f172a] border border-slate-800 rounded-[3rem] hover:bg-[#1e293b] hover:border-blue-500/50 transition-all duration-300">
    <div className="text-5xl mb-8 opacity-90">{icon}</div>
    <h3 className="text-2xl font-black text-white mb-4 leading-tight">{title}</h3>
    <p className="text-slate-400 font-medium leading-relaxed">{desc}</p>
  </div>
);

export default LandingPage;