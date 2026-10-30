// /workcopilot/login: the card opens on the Social tab, so the email form is
// one tab away. Selectors are the ids the page already ships (no test ids).
export class LoginPage {
  constructor(page) { this.page = page }

  async open() {
    await this.page.goto('/workcopilot/login')
    await this.page.locator('#wl-tab-email').click()
    await this.page.locator('#wl-user').waitFor()
  }

  async signIn(username, password) {
    await this.page.locator('#wl-user').fill(username)
    await this.page.locator('#wl-pass').fill(password)
    await this.page.locator('#wl-panel-email button[type=submit]').click()
  }

  error() { return this.page.locator('#wl-err') }
}
