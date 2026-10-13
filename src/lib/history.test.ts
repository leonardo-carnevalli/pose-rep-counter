import { afterEach, describe, expect, it, vi } from "vitest";
import { summarize } from "@/lib/exercises/summary";
import { clearHistory, readHistory, saveSession } from "./history";

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  };
}

const session = (minute: number) => summarize("squat", new Date(Date.UTC(2026, 9, 13, 10, minute)), []);

afterEach(() => vi.unstubAllGlobals());

describe("history", () => {
  it("saves sessions newest first, without duplicates, capped at 20", () => {
    vi.stubGlobal("localStorage", memoryStorage());
    for (let m = 0; m < 25; m++) saveSession(session(m));
    saveSession(session(24));
    const history = readHistory();
    expect(history).toHaveLength(20);
    expect(history[0]!.id).toBe(session(24).id);
    clearHistory();
    expect(readHistory()).toEqual([]);
  });

  it("drops corrupted or foreign entries", () => {
    const storage = memoryStorage();
    vi.stubGlobal("localStorage", storage);
    storage.setItem("pose-rep-counter:history:v1", JSON.stringify([{ id: 1 }, session(1)]));
    expect(readHistory()).toHaveLength(1);
    storage.setItem("pose-rep-counter:history:v1", "{not json");
    expect(readHistory()).toEqual([]);
  });

  it("keeps working when storage throws", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    });
    expect(readHistory()).toEqual([]);
    expect(saveSession(session(1))).toHaveLength(1);
    expect(() => clearHistory()).not.toThrow();
  });
});
