import { useRef, useState, type KeyboardEvent } from "react";

type NodeId = string;
type NodeType = "folder" | "file";
type CheckState = "checked" | "unchecked" | "indeterminate";

interface TreeNode {
  id: NodeId;
  name: string;
  type: NodeType;
  children?: TreeNode[];
}

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

const filterTree = (trees: TreeNode[], search: string): TreeNode[] => {
  if (!search) {
    return trees;
  }

  const filterNode = (node: TreeNode): TreeNode | null => {
    const matchSelf = node.name.toLowerCase().includes(search.toLowerCase());

    if (node.children?.length) {
      const newChildren = [...node.children]
        .map(filterNode)
        .filter(Boolean) as TreeNode[];
      if (newChildren.length > 0 || matchSelf) {
        return { ...node, children: newChildren };
      }
      return null;
    }

    if (matchSelf) {
      return { ...node };
    }

    return null;
  };

  return trees.map(filterNode).filter(Boolean) as TreeNode[];
};

interface VisibleNode {
  id: NodeId;
  node: TreeNode;
  level: number;
  parentId: NodeId | null;
}

const flattenTreeNodes = (
  trees: TreeNode[],
  expandedIds: Set<NodeId>,
  level: number = 0,
  parentId: NodeId | null = null
): VisibleNode[] => {
  const visibleNodes: VisibleNode[] = [];
  for (const node of trees) {
    visibleNodes.push({
      id: node.id,
      node: node,
      level: level,
      parentId: parentId,
    });
    if (
      node.children?.length &&
      expandedIds.has(node.id) &&
      node.type === "folder"
    ) {
      visibleNodes.push(
        ...flattenTreeNodes(node.children, expandedIds, level + 1, node.id)
      );
    }
  }
  return visibleNodes;
};

const getCheckStates = (
  trees: TreeNode[],
  checkedIds: Set<NodeId>
): Map<NodeId, CheckState> => {
  const result = new Map<NodeId, CheckState>();

  const dfs = (node: TreeNode) => {
    if (!node.children?.length) {
      const state: CheckState = checkedIds.has(node.id)
        ? "checked"
        : "unchecked";
      result.set(node.id, state);
      return state;
    }

    const childStates = node.children.map(dfs);
    const allChecked = childStates.every((node) => node === "checked");
    const allUnChecked = childStates.every((node) => node === "unchecked");
    let state: CheckState;
    if (allChecked) {
      state = "checked";
    } else if (allUnChecked) {
      state = checkedIds.has(node.id) ? "checked" : "unchecked";
      result.set(node.id, state);
    } else {
      state = "indeterminate";
    }
    result.set(node.id, state);
    return state;
  };

  trees.forEach(dfs);

  return result;
};

const getChildIds = (node: TreeNode): NodeId[] => {
  if (!node.children?.length) {
    return [];
  }
  const childIds: NodeId[] = [];
  for (const child of node.children) {
    childIds.push(child.id);
    if (child.children?.length) {
      childIds.push(...getChildIds(child));
    }
  }

  return childIds;
};

const getNodeById = (
  trees: TreeNode[],
  nodeId: NodeId
): TreeNode | undefined => {
  for (const node of trees) {
    if (node.id === nodeId) {
      return node;
    }
    if (node.children?.length) {
      const found = getNodeById(node.children, nodeId);
      if (found) {
        return found;
      }
    }
  }
};

