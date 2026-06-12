import { Reveal } from "../Reveal";

type Member = {
  name: string;
  title: string;
  bio: string;
  linkedin: string;
};

const TEAM: Member[] = [
  {
    name: "Ephraim Byiringiro",
    title: "Chief Executive Officer",
    bio: "Rwandan entrepreneur and engineer with a background in electronic hardware and medical devices. Leads WeShare's vision for shared mobility across East Africa.",
    linkedin: "https://www.linkedin.com/in/ephraimb/",
  },
  {
    name: "Cynthia Mujyambere",
    title: "Chief Technology Officer",
    bio: "Cornell Information Science graduate with experience at Microsoft and in research. Builds WeShare's mobile app, backend, and internal tools.",
    linkedin: "https://www.linkedin.com/in/cynthiamujyambere/",
  },
  {
    name: "Benjamin Masengesho",
    title: "Chief Operating Officer",
    bio: "Business Administration graduate from African Leadership University. Runs driver onboarding, partnerships, and day-to-day operations in Rwanda.",
    linkedin: "https://www.linkedin.com/in/benjamin-masengesho-3034332a3/",
  },
];

export function Team() {
  return (
    <section id="team" className="ws-section border-t border-white/[0.06]">
      <div className="ws-container">
        <Reveal>
          <div className="max-w-2xl">
            <span className="ws-eyebrow">Team</span>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
              The people building WeShare.
            </h2>
            <p className="mt-4 text-base text-white/65">
              A small team in Rwanda working on transport people can actually afford.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.08] md:grid-cols-3">
          {TEAM.map((m, i) => (
            <Reveal key={m.name} delay={(i + 1) * 80}>
              <article className="flex h-full flex-col bg-[#08111F] p-6 sm:p-7">
                <p className="text-lg font-black tracking-tight text-white">{m.name}</p>
                <p className="mt-1 text-sm font-medium text-teal">{m.title}</p>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-white/65">{m.bio}</p>
                <a
                  href={m.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${m.name} on LinkedIn`}
                  className="ws-li-pill mt-6 self-start"
                >
                  LinkedIn →
                </a>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Team;
