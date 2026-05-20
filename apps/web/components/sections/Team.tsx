import { Reveal } from "../Reveal";

type Member = {
  name: string;
  initials: string;
  title: string;
  color: string;
  text: string;
  bio: string;
  linkedin: string;
};

const TEAM: Member[] = [
  {
    name: "Ephraim Byiringiro",
    initials: "EB",
    title: "Chief Executive Officer",
    color: "#00C9B1",
    text: "#08111F",
    bio: "Ephraim is a Rwandan entrepreneur and engineer with a background in electronic hardware and medical devices. A participant in the Young Innovation Leaders Fellowship and an active voice in African AI governance, he brings a builder's mindset to WeShare — turning a simple idea about shared mobility into infrastructure for East Africa's next chapter of connectivity.",
    linkedin: "https://www.linkedin.com/in/ephraimb/",
  },
  {
    name: "Cynthia Mujyambere",
    initials: "CM",
    title: "Chief Technology Officer",
    color: "#FF6B35",
    text: "#FFFFFF",
    bio: "Cynthia is a Cornell University Information Science graduate with experience at Microsoft and in academic research. She leads WeShare's technical vision — from the mobile app architecture to the backend infrastructure — driven by a belief that technology designed specifically for African users can scale across the continent and create lasting impact.",
    linkedin: "https://www.linkedin.com/in/cynthiamujyambere/",
  },
  {
    name: "Benjamin Masengesho",
    initials: "BM",
    title: "Chief Operating Officer",
    color: "#F5C842",
    text: "#08111F",
    bio: "Benjamin is a Business Administration graduate from the African Leadership University, Rwanda's premier institution for next-generation African leaders. With a background in marketing and organizational leadership, he oversees the systems that keep WeShare running — from driver onboarding to partnerships — bringing the operational discipline that turns a great product into a reliable service people can depend on.",
    linkedin: "https://www.linkedin.com/in/benjamin-masengesho-3034332a3/",
  },
];

export function Team() {
  return (
    <section id="team" className="ws-section relative">
      <div className="ws-container">
        <Reveal>
          <div className="text-center">
            <span className="ws-eyebrow">Team</span>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl md:text-5xl">
              Meet the team behind WeShare.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-white/65">
              A small team building a better way to move across Rwanda — and
              soon, the rest of East Africa.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TEAM.map((m, i) => (
            <Reveal key={m.name} delay={(i + 1) * 100}>
              <article className="ws-card flex h-full flex-col items-center p-8 text-center">
                <div
                  aria-hidden="true"
                  className="flex h-24 w-24 items-center justify-center rounded-full font-black"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, ${m.color}, ${shade(m.color, -25)})`,
                    color: m.text,
                    fontSize: 30,
                    boxShadow: `0 12px 36px ${m.color}33`,
                  }}
                >
                  {m.initials}
                </div>
                <h3 className="mt-5 text-lg font-black tracking-tight text-white">
                  {m.name}
                </h3>
                <p className="mt-1 text-sm font-semibold text-white/60">{m.title}</p>
                <p className="mt-5 text-sm leading-relaxed text-white/70">
                  {m.bio}
                </p>
                <a
                  href={m.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${m.name} on LinkedIn`}
                  className="ws-li-pill mt-6"
                >
                  <LinkedInIcon />
                  LinkedIn
                </a>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function LinkedInIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="#0A66C2"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M20.452 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.356V9h3.414v1.561h.048c.476-.9 1.637-1.852 3.37-1.852 3.601 0 4.266 2.37 4.266 5.455v6.288ZM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124ZM7.114 20.452H3.558V9h3.556v11.452ZM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.226.792 24 1.771 24h20.451C23.2 24 24 23.226 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003Z" />
    </svg>
  );
}

function shade(hex: string, percent: number): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return hex;
  const num = parseInt(clean, 16);
  const r = clamp((num >> 16) + Math.round((255 * percent) / 100));
  const g = clamp(((num >> 8) & 0xff) + Math.round((255 * percent) / 100));
  const b = clamp((num & 0xff) + Math.round((255 * percent) / 100));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(255, n));
}

export default Team;
