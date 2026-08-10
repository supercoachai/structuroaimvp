import { describe, expect, it } from "vitest";

import type { Task } from "@/context/TaskContext";
import type { ParkedThought } from "@/lib/supabase/parkedThoughtsDb";
import type { V2DumpItem } from "@/components/v2/v2Dump";
import type { V2Task } from "@/components/v2/v2Tasks";
import {
  mergeRemoteDumpIntoLocal,
  mergeRemoteTasksIntoLocal,
  supabaseTaskToV2Task,
} from "./v2SupabaseSync";

function remoteTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "r1",
    title: "Remote taak",
    done: false,
    started: false,
    priority: null,
    source: "regular",
    postponedTo: null,
    focusStartedAt: null,
    focusExitedAt: null,
    focusAttempts: 0,
    reminders: [],
    repeat: "none",
    repeatWeekdays: "all",
    impact: "🌱",
    energyLevel: "medium",
    microSteps: [],
    notToday: false,
    created_at: "2026-07-28T09:00:00.000Z",
    ...overrides,
  } as Task;
}

function localTask(overrides: Partial<V2Task> = {}): V2Task {
  return {
    id: "l1",
    title: "Lokale taak",
    done: false,
    completedDate: null,
    dueDate: null,
    repeat: "none",
    repeatIntervalDays: null,
    priority: null,
    energy: null,
    microSteps: [],
    why: null,
    outcome: null,
    snoozeUntil: null,
    durationBucket: null,
    createdAt: "2026-07-28T10:00:00.000Z",
    ...overrides,
  };
}

describe("supabaseTaskToV2Task", () => {
  it("mapt kernvelden en herhaling terug naar het v2-model", () => {
    const task = supabaseTaskToV2Task(
      remoteTask({
        title: "Was ophangen",
        priority: 2,
        energyLevel: "low",
        dueAt: "2026-07-30T12:00:00.000Z",
        repeat: "daily",
        repeatWeekdays: "weekdays",
        notToday: true,
      }),
      "sb-r1"
    );
    expect(task.id).toBe("sb-r1");
    expect(task.title).toBe("Was ophangen");
    expect(task.priority).toBe(2);
    expect(task.energy).toBe("low");
    expect(task.dueDate).toBe("2026-07-30");
    expect(task.repeat).toBe("weekdays");
    expect(task.snoozeUntil).toBe("rest");
  });

  it("houdt done + completedDate van vandaag intact", () => {
    const today = new Date().toISOString();
    const task = supabaseTaskToV2Task(
      remoteTask({ done: true, completedAt: today }),
      "sb-r1"
    );
    expect(task.done).toBe(true);
    expect(task.completedDate).toBe(today.slice(0, 10));
  });
});

describe("mergeRemoteTasksIntoLocal", () => {
  it("voegt remote taken toe op een leeg apparaat (uitloggen / 2e device)", () => {
    const { tasks, map } = mergeRemoteTasksIntoLocal(
      [],
      [remoteTask({ id: "r1" }), remoteTask({ id: "r2", title: "Tweede" })],
      {}
    );
    expect(tasks).toHaveLength(2);
    expect(map["sb-r1"]).toBe("r1");
    expect(map["sb-r2"]).toBe("r2");
  });

  it("laat remote winnen voor gemapte taken en verwijdert elders verwijderde", () => {
    const local = [
      localTask({ id: "l1", title: "Oude titel" }),
      localTask({ id: "l2", title: "Elders verwijderd" }),
    ];
    const { tasks } = mergeRemoteTasksIntoLocal(
      local,
      [remoteTask({ id: "r1", title: "Nieuwe titel" })],
      { l1: "r1", l2: "r-weg" }
    );
    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe("l1");
    expect(tasks[0].title).toBe("Nieuwe titel");
  });

  it("bewaart lokale taken zonder mapping (nog niet gepusht)", () => {
    const { tasks, map } = mergeRemoteTasksIntoLocal(
      [localTask({ id: "nieuw", title: "Net gemaakt" })],
      [remoteTask({ id: "r1" })],
      {}
    );
    expect(tasks.map((t) => t.id).sort()).toEqual(["nieuw", "sb-r1"]);
    expect(map["nieuw"]).toBeUndefined();
  });

  it("voorkomt dubbele open rijen met dezelfde titel (seed + remote)", () => {
    const { tasks, map } = mergeRemoteTasksIntoLocal(
      [localTask({ id: "seed", title: "💊 ritalin (10 mg)" })],
      [
        remoteTask({ id: "r1", title: "💊 ritalin (10 mg)" }),
        remoteTask({ id: "r2", title: "💊 ritalin (10 mg)" }),
        remoteTask({ id: "r3", title: "Declaraties doen" }),
      ],
      {}
    );
    const open = tasks.filter((t) => !t.done);
    expect(open).toHaveLength(2);
    expect(open.map((t) => t.title).sort()).toEqual([
      "Declaraties doen",
      "💊 ritalin (10 mg)",
    ]);
    expect(map.seed).toBe("r1");
    expect(map["sb-r3"]).toBe("r3");
  });

  it("praagt oude done-taken weg bij hydratie", () => {
    const { tasks } = mergeRemoteTasksIntoLocal(
      [],
      [
        remoteTask({
          id: "r1",
          done: true,
          completedAt: "2026-07-01T12:00:00.000Z",
        }),
        remoteTask({ id: "r2", title: "Open taak" }),
      ],
      {}
    );
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe("Open taak");
  });
});

describe("mergeRemoteDumpIntoLocal", () => {
  const thought = (id: string, content = "Gedachte"): ParkedThought => ({
    id,
    content,
    convertedToTaskId: null,
    createdAt: "2026-07-28T09:00:00.000Z",
  });

  it("voegt remote gedachten toe op een leeg apparaat", () => {
    const { items, map } = mergeRemoteDumpIntoLocal([], [thought("t1")], {});
    expect(items).toHaveLength(1);
    expect(items[0].content).toBe("Gedachte");
    expect(map["sbd-t1"]).toBe("t1");
  });

  it("behoudt lokale metadata voor gemapte items en ruimt elders verwijderde op", () => {
    const local: V2DumpItem[] = [
      {
        id: "d1",
        content: "Oud",
        createdAt: "2026-07-28T09:00:00.000Z",
        disposition: "rest",
      },
      {
        id: "d2",
        content: "Weg",
        createdAt: "2026-07-28T09:05:00.000Z",
        disposition: null,
      },
    ];
    const { items } = mergeRemoteDumpIntoLocal(
      local,
      [thought("t1", "Nieuwe content")],
      { d1: "t1", d2: "t-weg" }
    );
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("d1");
    expect(items[0].content).toBe("Nieuwe content");
    expect(items[0].disposition).toBe("rest");
  });

  it("bewaart lokale items zonder mapping", () => {
    const local: V2DumpItem[] = [
      {
        id: "vers",
        content: "Nog niet gepusht",
        createdAt: "2026-07-29T09:00:00.000Z",
        disposition: null,
      },
    ];
    const { items } = mergeRemoteDumpIntoLocal(local, [thought("t1")], {});
    expect(items.map((i) => i.id).sort()).toEqual(["sbd-t1", "vers"]);
  });
});
