import { expect, test } from "bun:test";
import { createElement, useState } from "react";
import { act, create } from "react-test-renderer";
import {
  _buildExportJson,
  _migrate,
  type StoredLayoutV1,
  type StoredLayoutV2,
  usePersistence,
} from "./usePersistence";
import type { PhysicalConfig, PlacedModule } from "../lib/types";

function createStorageMock(initial: Record<string, string> = {}): Storage {
  const store = new Map(Object.entries(initial));

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

test("_migrate: v1 -> v2 sets gap=0 and outer=238, preserves placed and timestamp", () => {
  const v1: StoredLayoutV1 = {
    version: 1,
    placed: [{ pid: "x", w: 3, d: 5, x: 0, y: 0, color: "#fff" }],
    timestamp: 12345,
  };

  const v2 = _migrate(v1);

  expect(v2.version).toBe(2);
  expect(v2.placed).toEqual(v1.placed);
  expect(v2.timestamp).toBe(12345);
  expect(v2.physical).toEqual({ gapMm: 0, outerMm: 238 });
});

test("_migrate: v2 -> v2 is identity", () => {
  const v2In: StoredLayoutV2 = {
    version: 2,
    placed: [{ pid: "x", w: 3, d: 5, x: 0, y: 0, color: "#fff" }],
    physical: { gapMm: 0.3, outerMm: 250 },
    timestamp: 99,
  };

  const out = _migrate(v2In);

  expect(out).toEqual(v2In);
});

test("usePersistence loads the stored layout before the first save", async () => {
  const v1: StoredLayoutV1 = {
    version: 1,
    placed: [{ pid: "x", w: 3, d: 5, x: 0, y: 0, color: "#fff" }],
    timestamp: 12345,
  };
  const defaultPhysical: PhysicalConfig = { gapMm: 0.3, outerMm: 238 };
  const storage = createStorageMock({
    "fib-grid-layout": JSON.stringify(v1),
  });
  const originalLocalStorage = globalThis.localStorage;

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });

  function Harness() {
    const [placed, setPlaced] = useState<PlacedModule[]>([]);
    const [physical, setPhysical] = useState<PhysicalConfig>(defaultPhysical);

    usePersistence(placed, physical, setPlaced, setPhysical);

    return null;
  }

  let renderer: ReturnType<typeof create> | undefined;

  try {
    await act(async () => {
      renderer = create(createElement(Harness));
    });

    expect(storage.getItem("fib-grid-layout")).toBe(JSON.stringify(v1));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1100));
    });

    const raw = storage.getItem("fib-grid-layout");
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toMatchObject({
      version: 2,
      placed: v1.placed,
      physical: { gapMm: 0, outerMm: 238 },
    });
  } finally {
    await act(async () => {
      renderer?.unmount();
    });

    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: originalLocalStorage,
    });
  }
});

test("_buildExportJson includes physical, built_mm, and position_mm", () => {
  const placed: PlacedModule[] = [{ pid: "p1", w: 3, d: 5, x: 2, y: 4, color: "#aabbcc" }];
  const physical: PhysicalConfig = { gapMm: 0.5, outerMm: 250 };

  const data = _buildExportJson(placed, physical);

  expect(data).toMatchObject({
    version: 2,
    gridSize: 34,
    unitMm: 7,
    physical: {
      gapMm: 0.5,
      outerMm: 250,
      wallMm: 6,
    },
    modules: [
      {
        id: "p1",
        nominal_mm: { w: 21, d: 35 },
        built_mm: { w: 20.5, d: 34.5 },
        position_mm: { x: 14.25, y: 28.25 },
        x: 2,
        y: 4,
        color: "#aabbcc",
      },
    ],
  });
});

test("usePersistence debounces saves and persists the latest slider value", async () => {
  const storage = createStorageMock();
  const originalSetItem = storage.setItem.bind(storage);
  let setItemCalls = 0;

  storage.setItem = (key: string, value: string) => {
    setItemCalls += 1;
    originalSetItem(key, value);
  };

  const originalLocalStorage = globalThis.localStorage;

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });

  function Harness({ placed, physical }: { placed: PlacedModule[]; physical: PhysicalConfig }) {
    usePersistence(
      placed,
      physical,
      () => {},
      () => {},
    );

    return null;
  }

  let renderer: ReturnType<typeof create> | undefined;

  try {
    await act(async () => {
      renderer = create(
        createElement(Harness, {
          placed: [],
          physical: { gapMm: 0.3, outerMm: 238 },
        }),
      );
    });

    await act(async () => {
      renderer!.update(
        createElement(Harness, {
          placed: [],
          physical: { gapMm: 0.4, outerMm: 238 },
        }),
      );
      renderer!.update(
        createElement(Harness, {
          placed: [],
          physical: { gapMm: 0.8, outerMm: 238 },
        }),
      );
    });

    expect(storage.getItem("fib-grid-layout")).toBe(null);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1100));
    });

    expect(setItemCalls).toBe(1);
    expect(JSON.parse(storage.getItem("fib-grid-layout")!)).toMatchObject({
      version: 2,
      placed: [],
      physical: { gapMm: 0.8, outerMm: 238 },
    });
  } finally {
    await act(async () => {
      renderer?.unmount();
    });

    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: originalLocalStorage,
    });
  }
});
