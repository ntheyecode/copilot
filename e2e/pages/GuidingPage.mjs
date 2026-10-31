// /work/session/:id: the guided console. Plans on mount from the shared screen,
// then the watch loop reads a frame every few seconds.
export class GuidingPage {
  constructor(page) { this.page = page }

  stepCard() { return this.page.locator('section.gv-step') }
  stepCounter() { return this.page.getByText(/^Step \d+ of \d+$/).first() }

  async waitForPlan() {
    await this.stepCard().first().waitFor({ timeout: 30_000 })
  }

  // The person does something in their app: the shared screen changes once.
  async act() { return this.page.evaluate(() => window.__e2eScreen.act()) }

  async ask(question) {
    const box = this.page.getByPlaceholder(/Ask anything/)
    await box.fill(question)
    await this.page.getByRole('button', { name: 'Ask', exact: true }).click()
  }

  // An answer card holds the watch loop until the person goes back to guiding.
  async continueGuiding() {
    await this.page.getByRole('button', { name: 'Continue guiding' }).click()
  }

  async end() {
    await this.page.getByRole('button', { name: 'End', exact: true }).first().click()
    await this.page.getByText('Session complete').waitFor({ timeout: 30_000 })
  }
}
