import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SavedFilters from "./SavedFilters";

describe("SavedFilters", () => {
  beforeEach(() => localStorage.clear());

  it("saves, loads, and removes a named filter", async () => {
    const onLoad = vi.fn();
    render(<SavedFilters storageKey="test-filters" value={{ search: "paracetamol", category: "Analgesic" }} onLoad={onLoad} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Saved filter name" }), { target: { value: "Analgesics" } });
    fireEvent.click(screen.getByRole("button", { name: "Save current filter" }));
    await waitFor(() => expect(JSON.parse(localStorage.getItem("test-filters"))).toEqual([
      { name: "Analgesics", value: { search: "paracetamol", category: "Analgesic" } },
    ]));

    fireEvent.change(screen.getByRole("combobox", { name: "Load saved filter" }), { target: { value: "Analgesics" } });
    expect(onLoad).toHaveBeenCalledWith({ search: "paracetamol", category: "Analgesic" });
    fireEvent.click(screen.getByRole("button", { name: "Delete selected saved filter" }));
    expect(JSON.parse(localStorage.getItem("test-filters"))).toEqual([]);
  });
});
