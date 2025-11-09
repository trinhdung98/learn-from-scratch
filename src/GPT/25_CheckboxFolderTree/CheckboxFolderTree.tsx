import React from "react";

/* ---------- Types & Sample Data ---------- */

type NodeType = "folder" | "item";

type TreeNode = {
  id: string;
  name: string;
  type: NodeType;
  children?: TreeNode[];
};

type CheckState = "checked" | "unchecked" | "indeterminate";

const SAMPLE_TREE: TreeNode[] = [
  {
    id: "folder-docs",
    name: "Documents",
    type: "folder",
    children: [
      { id: "file-resume", name: "Resume.pdf", type: "item" },
      { id: "file-contract", name: "Contract.docx", type: "item" },
      {
        id: "folder-reports",
        name: "Reports",
        type: "folder",
        children: [
          { id: "file-q1", name: "Q1.xlsx", type: "item" },
          { id: "file-q2", name: "Q2.xlsx", type: "item" },
        ],
      },
    ],
  },
  {
    id: "folder-photos",
    name: "Photos",
    type: "folder",
    children: [
      { id: "file-family", name: "family.jpg", type: "item" },
      { id: "file-trip", name: "trip.png", type: "item" },
    ],
  },
  { id: "file-readme", name: "README.txt", type: "item" },
];

/* ---------- Utils ---------- */

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type VisibleNode = {
  id: string;
  node: TreeNode;
  level: number;
  parentId: string | null;
};

/* Filter tree for search, but keep selection in a separate structure */
function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
  const q = query.toLowerCase();
  if (!q) return nodes;

  const filterNode = (node: TreeNode): TreeNode | null => {
    const selfMatches = node.name.toLowerCase().includes(q);

    if (node.children && node.children.length > 0) {
      const filteredChildren = node.children
        .map(filterNode)
        .filter(Boolean) as TreeNode[];
      if (selfMatches || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      return null;
    }

    return selfMatches ? { ...node } : null;
  };

  return nodes.map(filterNode).filter(Boolean) as TreeNode[];
}

function flattenVisibleNodes(
  nodes: TreeNode[],
  expandedIds: Set<string>,
  level = 0,
  parentId: string | null = null
): VisibleNode[] {
  const result: VisibleNode[] = [];
  for (const node of nodes) {
    result.push({ id: node.id, node, level, parentId });

    if (
      node.type === "folder" &&
      node.children &&
      node.children.length > 0 &&
      expandedIds.has(node.id)
    ) {
      result.push(
        ...flattenVisibleNodes(node.children, expandedIds, level + 1, node.id)
      );
    }
  }
  return result;
}

function findNodeById(nodes: TreeNode[], id: string): TreeNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

/* Compute tri-state check map from selectedIds */

function computeCheckStates(
  nodes: TreeNode[],
  selectedIds: Set<string>
): Map<string, CheckState> {
  const map = new Map<string, CheckState>();

  const dfs = (node: TreeNode): CheckState => {
    if (!node.children || node.children.length === 0) {
      const state: CheckState = selectedIds.has(node.id)
        ? "checked"
        : "unchecked";
      map.set(node.id, state);
      return state;
    }

    const childStates = node.children.map(dfs);

    const allChecked = childStates.every((s) => s === "checked");
    const allUnchecked = childStates.every((s) => s === "unchecked");

    let state: CheckState;
    if (allChecked) state = "checked";
    else if (allUnchecked)
      state = selectedIds.has(node.id) ? "checked" : "unchecked";
    else state = "indeterminate";

    map.set(node.id, state);
    return state;
  };

  nodes.forEach(dfs);
  return map;
}

/* Toggle selection for a node + all descendants */

function collectNodeAndDescendants(node: TreeNode): string[] {
  const ids: string[] = [node.id];
  if (node.children) {
    for (const child of node.children) {
      ids.push(...collectNodeAndDescendants(child));
    }
  }
  return ids;
}

