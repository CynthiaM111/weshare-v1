import { Reveal } from "../Reveal";
import { SectionLabel } from "../SectionLabel";

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
    <section id="team" className="ws-section ws-bg-slate">
      <div className="ws-container">
        <Reveal>
          <SectionLabel>Team</SectionLabel>
          <h2 className="ws-headline ws-headline-lg mt-4 max-w-xl">
            The people building WeShare.
          </h2>
          <p className="ws-lead mt-4 max-w-lg">
            A small team in Rwanda working on transport people can actually afford.
          </p>
        </Reveal>

        <div className="mt-12 divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {TEAM.map((m, i) => (
            <Reveal key={m.name} delay={(i + 1) * 60}>
              <article className="grid gap-4 py-8 sm:grid-cols-[minmax(0,220px)_1fr_auto] sm:items-start sm:gap-8 sm:py-10">
                <div>
                  <h3 className="font-display text-xl font-bold text-white">{m.name}</h3>
                  <p className="mt-1 text-sm font-medium text-teal">{m.title}</p>
                </div>
                <p className="text-sm leading-relaxed text-white/60 sm:max-w-xl">{m.bio}</p>
                <a
                  href={m.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${m.name} on LinkedIn`}
                  className="ws-li-pill self-start sm:mt-1"
                >
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

export default Team;
