import { describe, expect, it } from "vitest";

import { removeV2DumpItem, type V2DumpItem } from "./v2Dump";
import { promoteDumpItemToTask } from "./v2DumpToTask";
import { emptyDraft, type V2Task } from "./v2Tasks";

function dumpItem(
  partial: Partial<V2DumpItem> & { content: string },
): V2DumpItem {
  return {
    id: partial.id ?? `dump-${partial.content}`,
    content: partial.content,
    createdAt: partial.createdAt ?? "2026-09-01T10:00:00.000Z",
    disposition: partial.disposition ?? null,
    source: partial.source,
  };
}

function existingTask(title: string): V2Task {
  return { ...emptyDraft(), id: `keep-${title}`, title };
}

describe("dump plus", () => {
  it("maakt taak zonder microstappen en verwijdert het dump-item", () => {
    const item = dumpItem({ id: "d1", content: "Bel de garage" });
    const other = dumpItem({ id: "d2", content: "Was ophangen" });
    const kept = existingTask("Boodschappen");

    const result = promoteDumpItemToTask(item, [item, other], [kept]);

    expect(result.dumpItems.map((d) => d.id)).toEqual(["d2"]);
    expect(result.task.title).toBe("Bel de garage");
    expect(result.task.microSteps).toEqual([]);
    expect(result.tasks).toHaveLength(2);
    expect(result.tasks[0].id).toBe(kept.id);
    expect(result.tasks[1].id).toBe(result.task.id);
    expect(result.tasks[1].microSteps).toEqual([]);
  });

  it("heeft geen stappenpreview: plus is één persist zonder stappen", () => {
    const item = dumpItem({ id: "d1", content: "Verzekering opzeggen" });
    const dumpItems = [item];
    const tasks: V2Task[] = [];

    const result = promoteDumpItemToTask(item, dumpItems, tasks);

    expect(result.dumpItems).toHaveLength(0);
    expect(result.task.title).toBe("Verzekering opzeggen");
    expect(result.task.microSteps).toEqual([]);
    expect(result.tasks).toHaveLength(1);
    expect(dumpItems.map((d) => d.id)).toEqual(["d1"]);
    expect(tasks).toEqual([]);
  });
});

describe("remove dump item (kruis)", () => {
  it("kruis verwijdert het dump-item en laat de rest staan", () => {
    const a = dumpItem({ id: "a", content: "een" });
    const b = dumpItem({ id: "b", content: "twee" });
    const next = removeV2DumpItem("a", [a, b]);
    expect(next.map((item) => item.id)).toEqual(["b"]);
    expect(next.find((item) => item.id === "a")).toBeUndefined();
  });
});
