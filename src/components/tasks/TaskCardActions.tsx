"use client";

import {
  PlayIcon,
  PencilSquareIcon,
  TrashIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

type TaskCardActionsProps = {
  onPlay: () => void;
  onEdit: () => void;
  onDelete: () => void;
  playLabel: string;
  editLabel: string;
  deleteLabel: string;
  onComplete?: () => void;
  completeLabel?: string;
  completing?: boolean;
  completePop?: boolean;
};

const iconBtn =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50 active:scale-[0.97]";

export default function TaskCardActions({
  onPlay,
  onEdit,
  onDelete,
  playLabel,
  editLabel,
  deleteLabel,
  onComplete,
  completeLabel,
  completing = false,
  completePop = false,
}: TaskCardActionsProps) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onPlay();
        }}
        className={`${iconBtn} border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100`}
        title={playLabel}
        aria-label={playLabel}
      >
        <PlayIcon className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className={`${iconBtn} hover:border-blue-200 hover:text-blue-600`}
        title={editLabel}
        aria-label={editLabel}
      >
        <PencilSquareIcon className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className={`${iconBtn} hover:border-red-200 hover:bg-red-50 hover:text-red-600`}
        title={deleteLabel}
        aria-label={deleteLabel}
      >
        <TrashIcon className="h-4 w-4" aria-hidden />
      </button>
      {onComplete ? (
        <button
          type="button"
          disabled={completing}
          aria-busy={completing}
          onClick={(e) => {
            e.stopPropagation();
            onComplete();
          }}
          className={`${iconBtn} border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:pointer-events-none ${
            completePop ? "scale-125" : "scale-100"
          } transition-transform duration-200`}
          title={completeLabel}
          aria-label={completeLabel}
        >
          <CheckIcon className="h-4 w-4" aria-hidden strokeWidth={2.5} />
        </button>
      ) : null}
    </div>
  );
}
