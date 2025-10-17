import { Marquee } from "@/components/magicui/marquee"
import { Shield, Lock, AlertTriangle, Zap, BadgeCheck, Link2 } from "lucide-react"

const painPoints = [
  {
    icon: AlertTriangle,
    title: "Bridge Hacks are Rising",
    body: "Over $2.5B stolen from cross-chain bridges in the last 2 years. Centralized bridges are honeypots for hackers.",
    type: "problem" as const
  },
  {
    icon: Lock,
    title: "Custody Risks Everywhere",
    body: "Traditional bridges require you to trust third parties with your assets. Your keys, their coins.",
    type: "problem" as const
  },
  {
    icon: Shield,
    title: "Atomic Swaps Change Everything",
    body: "Either both sides complete or neither does. No middle-man, no custody, no trust required. Pure cryptographic security.",
    type: "solution" as const
  },
  {
    icon: Link2,
    title: "EVM ↔ Stacks Finally Connected",
    body: "First trustless atomic swap protocol connecting Ethereum ecosystem with Bitcoin's smart contract layer via Stacks.",
    type: "solution" as const
  },
  {
    icon: BadgeCheck,
    title: "Non-Custodial by Design",
    body: "You control your private keys throughout the entire swap. Assets never leave your wallet until the swap completes.",
    type: "solution" as const
  },
  {
    icon: Zap,
    title: "The Future of Cross-Chain",
    body: "No wrapped tokens, no liquidity pools, no MEV. Just direct peer-to-peer atomic swaps across chains.",
    type: "solution" as const
  },
]

const problems = painPoints.filter(p => p.type === "problem")
const solutions = painPoints.filter(p => p.type === "solution")

const PainPointCard = ({
  icon: Icon,
  title,
  body,
  type,
}: {
  icon: React.ElementType
  title: string
  body: string
  type: "problem" | "solution"
}) => {
  const isProblem = type === "problem"
  const gradient = isProblem
    ? "from-red-500/10 to-red-600/5"
    : "from-green-500/10 to-emerald-600/5"
  const borderColor = isProblem ? "border-red-500/20" : "border-green-500/20"
  const iconColor = isProblem ? "text-red-400" : "text-green-400"
  const glowColor = isProblem
    ? "from-red-500/10 to-transparent"
    : "from-green-500/10 to-transparent"

  return (
    <div className={`relative w-full max-w-sm overflow-hidden rounded-3xl border ${borderColor} bg-gradient-to-b ${gradient} p-8 shadow-[0px_2px_0px_0px_rgba(255,255,255,0.1)_inset]`}>
      <div className={`absolute -top-5 -left-5 -z-10 h-40 w-40 rounded-full bg-gradient-to-b ${glowColor} blur-md`}></div>

      <div className={`mb-4 inline-flex rounded-full p-3 ${isProblem ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
        <Icon className={`h-6 w-6 ${iconColor}`} />
      </div>

      <h3 className="mb-3 text-xl font-bold text-white">{title}</h3>
      <p className="text-white/70 leading-relaxed">{body}</p>
    </div>
  )
}

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="mb-24">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mx-auto max-w-[640px]">
          <div className="flex justify-center">
            <button
              type="button"
              className="group relative z-[60] mx-auto rounded-full border border-white/20 bg-white/5 px-6 py-1 text-xs backdrop-blur transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-100 md:text-sm"
            >
              <div className="absolute inset-x-0 -top-px mx-auto h-0.5 w-1/2 bg-gradient-to-r from-transparent via-orange-500 to-transparent shadow-2xl transition-all duration-500 group-hover:w-3/4"></div>
              <div className="absolute inset-x-0 -bottom-px mx-auto h-0.5 w-1/2 bg-gradient-to-r from-transparent via-orange-500 to-transparent shadow-2xl transition-all duration-500 group-hover:h-px"></div>
              <span className="relative text-white">Why SunnySwap</span>
            </button>
          </div>
          <h2 className="from-foreground/60 via-foreground to-foreground/60 dark:from-muted-foreground/55 dark:via-foreground dark:to-muted-foreground/55 mt-5 bg-gradient-to-r bg-clip-text text-center text-4xl font-semibold tracking-tighter text-transparent md:text-[54px] md:leading-[60px] relative z-10">
            The Space Needs This
          </h2>

          <p className="mt-5 relative z-10 text-center text-lg text-zinc-400">
            Cross-chain bridges are broken. Atomic swaps fix them—no custody, no trust, just cryptography.
          </p>
        </div>

        <div className="my-16 flex max-h-[738px] justify-center gap-6 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)]">
          <div>
            <Marquee pauseOnHover vertical className="[--duration:25s]">
              {problems.map((point, idx) => (
                <PainPointCard key={idx} {...point} />
              ))}
            </Marquee>
          </div>

          <div className="hidden md:block">
            <Marquee reverse pauseOnHover vertical className="[--duration:30s]">
              {solutions.map((point, idx) => (
                <PainPointCard key={idx} {...point} />
              ))}
            </Marquee>
          </div>

          <div className="hidden lg:block">
            <Marquee pauseOnHover vertical className="[--duration:35s]">
              {[...painPoints].reverse().map((point, idx) => (
                <PainPointCard key={idx} {...point} />
              ))}
            </Marquee>
          </div>
        </div>

        <div className="-mt-8 flex justify-center">
          <a href="/app" className="group relative inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-black/50 px-6 py-3 text-sm font-medium text-white transition-all hover:border-orange-500/60 hover:bg-orange-500/10 active:scale-95">
            <div className="absolute inset-x-0 -top-px mx-auto h-px w-3/4 bg-gradient-to-r from-transparent via-orange-500/40 to-transparent"></div>
            <div className="absolute inset-x-0 -bottom-px mx-auto h-px w-3/4 bg-gradient-to-r from-transparent via-orange-500/40 to-transparent"></div>
            <Zap className="h-4 w-4 text-orange-500" />
            Start Swapping
          </a>
        </div>
      </div>
    </section>
  )
}
