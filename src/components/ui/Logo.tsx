interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  style?: React.CSSProperties
}

const sizes = {
  sm: { plc: '1.5rem', company: '0.5rem', gap: '0.125rem', letterSpacing: '0.15em' },
  md: { plc: '2rem', company: '0.625rem', gap: '0.1875rem', letterSpacing: '0.2em' },
  lg: { plc: '2.5rem', company: '0.75rem', gap: '0.25rem', letterSpacing: '0.25em' },
}

export function Logo({ size = 'md', className, style }: LogoProps) {
  const s = sizes[size]

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, ...style }}>
      <span
        style={{
          fontFamily: "'Swiss 721 Black Extended', Arial Black, sans-serif",
          fontSize: s.plc,
          fontWeight: 900,
          letterSpacing: '0.02em',
          color: 'inherit',
        }}
      >
        PLC.
      </span>
      <span
        style={{
          fontFamily: 'var(--font-geist-sans), Arial, sans-serif',
          fontSize: s.company,
          fontWeight: 400,
          letterSpacing: s.letterSpacing,
          color: 'inherit',
          marginTop: s.gap,
        }}
      >
        COMPANY
      </span>
    </div>
  )
}
