DRAFT — for review by a registered patent practitioner before filing. Not legal advice.

# 30: Abstract (v2 DRAFT)

> Package note (not filed): the abstract goes on its own page after the claims. Limit 150 words. Word count of the abstract below: 149 (counted by the package sweep script).

## ABSTRACT OF THE DISCLOSURE

A guidance client captures frames of a display while the user operates a target application, redacts each frame on the device by masking recognized text lines a policy engine identifies as sensitive, and transmits the redacted frame with an ordered plan whose steps each carry a planner-generated visible-when-done condition. A vision-capable model returns a navigation record identifying satisfied steps, the single current step and one screen-specific instruction. The client presents the instruction without injecting input; the user performs every action, and the plan advances only when a later redacted frame shows the expected result, that frame becoming the sole evidence of the step. One per-tenant policy object governs on-device masking, evidence retention and the model's instructions. A large goal is planned once as a dependency-ordered task map with screen-visible done-states; each task's steps are expanded just in time from a project learnings ledger and verified by the same loop.
