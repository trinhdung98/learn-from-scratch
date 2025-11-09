import TreeViewDemo from "./GPT/23_TreeView/TreeView";
import CheckboxFolderTreeDemo from "./GPT/25_CheckboxFolderTree/CheckboxFolderTree";
import TreeViewInterview from "./Interview/23_TreeView/TreeView";

function App() {
  return (
    <div className="flex p-2 gap-2 h-[100vh]">
      <div className="flex-1 border border-gray-300 p-2">
        <TreeViewInterview />
      </div>
      <div className="flex-1 border border-gray-300 p-2">
        <CheckboxFolderTreeDemo />
      </div>
    </div>
  );
}

export default App;
