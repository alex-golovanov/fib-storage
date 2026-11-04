import { expect, test } from "bun:test";
import { createElement, useState } from "react";
import { act, create } from "react-test-renderer";
import type { PlacedModule } from "../lib/types";
import { useUndoRedo } from "./useUndoRedo";

const first: PlacedModule = {
  pid: "first",
  w: 3,
  d: 13,
  x: 0,
  y: 0,
  color: "#fff",
};
const second: PlacedModule = {
  pid: "second",
  w: 3,
  d: 13,
  x: 5,
  y: 0,
  color: "#000",
};
const third: PlacedModule = {
  pid: "third",
  w: 3,
  d: 13,
  x: 10,
  y: 0,
  color: "#aaa",
};

test("history immediately restores each edit and invalidates redo after a new edit", async () => {
  let current: {
    placed: PlacedModule[];
    add: (module: PlacedModule) => void;
    clear: () => void;
    undo: () => void;
    redo: () => void;
  };

  function Harness() {
    const [placed, setPlaced] = useState<PlacedModule[]>([]);
    const history = useUndoRedo({ placed, load: setPlaced });
    current = {
      placed,
      add: (module) => {
        history.pushHistory();
        setPlaced((prev) => [...prev, module]);
      },
      clear: () => {
        history.pushHistory();
        setPlaced([]);
      },
      undo: history.undo,
      redo: history.redo,
    };
    return null;
  }

  let renderer: ReturnType<typeof create> | undefined;
  try {
    await act(async () => {
      renderer = create(createElement(Harness));
    });
    await act(async () => {
      current.add(first);
    });
    await act(async () => {
      current.add(second);
    });
    expect(current!.placed).toEqual([first, second]);

    await act(async () => {
      current.undo();
    });
    expect(current!.placed).toEqual([first]);
    await act(async () => {
      current.redo();
    });
    expect(current!.placed).toEqual([first, second]);

    await act(async () => {
      current.clear();
    });
    expect(current!.placed).toEqual([]);
    await act(async () => {
      current.undo();
    });
    expect(current!.placed).toEqual([first, second]);
    await act(async () => {
      current.undo();
    });
    expect(current!.placed).toEqual([first]);
    await act(async () => {
      current.add(third);
    });
    await act(async () => {
      current.redo();
    });
    expect(current!.placed).toEqual([first, third]);
  } finally {
    await act(async () => {
      renderer?.unmount();
    });
  }
});
