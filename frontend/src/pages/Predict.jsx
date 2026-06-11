import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, ArrowLeft, Upload, ImageIcon, AlertCircle,
  CheckCircle2, Loader2, Info, Clock, Zap,
} from 'lucide-react'
import { checkRateLimit, getRateLimitInfo } from '../utils/rateLimit'
import styles from './Predict.module.css'

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

const CLASS_COLORS = {
  'No Impairment':        '#10b981',
  'Very Mild Impairment': '#06b6d4',
  'Mild Impairment':      '#f59e0b',
  'Moderate Impairment':  '#ef4444',
}

const SEVERITY = {
  'No Impairment':        { label: 'Healthy', color: '#10b981', icon: '✓' },
  'Very Mild Impairment': { label: 'Very Mild', color: '#06b6d4', icon: '!' },
  'Mild Impairment':      { label: 'Mild', color: '#f59e0b', icon: '!!' },
  'Moderate Impairment':  { label: 'Moderate', color: '#ef4444', icon: '!!!' },
}

export default function Predict() {
  const nav = useNavigate()
  const [file, setFile]         = useState(null)
  const [preview, setPreview]   = useState(null)
  const [result, setResult]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [rlInfo, setRlInfo]     = useState(() => getRateLimitInfo())
  const timerRef = useRef(null)

  const onDrop = useCallback((accepted, rejected) => {
    setError(null)
    setResult(null)
    if (rejected.length) {
      setError('Only JPEG or PNG images are accepted (max 10 MB).')
      return
    }
    const f = accepted[0]
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  })

  async function handleAnalyse() {
    if (!file) return
    setError(null)

    const rl = checkRateLimit()
    setRlInfo(getRateLimitInfo())

    if (!rl.allowed) {
      setError(`Rate limit reached. Please wait ${rl.resetIn}s before trying again.`)
      return
    }

    setLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const { data } = await axios.post(`${API_BASE}/predict`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120_000, // Increased timeout for model cold-starts
      })
      setResult(data)
    } catch (e) {
      if (e.response) {
        setError(e.response.data?.detail || 'Server error. Please try again.')
      } else {
        setError('Cannot reach API. Make sure the backend is running on ' + API_BASE)
      }
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setFile(null)
    setPreview(null)
    setResult(null)
    setError(null)
  }

  const sorted = result
    ? Object.entries(result.probabilities).sort((a, b) => b[1] - a[1])
    : []

  return (
    <div className={styles.page}>
      {/* bg orbs */}
      <div className={styles.orb1} />
      <div className={styles.orb2} />

      {/* ── TOP BAR ── */}
      <header className={styles.header}>
        <button className={styles.back} onClick={() => nav('/')}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className={styles.headerTitle}>
          <Brain size={20} color="#a78bfa" />
          <span>MRI Analysis</span>
        </div>
        <div className={styles.rlBadge} title="API calls remaining this minute">
          <Zap size={13} />
          {rlInfo.remaining}/{rlInfo.limit} left
        </div>
      </header>

      <main className={styles.main}>
        {/* ── LEFT: Upload Panel ── */}
        <div className={styles.left}>
          <motion.div
            {...getRootProps()}
            className={`glass ${styles.dropzone} ${isDragActive ? styles.active : ''} ${preview ? styles.hasFile : ''}`}
            whileHover={{ borderColor: 'rgba(139,92,246,0.5)' }}
            animate={isDragActive ? { scale: 1.02 } : { scale: 1 }}
          >
            <input {...getInputProps()} />

            {preview ? (
              <div className={styles.previewWrap}>
                <img src={preview} alt="MRI preview" className={styles.previewImg} />
                <div className={styles.previewBadge}>
                  <ImageIcon size={12} /> {file?.name}
                </div>
              </div>
            ) : (
              <div className={styles.dropContent}>
                <motion.div
                  className={styles.dropIcon}
                  animate={isDragActive ? { scale: 1.2, y: -8 } : { scale: 1, y: 0 }}
                >
                  <Upload size={36} color="#7c3aed" />
                </motion.div>
                <div className={styles.dropTitle}>
                  {isDragActive ? 'Drop your MRI here' : 'Drag & drop your MRI'}
                </div>
                <div className={styles.dropSub}>
                  or <span>browse files</span> · JPEG, PNG · max 10 MB
                </div>
              </div>
            )}
          </motion.div>

          {/* Actions */}
          <div className={styles.actions}>
            {preview && !result && (
              <button
                className="btn-primary"
                onClick={handleAnalyse}
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {loading
                  ? <><Loader2 size={16} className={styles.spin} /> Analysing…</>
                  : <><Brain size={16} /> Analyse MRI</>
                }
              </button>
            )}
            {result && (
              <button
                className="btn-secondary"
                onClick={reset}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Analyse Another
              </button>
            )}
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                className={styles.errorBox}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Rate limit info */}
          <div className={styles.rlInfo}>
            <Clock size={13} />
            <span>Rate limit: {rlInfo.limit} requests per 60 seconds</span>
          </div>

          {/* Tips */}
          <div className={`glass ${styles.tips}`}>
            <div className={styles.tipsTitle}><Info size={14} /> Tips for best results</div>
            <ul className={styles.tipsList}>
              <li>Use axial-view brain MRI slices</li>
              <li>Ensure good contrast between grey/white matter</li>
              <li>Avoid heavily cropped or watermarked images</li>
              <li>JPEG or PNG, at least 128×128 px</li>
            </ul>
          </div>
        </div>

        {/* ── RIGHT: Results Panel ── */}
        <div className={styles.right}>
          <AnimatePresence mode="wait">
            {!result && !loading && (
              <motion.div
                key="empty"
                className={`glass ${styles.emptyState}`}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              >
                <Brain size={52} color="rgba(124,58,237,0.4)" />
                <p>Upload an MRI scan to see the AI prediction and attention heatmap here.</p>
              </motion.div>
            )}

            {loading && (
              <motion.div
                key="loading"
                className={`glass ${styles.emptyState}`}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              >
                <Loader2 size={48} color="#7c3aed" className={styles.spin} />
                <p>Running ViT inference + Grad-CAM…</p>
              </motion.div>
            )}

            {result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className={styles.results}
              >
                {/* ── Prediction badge ── */}
                <div className={`glass ${styles.predCard}`}>
                  <div className={styles.predLeft}>
                    <CheckCircle2 size={22} color={CLASS_COLORS[result.predicted_class]} />
                    <div>
                      <div className={styles.predLabel}>Predicted Class</div>
                      <div
                        className={styles.predClass}
                        style={{ color: CLASS_COLORS[result.predicted_class] }}
                      >
                        {result.predicted_class}
                      </div>
                    </div>
                  </div>
                  <div className={styles.predRight}>
                    <div className={styles.severityBadge}
                      style={{
                        background: SEVERITY[result.predicted_class]?.color + '22',
                        color: SEVERITY[result.predicted_class]?.color,
                        border: `1px solid ${SEVERITY[result.predicted_class]?.color}55`,
                      }}
                    >
                      {SEVERITY[result.predicted_class]?.label}
                    </div>
                    <div className={styles.confValue}>
                      {(result.confidence * 100).toFixed(1)}%
                    </div>
                    <div className={styles.confLabel}>Confidence</div>
                  </div>
                </div>

                {/* ── Probability bars ── */}
                <div className={`glass ${styles.probCard}`}>
                  <div className={styles.probTitle}>Class Probabilities</div>
                  <div className={styles.probList}>
                    {sorted.map(([cls, prob]) => (
                      <div key={cls} className={styles.probRow}>
                        <div className={styles.probName}>{cls}</div>
                        <div className={styles.probBarWrap}>
                          <motion.div
                            className={styles.probBar}
                            style={{ background: CLASS_COLORS[cls] }}
                            initial={{ width: 0 }}
                            animate={{ width: `${(prob * 100).toFixed(1)}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                          />
                        </div>
                        <div className={styles.probVal}>
                          {(prob * 100).toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Grad-CAM ── */}
                <div className={`glass ${styles.camCard}`}>
                  <div className={styles.camTitle}>
                    Attention Grad-CAM
                    <span className={styles.camSub}>
                      Highlights regions influencing the prediction
                    </span>
                  </div>
                  <div className={styles.camImages}>
                    <div className={styles.camImg}>
                      <img src={preview} alt="Original MRI" />
                      <div className={styles.camImgLabel}>Original</div>
                    </div>
                    <div className={styles.camArrow}>→</div>
                    <div className={styles.camImg}>
                      <img
                        src={`data:image/png;base64,${result.gradcam_png_b64}`}
                        alt="Grad-CAM heatmap"
                      />
                      <div className={styles.camImgLabel}>Heatmap</div>
                    </div>
                  </div>
                  <div className={styles.camLegend}>
                    <span style={{ color: '#1e40af' }}>Low attention</span>
                    <div className={styles.camGradient} />
                    <span style={{ color: '#ef4444' }}>High attention</span>
                  </div>
                </div>

                {/* ── Disclaimer ── */}
                <div className={styles.disclaimer}>
                  <AlertCircle size={13} />
                  This tool is for research and educational purposes only and does not constitute medical advice.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
