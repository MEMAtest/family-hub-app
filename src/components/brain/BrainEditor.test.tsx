import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import CreateNodeModal from "./CreateNodeModal";
import NodeDetailPanel from "./NodeDetailPanel";
import { useBrainContext } from "@/contexts/familyHub/BrainContext";

jest.mock("@/contexts/familyHub/BrainContext", () => ({
  useBrainContext: jest.fn(),
}));
jest.mock("@/hooks/useMediaQuery", () => ({ useMediaQuery: () => false }));
const createNode = jest.fn().mockResolvedValue({});
const updateNode = jest.fn().mockResolvedValue({});
const base = {
  isCreateNodeOpen: true,
  setIsCreateNodeOpen: jest.fn(),
  createNode,
};
beforeEach(() => {
  jest.clearAllMocks();
  (useBrainContext as jest.Mock).mockReturnValue(base);
});

test("subject auto-fills while typing, stays manual once edited and resumes when cleared", () => {
  render(<CreateNodeModal />);
  const body = screen.getByPlaceholderText(
    "Write the note, checklist, or linked thought...",
  );
  fireEvent.change(body, {
    target: { value: "Book the plumber. Check the quote first." },
  });
  expect(screen.getByLabelText("Note title")).toHaveValue("Book the plumber.");
  fireEvent.change(screen.getByLabelText("Note title"), {
    target: { value: "Bathroom repairs" },
  });
  fireEvent.change(body, { target: { value: "A changed note" } });
  expect(screen.getByLabelText("Note title")).toHaveValue("Bathroom repairs");
  fireEvent.change(screen.getByLabelText("Note title"), {
    target: { value: "" },
  });
  fireEvent.change(body, { target: { value: "Check the cistern" } });
  expect(screen.getByLabelText("Note title")).toHaveValue("Check the cistern");
  expect(screen.getByRole("dialog", { name: "Add note" })).toHaveAttribute(
    "aria-modal",
    "true",
  );
});

test("rapid edits to title and body are saved together when details close", () => {
  (useBrainContext as jest.Mock).mockReturnValue({
    nodes: [
      {
        id: "note",
        title: "Before",
        content: "Before body",
        status: "todo",
        priority: "medium",
        nodeType: "note",
        tags: [],
        dueDate: null,
      },
    ],
    selectedNodeId: "note",
    isNodeDetailOpen: true,
    setIsNodeDetailOpen: jest.fn(),
    updateNode,
    deleteNode: jest.fn(),
    selectNode: jest.fn(),
    linksByNodeId: {},
    backlinksByNodeId: {},
    mentionSuggestionsByNodeId: {},
  });
  render(<NodeDetailPanel />);
  fireEvent.change(screen.getByLabelText("Note title"), {
    target: { value: "After title" },
  });
  fireEvent.change(
    screen.getByPlaceholderText("Add notes (markdown supported)..."),
    { target: { value: "After body" } },
  );
  fireEvent.click(screen.getByRole("button", { name: "Close note details" }));
  expect(updateNode).toHaveBeenCalledWith("note", {
    title: "After title",
    content: "After body",
  });
});
