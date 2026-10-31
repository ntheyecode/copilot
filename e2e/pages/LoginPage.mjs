// /workcopilot/login: where social sign-in exists the card opens on the Social
// tab, so the email form is one tab away; without it (the organizations site)
// the email form is the only panel. Selectors are the ids the page ships.
export class LoginPage {
  constructor(page) { this.page = page }

  async open() {
    await this.page.goto('/workcopilot/login')
    const user = this.page.locator('#wl-user')
    const emailTab = this.page.locator('#wl-tab-email')
    await user.or(emailTab).first().waitFor()
    if (await emailTab.count()) await emailTab.click()
    await user.waitFor()
  }

  async signIn(username, password) {
    await this.page.locator('#wl-user').fill(username)
    await this.page.locator('#wl-pass').fill(password)
    await this.page.locator('#wl-panel-email button[type=submit]').click()
  }

  error() { return this.page.locator('#wl-err') }
}
