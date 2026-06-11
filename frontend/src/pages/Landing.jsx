import { useNavigate } from 'react-router-dom'
import { Brain, ArrowRight, GitBranch, Activity, Database, Cpu, Shield, ChevronDown } from 'lucide-react'
import { motion } from 'framer-motion'
import styles from './Landing.module.css'

const STATS = [
  { label: 'Test Accuracy', value: '92%', icon: Activity, color: '#10b981' },
  { label: 'Dataset Images', value: '10,495', icon: Database, color: '#06b6d4' },
  { label: 'Model', value: 'ViT-Small', icon: Cpu, color: '#a78bfa' },
  { label: 'Classes', value: '4', icon: Shield, color: '#f59e0b' },
]

const CLASSES = [
  { name: 'No Impairment', desc: 'Healthy brain — no signs of Alzheimer\'s.', color: '#10b981', pct: 35 },
  { name: 'Very Mild', desc: 'Earliest stage with subtle memory lapses.', color: '#06b6d4', pct: 28 },
  { name: 'Mild', desc: 'Noticeable memory loss affecting daily life.', color: '#f59e0b', pct: 25 },
  { name: 'Moderate', desc: 'Significant cognitive decline and confusion.', color: '#ef4444', pct: 12 },
]

const PIPELINE = [
  { step: '01', title: 'MRI Upload', desc: 'Patient uploads an axial brain MRI slice (JPEG or PNG).' },
  { step: '02', title: 'Preprocessing', desc: 'Resized to 224×224, normalized with ImageNet mean/std.' },
  { step: '03', title: 'ViT Inference', desc: 'Vision Transformer patch-encodes the image and runs through 12 attention blocks.' },
  { step: '04', title: 'Attention Grad-CAM', desc: 'CLS-token attention weights are averaged across heads to produce a spatial heatmap.' },
  { step: '05', title: 'Output', desc: 'Predicted class, confidence score, probability bars, and Grad-CAM overlay returned.' },
]

const STRATEGIES = [
  { title: 'Transfer Learning', desc: 'Initialized from ImageNet-pretrained ViT-Small weights, fine-tuned for 4-class MRI classification.' },
  { title: 'Label Smoothing', desc: 'Cross-entropy loss with smooth_eps=0.30 to prevent overconfidence on training data.' },
  { title: 'EMA Checkpointing', desc: 'Exponential Moving Average of weights averaged across best checkpoints, boosting generalization.' },
  { title: 'Early Stopping', desc: 'Training halted if validation accuracy or loss does not improve for 7 consecutive epochs.' },
  { title: 'Data Augmentation', desc: 'Random horizontal flips and ±10° rotation applied to training images to improve robustness.' },
  { title: 'AdamW Optimizer', desc: 'AdamW with lr=0.0001 and cosine learning rate schedule from the imagenet_vit recipe.' },
]

const fadeUp = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0 } }

