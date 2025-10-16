"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import { Shield, Zap, Lock, GitBranch, RefreshCw, Coins } from "lucide-react"

export default function Features() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })

  const features = [
    {
      icon: Shield,
      title: "Trustless Security",
      description: "Hash Time-Locked Contracts ensure atomic execution—both sides complete or neither does. No trust required.",
      gradient: "from-orange-500/20 to-red-500/20",
      iconColor: "text-orange-400"
    },
    {
      icon: Lock,
      title: "Non-Custodial",
      description: "Your keys, your coins. Assets never leave your wallet until the swap cryptographically completes.",
      gradient: "from-blue-500/20 to-cyan-500/20",
      iconColor: "text-blue-400"
    },
    {
      icon: GitBranch,
      title: "Cross-Chain Native",
      description: "Seamlessly swap between EVM chains and Stacks. No wrapped tokens, no liquidity pools needed.",
      gradient: "from-purple-500/20 to-pink-500/20",
      iconColor: "text-purple-400"
    },
    {
      icon: Zap,
      title: "Zero Middlemen",
      description: "Direct peer-to-peer swaps with no intermediaries. Pure decentralization at its finest.",
      gradient: "from-green-500/20 to-emerald-500/20",
      iconColor: "text-green-400"
    },
    {
      icon: RefreshCw,
      title: "Auto-Refund",
      description: "If a swap doesn't complete within the timelock, funds automatically return to both parties.",
      gradient: "from-yellow-500/20 to-orange-500/20",
      iconColor: "text-yellow-400"
    },
    {
      icon: Coins,
      title: "Transparent Pricing",
      description: "Only pay network gas fees. No protocol fees, no hidden costs, no MEV extraction.",
      gradient: "from-indigo-500/20 to-blue-500/20",
      iconColor: "text-indigo-400"
    }
  ]

  return (
    <section id="features" className="relative overflow-hidden py-24 sm:py-32">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 bg-orange-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      <div ref={ref} className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
            Why Choose SunnySwap
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Built on atomic swap technology, SunnySwap eliminates the risks of traditional cross-chain bridges
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className={`relative group p-6 rounded-2xl border border-white/10 bg-gradient-to-br ${feature.gradient} backdrop-blur-sm hover:border-white/20 transition-all duration-300`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              <div className="relative z-10">
                <div className={`inline-flex p-3 rounded-xl bg-black/30 mb-4`}>
                  <feature.icon className={`h-6 w-6 ${feature.iconColor}`} />
                </div>

                <h3 className="text-xl font-semibold mb-2 text-white">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
