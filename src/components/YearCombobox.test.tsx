// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import YearCombobox from "./YearCombobox";

function Harness({ spy }: { spy: (v: string) => void }) {
  const [v, setV] = useState("");
  return (
    <YearCombobox
      value={v}
      onChange={(x) => {
        setV(x);
        spy(x);
      }}
      placeholder="Ano"
    />
  );
}

describe("YearCombobox", () => {
  it("aceita digitar o ano completo", () => {
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    fireEvent.change(screen.getByPlaceholderText("Ano"), { target: { value: "1990" } });
    expect(spy).toHaveBeenLastCalledWith("1990");
  });

  it("não aceita ano impossível nem letras", () => {
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    const input = screen.getByPlaceholderText("Ano") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "1800" } });
    expect(spy).toHaveBeenLastCalledWith("");
    fireEvent.change(input, { target: { value: "ab19x" } });
    expect(input.value).toBe("19");
    fireEvent.change(input, { target: { value: "2999" } });
    expect(spy).toHaveBeenLastCalledWith("");
  });

  it("a lista filtra pelo que foi digitado e dá para escolher tocando", () => {
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    const input = screen.getByPlaceholderText("Ano");
    fireEvent.focus(input);
    expect(screen.getAllByRole("option").length).toBeGreaterThan(50); // lista inteira para rolar
    fireEvent.change(input, { target: { value: "198" } });
    const opts = screen.getAllByRole("option").map((o) => o.textContent);
    expect(opts.length).toBe(10);
    expect(opts.every((y) => y!.startsWith("198"))).toBe(true);
    fireEvent.click(screen.getByText("1985"));
    expect(spy).toHaveBeenLastCalledWith("1985");
    expect((input as HTMLInputElement).value).toBe("1985");
  });
});
