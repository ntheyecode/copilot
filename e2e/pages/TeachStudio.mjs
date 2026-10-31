// /work/teach: the workflow list and the 5-phase authoring wizard. The wizard's
// labels have no htmlFor, so fields are reached by their placeholders.
export const PH = Object.freeze({
  productName: 'e.g. Salesforce, your billing portal',
  title: 'e.g. Raise a credit note',
  owner: 'e.g. Finance operations',
  launchTarget: 'e.g. Billing > Credit notes',
  instruction: 'e.g. Open the Credit notes tab and choose New.',
  target: 'e.g. the New button, top right',
  doneWhen: 'e.g. the draft credit note opens',
})

export class TeachStudio {
  constructor(page) { this.page = page }

  async open() {
    await this.page.goto('/work/teach')
    await this.page.getByRole('heading', { level: 1, name: 'Teach a workflow' }).waitFor()
  }

  tab(name) { return this.page.getByRole('tablist', { name: 'Authoring steps' }).getByRole('tab', { name }) }
  button(name) { return this.page.getByRole('button', { name, exact: true }) }
  field(ph) { return this.page.getByPlaceholder(ph, { exact: true }) }

  async newWorkflow() {
    await this.button('New workflow').click()
    await this.tab('Basics').waitFor()
  }

  async fillBasics({ productName, title, owner, launchTarget }) {
    await this.field(PH.productName).fill(productName)
    await this.field(PH.title).fill(title)
    await this.field(PH.owner).fill(owner)
    await this.field(PH.launchTarget).fill(launchTarget)
  }

  async next() { await this.button('Next').click() }
  async back() { await this.button('Back').click() }

  async acknowledgeScope() {
    await this.page.getByLabel('I understand this workflow will be shared with my company.').check()
  }

  // Steps phase: the wizard starts with one empty row; add the rest.
  async writeSteps(instructions) {
    for (let i = 0; i < instructions.length; i++) {
      const boxes = this.field(PH.instruction)
      if (i >= await boxes.count()) await this.button('Add step').click()
      await this.field(PH.instruction).nth(i).fill(instructions[i])
    }
  }

  async saveDraft() {
    await this.button('Save draft').click()
    await this.page.getByText('Draft saved.').first().waitFor()
  }

  async publish() {
    await this.button('Publish').last().click()
    await this.page.getByText(/Published/).first().waitFor()
  }

  row(title) { return this.page.locator('.tch-row, li, article').filter({ has: this.page.locator('button.tch-rowhead', { hasText: title }) }).first() }

  async openRow(title) {
    const head = this.page.locator('button.tch-rowhead', { hasText: title }).first()
    if ((await head.getAttribute('aria-expanded')) !== 'true') await head.click()
    return this.row(title)
  }

  async rowAction(title, action, { confirm = false } = {}) {
    const row = await this.openRow(title)
    await row.getByRole('button', { name: action, exact: true }).click()
    if (confirm) await this.page.getByRole('dialog').getByRole('button', { name: action, exact: true }).click()
  }
}