/** Count selected leaf items */
function countSelectedItems(
  nodes: TreeNode[],
  selectedIds: Set<string>
): number {
  let count = 0;
  const visit = (node: TreeNode) => {
    if (!node.children || node.children.length === 0) {
      if (selectedIds.has(node.id)) count += 1;
    } else {
      node.children.forEach(visit);
    }
  };
  nodes.forEach(visit);
  return count;
}

/* ---------- Hook: keyboard navigation for treegrid ---------- */

function useTreeKeyboardNavigation(
  visibleNodes: VisibleNode[],
  expandedIds: Set<string>,
  onToggleExpand: (id: string) => void,
  onToggleCheck: (node: TreeNode) => void
) {
  const [focusedId, setFocusedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!visibleNodes.length) {
      setFocusedId(null);
      return;
    }
    if (!focusedId || !visibleNodes.some((n) => n.id === focusedId)) {
      setFocusedId(visibleNodes[0].id);
    }
  }, [visibleNodes, focusedId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!visibleNodes.length) return;

    const key = e.key;
    const idx = focusedId
      ? visibleNodes.findIndex((n) => n.id === focusedId)
      : 0;
    const current = visibleNodes[idx] ?? visibleNodes[0];

    const prevent = () => {
      e.preventDefault();
      e.stopPropagation();
    };

    if (
      [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
        "Enter",
        " ",
      ].includes(key)
    ) {
      prevent();
    } else {
      return;
    }

    if (key === "ArrowDown") {
      const next = Math.min(idx + 1, visibleNodes.length - 1);
      setFocusedId(visibleNodes[next].id);
    }

    if (key === "ArrowUp") {
      const prev = Math.max(idx - 1, 0);
      setFocusedId(visibleNodes[prev].id);
    }

    if (key === "Home") {
      setFocusedId(visibleNodes[0].id);
    }

    if (key === "End") {
      setFocusedId(visibleNodes[visibleNodes.length - 1].id);
    }

    if (key === "ArrowRight") {
      if (current.node.type === "folder") {
        const isExpanded = expandedIds.has(current.id);
        const hasChildren = current.node.children?.length;
        if (!isExpanded && hasChildren) {
          onToggleExpand(current.id);
        }
      }
    }

    if (key === "ArrowLeft") {
      if (current.node.type === "folder" && expandedIds.has(current.id)) {
        onToggleExpand(current.id);
      } else if (current.parentId) {
        const parentIndex = visibleNodes.findIndex(
          (n) => n.id === current.parentId
        );
        if (parentIndex >= 0) {
          setFocusedId(visibleNodes[parentIndex].id);
        }
      }
    }

    if (key === " " || key === "Enter") {
      onToggleCheck(current.node);
    }
  };

  const activeDescendantId = focusedId ? `tree-row-${focusedId}` : undefined;

  return { focusedId, setFocusedId, handleKeyDown, activeDescendantId };
}

/* ---------- Main Component ---------- */

