import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Upload, Brain, Eye, Cpu, Zap, Clock, CheckCircle, BarChart2, ArrowRight } from 'lucide-react'

const fade = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

const stag = {
  show: { transition: { staggerChildren: 0.1 } },
}

const FEATURES = [
  {
    icon: Eye,
    title: 'Computer Vision',
    desc: 'Pure JavaScript image processing identifies all 54 stickers using HSV color analysis — no Python or C required.',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
  },
  {
    icon: Brain,
    title: 'Kociemba Two-Phase',
    desc: 'Pure JS IDA* solver generates optimal or near-optimal solutions — typically within 20 moves.',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    icon: Cpu,
    title: '3D Visualization',
    desc: 'Three.js interactive cube animates every solver move with play, pause, step controls and orbit camera.',
    color: 'text-accent',
    bg: 'bg-accent/10',
  },
  {
    icon: BarChart2,
    title: 'History & Analytics',
    desc: 'MongoDB stores every solve. Search, filter, export PDF reports and view aggregate statistics.',
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10',
  },
]

const STEPS = [
  {
    n: '01',
    title: 'Upload 6 Face Photos',
    desc: 'Photograph each face of your Rubiks Cube in good lighting.',
  },
  {
    n: '02',
    title: 'AI Color Detection',
    desc: 'JS image processing maps every sticker to its color using HSV analysis.',
  },
  {
    n: '03',
    title: 'Cube State Validation',
    desc: 'All 54 stickers verified: counts, centers, and parity checks.',
  },
  {
    n: '04',
    title: 'Kociemba Solver',
    desc: 'Pure JS Two-Phase IDA* solver generates moves in milliseconds.',
  },
  {
    n: '05',
    title: '3D Animated Solution',
    desc: 'Watch each move play out on an interactive Three.js cube.',
  },
]

const STATS = [
  { v: '≤20', l: 'Moves', icon: Zap },
  { v: '<2s', l: 'Solve Time', icon: Clock },
  { v: '54', l: 'Stickers', icon: Eye },
  { v: '6', l: 'Face Images', icon: CheckCircle },
]

