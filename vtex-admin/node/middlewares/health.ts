export async function health(ctx: Context) {
  const token = ctx.vtex.adminUserAuthToken ?? ctx.cookies.get('VtexIdclientAutCookie')
  ctx.set('Cache-Control', 'no-store')
  ctx.body = {
    ok: true,
    account: ctx.vtex.account,
    workspace: ctx.vtex.workspace,
    hasAdminToken: !!token,
  }
}
