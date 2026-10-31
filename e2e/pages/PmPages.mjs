// Project management surfaces: /work/pm (PM), /work/queue (worker), /work/srpm
// (Sr PM) and /work/grc (oversight).
export class PmPages {
  constructor(page) { this.page = page }

  async openPm() {
    await this.page.goto('/work/pm')
    // The page's own heading (the top bar repeats the name outside <main>).
    await this.page.getByRole('main').getByRole('heading', { name: 'Projects I manage' }).waitFor()
  }

  // New project dialog -> the AI maps the tasks -> the project view opens.
  async createProject({ goal, name }) {
    const p = this.page
    await p.getByRole('button', { name: /^(New project|New)$/ }).first().click()
    const dlg = p.getByRole('dialog')
    if (name) await dlg.locator('#wd-ep-name').fill(name)
    await dlg.locator('#wd-ep-goal').fill(goal)
    await p.locator('#wd-ep-new-form button[type=submit], button[form="wd-ep-new-form"]').first().click()
    await dlg.waitFor({ state: 'hidden', timeout: 30_000 })
  }

  async assign(taskTitle, personName) {
    const select = this.page.getByLabel(`Assignee for ${taskTitle}`)
    await select.selectOption({ label: personName })
    const row = this.page.locator('*:has(> select[aria-label="Assignee for ' + taskTitle + '"])').first()
    await row.getByRole('button', { name: /^(Assign|Move)$/ }).click()
  }

  async openQueue() {
    await this.page.goto('/work/queue')
    await this.page.getByRole('main').getByRole('heading', { name: 'My queue' }).first().waitFor()
  }
}
