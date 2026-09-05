import React from 'react';
import {
  GraduationCap,
  BookOpen,
  Phone,
  Mail,
  Instagram,
  MessageSquare,
  ExternalLink,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Flame,
  Code2,
  CheckCircle2,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AboutPage: React.FC = () => {
  // Ordered courses as requested
  const courses = [
    { title: 'SSC-GD / CISF / AR / CRPF / BSF', category: 'Paramilitary & Central Armed Forces' },
    { title: 'Assam Police (AB/UB)', category: 'State Police Department' },
    { title: 'Assam Police — SI (AB/UB)', category: 'Sub-Inspector Cadet' },
    { title: 'Agniveer (GD, Technical)', category: 'Indian Army Cadres' },
    { title: 'Agniveer (Navy, Airforce, Nursing)', category: 'Defense & Air/Naval Wings' },
    { title: 'Forest Guard / Forester', category: 'Environment & Forest Cadre' },
    { title: 'SSC MTS / CHSL', category: 'Staff Selection Commission' },
    { title: 'ADRE — Grade III & IV', category: 'Assam Direct Recruitment' },
    { title: 'Forest Dept.', category: 'State Forest Services' },
    { title: 'RRB / TA-Army', category: 'Railways & Territorial Army' },
  ];

  // Social & community channels
  const socialLinks = [
    {
      title: 'Dikjyoti Coaching Institute',
      platform: 'Instagram',
      handle: '@dikjyoticoachinginstitute',
      url: 'https://www.instagram.com/dikjyoticoachinginstitute',
      desc: 'Official institute account for classroom notifications, exam alerts, and academic updates.',
      icon: Instagram,
      gradient: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
    },
    {
      title: 'Dikjyoti Physical Academy',
      platform: 'Instagram',
      handle: '@dikjyoti_physical_academy',
      url: 'https://www.instagram.com/dikjyoti_physical_academy',
      desc: 'Ground training drills, morning physical fitness sessions, endurance runs, and PST/PET prep.',
      icon: Flame,
      gradient: 'linear-gradient(135deg, #e1306c, #fd1d1d, #f56040)',
    },
    {
      title: 'App Developer',
      platform: 'Instagram',
      handle: '@shajamal.live',
      url: 'https://www.instagram.com/shajamal.live',
      desc: 'Technical developer profile & digital platform updates for Dikjyoti Online Test.',
      icon: Code2,
      gradient: 'linear-gradient(135deg, #3E2072, #5B2E9E, #F5A8C6)',
    },
    {
      title: 'Official WhatsApp Channel',
      platform: 'WhatsApp',
      handle: 'Dikjyoti Online Test & Academy',
      url: 'https://whatsapp.com/channel/0029Vb7I1544o7qTcRE9g338',
      desc: 'Join the broadcast channel for instant test schedules, weekly mock notifications, and study materials.',
      icon: MessageSquare,
      gradient: 'linear-gradient(135deg, #128c7e, #25d366)',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      {/* Masthead Header */}
      <div
        className="text-white p-6 sm:p-8 rounded-2xl border border-[#ECE7F5] shadow-xs relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #3E2072, #5B2E9E)' }}
      >
        <div className="max-w-2xl relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[#F5A8C6] border border-white/15 text-xs font-bold uppercase tracking-wider">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Official Academy & Contact Info</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            About Us & Contact
          </h1>

          <p className="text-xs sm:text-sm text-purple-100 leading-relaxed font-normal">
            Welcome to the official information center for Dikjyoti Coaching Institute.
            Find details on our offline physical classroom batches, courses offered, social channels,
            and direct helpline.
          </p>
        </div>

        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-8 translate-y-8">
          <GraduationCap className="w-64 h-64 text-[#F5A8C6]" />
        </div>
      </div>

      {/* 1. ABOUT THE INSTITUTE */}
      <section className="bg-white rounded-2xl border border-[#ECE7F5] p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center gap-3 border-b border-[#F0EDF7] pb-3">
          <div className="w-10 h-10 rounded-xl bg-[#EDE1FA] text-[#5B2E9E] flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#5B2E9E] uppercase tracking-wider">
              Section 01
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#241748]">
              About the Institute
            </h2>
          </div>
        </div>

        <div className="space-y-3 text-[#4A3E65] leading-relaxed text-xs sm:text-sm">
          <p>
            <strong className="text-[#241748] font-bold">Dikjyoti Coaching Institute</strong> is a premier competitive examination training institute dedicated to guiding aspirants across Assam toward career success in state and central government services.
          </p>
          <p>
            The institute prepares students across Assam for competitive government exams through <strong className="text-[#3E2072] font-bold">daily morning physical classes</strong> plus a <strong className="text-[#3E2072] font-bold">weekly online test on this app</strong>. This blended approach combines rigorous ground physical endurance with server-authoritative digital exam simulations, building both physical fitness and exam temperament.
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#FAF9FD] border border-[#ECE7F5]">
            <div className="w-8 h-8 rounded-lg bg-[#3E2072] text-[#F5A8C6] flex items-center justify-center shrink-0 mt-0.5">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#241748]">Daily Morning Physical Classes</h4>
              <p className="text-[11px] text-[#786D8F] mt-0.5 font-medium">
                Structured field conditioning, running drills, and physical standard training.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#FAF9FD] border border-[#ECE7F5]">
            <div className="w-8 h-8 rounded-lg bg-[#3E2072] text-[#F5A8C6] flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#241748]">Weekly App-Based Online Tests</h4>
              <p className="text-[11px] text-[#786D8F] mt-0.5 font-medium">
                Timed digital mock assessments, negative marking schemes, and state rank standing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. COURSES OFFERED */}
      <section className="bg-white rounded-2xl border border-[#ECE7F5] p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center gap-3 border-b border-[#F0EDF7] pb-3">
          <div className="w-10 h-10 rounded-xl bg-[#EDE1FA] text-[#5B2E9E] flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#5B2E9E] uppercase tracking-wider">
              Section 02
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#241748]">
              Courses Offered
            </h2>
          </div>
        </div>

        <p className="text-xs text-[#786D8F] font-medium">
          Dikjyoti Coaching Institute provides specialized preparation programs for the following competitive exams:
        </p>

        {/* Clear List of Courses */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {courses.map((course, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-3 rounded-xl bg-[#FAF9FD] border border-[#ECE7F5] hover:border-[#5B2E9E]/40 transition-colors"
            >
              <div className="w-6 h-6 rounded-lg bg-[#3E2072] text-[#F5A8C6] flex items-center justify-center text-[11px] font-bold shrink-0">
                {idx + 1}
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-[#241748] leading-snug">
                  {course.title}
                </h3>
                <p className="text-[10px] text-[#9B93A8] font-medium">{course.category}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Explicit Notice */}
        <div className="p-3.5 rounded-xl bg-[#FAF6FF] border border-[#EDE1FA] text-[#5B2E9E] flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-[#5B2E9E] shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed font-medium">
            <strong className="font-bold text-[#3E2072]">Important Notice: </strong>
            Daily morning physical classes are held alongside all these courses to ensure complete preparation.
          </div>
        </div>
      </section>

      {/* 3. SOCIAL MEDIA & COMMUNITY LINKS */}
      <section className="bg-white rounded-2xl border border-[#ECE7F5] p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center gap-3 border-b border-[#F0EDF7] pb-3">
          <div className="w-10 h-10 rounded-xl bg-[#EDE1FA] text-[#5B2E9E] flex items-center justify-center shrink-0">
            <Instagram className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#5B2E9E] uppercase tracking-wider">
              Section 03
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#241748]">
              Social Media & Community Channels
            </h2>
          </div>
        </div>

        <p className="text-xs text-[#786D8F] font-medium">
          Tap any channel below to open directly in Instagram or WhatsApp:
        </p>

        <div className="space-y-2.5">
          {socialLinks.map((item, idx) => {
            const Icon = item.icon;
            return (
              <a
                key={idx}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-[#ECE7F5] hover:border-[#5B2E9E] bg-[#FAF9FD] hover:bg-white transition-all shadow-2xs hover:shadow-xs"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-xs shrink-0"
                    style={{ background: item.gradient }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs sm:text-sm font-bold text-[#241748] group-hover:text-[#3E2072]">
                        {item.title}
                      </h3>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#EDE1FA] text-[#5B2E9E]">
                        {item.platform}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono font-medium text-[#786D8F]">
                      {item.handle}
                    </div>
                    <p className="text-[11px] text-[#9B93A8] mt-0.5 leading-normal">
                      {item.desc}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1 text-xs font-bold text-[#5B2E9E] group-hover:text-[#3E2072] transition-colors self-end sm:self-center">
                  <span>Open</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </a>
            );
          })}
        </div>
      </section>

      {/* 4. CONTACT DETAILS */}
      <section className="bg-white rounded-2xl border border-[#ECE7F5] p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center gap-3 border-b border-[#F0EDF7] pb-3">
          <div className="w-10 h-10 rounded-xl bg-[#EDE1FA] text-[#5B2E9E] flex items-center justify-center shrink-0">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#5B2E9E] uppercase tracking-wider">
              Section 04
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#241748]">
              Contact Details
            </h2>
          </div>
        </div>

        <p className="text-xs text-[#786D8F] font-medium">
          Have questions regarding batch admissions, syllabus, or online tests? Contact us directly:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Phone Dial Link */}
          <a
            href="tel:6002200319"
            className="group p-4 rounded-xl border border-[#ECE7F5] hover:border-[#2C9A5B] bg-[#FAF9FD] hover:bg-white transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#9B93A8]">
                  Direct Phone Helpline
                </span>
                <div className="text-base font-bold text-[#241748] font-mono group-hover:text-emerald-700 transition-colors">
                  6002200319
                </div>
              </div>
              <p className="text-[11px] text-[#786D8F]">
                Tap to dial immediately from your phone.
              </p>
            </div>

            <div className="pt-2.5 border-t border-[#ECE7F5] mt-2.5 flex items-center justify-between text-xs font-bold text-emerald-700 group-hover:underline">
              <span>Call Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </a>

          {/* Email Mailto Link */}
          <a
            href="mailto:dikjyoti786@gmail.com"
            className="group p-4 rounded-xl border border-[#ECE7F5] hover:border-[#5B2E9E] bg-[#FAF9FD] hover:bg-white transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-lg bg-[#3E2072] text-[#F5A8C6] flex items-center justify-center shadow-xs">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#9B93A8]">
                  Official Institute Email
                </span>
                <div className="text-sm font-bold text-[#241748] font-mono break-all group-hover:text-[#5B2E9E] transition-colors">
                  dikjyoti786@gmail.com
                </div>
              </div>
              <p className="text-[11px] text-[#786D8F]">
                Tap to compose an inquiry email.
              </p>
            </div>

            <div className="pt-2.5 border-t border-[#ECE7F5] mt-2.5 flex items-center justify-between text-xs font-bold text-[#5B2E9E] group-hover:underline">
              <span>Send Email</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </a>
        </div>
      </section>

      {/* Return Navigation */}
      <div className="pt-2 text-center">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#786D8F] hover:text-[#3E2072] transition-colors"
        >
          <span>← Return to Home Gateway</span>
        </Link>
      </div>
    </div>
  );
};
