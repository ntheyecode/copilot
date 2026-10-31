// The clickwrap gate ("One step before you continue") shown on every /work*
// surface until the account accepts the current agreements.
export class LegalGate {
  constructor(page) { this.page = page }
  dialog() { return this.page.getByRole('dialog', { name: 'One step before you continue' }) }
  async accept() {
    const d = this.dialog()
    await d.waitFor()
    await this.page.locator('#lcg-accept-cb').check()
    await d.getByRole('button', { name: 'Agree and continue' }).click()
    await d.waitFor({ state: 'hidden' })
  }
}
