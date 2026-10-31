// /work/company: the company admin console. Sections are role="button" items
// in the side nav; the h1 names the open section.
export class CompanyAdmin {
  constructor(page) { this.page = page }

  async open() {
    await this.page.goto('/work/company')
    await this.page.getByRole('heading', { level: 1, name: 'Overview' }).waitFor()
  }

  async section(name, heading = name) {
    await this.page.locator('.wka-nav-item', { hasText: name }).first().click()
    await this.page.getByRole('heading', { level: 1, name: heading }).waitFor()
  }

  // Team: the row of one person (by username) and its Trainer checkbox.
  personRow(username) {
    return this.page.locator('tr, li, .wka-row, article').filter({ hasText: username }).filter({ has: this.page.getByLabel('Trainer') }).last()
  }

  // API & webhooks: create a key through the form; returns the one-time secret.
  async createApiKey({ name, scopes, expiry = '30 days' }) {
    const p = this.page
    await p.getByRole('button', { name: 'Create key' }).first().click()
    await p.getByPlaceholder('e.g. Billing sync (production)').fill(name)
    // Each scope's label is its name followed by the scope id ("Read workflowsworkflows:read").
    for (const s of scopes) await p.getByRole('checkbox', { name: new RegExp(`^${s}`) }).check()
    await p.getByRole('radiogroup', { name: 'Expires in' }).getByRole('radio', { name: expiry }).click()
    await p.getByRole('button', { name: 'Create key' }).last().click()
    const secretField = p.getByLabel('Your new API key')
    await secretField.waitFor()
    const secret = (await secretField.inputValue().catch(() => null)) || (await secretField.innerText())
    await p.getByRole('button', { name: 'I have stored it' }).click()
    return secret.trim()
  }
}
