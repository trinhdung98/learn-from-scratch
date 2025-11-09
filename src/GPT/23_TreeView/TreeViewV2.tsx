import React from "react";

/* ---------- Types & Sample Data ---------- */

type NodeType = "folder" | "file";

export type TreeNode = {
  id: string;
  name: string;
  type: NodeType;
  children?: TreeNode[];
  lazy?: boolean; // if true => children will be loaded lazily
};

const SAMPLE_TREE: TreeNode[] = [
  {
    id: "src",
    name: "src",
    type: "folder",
    children: [
      {
        id: "components",
        name: "components",
        type: "folder",
        children: [
          { id: "button", name: "Button.tsx", type: "file" },
          { id: "modal", name: "Modal.tsx", type: "file" },
        ],
      },
      {
        id: "pages",
        name: "pages",
        type: "folder",
        lazy: true, // will lazy-load children on first expand
      },
      { id: "app", name: "App.tsx", type: "file" },
    ],
  },
  {
    id: "public",
    name: "public",
    type: "folder",
    children: [
      { id: "favicon", name: "favicon.ico", type: "file" },
      { id: "robots", name: "robots.txt", type: "file" },
    ],
  },
  { id: "readme", name: "README.md", type: "file" },
];

/* ---------- Utils ---------- */

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

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

function collectFolderIds(nodes: TreeNode[]): Set<string> {
  const result = new Set<string>();
  const visit = (node: TreeNode) => {
    if (node.type === "folder") {
      result.add(node.id);
      node.children?.forEach(visit);
    }
  };
  nodes.forEach(visit);
  return result;
}

type VisibleNode = {
  id: string;
  node: TreeNode;
  level: number;
  parentId: string | null;
};

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

/** Deep immutable update helper */
function updateNodeInTree(
  nodes: TreeNode[],
  id: string,
  updater: (node: TreeNode) => TreeNode
): TreeNode[] {
  return nodes.map((node) => {
    if (node.id === id) {
      return updater(node);
    }
    if (node.children) {
      return {
        ...node,
        children: updateNodeInTree(node.children, id, updater),
      };
    }
    return node;
  });
}

/** Find node by id in tree */
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

/** Collect descendants ids (for checkbox subtree toggle) */
function collectDescendantIds(node: TreeNode): string[] {
  const result: string[] = [];
  const visit = (n: TreeNode) => {
    result.push(n.id);
    n.children?.forEach(visit);
  };
  node.children?.forEach(visit);
  return result;
}

/* ---------- useTreeNavigation Hook ---------- */

type UseTreeNavigationArgs = {
  tree: TreeNode[];
  expandedIds: Set<string>;
  onToggleFolder: (id: string) => void;
  onToggleCheck: (node: TreeNode) => void;
  onFileActivate?: (node: TreeNode) => void;
};

function useTreeNavigation({
  tree,
  expandedIds,
  onToggleFolder,
  onToggleCheck,
  onFileActivate,
}: UseTreeNavigationArgs) {
  const [focusedId, setFocusedId] = React.useState<string | null>(null);

  const visibleNodes = React.useMemo(
    () => flattenVisibleNodes(tree, expandedIds),
    [tree, expandedIds]
  );

  // Keep focusedId valid when tree changes
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
    const currentIndex = focusedId
      ? visibleNodes.findIndex((n) => n.id === focusedId)
      : 0;
    const current = visibleNodes[currentIndex] ?? visibleNodes[0];

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
      const nextIndex = Math.min(currentIndex + 1, visibleNodes.length - 1);
      setFocusedId(visibleNodes[nextIndex].id);
    }

    if (key === "ArrowUp") {
      const prevIndex = Math.max(currentIndex - 1, 0);
      setFocusedId(visibleNodes[prevIndex].id);
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
        if (!isExpanded && (hasChildren || current.node.lazy)) {
          onToggleFolder(current.id);
        } else if (isExpanded && hasChildren) {
          const next = visibleNodes[currentIndex + 1];
          if (next && next.parentId === current.id) {
            setFocusedId(next.id);
          }
        }
      }
    }

    if (key === "ArrowLeft") {
      if (current.node.type === "folder" && expandedIds.has(current.id)) {
        onToggleFolder(current.id);
      } else if (current.parentId) {
        const parentIndex = visibleNodes.findIndex(
          (n) => n.id === current.parentId
        );
        if (parentIndex >= 0) {
          setFocusedId(visibleNodes[parentIndex].id);
        }
      }
    }

    if (key === " ") {
      // Space toggles checkbox
      onToggleCheck(current.node);
    }

    if (key === "Enter") {
      if (current.node.type === "folder") {
        onToggleFolder(current.id);
      } else {
        onFileActivate?.(current.node);
      }
    }
  };

  const activeDescendantId = focusedId ? `treeitem-${focusedId}` : undefined;

  return {
    focusedId,
    setFocusedId,
    visibleNodes,
    handleKeyDown,
    activeDescendantId,
  };
}

