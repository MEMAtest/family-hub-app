import { brainWritingInput, validateBrainWriting } from "./writing";

test("preserves amounts, dates, links and checklist states", () => {
  const text =
    "- [ ] Ask Ade about £150 on 24/10/2026\n- [x] Read [[node:boiler|Boiler]] https://example.test/quote";
  expect(
    validateBrainWriting(text, { title: "Boiler quote", content: text }),
  ).toMatchObject({ title: "Boiler quote" });
  for (const content of [
    text.replace("150", "200"),
    text.replace("£", "$"),
    text.replace("[x]", "[ ]"),
    text.replace("[[node:boiler|Boiler]]", "Boiler"),
    text.replace("example.test", "other.test"),
  ]) {
    expect(() =>
      validateBrainWriting(text, { title: "Boiler quote", content }),
    ).toThrow("protected details");
  }
});
test("rejects empty output, excessively long titles, invalid types and overlong drafts", () => {
  expect(() =>
    validateBrainWriting("A note", { title: "", content: "" }),
  ).toThrow();
  expect(() =>
    validateBrainWriting("A note", {
      title: "a".repeat(91),
      content: "A note",
    }),
  ).toThrow();
  expect(
    brainWritingInput.safeParse({ text: "a".repeat(4001), nodeType: "note" })
      .success,
  ).toBe(false);
  expect(
    brainWritingInput.safeParse({ text: "A note", nodeType: "bank" }).success,
  ).toBe(false);
});
