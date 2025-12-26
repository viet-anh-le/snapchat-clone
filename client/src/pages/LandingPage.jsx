import React from "react";
import { Link } from "react-router-dom";
import { Button } from "antd";
import { ArrowRightOutlined, GithubOutlined } from "@ant-design/icons";

const LandingPage = () => {
  const teamMembers = [
    { name: "Alex", role: "Backend Lead", initials: "A" },
    { name: "Ben", role: "UI/UX", initials: "B" },
    { name: "Chloe", role: "Mobile Dev", initials: "C" },
    { name: "David", role: "Testing & Docs", initials: "D" },
  ];

  const techStack = [
    {
      name: "React",
      logo: "https://www.vectorlogo.zone/logos/reactjs/reactjs-icon.svg",
    },
    {
      name: "Node.js",
      logo: "https://www.vectorlogo.zone/logos/nodejs/nodejs-icon.svg",
    },
    {
      name: "Firebase",
      logo: "https://www.vectorlogo.zone/logos/firebase/firebase-icon.svg",
    },
    {
      name: "Git",
      logo: "https://www.vectorlogo.zone/logos/git-scm/git-scm-icon.svg",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-800 selection:bg-black selection:text-[#fffc00]">
      <section className="relative py-12 overflow-hidden bg-[#fffc00]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <h1 className="text-5xl md:text-7xl font-black mb-4 text-black leading-tight tracking-tight">
              Share Moments.
              <br />
              <span className="underline decoration-black decoration-4">
                No Pressure.
              </span>
            </h1>
            <p className="text-lg text-slate-800 mb-8 max-w-lg leading-snug font-medium">
              (Student Project Edition)
              <br />
              Dự án xây dựng ứng dụng chia sẻ ảnh tự hủy vui nhộn bởi nhóm 4
              sinh viên.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Link to="/signup">
                <Button
                  type="primary"
                  size="large"
                  className="bg-black hover:bg-slate-800! text-white border-0 font-bold h-12 px-8 rounded-xl flex items-center transition-all shadow-lg shadow-black/20"
                >
                  Bắt đầu ngay <ArrowRightOutlined className="ml-2" />
                </Button>
              </Link>
              <a
                href="https://github.com/AnNguyenVan123/BTL_web"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  size="large"
                  icon={<GithubOutlined />}
                  className="font-bold h-12 px-6 rounded-xl border-2 border-black text-black hover:bg-black hover:text-white bg-transparent transition-all"
                >
                  Source Code
                </Button>
              </a>
            </div>
          </div>

          <div className="flex justify-center md:justify-end">
            <div className="relative group scale-90 md:scale-100">
              <div className="absolute -inset-1 bg-white rounded-[3rem] blur opacity-40 group-hover:opacity-60 transition"></div>
              <div className="relative w-64 h-[500px] bg-black rounded-[3rem] p-3 border-4 border-black shadow-xl">
                <div className="bg-white w-full h-full rounded-[2.2rem] flex flex-col items-center justify-center relative overflow-hidden border border-slate-200">
                  <div className="text-7xl mb-4 opacity-100 filter drop-shadow-md">
                    📷
                  </div>
                  <div className="w-14 h-14 bg-[#fffc00] rounded-xl flex items-center justify-center mb-3 shadow-sm">
                    <span className="text-2xl">👻</span>
                  </div>
                  <p className="font-black text-black text-xl tracking-tight uppercase mb-1">
                    SnapProject
                  </p>
                  <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                    Student Edition
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-10">
            <div>
              <h2 className="text-3xl font-black text-black uppercase tracking-tight">
                Key Features{" "}
                <span className="text-[#eab308] underline decoration-wavy decoration-2">
                  Built
                </span>
              </h2>
            </div>
            <p className="text-slate-400 font-bold hidden md:block tracking-wider uppercase text-xs">
              Project / 2025
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              icon="📷"
              title="AR Filters"
              desc="Hiệu ứng thực tế ảo tăng cường cơ bản (Basic implementation)."
            />
            <FeatureCard
              icon="⏱️"
              title="Disappearing"
              desc="Tin nhắn và hình ảnh tự động biến mất sau khi xem."
            />
            <FeatureCard
              icon="🌍"
              title="24h Stories"
              desc="Chia sẻ câu chuyện trong ngày, hiển thị trong vòng 24 giờ."
            />
          </div>
        </div>
      </section>

      <section id="tech" className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-black mb-10 text-black uppercase tracking-wider">
            Tech Stack
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {techStack.map((tech) => (
              <div
                key={tech.name}
                className="p-6 bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all group cursor-default border border-slate-100"
              >
                <div className="h-12 w-12 mx-auto mb-4 transition-transform duration-300 group-hover:scale-110">
                  <img
                    src={tech.logo}
                    alt={tech.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="font-bold text-black tracking-normal text-sm">
                  {tech.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="team" className="py-16 bg-[#fffc00]/10">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-black text-center mb-10 text-black tracking-tight">
            Meet the Team
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {teamMembers.map((m, i) => (
              <div key={i} className="text-center group">
                <div className="w-24 h-24 rounded-full bg-[#fffc00] border-4 border-white shadow-md flex items-center justify-center text-2xl font-black text-black mb-4 mx-auto group-hover:scale-105 transition-all duration-300">
                  {m.initials}
                </div>
                <h3 className="font-black text-lg text-black mb-1">{m.name}</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {m.role}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }) => (
  <div className="p-6 bg-white rounded-3xl hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-center border border-transparent hover:border-[#fffc00]">
    <div className="text-4xl mb-4 bg-[#fffc00] w-16 h-16 mx-auto flex items-center justify-center rounded-2xl">
      {icon}
    </div>
    <h3 className="text-lg font-black text-black mb-2 tracking-tight">
      {title}
    </h3>
    <p className="text-slate-600 font-medium leading-relaxed text-sm">{desc}</p>
  </div>
);

export default LandingPage;
