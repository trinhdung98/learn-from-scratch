import React from "react";

/* ---------- Types & Sample Data ---------- */

type NodeType = "folder" | "file";

export type TreeNode = {
  id: string;
  name: string;
  type: NodeType;
  children?: TreeNode[];
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
        children: [
          { id: "index", name: "index.tsx", type: "file" },
          { id: "settings", name: "settings.tsx", type: "file" },
        ],
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

/** Filter tree by search query; keep parents of matching children */
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

/** Collect all folder ids in a tree (used to auto-expand when searching) */
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

/** Flatten tree into visible nodes based on expanded folders */
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

/* ---------- Root TreeView Component ---------- */

export default function TreeViewDemo() {
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(
    () => new Set(["src"]) // default expanded root
  );
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const treeRef = React.useRef<HTMLDivElement | null>(null);

  const isSearching = searchQuery.trim().length > 0;

  /* Compute visible tree based on search */
  const displayTree = React.useMemo(
    () => filterTree(SAMPLE_TREE, searchQuery),
    [searchQuery]
  );

  /* Expanded set: real expandedIds, or auto-expand all folders while searching */
  const effectiveExpandedIds = React.useMemo(() => {
    if (!isSearching) return expandedIds;
    return collectFolderIds(displayTree);
  }, [expandedIds, isSearching, displayTree]);

  /* Visible nodes (for keyboard navigation) */
  const visibleNodes = React.useMemo(
    () => flattenVisibleNodes(displayTree, effectiveExpandedIds),
    [displayTree, effectiveExpandedIds]
  );

  /* Ensure we always have a selected node */
  React.useEffect(() => {
    if (!selectedId && visibleNodes.length > 0) {
      setSelectedId(visibleNodes[0].id);
    }
  }, [visibleNodes, selectedId]);

  const toggleFolder = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    // Keep focus on tree container for keyboard nav
    treeRef.current?.focus();
  };

  /* Keyboard navigation for ARIA tree pattern */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!visibleNodes.length) return;

    const key = e.key;
    const currentIndex = selectedId
      ? visibleNodes.findIndex((n) => n.id === selectedId)
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
      setSelectedId(visibleNodes[nextIndex].id);
    }

    if (key === "ArrowUp") {
      const prevIndex = Math.max(currentIndex - 1, 0);
      setSelectedId(visibleNodes[prevIndex].id);
    }

    if (key === "Home") {
      setSelectedId(visibleNodes[0].id);
    }

    if (key === "End") {
      setSelectedId(visibleNodes[visibleNodes.length - 1].id);
    }

    if (key === "ArrowRight") {
      if (current.node.type === "folder") {
        const isExpanded = effectiveExpandedIds.has(current.id);
        const hasChildren = current.node.children?.length;
        if (!isExpanded && hasChildren) {
          toggleFolder(current.id);
        } else if (isExpanded && hasChildren) {
          // move to first child
          const next = visibleNodes[currentIndex + 1];
          if (next && next.parentId === current.id) {
            setSelectedId(next.id);
          }
        }
      }
    }

    if (key === "ArrowLeft") {
      if (
        current.node.type === "folder" &&
        effectiveExpandedIds.has(current.id)
      ) {
        // collapse
        toggleFolder(current.id);
      } else if (current.parentId) {
        // move to parent
        const parentIndex = visibleNodes.findIndex(
          (n) => n.id === current.parentId
        );
        if (parentIndex >= 0) {
          setSelectedId(visibleNodes[parentIndex].id);
        }
      }
    }

    if (key === "Enter" || key === " ") {
      if (current.node.type === "folder") {
        toggleFolder(current.id);
      } else {
        // “activate” file – in real app you might open it
        console.log("Open file:", current.node.name);
      }
    }
  };

  const activeDescendantId = selectedId ? `treeitem-${selectedId}` : undefined;

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

      {/* Tree Container */}
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
            selectedId={selectedId}
            onToggle={toggleFolder}
            onSelect={handleSelect}
            isSearching={isSearching}
          />
        )}
      </div>

      <p className="mt-2 text-[0.7rem] text-slate-500">
        Keyboard: ↑/↓ to move, → to expand, ← to collapse, Enter/Space to toggle
        folders.
      </p>
    </div>
  );
}

/* ---------- <TreeRoot /> : top-level recursion entry ---------- */

type TreeRootProps = {
  nodes: TreeNode[];
  level: number;
  expandedIds: Set<string>;
  selectedId: string | null;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  isSearching: boolean;
};

function TreeRoot({
  nodes,
  level,
  expandedIds,
  selectedId,
  onToggle,
  onSelect,
  isSearching,
}: TreeRootProps) {
  return (
    <div role={level === 0 ? undefined : "group"}>
      {nodes.map((node) => (
        <TreeItemRow
          key={node.id}
          node={node}
          level={level}
          isExpanded={node.type === "folder" && expandedIds.has(node.id)}
          isSelected={selectedId === node.id}
          onToggle={() => onToggle(node.id)}
          onSelect={() => onSelect(node.id)}
          isSearching={isSearching}
          expandedIds={expandedIds}
          selectedId={selectedId}
          onToggleChild={onToggle}
          onSelectChild={onSelect}
        />
      ))}
    </div>
  );
}

/* ---------- <TreeItemRow /> : recursive node component ---------- */

type TreeItemRowProps = {
  node: TreeNode;
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onSelect: () => void;
  isSearching: boolean;
  expandedIds: Set<string>;
  selectedId: string | null;
  onToggleChild: (id: string) => void;
  onSelectChild: (id: string) => void;
};

function TreeItemRow({
  node,
  level,
  isExpanded,
  isSelected,
  onToggle,
  onSelect,
  isSearching,
  expandedIds,
  selectedId,
  onToggleChild,
  onSelectChild,
}: TreeItemRowProps) {
  const hasChildren = node.children && node.children.length > 0;
  const isFolder = node.type === "folder";

  const indentPx = level * 16;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
  };

  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle();
  };

  const icon = isFolder ? (isExpanded ? "📂" : "📁") : "📄";

  return (
    <div>
      <div
        id={`treeitem-${node.id}`}
        role="treeitem"
        aria-selected={isSelected}
        aria-expanded={isFolder ? isExpanded : undefined}
        style={{ paddingLeft: indentPx }}
        onClick={handleClick}
        className={classNames(
          "flex cursor-pointer items-center rounded-sm px-1 py-0.5",
          isSelected
            ? "bg-indigo-600 text-white"
            : "text-slate-800 hover:bg-indigo-50"
        )}
      >
        {/* Chevron for folders */}
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

        {/* Icon + label */}
        <span className="mr-1 text-xs">{icon}</span>
        <span
          className={classNames(
            "truncate text-xs",
            !isSelected && isFolder && "font-medium"
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
          selectedId={selectedId}
          onToggle={onToggleChild}
          onSelect={onSelectChild}
          isSearching={isSearching}
        />
      )}
    </div>
  );
}
