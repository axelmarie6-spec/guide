import { NavLink } from 'react-router-dom'
import { useT } from '../context/ThemeContext'

const LEFT_TABS = [
  {
    path: '/',
    label: 'Auj.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[22px] h-[22px]">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M2.25 12l8.954-8.955a1.5 1.5 0 012.092 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    path: '/explorer',
    label: 'Explorer',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[22px] h-[22px]">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
      </svg>
    ),
  },
]

const RIGHT_TABS = [
  {
    path: '/voyage',
    label: 'Voyage',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[22px] h-[22px]">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
      </svg>
    ),
  },
  {
    path: '/coffre-fort',
    label: 'Coffre',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[22px] h-[22px]">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
]

function OracleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" width={22} height={22}>
      <path d="M12 2.5L13.2 8.8L19.5 10L13.2 11.2L12 17.5L10.8 11.2L4.5 10L10.8 8.8L12 2.5Z"
        fill="white"/>
      <path d="M19.5 4L20.1 6.4L22.5 7L20.1 7.6L19.5 10L18.9 7.6L16.5 7L18.9 6.4L19.5 4Z"
        fill="white" opacity={0.75}/>
      <path d="M5 15L5.5 17L7.5 17.5L5.5 18L5 20L4.5 18L2.5 17.5L4.5 17L5 15Z"
        fill="white" opacity={0.65}/>
    </svg>
  )
}

function TabItem({ path, label, icon }) {
  const { T } = useT()
  return (
    <NavLink
      to={path}
      end={path === '/'}
      className="nav-tab"
      style={({ isActive }) => ({
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', flex: 1, padding: '8px 2px', gap: '3px',
        fontSize: '9px', fontWeight: isActive ? 600 : 400,
        fontFamily: 'inherit',
        color: isActive ? T.p : T.t,
        borderRadius: '20px',
        background: isActive ? T.navActive : 'transparent',
        transition: 'all 0.18s', textDecoration: 'none',
      })}
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  )
}

export default function BottomBar() {
  const { T } = useT()
  return (
    <nav style={{
      position: 'fixed', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)', left: '50%', transform: 'translateX(-50%)',
      width: 'calc(100% - 32px)', maxWidth: '480px',
      background: T.navBg,
      backdropFilter: 'blur(32px) saturate(1.8)',
      WebkitBackdropFilter: 'blur(32px) saturate(1.8)',
      borderRadius: '26px',
      border: '1px solid ' + T.navBorder,
      boxShadow: T.navShadow,
      display: 'flex',
      padding: '6px',
      zIndex: 50,
      overflow: 'visible',
    }}>
      {LEFT_TABS.map(t => <TabItem key={t.path} {...t} />)}

      {/* Oracle — bouton central qui sort de la barre */}
      <NavLink
        to="/oracle"
        className="nav-tab"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', gap: 0 }}
      >
        {({ isActive }) => (
          <>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: isActive
                ? 'linear-gradient(145deg, #f5b535, #d4861a)'
                : 'linear-gradient(145deg, #e8a030, #c87818)',
              boxShadow: isActive
                ? '0 0 0 3px rgba(232,160,48,0.30), 0 5px 20px rgba(232,160,48,0.55), 0 2px 6px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.35)'
                : '0 4px 16px rgba(232,160,48,0.38), 0 2px 6px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.30)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transform: 'translateY(-20px)',
              flexShrink: 0,
              transition: 'box-shadow 0.18s',
            }}>
              <OracleIcon />
            </div>
            <span style={{
              fontSize: '9px',
              fontWeight: isActive ? 700 : 500,
              color: isActive ? 'var(--sun)' : T.t,
              marginTop: '-14px',
              fontFamily: 'inherit',
              letterSpacing: '0.01em',
            }}>
              Oracle
            </span>
          </>
        )}
      </NavLink>

      {RIGHT_TABS.map(t => <TabItem key={t.path} {...t} />)}
    </nav>
  )
}
