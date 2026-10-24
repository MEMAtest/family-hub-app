import React, { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { BrainContentField, BrainTitleField } from "./BrainWritingFields";
import { useBrainWritingAssist } from "./useBrainWritingAssist";

function Editor({
  protect = false,
  enabled = true,
  nodeType = "note",
  initialTitle = "",
  initialContent = "",
}) {
  const [title, setTitle] = useState(initialTitle),
    [content, setContent] = useState(initialContent);
  const assist = useBrainWritingAssist({
    identity: "draft",
    enabled,
    protectTitle: protect,
    title,
    content,
    nodeType,
    onTitle: setTitle,
    onContent: setContent,
  });
  return (
    <>
      <BrainTitleField assist={assist} />
      <BrainContentField assist={assist} placeholder="Draft" />
    </>
  );
}
const result = (
  title = "Arrange boiler inspection",
  content = "Book a boiler inspection and ask for a quote.",
) => ({
  ok: true,
  json: async () => ({ source: "ai", draft: { title, content } }),
});
const pause = async () => {
  await act(async () => {
    jest.advanceTimersByTime(1800);
  });
};
const originalFetch = global.fetch;
beforeEach(() => {
  jest.useFakeTimers();
  global.fetch = jest.fn().mockResolvedValue(result());
});
afterEach(() => {
  jest.useRealTimers();
  global.fetch = originalFetch;
});

test("one automatic pass titles the draft after a pause and polishes only after leaving the field, with undo", async () => {
  render(<Editor />);
  const notes = screen.getByLabelText("Notes");
  fireEvent.focus(notes);
  fireEvent.change(notes, {
    target: { value: "book boiler inspetion and ask for qoute" },
  });
  await pause();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText("Note title")).toHaveValue(
    "Arrange boiler inspection",
  );
  expect(notes).toHaveValue("book boiler inspetion and ask for qoute");
  await act(async () => {
    fireEvent.blur(notes);
  });
  expect(notes).toHaveValue("Book a boiler inspection and ask for a quote.");
  fireEvent.click(screen.getByRole("button", { name: "Undo AI changes" }));
  expect(notes).toHaveValue("book boiler inspetion and ask for qoute");
  expect(screen.getByLabelText("Note title")).toHaveValue(
    "book boiler inspetion and ask for qoute",
  );
  await pause();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(
    screen.queryByRole("button", { name: "AI enhance" }),
  ).not.toBeInTheDocument();
});

test("editing an existing task automatically offers a subject without overwriting a custom title", async () => {
  render(
    <Editor
      protect
      initialTitle="My boiler plan"
      initialContent="Old note"
      nodeType="task"
    />,
  );
  await pause();
  expect(fetch).not.toHaveBeenCalled();
  const notes = screen.getByLabelText("Notes");
  fireEvent.change(notes, {
    target: { value: "book boiler inspetion and ask for qoute" },
  });
  await act(async () => {
    fireEvent.blur(notes);
  });
  expect(screen.getByLabelText("Note title")).toHaveValue("My boiler plan");
  expect(screen.getByText("Arrange boiler inspection")).toBeVisible();
  expect(JSON.parse((fetch as jest.Mock).mock.calls[0][1].body).nodeType).toBe(
    "task",
  );
  fireEvent.click(screen.getByRole("button", { name: "Use title" }));
  expect(screen.getByLabelText("Note title")).toHaveValue(
    "Arrange boiler inspection",
  );
});

test("late results cannot replace newer text or a newly typed title", async () => {
  let resolve!: (value: unknown) => void;
  (fetch as jest.Mock).mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  render(<Editor />);
  const notes = screen.getByLabelText("Notes");
  fireEvent.change(notes, { target: { value: "First draft about boiler" } });
  await pause();
  fireEvent.change(notes, { target: { value: "Newer draft about windows" } });
  fireEvent.change(screen.getByLabelText("Note title"), {
    target: { value: "My windows" },
  });
  await act(async () => {
    resolve(result("Boiler", "Old boiler text"));
  });
  expect(notes).toHaveValue("Newer draft about windows");
  expect(screen.getByLabelText("Note title")).toHaveValue("My windows");
  (fetch as jest.Mock).mockResolvedValueOnce(
    result("Windows quote", "Ask for a windows quote."),
  );
  await act(async () => {
    fireEvent.blur(notes);
  });
  expect(notes).toHaveValue("Ask for a windows quote.");
  expect(screen.getByLabelText("Note title")).toHaveValue("My windows");
});

test("unavailable AI keeps text and does not repeatedly retry without a new edit or explicit retry", async () => {
  (fetch as jest.Mock).mockResolvedValueOnce({
    ok: false,
    json: async () => ({ error: "Refinement unavailable." }),
  });
  render(<Editor />);
  const notes = screen.getByLabelText("Notes");
  fireEvent.change(notes, { target: { value: "My original boiler draft" } });
  await pause();
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Refinement unavailable.",
  );
  fireEvent.blur(notes);
  await pause();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(notes).toHaveValue("My original boiler draft");
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Retry refinement" }));
  });
  expect(notes).toHaveValue("Book a boiler inspection and ask for a quote.");
});

test("closing an editor cancels pending work and opening saved content never starts a rewrite", async () => {
  let resolve!: (value: unknown) => void;
  (fetch as jest.Mock).mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const { rerender } = render(<Editor initialContent="Saved original" />);
  await pause();
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Notes"), {
    target: { value: "Edited original" },
  });
  await pause();
  rerender(<Editor initialContent="Saved original" enabled={false} />);
  await act(async () => {
    resolve(result());
  });
  expect(screen.getByLabelText("Notes")).toHaveValue("Edited original");
});

test("dictation/composition does not refine a half-composed word", async () => {
  render(<Editor />);
  const notes = screen.getByLabelText("Notes");
  fireEvent.compositionStart(notes);
  fireEvent.change(notes, { target: { value: "Book a boiler inspection" } });
  await pause();
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.compositionEnd(notes);
  await pause();
  expect(fetch).toHaveBeenCalledTimes(1);
});

test('switching a draft from note to task cancels the old request and uses task context', async () => {
  let resolve!: (value: unknown) => void;
  (fetch as jest.Mock).mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  const { rerender } = render(<Editor />);
  fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'Arrange boiler inspection' } });
  await pause();
  rerender(<Editor nodeType="task" />);
  await act(async () => { resolve(result('Wrong old note title', 'Old note wording')); });
  await pause();
  expect(JSON.parse((fetch as jest.Mock).mock.calls[1][1].body).nodeType).toBe('task');
  expect(screen.getByLabelText('Note title')).toHaveValue('Arrange boiler inspection');
  expect(screen.getByLabelText('Notes')).toHaveValue('Book a boiler inspection and ask for a quote.');
});
