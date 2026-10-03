/** Nav and header icon: the TE mark, scaled to whatever box Payload gives it (18px). */
export function Icon() {
  return (
    <svg aria-label="TenantEcom" className="te-icon" role="img" viewBox="0 0 32 32">
      <rect fill="var(--te-brand)" height="32" rx="8" width="32" />
      <text
        fill="var(--te-on-brand)"
        fontFamily="Arial, sans-serif"
        fontSize="14"
        fontWeight="700"
        textAnchor="middle"
        x="16"
        y="21"
      >
        TE
      </text>
    </svg>
  )
}