export default function HomePage() {
  return (
    <div className="overflow-x-hidden">
      <section className="relative min-h-[88vh] flex items-center justify-center px-4 py-20">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-glow" />
          <div
            className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-accent/8 rounded-full blur-3xl animate-pulse-glow"
            style={{ animationDelay: '2s' }}
          />
        </div>

        <motion.div
          className="relative text-center max-w-4xl mx-auto"
          initial="hidden"
          animate="show"
          variants={stag}
        >
          <motion.div
            variants={fade}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium mb-6"
          >
            <Zap size={13} />
            Final Year B.Tech Major Project — Node.js + React
          </motion.div>

          <motion.h1
            variants={fade}
            className="font-display font-bold text-5xl md:text-7xl leading-[1.08] mb-6"
          >
            Solve Any
            <br />
            <span className="gradient-text">Rubiks Cube</span>
            <br />
            with AI Vision
          </motion.h1>

          <motion.p
            variants={fade}
            className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            CubeVision detects all 54 stickers via JavaScript image processing, validates the configuration,
            and generates an optimal or near-optimal solution using the Kociemba Two-Phase Algorithm —
            all in pure Node.js with no Python or C compilation required.
          </motion.p>

          <motion.div
            variants={fade}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            <Link
              to="/upload"
              className="btn-primary text-base px-8 py-4 flex items-center gap-2"
            >
              <Upload size={18} />
              Upload Your Cube
              <ArrowRight size={16} />
            </Link>

            <Link
              to="/stats"
              className="btn-secondary text-base px-8 py-4 flex items-center gap-2"
            >
              <BarChart2 size={18} />
              View Statistics
            </Link>
          </motion.div>

          <motion.div variants={fade} className="mt-16 flex justify-center gap-4">
            {[
              ['bg-cube-white', 'bg-cube-red', 'bg-cube-white', 'bg-cube-white', 'bg-cube-white', 'bg-cube-orange', 'bg-cube-red', 'bg-cube-red', 'bg-cube-yellow'],
              ['bg-cube-blue', 'bg-cube-blue', 'bg-cube-green', 'bg-cube-blue', 'bg-cube-blue', 'bg-cube-blue', 'bg-cube-orange', 'bg-cube-blue', 'bg-cube-white'],
            ].map((face, fi) => (
              <div
                key={fi}
                className={`grid grid-cols-3 gap-1 p-3 card w-fit animate-float ${fi === 0 ? 'rotate-12' : '-rotate-6'}`}
                style={{ animationDelay: `${fi * 1.2}s` }}
              >
                {face.map((c, i) => (
                  <div key={i} className={`w-6 h-6 rounded ${c} shadow`} />
                ))}
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      <section className="border-y border-dark-border bg-dark-card/50 py-10 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {STATS.map(({ v, l, icon: Icon }) => (
            <div key={l}>
              <Icon size={18} className="text-accent mx-auto mb-2" />
              <div className="font-display font-bold text-3xl gradient-text">{v}</div>
              <div className="text-gray-400 text-sm mt-1">{l}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-14"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={stag}
          >
            <motion.p
              variants={fade}
              className="text-accent text-sm font-semibold uppercase tracking-widest mb-3"
            >
              Capabilities
            </motion.p>

            <motion.h2 variants={fade} className="section-title">
              Powered by Node.js & Three.js
            </motion.h2>
          </motion.div>

          <motion.div
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={stag}
          >
            {FEATURES.map(({ icon: Icon, title, desc, color, bg }) => (
              <motion.div
                key={title}
                variants={fade}
                className="card p-6 hover:border-primary/40 transition-colors group"
              >
                <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon size={20} className={color} />
                </div>

                <h3 className="font-display font-semibold text-white mb-2">
                  {title}
                </h3>

                <p className="text-gray-400 text-sm leading-relaxed">
                  {desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-24 px-4 bg-dark-card/30">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-accent text-sm font-semibold uppercase tracking-widest mb-3">
              Workflow
            </p>

            <h2 className="section-title">
              How CubeVision Works
            </h2>
          </div>

          <div className="space-y-3">
            {STEPS.map(({ n, title, desc }, i) => (
              <motion.div
                key={n}
                className="card p-5 flex items-start gap-5 hover:border-primary/40 transition-colors"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <span className="font-mono font-bold text-2xl gradient-text shrink-0">
                  {n}
                </span>

                <div>
                  <h3 className="font-display font-semibold text-white mb-0.5">
                    {title}
                  </h3>

                  <p className="text-gray-400 text-sm">
                    {desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/upload"
              className="btn-accent text-base px-10 py-4 inline-flex items-center gap-2"
            >
              <Upload size={18} />
              Start Solving Now
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-dark-border py-10 px-4 text-center text-gray-500 text-sm space-y-3">
        <p className="font-display text-gray-300 text-lg font-semibold">
          Cube<span className="gradient-text">Vision</span>
        </p>

        <p className="text-cyan-400 text-xs sm:text-sm font-semibold tracking-wide">
          Designed and developed by Man Mohan Sharma
        </p>

        <p className="text-gray-400 max-w-2xl mx-auto leading-relaxed">
          CubeVision is an AI-based Rubik&apos;s Cube recognition and solving platform created as a Final Year B.Tech Major Project.
          This website belongs to Man Mohan Sharma and demonstrates computer vision, cube validation, Kociemba solving,
          and interactive 3D visualization in a full-stack web application.
        </p>

        <p className="text-gray-500 text-xs">
          React · Node.js/Express · Sharp · Three.js · MongoDB · Kociemba Two-Phase Algorithm
        </p>
      </footer>
    </div>
  )
}