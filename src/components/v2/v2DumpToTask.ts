import { removeV2DumpItem, type V2DumpItem } from "./v2Dump";
import { emptyDraft, type V2Task } from "./v2Tasks";

export type PromoteDumpItemToTaskResult = {
  dumpItems: V2DumpItem[];
  tasks: V2Task[];
  task: V2Task;
};

/** Dump-item → taak zonder microstappen. Dump verdwijnt. */
export function promoteDumpItemToTask(
  item: V2DumpItem,
  dumpItems: V2DumpItem[],
  tasks: V2Task[],
): PromoteDumpItemToTaskResult {
  const task: V2Task = { ...emptyDraft(), title: item.content };
  return {
    dumpItems: removeV2DumpItem(item.id, dumpItems),
    tasks: [...tasks, task],
    task,
  };
}
