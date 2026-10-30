// /work/start: the guided "Start a task" wizard. With wc.coach.skip=1 (set by
// prepContext) it opens on the goal step.
export class StartTaskPage {
  constructor(page) { this.page = page }

  async open() {
    await this.page.goto('/work/start')
    await this.page.getByRole('heading', { level: 1, name: 'Start a task' }).waitFor()
  }

  // Walk the wizard from the goal to "Begin guiding", answering the scoping
  // question; returns the new session id from the URL.
  async startTask({ title, goal }) {
    const p = this.page
    await p.locator('#wd-name').fill(title)
    await p.locator('#wd-goal').fill(goal)
    await this.next('Continue')
    await this.next('Looks right, continue')
    await p.getByRole('button', { name: /Quick/ }).first().click()
    // Optional research step and the scoping questions, until the review step.
    for (let i = 0; i < 8; i++) {
      const begin = p.locator('.wd-wz-begin')
      if (await begin.isVisible()) break
      const option = p.getByRole('button', { name: 'Excel', exact: true })
      if (await option.isVisible()) await option.click()
      const nextBtn = p.getByRole('button', { name: /^(Next|Review|Continue|Skip)$/ }).last()
      if (await nextBtn.isVisible()) await nextBtn.click()
      await p.waitForTimeout(150)
    }
    await p.locator('.wd-wz-begin').click()
    await p.waitForURL(/\/work\/session\/[^/]+$/)
    return p.url().split('/').pop()
  }

  async next(name) {
    const b = this.page.getByRole('button', { name, exact: true })
    await b.click()
  }
}