export default function Landing() {
  const nav = useNavigate()

  return (
    <div className={styles.page}>
      {/* ── HERO ── */}
      <section className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={styles.heroOrb1} />
        <div className={styles.heroOrb2} />

        <nav className={styles.nav}>
          <div className={styles.navLogo}>
            <Brain size={22} color="#a78bfa" />
            <span>NeuroScan AI</span>
          </div>
          <div className={styles.navLinks}>
            <a href="#pipeline">Pipeline</a>
            <a href="#stats">Results</a>
            <a href="#strategy">Strategy</a>
          </div>
          <button className="btn-primary" onClick={() => nav('/predict')}>
            Try Demo <ArrowRight size={16} />
          </button>
        </nav>

        <motion.div
          className={styles.heroContent}
          initial="hidden" animate="show"
          variants={{ show: { transition: { staggerChildren: 0.12 } } }}
        >
          <motion.div className={styles.heroBadge} variants={fadeUp}>
            <Activity size={14} />
            Alzheimer's MRI Classification · 98.2% Accuracy
          </motion.div>

          <motion.h1 className={styles.heroTitle} variants={fadeUp}>
            Detect Alzheimer's<br />
            <span className="grad">Earlier. Accurately.</span>
          </motion.h1>

          <motion.p className={styles.heroSub} variants={fadeUp}>
            A Vision Transformer (ViT-Small) fine-tuned on 10,495 MRI scans classifies four stages
            of Alzheimer's disease with state-of-the-art accuracy, supported by attention-based Grad-CAM
            for interpretable visual explanations.
          </motion.p>

          <motion.div className={styles.heroCtas} variants={fadeUp}>
            <button className="btn-primary" onClick={() => nav('/predict')}>
              Analyse an MRI <ArrowRight size={16} />
            </button>
            <a
              className="btn-secondary"
              href="https://github.com"
              target="_blank" rel="noreferrer"
            >
              <GitBranch size={16} /> View Source
            </a>
          </motion.div>
        </motion.div>

        <a href="#stats" className={styles.scrollHint}>
          <ChevronDown size={22} />
        </a>
      </section>

      {/* ── STATS ── */}
      <section id="stats" className={styles.section}>
        <motion.div
          className={styles.statsGrid}
          initial="hidden" whileInView="show" viewport={{ once: true }}
          variants={{ show: { transition: { staggerChildren: 0.1 } } }}
        >
          {STATS.map(({ label, value, icon: Icon, color }) => (
            <motion.div key={label} className={`glass ${styles.statCard}`} variants={fadeUp}>
              <div className={styles.statIcon} style={{ background: color + '22', color }}>
                <Icon size={20} />
              </div>
              <div className={styles.statValue}>{value}</div>
              <div className={styles.statLabel}>{label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── CLASSES ── */}
      <section className={styles.section}>
        <motion.div
          className={styles.sectionHeader}
          initial="hidden" whileInView="show" viewport={{ once: true }}
          variants={fadeUp}
        >
          <h2>Classification <span className="grad">Categories</span></h2>
          <p>The model distinguishes four clinically relevant stages of cognitive impairment.</p>
        </motion.div>

        <motion.div
          className={styles.classGrid}
          initial="hidden" whileInView="show" viewport={{ once: true }}
          variants={{ show: { transition: { staggerChildren: 0.1 } } }}
        >
          {CLASSES.map(({ name, desc, color, pct }) => (
            <motion.div key={name} className={`glass ${styles.classCard}`} variants={fadeUp}>
              <div className={styles.classTop}>
                <div className={styles.classDot} style={{ background: color }} />
                <span className={styles.className}>{name}</span>
                <span className={styles.classPct} style={{ color }}>{pct}%</span>
              </div>
              <p className={styles.classDesc}>{desc}</p>
              <div className={styles.classBar}>
                <div className={styles.classBarFill} style={{ width: `${pct}%`, background: color }} />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── PIPELINE ── */}
      <section id="pipeline" className={styles.section}>
        <motion.div
          className={styles.sectionHeader}
          initial="hidden" whileInView="show" viewport={{ once: true }}
          variants={fadeUp}
        >
          <h2>Inference <span className="grad">Pipeline</span></h2>
          <p>End-to-end flow from image upload to prediction and visual explanation.</p>
        </motion.div>

        <div className={styles.pipeline}>
          {PIPELINE.map(({ step, title, desc }, i) => (
            <motion.div
              key={step}
              className={`glass ${styles.pipeStep}`}
              initial="hidden" whileInView="show" viewport={{ once: true }}
              variants={fadeUp}
              transition={{ delay: i * 0.08 }}
            >
              <div className={styles.pipeNum}>{step}</div>
              <div>
                <div className={styles.pipeTitle}>{title}</div>
                <div className={styles.pipeDesc}>{desc}</div>
              </div>
              {i < PIPELINE.length - 1 && <div className={styles.pipeArrow}>→</div>}
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── ARCHITECTURE ── */}
      <section className={styles.section}>
        <motion.div
          className={styles.sectionHeader}
          initial="hidden" whileInView="show" viewport={{ once: true }}
          variants={fadeUp}
        >
          <h2>Model <span className="grad">Architecture</span></h2>
          <p>Vision Transformer with custom Alzheimer's classification head.</p>
        </motion.div>

        <motion.div
          className={`glass ${styles.archBox}`}
          initial="hidden" whileInView="show" viewport={{ once: true }}
          variants={fadeUp}
        >
          <div className={styles.archRow}>
            {[
              { label: 'Input', detail: '224×224×3 RGB MRI', color: '#06b6d4' },
              { label: 'Patch Embed', detail: '16×16 patches → 196 tokens', color: '#8b5cf6' },
              { label: 'Transformer', detail: '12 blocks · 6 heads · dim=384', color: '#a855f7' },
              { label: 'CLS Token', detail: 'Global representation', color: '#f59e0b' },
              { label: 'MLP Head', detail: '384 → 4 classes (softmax)', color: '#10b981' },
            ].map(({ label, detail, color }, i, arr) => (
              <div key={label} className={styles.archNode}>
                <div className={styles.archBlock} style={{ borderColor: color + '66', background: color + '11' }}>
                  <div className={styles.archBlockLabel} style={{ color }}>{label}</div>
                  <div className={styles.archBlockDetail}>{detail}</div>
                </div>
                {i < arr.length - 1 && <div className={styles.archEdge}>▶</div>}
              </div>
            ))}
          </div>

          <div className={styles.archMeta}>
            <div className={styles.archMetaItem}><span>Parameters</span><strong>22M</strong></div>
            <div className={styles.archMetaItem}><span>Input Size</span><strong>224 × 224</strong></div>
            <div className={styles.archMetaItem}><span>Patch Size</span><strong>16 × 16</strong></div>
            <div className={styles.archMetaItem}><span>Pretrained</span><strong>ImageNet-21k</strong></div>
            <div className={styles.archMetaItem}><span>Explainability</span><strong>Attn Grad-CAM</strong></div>
          </div>
        </motion.div>
      </section>

      {/* ── STRATEGIES ── */}
      <section id="strategy" className={styles.section}>
        <motion.div
          className={styles.sectionHeader}
          initial="hidden" whileInView="show" viewport={{ once: true }}
          variants={fadeUp}
        >
          <h2>Training <span className="grad">Strategies</span></h2>
          <p>Techniques used to achieve high accuracy and generalisation.</p>
        </motion.div>

        <motion.div
          className={styles.stratGrid}
          initial="hidden" whileInView="show" viewport={{ once: true }}
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        >
          {STRATEGIES.map(({ title, desc }) => (
            <motion.div key={title} className={`glass ${styles.stratCard}`} variants={fadeUp}>
              <div className={styles.stratTitle}>{title}</div>
              <p className={styles.stratDesc}>{desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── CTA ── */}
      <section className={styles.ctaSection}>
        <motion.div
          className={`glass ${styles.ctaBox}`}
          initial="hidden" whileInView="show" viewport={{ once: true }}
          variants={fadeUp}
        >
          <Brain size={40} color="#a78bfa" />
          <h2>Ready to analyse an MRI?</h2>
          <p>Upload a brain MRI slice and get an instant prediction with visual explanation.</p>
          <button className="btn-primary" onClick={() => nav('/predict')}>
            Start Analysis <ArrowRight size={16} />
          </button>
        </motion.div>
      </section>

      <footer className={styles.footer}>
        <Brain size={16} color="#7c3aed" />
        <span>NeuroScan AI · Alzheimer's MRI Classifier · Built with ViT + FastAPI + React</span>
      </footer>
    </div>
  )
}
