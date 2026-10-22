import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EmptyState from "./EmptyState";

describe("EmptyState", () => {
  it("shows its empty-state copy and runs the supplied action", () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        title="No batches"
        message="Receive stock to get started."
        action={<button onClick={onClick}>Receive stock</button>}
      />,
    );

    expect(screen.getByText("No batches")).toBeInTheDocument();
    expect(screen.getByText("Receive stock to get started.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Receive stock" }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
