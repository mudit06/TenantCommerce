/** Sign-in page logo: the TE mark and product name (docs/screens/super-admin.md, Sign in). */
export function Logo() {
  return (
    <div className="te-logo">
      <span aria-hidden="true" className="te-logo__mark">
        TE
      </span>
      <span className="te-logo__text">
        TenantEcom <span className="te-logo__muted">admin</span>
      </span>
    </div>
  )
}
