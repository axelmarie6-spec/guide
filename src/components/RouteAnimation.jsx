
export const ROUTE_INTRO_KEY = 'route_intro_seen_v1'

const PATH_LEN = 653
const DRAW_DUR = 6

const CITIES = [
  { label: 'Bruxelles', flag: '🇧🇪', x: 47,  y: 103, delay: 0.3,  tx:  8, ty: -12, anchor: 'start' },
  { label: 'Amsterdam', flag: '🇳🇱', x: 58,  y: 65,  delay: 0.67, tx:  8, ty: -12, anchor: 'start' },
  { label: 'Berlin',    flag: '🇩🇪', x: 228, y: 62,  delay: 2.23, tx:  8, ty: -12, anchor: 'start' },
  { label: 'Prague',    flag: '🇨🇿', x: 249, y: 121, delay: 2.81, tx:  8, ty:  18, anchor: 'start' },
  { label: 'Budapest',  flag: '🇭🇺', x: 341, y: 186, delay: 3.85, tx: -8, ty: -12, anchor: 'end'   },
  { label: 'Vienne',    flag: '🇦🇹', x: 287, y: 169, delay: 4.37, tx: -8, ty:  18, anchor: 'end'   },
  { label: 'Genève',    flag: '🇨🇭', x: 83,  y: 218, delay: 6.3,  tx:  8, ty: -12, anchor: 'start' },
]

export default function RouteAnimation({ onDone }) {
  function finish() {
    localStorage.setItem(ROUTE_INTRO_KEY, '1')
    onDone()
  }

  const statsDelay = DRAW_DUR + 0.8
  const ctaDelay   = DRAW_DUR + 1.8

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: '#0f0d0b',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '0 16px',
    }}>
      <style>{`
        @keyframes ra-draw {
          from { stroke-dashoffset: ${PATH_LEN}; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes ra-pop {
          0%   { transform: scale(0); opacity: 0; }
          65%  { transform: scale(1.4); opacity: 1; }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes ra-fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes ra-pulse {
          0%, 100% { transform: scale(1);   opacity: 0.5; }
          50%       { transform: scale(2.2); opacity: 0;   }
        }
      `}</style>

      {/* Header */}
      <div style={{
        textAlign: 'center', marginBottom: 16,
        animation: 'ra-fade-up 0.7s ease 0.1s both',
      }}>
        <p style={{ fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(232,160,48,0.6)', margin: '0 0 4px', fontWeight: 600 }}>
          Août 2026
        </p>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'rgba(255,255,255,0.92)', margin: 0, letterSpacing: '-0.02em' }}>
          Notre voyage
        </h1>
      </div>

      {/* Map SVG */}
      <svg
        viewBox="0 0 400 260"
        style={{ width: '100%', maxWidth: 440, overflow: 'visible' }}
        aria-hidden="true"
      >
        {/* Faint grid */}
        {[40, 80, 120, 160, 200, 240].map(y => (
          <line key={`h${y}`} x1={0} y1={y} x2={400} y2={y}
            stroke="rgba(255,255,255,0.035)" strokeWidth={0.5} />
        ))}
        {[40, 80, 120, 160, 200, 240, 280, 320, 360].map(x => (
          <line key={`v${x}`} x1={x} y1={0} x2={x} y2={260}
            stroke="rgba(255,255,255,0.035)" strokeWidth={0.5} />
        ))}

        {/* North Sea coast hint */}
        <path
          d="M 0,90 Q 18,72 38,80 Q 58,88 72,68 Q 88,48 112,54 Q 130,58 145,46"
          stroke="rgba(100,160,220,0.18)" strokeWidth={1.5}
          fill="none" strokeLinecap="round"
        />

        {/* Alps hint */}
        <path
          d="M 55,238 Q 100,222 150,228 Q 200,234 248,222 Q 295,210 330,218"
          stroke="rgba(255,255,255,0.12)" strokeWidth={1.5}
          fill="none" strokeLinecap="round" strokeDasharray="5 4"
        />

        {/* Route line */}
        <polyline
          points="47,103 58,65 228,62 249,121 341,186 287,169 83,218"
          fill="none"
          stroke="rgba(232,160,48,0.85)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={PATH_LEN}
          style={{
            animation: `ra-draw ${DRAW_DUR}s cubic-bezier(0.45,0,0.2,1) 0.3s both`,
          }}
        />

        {/* City dots + labels */}
        {CITIES.map(c => (
          <g key={c.label}>
            {/* Pulse ring (shows after dot appears) */}
            <circle cx={c.x} cy={c.y} r={5}
              fill="none" stroke="rgba(232,160,48,0.35)" strokeWidth={1.5}
              style={{
                transformOrigin: `${c.x}px ${c.y}px`,
                animation: `ra-pulse 2s ease-in-out ${c.delay + 0.5}s infinite`,
              }}
            />
            {/* Main dot */}
            <circle cx={c.x} cy={c.y} r={5}
              fill="rgba(232,160,48,0.9)"
              stroke="#0f0d0b" strokeWidth={1.5}
              style={{
                transformOrigin: `${c.x}px ${c.y}px`,
                animation: `ra-pop 0.45s cubic-bezier(0.34,1.56,0.64,1) ${c.delay}s both`,
              }}
            />
            {/* Label */}
            <text
              x={c.x + c.tx} y={c.y + c.ty}
              fill="rgba(255,255,255,0.8)"
              fontSize={8.5}
              fontFamily="system-ui, -apple-system, sans-serif"
              fontWeight={600}
              textAnchor={c.anchor}
              style={{
                animation: `ra-fade-up 0.4s ease ${c.delay + 0.2}s both`,
              }}
            >
              {c.flag} {c.label}
            </text>
          </g>
        ))}
      </svg>

      {/* Stats */}
      <div style={{
        display: 'flex', gap: 36, marginTop: 20,
        animation: `ra-fade-up 0.65s ease ${statsDelay}s both`,
      }}>
        {[['22', 'jours'], ['7', 'villes'], ['5', 'amis']].map(([n, l]) => (
          <div key={l} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'rgba(232,160,48,0.95)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {n}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: 4, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
              {l}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={finish}
        style={{
          marginTop: 28,
          padding: '13px 36px',
          borderRadius: '24px',
          background: 'rgba(232,160,48,0.14)',
          border: '1.5px solid rgba(232,160,48,0.45)',
          color: 'rgba(232,160,48,0.95)',
          fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
          fontFamily: 'inherit', letterSpacing: '0.01em',
          animation: `ra-fade-up 0.65s ease ${ctaDelay}s both`,
        }}
      >
        Commencer →
      </button>

      {/* Skip */}
      <button
        onClick={finish}
        style={{
          position: 'absolute', top: 20, right: 20,
          padding: '7px 16px', borderRadius: '14px',
          background: 'rgba(255,255,255,0.07)', border: 'none',
          color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem',
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        Passer
      </button>
    </div>
  )
}