export default function CheckboxFolderTreeDemo() {
  const [tree] = React.useState<TreeNode[]>(SAMPLE_TREE); // static structure
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(
    () => new Set(["folder-docs", "folder-photos"])
  );
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(
    () => new Set()
  );
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredTree = React.useMemo(
    () => filterTree(tree, searchQuery),
    [tree, searchQuery]
  );

  const visibleNodes = React.useMemo(
    () => flattenVisibleNodes(filteredTree, expandedIds),
    [filteredTree, expandedIds]
  );

  const checkStates = React.useMemo(
    () => computeCheckStates(tree, selectedIds),
    [tree, selectedIds]
  );

  const selectedCount = React.useMemo(
    () => countSelectedItems(tree, selectedIds),
    [tree, selectedIds]
  );

  const handleToggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleCheck = (node: TreeNode) => {
    const fullNode = findNodeById(tree, node.id) ?? node;
    const idsToToggle = collectNodeAndDescendants(fullNode);

    setSelectedIds((prev) => {
      const next = new Set(prev);
      const currentState = checkStates.get(node.id) ?? "unchecked";
      const target: CheckState =
        currentState === "checked" ? "unchecked" : "checked";

      if (target === "checked") {
        idsToToggle.forEach((id) => next.add(id));
      } else {
        idsToToggle.forEach((id) => next.delete(id));
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds((prev) => {
      if (prev.size === countAllLeafItems(tree)) {
        // if all already selected, clear all
        return new Set();
      }
      const allLeafIds = collectAllLeafIds(tree);
      return new Set(allLeafIds);
    });
  };

  const { focusedId, setFocusedId, handleKeyDown, activeDescendantId } =
    useTreeKeyboardNavigation(
      visibleNodes,
      expandedIds,
      handleToggleExpand,
      handleToggleCheck
    );

  return (
    <div className="mx-auto my-6 max-w-xl rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Checkbox Folder Selection</h2>
        <button
          type="button"
          onClick={handleSelectAll}
          className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-100"
        >
          Select / Clear all
        </button>
      </div>

      {/* Search */}
      <div className="mb-3">
        <label className="mb-1 block text-xs font-medium text-slate-700">
          Search
        </label>
        <input
          className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          placeholder="Filter folders and files…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Treegrid */}
      <div
        className="max-h-80 overflow-auto rounded-md border border-slate-200 bg-slate-50 text-sm focus:outline-none"
        role="treegrid"
        tabIndex={0}
        aria-label="Folder selection"
        aria-activedescendant={activeDescendantId}
        onKeyDown={handleKeyDown}
      >
        {/* Header row */}
        <div
          role="row"
          className="sticky top-0 flex border-b border-slate-200 bg-slate-100 px-2 py-1 text-[0.7rem] font-semibold text-slate-500"
        >
          <div role="columnheader" className="flex-1">
            Name
          </div>
          <div role="columnheader" className="w-24 text-right">
            Type
          </div>
        </div>

        {filteredTree.length === 0 ? (
          <div className="px-2 py-2 text-[0.75rem] text-slate-500">
            No matches for &quot;{searchQuery}&quot;
          </div>
        ) : (
          <TreeRows
            nodes={filteredTree}
            level={1}
            expandedIds={expandedIds}
            checkStates={checkStates}
            focusedId={focusedId}
            onToggleExpand={handleToggleExpand}
            onToggleCheck={handleToggleCheck}
            onRowFocus={setFocusedId}
          />
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-[0.75rem] text-slate-500">
        <span>
          Selected items:{" "}
          <span className="font-semibold text-slate-700">{selectedCount}</span>
        </span>
        <span>
          Keyboard: ↑/↓ move, →/← expand/collapse, Space/Enter toggle.
        </span>
      </div>
    </div>
  );
}

/* ---------- Helper: count all leaf items ---------- */

function countAllLeafItems(nodes: TreeNode[]): number {
  let count = 0;
  const visit = (n: TreeNode) => {
    if (!n.children || n.children.length === 0) count += 1;
    else n.children.forEach(visit);
  };
  nodes.forEach(visit);
  return count;
}

function collectAllLeafIds(nodes: TreeNode[]): string[] {
  const ids: string[] = [];
  const visit = (n: TreeNode) => {
    if (!n.children || n.children.length === 0) ids.push(n.id);
    else n.children.forEach(visit);
  };
  nodes.forEach(visit);
  return ids;
}

/* ---------- Recursive rows ---------- */

type TreeRowsProps = {
  nodes: TreeNode[];
  level: number;
  expandedIds: Set<string>;
  checkStates: Map<string, CheckState>;
  focusedId: string | null;
  onToggleExpand: (id: string) => void;
  onToggleCheck: (node: TreeNode) => void;
  onRowFocus: (id: string) => void;
};

function TreeRows({
  nodes,
  level,
  expandedIds,
  checkStates,
  focusedId,
  onToggleExpand,
  onToggleCheck,
  onRowFocus,
}: TreeRowsProps) {
  return (
    <>
      {nodes.map((node) => {
        const isFolder = node.type === "folder";
        const isExpanded = isFolder && expandedIds.has(node.id);
        const state = checkStates.get(node.id) ?? "unchecked";

        return (
          <React.Fragment key={node.id}>
            <TreeRow
              node={node}
              level={level}
              isFolder={isFolder}
              isExpanded={isExpanded}
              checkState={state}
              isFocused={focusedId === node.id}
              onToggleExpand={() => onToggleExpand(node.id)}
              onToggleCheck={() => onToggleCheck(node)}
              onFocus={() => onRowFocus(node.id)}
            />
            {isFolder &&
              isExpanded &&
              node.children &&
              node.children.length > 0 && (
                <TreeRows
                  nodes={node.children}
                  level={level + 1}
                  expandedIds={expandedIds}
                  checkStates={checkStates}
                  focusedId={focusedId}
                  onToggleExpand={onToggleExpand}
                  onToggleCheck={onToggleCheck}
                  onRowFocus={onRowFocus}
                />
              )}
          </React.Fragment>
        );
      })}
    </>
  );
}

type TreeRowProps = {
  node: TreeNode;
  level: number;
  isFolder: boolean;
  isExpanded: boolean;
  checkState: CheckState;
  isFocused: boolean;
  onToggleExpand: () => void;
  onToggleCheck: () => void;
  onFocus: () => void;
};

function TreeRow({
  node,
  level,
  isFolder,
  isExpanded,
  checkState,
  isFocused,
  onToggleExpand,
  onToggleCheck,
  onFocus,
}: TreeRowProps) {
  const indent = (level - 1) * 16;

  const icon = isFolder ? (isExpanded ? "📂" : "📁") : "📄";

  const handleRowClick = () => {
    onFocus();
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand();
    onFocus();
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleCheck();
    onFocus();
  };

  const ariaChecked =
    checkState === "indeterminate" ? "mixed" : checkState === "checked";

  return (
    <div
      id={`tree-row-${node.id}`}
      role="row"
      aria-level={level}
      aria-expanded={isFolder ? isExpanded : undefined}
      aria-selected={isFocused}
      onClick={handleRowClick}
      className={classNames(
        "flex items-center border-b border-slate-100 px-2 py-1",
        isFocused ? "bg-indigo-600 text-white" : "hover:bg-indigo-50"
      )}
    >
      {/* First column: checkbox + label */}
      <div role="gridcell" className="flex flex-1 items-center">
        {/* indent */}
        <div style={{ width: indent }} aria-hidden="true" />
        {/* expand/collapse chevron */}
        {isFolder ? (
          <button
            type="button"
            onClick={handleExpandClick}
            className={classNames(
              "mr-1 flex h-4 w-4 items-center justify-center rounded-sm text-[10px]",
              isFocused ? "hover:bg-indigo-500" : "hover:bg-slate-200/60"
            )}
            aria-label={isExpanded ? "Collapse folder" : "Expand folder"}
          >
            {isExpanded ? "▾" : "▸"}
          </button>
        ) : (
          <div className="mr-1 h-4 w-4" aria-hidden="true" />
        )}

        {/* Checkbox with indeterminate state */}
        <div className="mr-2 flex items-center">
          <input
            type="checkbox"
            checked={checkState === "checked"}
            ref={(el) => {
              if (el) el.indeterminate = checkState === "indeterminate";
            }}
            onClick={handleCheckboxClick}
            onChange={() => {}}
            aria-checked={ariaChecked as any}
            className={classNames(
              "h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600",
              isFocused && "border-white"
            )}
          />
        </div>

        {/* Icon + name */}
        <span className="mr-1 text-xs">{icon}</span>
        <span
          className={classNames(
            "truncate text-xs",
            isFolder && !isFocused && "font-medium"
          )}
        >
          {node.name}
        </span>
      </div>

      {/* Second column: type */}
      <div role="gridcell" className="w-24 text-right text-[0.7rem]">
        {isFolder ? "Folder" : "File"}
      </div>
    </div>
  );
}