/* ---------- Root Component ---------- */

export default function TreeViewDemo() {
  const [treeData, setTreeData] = React.useState<TreeNode[]>(SAMPLE_TREE);
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(
    () => new Set(["src"])
  );
  const [checkedIds, setCheckedIds] = React.useState<Set<string>>(
    () => new Set()
  );
  const [loadingIds, setLoadingIds] = React.useState<Set<string>>(
    () => new Set()
  );
  const [searchQuery, setSearchQuery] = React.useState("");
  const treeRef = React.useRef<HTMLDivElement | null>(null);

  const isSearching = searchQuery.trim().length > 0;

  // Filtered tree (search)
  const displayTree = React.useMemo(
    () => filterTree(treeData, searchQuery),
    [treeData, searchQuery]
  );

  // Expanded set: real expandedIds or auto-expanded while searching
  const effectiveExpandedIds = React.useMemo(() => {
    if (!isSearching) return expandedIds;
    return collectFolderIds(displayTree);
  }, [expandedIds, isSearching, displayTree]);

  // Lazy loading on folder expand
  const handleToggleFolder = (id: string) => {
    const node = findNodeById(treeData, id);
    if (!node || node.type !== "folder") return;

    // If lazy and not loaded yet => simulate async load
    if (node.lazy && !node.children && !loadingIds.has(id)) {
      setLoadingIds((prev) => new Set(prev).add(id));

      // simulate API
      setTimeout(() => {
        setTreeData((prev) =>
          updateNodeInTree(prev, id, (n) => ({
            ...n,
            lazy: false,
            children: [
              {
                id: `${id}-log-1`,
                name: `${id}-log-1.txt`,
                type: "file",
              },
              {
                id: `${id}-log-2`,
                name: `${id}-log-2.txt`,
                type: "file",
              },
            ],
          }))
        );
        setLoadingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setExpandedIds((prev) => new Set(prev).add(id));
      }, 800);

      return;
    }

    // Normal toggle
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Checkbox toggle (subtree selection)
  const handleToggleCheck = (node: TreeNode) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      const descendants = collectDescendantIds(node);
      const idsToToggle = [node.id, ...descendants];
      const allChecked = idsToToggle.every((id) => next.has(id));

      if (allChecked) {
        idsToToggle.forEach((id) => next.delete(id));
      } else {
        idsToToggle.forEach((id) => next.add(id));
      }

      return next;
    });
  };

  const onFileActivate = (node: TreeNode) => {
    console.log("Open file:", node.name);
  };

  const { focusedId, setFocusedId, handleKeyDown, activeDescendantId } =
    useTreeNavigation({
      tree: displayTree,
      expandedIds: effectiveExpandedIds,
      onToggleFolder: handleToggleFolder,
      onToggleCheck: handleToggleCheck,
      onFileActivate,
    });

  const handleSelectWithMouse = (id: string) => {
    setFocusedId(id);
    treeRef.current?.focus();
  };

  const checkedCount = checkedIds.size;

  return (
    <div className="mx-auto my-6 max-w-xl rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-md">
      <h2 className="mb-3 text-lg font-semibold">Tree / Folder Navigation</h2>

      {/* Search */}
      <div className="mb-3">
        <label className="mb-1 block text-xs font-medium text-slate-700">
          Search
        </label>
        <input
          className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
          placeholder="Filter files and folders…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Tree container */}
      <div
        ref={treeRef}
        className="max-h-80 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-2 text-sm focus:outline-none"
        role="tree"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        aria-label="Project files"
        aria-activedescendant={activeDescendantId}
      >
        {displayTree.length === 0 ? (
          <p className="px-1 py-2 text-xs text-slate-500">
            No results for &quot;{searchQuery}&quot;
          </p>
        ) : (
          <TreeRoot
            nodes={displayTree}
            level={0}
            expandedIds={effectiveExpandedIds}
            focusedId={focusedId}
            checkedIds={checkedIds}
            loadingIds={loadingIds}
            onToggleFolder={handleToggleFolder}
            onToggleCheck={handleToggleCheck}
            onSelect={handleSelectWithMouse}
          />
        )}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <p className="text-[0.7rem] text-slate-500">
          Keyboard: ↑/↓ to move, → to expand, ← to collapse, Space to check,
          Enter to expand/open.
        </p>
        <p className="text-[0.7rem] text-slate-600">
          Checked: <span className="font-semibold">{checkedCount}</span>
        </p>
      </div>
    </div>
  );
}

