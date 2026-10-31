// The /work shell: the Sections rail, the top bar and sign-out.
export class WorkShell {
  constructor(page) { this.page = page }

  rail() { return this.page.getByRole('navigation', { name: 'Sections' }) }
  railLink(name) { return this.rail().getByRole('link', { name, exact: true }) }

  // Names of every rail link, in order (what this role can reach).
  async railNames() {
    await this.rail().waitFor()
    return (await this.rail().getByRole('link').allInnerTexts()).map((s) => s.trim()).filter(Boolean)
  }

  async signOut() {
    await this.page.locator('button.wd-signout').click()
    await this.page.waitForURL(/\/workcopilot/)
  }

  async openPreferences() {
    await this.page.getByRole('button', { name: 'Preferences' }).click()
    return this.page.getByRole('dialog', { name: 'Preferences' })
  }
}
