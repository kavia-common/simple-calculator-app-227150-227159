"use client";

import React, { useEffect, useMemo, useState } from "react";

type Operator = "+" | "-" | "×" | "÷";
type Phase = "input" | "result" | "error";

function isDigitKey(key: string): boolean {
  return /^[0-9]$/.test(key);
}

function formatNumberForDisplay(value: number): string {
  // Avoid scientific notation for typical calculator ranges; keep it simple.
  // Also normalize -0 to 0.
  if (Object.is(value, -0)) return "0";
  const asString = String(value);
  return asString;
}

function applyOperator(a: number, b: number, op: Operator): number | "DIV0" {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      if (b === 0) return "DIV0";
      return a / b;
  }
}

export default function Home() {
  const [display, setDisplay] = useState<string>("0");
  const [phase, setPhase] = useState<Phase>("input");

  // Running accumulator and pending operator (sequential evaluation).
  const [acc, setAcc] = useState<number | null>(null);
  const [pendingOp, setPendingOp] = useState<Operator | null>(null);

  // When pressing "=" repeatedly, repeat last operation: result (op) lastOperand
  const [lastOp, setLastOp] = useState<Operator | null>(null);
  const [lastOperand, setLastOperand] = useState<number | null>(null);

  const isError = phase === "error";

  const ariaDisplayLabel = useMemo(() => {
    if (isError) return "Calculator display. Error.";
    return "Calculator display.";
  }, [isError]);

  function resetAll() {
    setDisplay("0");
    setPhase("input");
    setAcc(null);
    setPendingOp(null);
    setLastOp(null);
    setLastOperand(null);
  }

  function setError() {
    setDisplay("Error");
    setPhase("error");
    // Keep acc/pending state as-is; user can Clear to reset.
  }

  function currentDisplayNumber(): number {
    // If display is incomplete like "-" or "0.", Number() still works.
    // Guard error states elsewhere.
    const n = Number(display);
    if (Number.isNaN(n)) return 0;
    return n;
  }

  function inputDigit(digit: string) {
    if (isError) return;

    // If we just produced a result and user types a digit, start new expression.
    if (phase === "result") {
      setDisplay(digit);
      setPhase("input");
      setAcc(null);
      setPendingOp(null);
      setLastOp(null);
      setLastOperand(null);
      return;
    }

    setDisplay((prev) => {
      if (prev === "0") return digit;
      if (prev === "-0") return `-${digit}`;
      return prev + digit;
    });
  }

  function inputDecimal() {
    if (isError) return;

    if (phase === "result") {
      // Start new number after result.
      setDisplay("0.");
      setPhase("input");
      setAcc(null);
      setPendingOp(null);
      setLastOp(null);
      setLastOperand(null);
      return;
    }

    setDisplay((prev) => {
      if (prev.includes(".")) return prev; // prevent multiple decimals in a number
      if (prev === "" || prev === "-") return `${prev}0.`;
      return prev + ".";
    });
  }

  function deleteOne() {
    if (isError) return;

    if (phase === "result") {
      // Treat delete after result as starting to edit the result.
      setPhase("input");
    }

    setDisplay((prev) => {
      if (prev.length <= 1) return "0";
      const next = prev.slice(0, -1);
      // If user deletes down to just "-", normalize to "0".
      if (next === "-" || next === "") return "0";
      return next;
    });
  }

  function toggleSign() {
    if (isError) return;

    if (phase === "result") {
      // toggling sign on result should keep it as a result but editable
      setPhase("input");
    }

    setDisplay((prev) => {
      if (prev === "0") return "-0";
      if (prev === "-0") return "0";
      if (prev.startsWith("-")) return prev.slice(1);
      return `-${prev}`;
    });
  }

  function chooseOperator(op: Operator) {
    if (isError) return;

    // If we have a fresh result and choose an operator, keep the result as accumulator.
    const inputVal = currentDisplayNumber();

    if (acc === null) {
      setAcc(inputVal);
      setPendingOp(op);
      setPhase("result"); // operator selection "commits" current input
      // choosing an operator resets chained equals memory
      setLastOp(null);
      setLastOperand(null);
      return;
    }

    if (pendingOp === null) {
      // Replace operator when there is an accumulator but no pending op (rare, but safe).
      setPendingOp(op);
      setPhase("result");
      setLastOp(null);
      setLastOperand(null);
      return;
    }

    // Sequential evaluation: apply previous op with current input.
    const result = applyOperator(acc, inputVal, pendingOp);
    if (result === "DIV0") {
      setError();
      return;
    }

    setAcc(result);
    setPendingOp(op);
    setDisplay(formatNumberForDisplay(result));
    setPhase("result");
    setLastOp(null);
    setLastOperand(null);
  }

  function equals() {
    if (isError) return;

    // If there is no pending operator, "=" should repeat last operation if available,
    // otherwise it's a no-op (keep current number).
    if (pendingOp === null || acc === null) {
      if (lastOp !== null && lastOperand !== null) {
        const base = currentDisplayNumber();
        const next = applyOperator(base, lastOperand, lastOp);
        if (next === "DIV0") {
          setError();
          return;
        }
        setDisplay(formatNumberForDisplay(next));
        setPhase("result");
        // keep lastOp/lastOperand for further chaining
      } else {
        setPhase("result");
      }
      return;
    }

    const inputVal = currentDisplayNumber();
    const result = applyOperator(acc, inputVal, pendingOp);
    if (result === "DIV0") {
      setError();
      return;
    }

    setDisplay(formatNumberForDisplay(result));
    setPhase("result");

    // For chaining equals, remember the operation and the right operand used.
    setLastOp(pendingOp);
    setLastOperand(inputVal);

    // After equals, clear pending op and accumulator: display becomes the base.
    setAcc(null);
    setPendingOp(null);
  }

  // Keyboard support
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const { key } = e;

      if (key === "Escape") {
        e.preventDefault();
        resetAll();
        return;
      }

      if (isDigitKey(key)) {
        e.preventDefault();
        inputDigit(key);
        return;
      }

      if (key === ".") {
        e.preventDefault();
        inputDecimal();
        return;
      }

      if (key === "Backspace") {
        e.preventDefault();
        deleteOne();
        return;
      }

      if (key === "Enter" || key === "=") {
        e.preventDefault();
        equals();
        return;
      }

      if (key === "+") {
        e.preventDefault();
        chooseOperator("+");
        return;
      }
      if (key === "-") {
        e.preventDefault();
        chooseOperator("-");
        return;
      }
      if (key === "*") {
        e.preventDefault();
        chooseOperator("×");
        return;
      }
      if (key === "/") {
        e.preventDefault();
        chooseOperator("÷");
        return;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // Intentionally depend on stateful handlers via stable closures created per render.
  });

  const buttons: Array<
    | { kind: "digit"; label: string; aria: string; span?: number }
    | { kind: "action"; label: string; aria: string; tone?: "primary" | "accent" | "danger"; span?: number }
    | { kind: "op"; label: Operator; aria: string; tone?: "primary" | "accent"; span?: number }
  > = [
    { kind: "action", label: "C", aria: "Clear", tone: "danger" },
    { kind: "action", label: "⌫", aria: "Delete last digit", tone: "accent" },
    { kind: "action", label: "±", aria: "Toggle sign", tone: "accent" },
    { kind: "op", label: "÷", aria: "Divide", tone: "primary" },

    { kind: "digit", label: "7", aria: "Seven" },
    { kind: "digit", label: "8", aria: "Eight" },
    { kind: "digit", label: "9", aria: "Nine" },
    { kind: "op", label: "×", aria: "Multiply", tone: "primary" },

    { kind: "digit", label: "4", aria: "Four" },
    { kind: "digit", label: "5", aria: "Five" },
    { kind: "digit", label: "6", aria: "Six" },
    { kind: "op", label: "-", aria: "Subtract", tone: "primary" },

    { kind: "digit", label: "1", aria: "One" },
    { kind: "digit", label: "2", aria: "Two" },
    { kind: "digit", label: "3", aria: "Three" },
    { kind: "op", label: "+", aria: "Add", tone: "primary" },

    { kind: "digit", label: "0", aria: "Zero", span: 2 },
    { kind: "digit", label: ".", aria: "Decimal point" },
    { kind: "action", label: "=", aria: "Equals", tone: "primary" },
  ];

  function toneClasses(tone?: "primary" | "accent" | "danger") {
    switch (tone) {
      case "primary":
        return "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-400";
      case "accent":
        return "bg-amber-500 text-white hover:bg-amber-600 focus-visible:ring-amber-300";
      case "danger":
        return "bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-300";
      default:
        return "bg-white text-slate-900 hover:bg-slate-50 focus-visible:ring-blue-300";
    }
  }

  return (
    <main className="min-h-screen px-4 py-10 flex items-center justify-center">
      <section
        className="w-full max-w-sm sm:max-w-md"
        aria-label="Calculator"
      >
        <div className="rounded-2xl bg-white shadow-lg ring-1 ring-slate-200/70 overflow-hidden">
          <header className="px-5 pt-5 pb-4">
            <h1 className="text-slate-900 text-lg font-semibold tracking-tight">
              Ocean Calculator
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Keyboard: 0–9, ., + − * /, Enter, Backspace
            </p>
          </header>

          <div className="px-5 pb-5">
            <div
              role="status"
              aria-live="polite"
              aria-label={ariaDisplayLabel}
              className={[
                "w-full rounded-xl px-4 py-4",
                "bg-slate-50 ring-1 ring-slate-200",
                "text-right font-mono tabular-nums",
                "shadow-inner",
                isError ? "ring-red-300 bg-red-50 text-red-600" : "text-slate-900",
              ].join(" ")}
            >
              <div className="text-3xl sm:text-4xl leading-none break-all select-text">
                {display}
              </div>
              <div className="mt-2 text-xs text-slate-500 flex justify-between">
                <span>
                  {pendingOp ? `Pending: ${pendingOp}` : lastOp ? `Repeat: ${lastOp}` : "Ready"}
                </span>
                <span>{isError ? "Press C to clear" : "\u00A0"}</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-3">
              {buttons.map((b, idx) => {
                const span = b.span ?? 1;

                const base =
                  "h-12 sm:h-13 rounded-xl shadow-sm ring-1 ring-slate-200 " +
                  "transition-colors active:translate-y-[1px] active:shadow-none " +
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white " +
                  "disabled:opacity-60 disabled:cursor-not-allowed";

                const className =
                  base + " " + toneClasses("tone" in b ? b.tone : undefined);

                const style =
                  span > 1
                    ? ({ gridColumn: `span ${span} / span ${span}` } as React.CSSProperties)
                    : undefined;

                let onClick: (() => void) | undefined;

                if (b.kind === "digit") {
                  onClick = () => {
                    if (b.label === ".") inputDecimal();
                    else inputDigit(b.label);
                  };
                } else if (b.kind === "op") {
                  onClick = () => chooseOperator(b.label);
                } else {
                  if (b.label === "C") onClick = resetAll;
                  else if (b.label === "⌫") onClick = deleteOne;
                  else if (b.label === "±") onClick = toggleSign;
                  else if (b.label === "=") onClick = equals;
                }

                const disabled = isError && b.label !== "C";

                return (
                  <button
                    key={`${b.kind}-${b.label}-${idx}`}
                    type="button"
                    className={className}
                    style={style}
                    onClick={onClick}
                    aria-label={b.aria}
                    disabled={disabled}
                  >
                    <span className="text-lg font-semibold">{b.label}</span>
                  </button>
                );
              })}
            </div>

            <footer className="mt-5 text-xs text-slate-500">
              <p>
                Sequential operations: <span className="font-medium text-slate-700">2 + 3 × 4</span>{" "}
                applies operators in order entered.
              </p>
            </footer>
          </div>
        </div>
      </section>
    </main>
  );
}