/* ---------- Tree Components ---------- */

type TreeRootProps = {
  nodes: TreeNode[];
  level: number;
  expandedIds: Set<string>;
  focusedId: string | null;
  checkedIds: Set<string>;
  loadingIds: Set<string>;
  onToggleFolder: (id: string) => void;
  onToggleCheck: (node: TreeNode) => void;
  onSelect: (id: string) => void;
};

function TreeRoot({
  nodes,
  level,
  expandedIds,
  focusedId,
  checkedIds,
  loadingIds,
  onToggleFolder,
  onToggleCheck,
  onSelect,
}: TreeRootProps) {
  return (
    <div role={level === 0 ? undefined : "group"}>
      {nodes.map((node) => (
        <TreeItemRow
          key={node.id}
          node={node}
          level={level}
          isExpanded={node.type === "folder" ? expandedIds.has(node.id) : false}
          isFocused={focusedId === node.id}
          isChecked={checkedIds.has(node.id)}
          isLoading={loadingIds.has(node.id)}
          onToggleFolder={() => onToggleFolder(node.id)}
          onToggleCheck={() => onToggleCheck(node)}
          onSelect={() => onSelect(node.id)}
          expandedIds={expandedIds}
          focusedId={focusedId}
          checkedIds={checkedIds}
          loadingIds={loadingIds}
          onToggleFolderChild={onToggleFolder}
          onToggleCheckChild={onToggleCheck}
          onSelectChild={onSelect}
        />
      ))}
    </div>
  );
}

type TreeItemRowProps = {
  node: TreeNode;
  level: number;
  isExpanded: boolean;
  isFocused: boolean;
  isChecked: boolean;
  isLoading: boolean;
  onToggleFolder: () => void;
  onToggleCheck: () => void;
  onSelect: () => void;
  expandedIds: Set<string>;
  focusedId: string | null;
  checkedIds: Set<string>;
  loadingIds: Set<string>;
  onToggleFolderChild: (id: string) => void;
  onToggleCheckChild: (node: TreeNode) => void;
  onSelectChild: (id: string) => void;
};

function TreeItemRow({
  node,
  level,
  isExpanded,
  isFocused,
  isChecked,
  isLoading,
  onToggleFolder,
  onToggleCheck,
  onSelect,
  expandedIds,
  focusedId,
  checkedIds,
  loadingIds,
  onToggleFolderChild,
  onToggleCheckChild,
  onSelectChild,
}: TreeItemRowProps) {
  const isFolder = node.type === "folder";
  const hasChildren = node.children && node.children.length > 0;
  const indentPx = level * 16;

  const handleRowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
  };

  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFolder();
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleCheck();
  };

  const icon = isFolder ? (isExpanded ? "📂" : "📁") : "📄";

  return (
    <div>
      <div
        id={`treeitem-${node.id}`}
        role="treeitem"
        aria-selected={isFocused}
        aria-expanded={isFolder ? isExpanded : undefined}
        style={{ paddingLeft: indentPx }}
        onClick={handleRowClick}
        className={classNames(
          "flex cursor-pointer items-center rounded-sm px-1 py-0.5",
          isFocused
            ? "bg-indigo-600 text-white"
            : "text-slate-800 hover:bg-indigo-50"
        )}
      >
        {/* Chevron (for folders) */}
        <button
          type="button"
          aria-hidden={!isFolder}
          onClick={isFolder ? handleChevronClick : undefined}
          className={classNames(
            "mr-1 flex h-4 w-4 items-center justify-center rounded-sm text-[10px]",
            !isFolder && "opacity-0",
            isFolder && "hover:bg-slate-200/60"
          )}
          tabIndex={-1}
        >
          {isFolder ? (isExpanded ? "▾" : "▸") : ""}
        </button>

        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isChecked}
          onClick={handleCheckboxClick}
          onChange={() => {}}
          className="mr-1 h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
        />

        {/* Icon + label */}
        <span className="mr-1 text-xs">{isLoading ? "⏳" : icon}</span>
        <span
          className={classNames(
            "truncate text-xs",
            !isFocused && isFolder && "font-medium"
          )}
        >
          {node.name}
        </span>
      </div>

      {/* Children */}
      {isFolder && hasChildren && isExpanded && (
        <TreeRoot
          nodes={node.children!}
          level={level + 1}
          expandedIds={expandedIds}
          focusedId={focusedId}
          checkedIds={checkedIds}
          loadingIds={loadingIds}
          onToggleFolder={onToggleFolderChild}
          onToggleCheck={onToggleCheckChild}
          onSelect={onSelectChild}
        />
      )}
    </div>
  );
}
