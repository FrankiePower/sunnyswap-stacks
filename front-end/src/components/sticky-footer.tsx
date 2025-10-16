"use client"
import { motion } from "framer-motion"

export function StickyFooter() {
  return (
    <footer className="relative w-full bg-gradient-to-b from-transparent via-orange-500/5 to-orange-500/10 border-t border-orange-500/20 mt-24">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand Section */}
          <div className="md:col-span-1">
            <h3 className="text-2xl font-black tracking-wider bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent uppercase mb-4" style={{ fontFamily: 'ui-monospace, monospace', letterSpacing: '0.15em' }}>
              SUNNYSWAP
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Trustless atomic swaps between EVM chains and Stacks blockchain. No custody, pure decentralization.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-foreground font-semibold mb-4">Product</h4>
            <ul className="space-y-2">
              <li>
                <a href="/app" className="text-muted-foreground hover:text-orange-400 transition-colors text-sm">
                  Launch dApp
                </a>
              </li>
              <li>
                <a href="#features" className="text-muted-foreground hover:text-orange-400 transition-colors text-sm">
                  Features
                </a>
              </li>
              <li>
                <a href="#testimonials" className="text-muted-foreground hover:text-orange-400 transition-colors text-sm">
                  Why SunnySwap
                </a>
              </li>
              <li>
                <a href="#faq" className="text-muted-foreground hover:text-orange-400 transition-colors text-sm">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-foreground font-semibold mb-4">Resources</h4>
            <ul className="space-y-2">
              <li>
                <a href="/docs" className="text-muted-foreground hover:text-orange-400 transition-colors text-sm">
                  Documentation
                </a>
              </li>
              <li>
                <a href="/whitepaper" className="text-muted-foreground hover:text-orange-400 transition-colors text-sm">
                  Whitepaper
                </a>
              </li>
              <li>
                <a href="/guides" className="text-muted-foreground hover:text-orange-400 transition-colors text-sm">
                  Guides
                </a>
              </li>
              <li>
                <a href="/blog" className="text-muted-foreground hover:text-orange-400 transition-colors text-sm">
                  Blog
                </a>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h4 className="text-foreground font-semibold mb-4">Community</h4>
            <ul className="space-y-2">
              <li>
                <a href="https://github.com/sunnyswap" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-orange-400 transition-colors text-sm">
                  GitHub
                </a>
              </li>
              <li>
                <a href="https://twitter.com/sunnyswap" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-orange-400 transition-colors text-sm">
                  Twitter
                </a>
              </li>
              <li>
                <a href="https://discord.gg/sunnyswap" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-orange-400 transition-colors text-sm">
                  Discord
                </a>
              </li>
              <li>
                <a href="https://t.me/sunnyswap" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-orange-400 transition-colors text-sm">
                  Telegram
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-muted-foreground text-sm">
              © 2025 SunnySwap. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm">
              <a href="/privacy" className="text-muted-foreground hover:text-orange-400 transition-colors">
                Privacy Policy
              </a>
              <a href="/terms" className="text-muted-foreground hover:text-orange-400 transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