const TreeViewInterview = () => {
  const [selectedId, setSelectedId] = useState<NodeId>(SAMPLE_TREE[0].id);
  const [expandedIds, setExpandedIds] = useState<Set<NodeId>>(new Set());
  const [checkedIds, setCheckedIds] = useState<Set<NodeId>>(new Set());
  const [search, setSearch] = useState<string>("");
  const treeRef = useRef<HTMLDivElement | null>(null);

  const filteredTrees = filterTree(SAMPLE_TREE, search);
  const flattenNodes = flattenTreeNodes(filteredTrees, expandedIds);
  const checkedStates = getCheckStates(filteredTrees, checkedIds);

  const onSelectItem = (nodeId: NodeId) => {
    setSelectedId(nodeId);
    treeRef.current?.focus();
  };

  const onToggleExpand = (nodeId: NodeId) => {
    setExpandedIds((previous) => {
      const newExpanedIds = new Set(previous);
      if (newExpanedIds.has(nodeId)) {
        newExpanedIds.delete(nodeId);
      } else {
        newExpanedIds.add(nodeId);
      }
      return newExpanedIds;
    });
  };

  const onToggleCheck = (nodeId: NodeId) => {
    const node = getNodeById(filteredTrees, nodeId);
    if (node) {
      const childIds = getChildIds(node);
      const newCheckedIds = new Set(checkedIds);
      let target: CheckState;
      if (newCheckedIds.has(nodeId)) {
        target = "unchecked";
        newCheckedIds.delete(nodeId);
      } else {
        target = "checked";
        newCheckedIds.add(nodeId);
      }
      if (target === "checked") {
        for (const childId of childIds) {
          newCheckedIds.add(childId);
        }
      } else if (target === "unchecked") {
        for (const childId of childIds) {
          newCheckedIds.delete(childId);
        }
      }
      setCheckedIds(newCheckedIds);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (flattenNodes.length === 0) {
      return;
    }
    const currentIndex =
      flattenNodes.findIndex((node) => node.id === selectedId) ?? 0;
    const currentNode = flattenNodes[currentIndex] ?? flattenNodes[0];
    event.preventDefault();
    event.stopPropagation();
    const key = event.key;
    switch (key) {
      case "ArrowUp": {
        const nextIndex = Math.max(currentIndex - 1, 0);
        setSelectedId(flattenNodes[nextIndex].id);
        break;
      }

      case "ArrowDown": {
        const nextIndex = Math.min(currentIndex + 1, flattenNodes.length - 1);
        setSelectedId(flattenNodes[nextIndex].id);
        break;
      }

      case "ArrowLeft": {
        const newExpandedIds = new Set(expandedIds);
        if (
          newExpandedIds.has(currentNode.id) &&
          currentNode.node.type === "folder"
        ) {
          newExpandedIds.delete(currentNode.id);
          setExpandedIds(newExpandedIds);
        }
        break;
      }

      case "ArrowRight": {
        const newExpandedIds = new Set(expandedIds);
        if (
          !newExpandedIds.has(currentNode.id) &&
          currentNode.node.type === "folder"
        ) {
          newExpandedIds.add(currentNode.id);
          setExpandedIds(newExpandedIds);
        }
        break;
      }

      case "Enter": {
        onToggleExpand(selectedId);
        break;
      }
    }
  };

  const activeDescendantId = selectedId ? `treeitem-${selectedId}` : undefined;

  return (
    <div className="mx-auto w-[80%] border border-gray-300 p-4 rounded-xl shadow-md mt-6 flex flex-col gap-2">
      <h3 className="font-bold">Tree/ Folder Navigation</h3>
      <div>
        <label>Search</label>
        <input
          name="search"
          className="w-[100%] border border-gray-300 rounded-md p-2"
          placeholder="Filter files and folders..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div
        ref={treeRef}
        role="tree"
        className="bg-gray-100 p-2 rounded-md shadow-md"
        aria-activedescendant={activeDescendantId}
        onKeyDown={onKeyDown}
      >
        <TreeRoot
          nodes={filteredTrees ?? []}
          expandedIds={expandedIds}
          onSelectItem={onSelectItem}
          onToggleExpand={onToggleExpand}
          selectedId={selectedId}
          level={0}
          onToggleCheck={onToggleCheck}
          checkedStates={checkedStates}
        />
      </div>
    </div>
  );
};

const TreeRoot = ({
  nodes,
  onSelectItem,
  selectedId,
  onToggleExpand,
  expandedIds,
  level,
  onToggleCheck,
  checkedStates,
}: {
  nodes: TreeNode[];
  onSelectItem: (nodeId: NodeId) => void;
  selectedId: NodeId;
  onToggleExpand: (nodeId: NodeId) => void;
  expandedIds: Set<NodeId>;
  level: number;
  onToggleCheck: (nodeId: NodeId) => void;
  checkedStates: Map<NodeId, CheckState>;
}) => {
  return nodes.map((tree) => {
    return (
      <>
        <TreeItem
          node={tree}
          selectedId={selectedId}
          onSelectItem={() => onSelectItem(tree.id)}
          level={level}
          onToggleExpand={() => onToggleExpand(tree.id)}
          checkState={checkedStates.get(tree.id) ?? "unchecked"}
          onToggleCheck={() => onToggleCheck(tree.id)}
        />

        {tree.children?.length &&
        tree.type === "folder" &&
        expandedIds.has(tree.id) ? (
          <TreeRoot
            nodes={tree.children}
            selectedId={selectedId}
            onSelectItem={onSelectItem}
            level={level + 1}
            onToggleExpand={onToggleExpand}
            expandedIds={expandedIds}
            onToggleCheck={onToggleCheck}
            checkedStates={checkedStates}
          />
        ) : null}
      </>
    );
  });
};

const TreeItem = ({
  node,
  onSelectItem,
  selectedId,
  level,
  onToggleExpand,
  checkState,
  onToggleCheck,
}: {
  node: TreeNode;
  onSelectItem: () => void;
  selectedId: NodeId;
  level: number;
  onToggleExpand: () => void;
  checkState: CheckState;
  onToggleCheck: () => void;
}) => {
  const isSelected = node.id === selectedId;
  const icon = node.type === "folder" ? "📁" : "📄";
  const toggleIcon = node.type === "folder" ? "▸" : "▾";

  return (
    <div
      id={`treeitem-${node.id}`}
      role="treeitem"
      style={{ paddingLeft: level * 16 }}
      className={`flex gap-1 display cursor-pointer ${
        isSelected ? "text-white" : ""
      } ${isSelected ? "bg-blue-500" : ""}`}
      onClick={onSelectItem}
    >
      <button
        className={`${node.type !== "folder" ? "invisible" : ""}`}
        onClick={onToggleExpand}
      >
        {toggleIcon}
      </button>
      <input
        type="checkbox"
        checked={checkState === "checked"}
        onChange={() => {
          onToggleCheck();
        }}
        ref={(ref) => {
          if (ref) {
            ref.indeterminate = checkState === "indeterminate";
          }
        }}
      />
      <span>{icon}</span>
      <span>{node.name}</span>
    </div>
  );
};

export default TreeViewInterview;
