import Link from 'next/link';

// Extracted from PactPreview
const members = [
  { name: "Elias Vance", status: "VERIFIED", statusColor: "text-parchment", dot: "bg-foreground" },
  { name: "Clara Hayes", status: "PENDING PROOF", statusColor: "text-parchment-muted", dot: "border border-foreground" },
  { name: "Julian Roarke", status: "DEFAULTED", statusColor: "text-wax", dot: "bg-wax", strike: true },
];

function PactPreview() {
  return (
    <div className="bg-surface p-6 md:p-8 lg:p-16 flex items-center justify-center relative overflow-hidden">
      {/* Background decorative lines */}
      <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 opacity-20 pointer-events-none">
        <div className="col-start-2 row-span-full border-l border-rule" />
        <div className="col-start-5 row-span-full border-l border-rule" />
        <div className="row-start-3 col-span-full border-t border-rule" />
      </div>

      {/* The Contract UI Box */}
      <div className="w-full max-w-lg bg-background border border-rule shadow-[0_0_40px_rgba(0,0,0,0.8)] relative z-10 flex flex-col">
        {/* Header */}
        <div className="border-b border-rule p-4 md:p-6 flex justify-between items-baseline bg-surface/50">
          <div className="font-mono text-xs text-parchment-muted tracking-widest">
            DOCUMENT REF: 884-OMEGA
          </div>
          <div className="font-mono text-[10px] text-wax border border-primary px-2 py-1 tracking-widest">
            ENFORCEMENT ACTIVE
          </div>
        </div>

        <div className="p-6 md:p-8 flex flex-col gap-8">
          <div>
            <h2 className="font-display text-xl md:text-2xl mb-2">
              Advanced Neurobiology — Final Synthesis
            </h2>
            <p className="font-mono text-xs text-parchment-muted uppercase tracking-wider">
              Execution Deadline: 23:59:00 GMT TODAY
            </p>
          </div>

          {/* Stakes / Metrics */}
          <div className="grid grid-cols-2 border-y border-rule py-6 gap-6">
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[10px] text-parchment-muted tracking-widest">
                CAPITAL AT RISK
              </span>
              <span className="font-serif text-2xl md:text-3xl tabular-nums tracking-tight">
                $1,250.00
              </span>
            </div>
            <div className="flex flex-col gap-2 border-l border-rule pl-6">
              <span className="font-mono text-[10px] text-parchment-muted tracking-widest">
                SIGNATORIES
              </span>
              <span className="font-serif text-2xl md:text-3xl tabular-nums tracking-tight">
                4 / 4
              </span>
            </div>
          </div>

          {/* Signatory Roster */}
          <div className="flex flex-col gap-4">
            <div className="font-mono text-[10px] text-parchment-muted tracking-widest uppercase border-b border-rule pb-2">
              Tribunal Ledger
            </div>

            {members.map((member) => (
              <div key={member.name} className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`size-2 rounded-full ${member.dot}`} />
                  <span
                    className={`font-serif text-lg ${
                      member.strike ? "text-parchment-muted line-through decoration-primary" : ""
                    }`}
                  >
                    {member.name}
                  </span>
                </div>
                <span className={`font-mono text-xs tracking-widest ${member.statusColor}`}>
                  {member.status}
                </span>
              </div>
            ))}
          </div>

          {/* Evidence Block */}
          <div className="mt-2 border border-rule bg-surface p-1">
            <div className="border border-rule/50 relative flex items-center justify-center">
              <div className="absolute inset-0 bg-background/60 z-10 flex items-center justify-center p-4 text-center">
                <span className="font-mono text-xs text-parchment tracking-widest uppercase border border-foreground px-3 py-2 bg-background/80">
                  Awaiting Your Evidence
                </span>
              </div>
              <div className="bg-surface aspect-video w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Extracted from ManifestoSection
const steps = [
  {
    clause: "II",
    title: "Join the Tribunal",
    description:
      "Authenticate and either draft a new pact or accept a sworn invitation from an existing syndicate.",
  },
  {
    clause: "III",
    title: "Execute & Submit Proof",
    description:
      "Complete your study obligations and upload tangible, indisputable evidence — notes, photographs, or session logs.",
  },
  {
    clause: "IV",
    title: "Peer Validation",
    description:
      "Review and verify your peers' submissions. No self-reporting. The collective maintains integrity.",
  },
  {
    clause: "V",
    title: "The Reckoning",
    description:
      "The system audits the cycle. Leaderboards update. Defaulters are publicly identified. Consequences are automatic.",
  },
];

function ManifestoSection() {
  return (
    <section id="manifesto" className="border-t border-rule bg-background text-foreground z-10 relative">
      <div className="p-8 md:p-12 lg:p-24">
        <div className="font-mono text-xs tracking-widest text-wax mb-6 uppercase">
          The Protocol
        </div>
        <h2 className="font-display text-3xl md:text-4xl tracking-tight mb-16">
          How the Pact Binds You
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-rule">
          {steps.map((step) => (
            <div
              key={step.clause}
              className="bg-background p-8 md:p-12 flex flex-col gap-4"
            >
              <div className="font-mono text-[10px] text-wax tracking-widest uppercase">
                Clause {step.clause}
              </div>
              <h3 className="font-display text-xl md:text-2xl">{step.title}</h3>
              <p className="font-serif text-base text-parchment-muted leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HeroSection() {
  return (
    <div className="p-8 md:p-12 lg:p-24 flex flex-col justify-center relative z-10">
      <div className="max-w-[50ch]">
        <div className="font-mono text-xs tracking-widest text-wax mb-8 uppercase">
          Clause I: Absolute Commitment
        </div>
        <h1 className="font-display text-4xl md:text-5xl lg:text-7xl leading-[1.1] tracking-tight mb-8 text-balance">
          Failure carries <br />a tangible cost.
        </h1>
        <p className="text-lg lg:text-xl text-parchment-muted leading-relaxed mb-12 text-pretty font-serif">
          A binding protocol for mandatory academic execution. Stake capital alongside your peers.
          Submit indisputable photographic proof. Face the tribunal. There are no extensions, no
          excuses, and no refunds for default.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <Link href="/signup" className="bg-wax hover:bg-wax-deep text-parchment font-mono text-sm tracking-widest uppercase px-8 py-4 border border-primary transition-colors inline-block">
            Draft a Pact
          </Link>
          <div className="font-mono text-xs text-parchment-muted leading-relaxed max-w-[24ch]">
            By initiating, you consent to irrevocable capital forfeiture upon failure.
          </div>
        </div>
      </div>
    </div>
  );
}

function Navbar() {
  return (
    <nav className="px-6 md:px-8 py-6 border-b border-rule flex justify-between items-center shrink-0 relative z-10">
      <div className="font-display text-lg md:text-xl tracking-widest font-bold">
        STUDYPACT<span className="text-wax">.</span>
      </div>
      <div className="flex gap-4 md:gap-8 font-mono text-xs tracking-widest uppercase items-center">
        <a href="#manifesto" className="hidden md:inline text-parchment-muted hover:text-foreground transition-colors">
          The Manifesto
        </a>
        <Link
          href="/login"
          className="hidden sm:inline text-parchment-muted hover:text-foreground transition-colors"
        >
          Login
        </Link>
        <Link
          href="/dashboard"
          className="border border-rule px-4 py-2 hover:bg-foreground hover:text-background transition-colors font-mono text-xs tracking-widest uppercase"
        >
          Authenticate
        </Link>
      </div>
    </nav>
  );
}

function FooterSection() {
  return (
    <footer className="border-t border-rule px-8 py-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10 bg-background text-foreground">
      <div>
        <div className="font-display text-lg tracking-widest font-bold mb-2">
          STUDYPACT<span className="text-wax">.</span>
        </div>
        <p className="font-mono text-[10px] text-parchment-muted tracking-widest uppercase">
          Replace willpower with binding obligation.
        </p>
      </div>
      <div className="font-mono text-[10px] text-parchment-muted tracking-widest uppercase">
        © {new Date().getFullYear()} StudyPact Protocol. All rights enforced.
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative w-full overflow-hidden selection:bg-wax/20">
      <Navbar />
      <main className="flex-1 flex flex-col">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <HeroSection />
          <PactPreview />
        </div>
        <ManifestoSection />
      </main>
      <FooterSection />
    </div>
  );
}
