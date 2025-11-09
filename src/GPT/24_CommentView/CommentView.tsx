import React from "react";

/* ---------- Types ---------- */

type CommentID = string;

type Vote = "up" | "down" | null;

type Comment = {
  id: CommentID;
  authorName: string;
  avatarColor: string;
  content: string;
  createdAt: number; // timestamp (ms)
  score: number;
  userVote: Vote;
  replies: Comment[];
};

type SortOption = "newest" | "oldest" | "top";

/* ---------- Sample Data ---------- */

const now = Date.now();

const SAMPLE_COMMENTS: Comment[] = [
  {
    id: "c1",
    authorName: "Alice",
    avatarColor: "#4F46E5",
    content: "This is a top-level comment. Great post! 🎉",
    createdAt: now - 1000 * 60 * 15,
    score: 5,
    userVote: null,
    replies: [
      {
        id: "c1-r1",
        authorName: "Bob",
        avatarColor: "#10B981",
        content: "Totally agree with Alice here.",
        createdAt: now - 1000 * 60 * 5,
        score: 3,
        userVote: null,
        replies: [],
      },
    ],
  },
  {
    id: "c2",
    authorName: "Charlie",
    avatarColor: "#F97316",
    content: "Could you elaborate a bit more on the performance aspect?",
    createdAt: now - 1000 * 60 * 60,
    score: 2,
    userVote: null,
    replies: [],
  },
];

/* ---------- Utilities ---------- */

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? "s" : ""} ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} hour${diffH > 1 ? "s" : ""} ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD} day${diffD > 1 ? "s" : ""} ago`;
}

function sortComments(comments: Comment[], sortBy: SortOption): Comment[] {
  const copy = [...comments];
  copy.sort((a, b) => {
    if (sortBy === "newest") return b.createdAt - a.createdAt;
    if (sortBy === "oldest") return a.createdAt - b.createdAt;
    // top
    if (b.score !== a.score) return b.score - a.score;
    return b.createdAt - a.createdAt;
  });
  return copy;
}

/* Deep, immutable tree operations */

function updateCommentInTree(
  comments: Comment[],
  id: CommentID,
  updater: (c: Comment) => Comment
): Comment[] {
  return comments.map((comment) => {
    if (comment.id === id) {
      return updater(comment);
    }
    if (comment.replies.length > 0) {
      return {
        ...comment,
        replies: updateCommentInTree(comment.replies, id, updater),
      };
    }
    return comment;
  });
}

function deleteCommentInTree(comments: Comment[], id: CommentID): Comment[] {
  const result: Comment[] = [];

  for (const comment of comments) {
    if (comment.id === id) continue;
    if (comment.replies.length > 0) {
      result.push({
        ...comment,
        replies: deleteCommentInTree(comment.replies, id),
      });
    } else {
      result.push(comment);
    }
  }

  return result;
}

function addReplyToComment(
  comments: Comment[],
  parentId: CommentID,
  newComment: Comment
): Comment[] {
  return comments.map((comment) => {
    if (comment.id === parentId) {
      return {
        ...comment,
        replies: [...comment.replies, newComment],
      };
    }
    if (comment.replies.length > 0) {
      return {
        ...comment,
        replies: addReplyToComment(comment.replies, parentId, newComment),
      };
    }
    return comment;
  });
}

/* ---------- Comment Form Component ---------- */

type CommentFormProps = {
  placeholder?: string;
  autoFocus?: boolean;
  initialValue?: string;
  onCancel?: () => void;
  onSubmit: (value: string) => void;
  maxLength?: number;
};

function CommentForm({
  placeholder = "Write a comment...",
  autoFocus,
  initialValue = "",
  onCancel,
  onSubmit,
  maxLength = 280,
}: CommentFormProps) {
  const [value, setValue] = React.useState(initialValue);
  const [touched, setTouched] = React.useState(false);

  const remaining = maxLength - value.length;
  const tooLong = remaining < 0;
  const tooShort = value.trim().length < 3;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (tooShort || tooLong) return;
    onSubmit(value.trim());
    setValue("");
    setTouched(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-1">
      <textarea
        autoFocus={autoFocus}
        className="w-full resize-none rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
        placeholder={placeholder}
        rows={3}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => setTouched(true)}
      />
      <div className="flex items-center justify-between text-[0.75rem]">
        <div className="flex items-center gap-2">
          {touched && tooShort && (
            <span className="text-red-500">
              Comment must be at least 3 characters.
            </span>
          )}
          {touched && tooLong && (
            <span className="text-red-500">
              Comment exceeds maximum length of {maxLength}.
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span
            className={classNames(
              "text-xs",
              remaining < 0 ? "text-red-500" : "text-slate-500"
            )}
          >
            {remaining} chars left
          </span>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full border border-transparent px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            disabled={tooShort || tooLong}
          >
            Post
          </button>
        </div>
      </div>
    </form>
  );
}

/* ---------- Comment Item Component (Recursive) ---------- */

type CommentItemProps = {
  comment: Comment;
  level: number;
  sortBy: SortOption;
  onReply: (parentId: CommentID, text: string) => void;
  onEdit: (id: CommentID, text: string) => void;
  onDelete: (id: CommentID) => void;
  onVote: (id: CommentID, vote: Vote) => void;
};

function CommentItem({
  comment,
  level,
  sortBy,
  onReply,
  onEdit,
  onDelete,
  onVote,
}: CommentItemProps) {
  const [isReplying, setIsReplying] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const sortedReplies = sortComments(comment.replies, sortBy);

  const handleUpvote = () => {
    onVote(comment.id, comment.userVote === "up" ? null : "up");
  };

  const handleDownvote = () => {
    onVote(comment.id, comment.userVote === "down" ? null : "down");
  };

  const indentPx = level * 16;

  const avatarInitial = comment.authorName.charAt(0).toUpperCase();

  const handleSubmitReply = (text: string) => {
    onReply(comment.id, text);
    setIsReplying(false);
  };

  const handleSubmitEdit = (text: string) => {
    onEdit(comment.id, text);
    setIsEditing(false);
  };

  return (
    <div className="relative">
      {/* Vertical thread line (except top level) */}
      {level > 0 && (
        <div
          className="absolute left-[6px] top-0 h-full w-px bg-slate-200"
          style={{ marginLeft: indentPx }}
        />
      )}

      <div
        className="mt-2 flex gap-2"
        style={{ paddingLeft: indentPx + (level > 0 ? 12 : 0) }}
      >
        {/* Avatar */}
        <div
          className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
          style={{ backgroundColor: comment.avatarColor }}
        >
          {avatarInitial}
        </div>

        <div className="flex-1">
          {/* Header */}
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-800">
              {comment.authorName}
            </span>
            <span className="text-slate-400">
              · {formatRelativeTime(comment.createdAt)}
            </span>
          </div>

          {/* Content / Edit mode */}
          <div className="mt-1">
            {isEditing ? (
              <CommentForm
                initialValue={comment.content}
                onSubmit={handleSubmitEdit}
                onCancel={() => setIsEditing(false)}
                maxLength={280}
              />
            ) : (
              <p className="whitespace-pre-wrap text-sm text-slate-800">
                {comment.content}
              </p>
            )}
          </div>

          {/* Actions */}
          {!isEditing && (
            <div className="mt-1 flex items-center gap-3 text-[0.75rem] text-slate-500">
              {/* Voting */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleUpvote}
                  className={classNames(
                    "flex h-5 w-5 items-center justify-center rounded-full border border-transparent hover:bg-indigo-50",
                    comment.userVote === "up" && "text-indigo-600"
                  )}
                >
                  ▲
                </button>
                <span
                  className={classNames(
                    "min-w-[1.5rem] text-center",
                    comment.score > 0 && "text-emerald-600",
                    comment.score < 0 && "text-red-500"
                  )}
                >
                  {comment.score}
                </span>
                <button
                  type="button"
                  onClick={handleDownvote}
                  className={classNames(
                    "flex h-5 w-5 items-center justify-center rounded-full border border-transparent hover:bg-indigo-50",
                    comment.userVote === "down" && "text-indigo-600"
                  )}
                >
                  ▼
                </button>
              </div>

              {/* Reply */}
              <button
                type="button"
                className="rounded-full px-1 text-[0.75rem] font-medium text-slate-600 hover:bg-slate-100"
                onClick={() => setIsReplying((prev) => !prev)}
              >
                Reply
              </button>

              {/* Edit / Delete (for demo, assume current user = Alice) */}
              {comment.authorName === "Alice" && (
                <>
                  <button
                    type="button"
                    className="rounded-full px-1 text-[0.75rem] text-slate-600 hover:bg-slate-100"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="rounded-full px-1 text-[0.75rem] text-red-500 hover:bg-red-50"
                    onClick={() => onDelete(comment.id)}
                  >
                    Delete
                  </button>
                </>
              )}

              {/* Collapse */}
              {comment.replies.length > 0 && (
                <button
                  type="button"
                  className="rounded-full px-1 text-[0.7rem] text-slate-500 hover:bg-slate-100"
                  onClick={() => setIsCollapsed((prev) => !prev)}
                >
                  {isCollapsed
                    ? `Expand (${comment.replies.length} repl${
                        comment.replies.length > 1 ? "ies" : "y"
                      })`
                    : "Collapse"}
                </button>
              )}
            </div>
          )}

          {/* Reply form */}
          {isReplying && !isEditing && (
            <div className="mt-2">
              <CommentForm
                placeholder={`Reply to ${comment.authorName}...`}
                autoFocus
                onSubmit={handleSubmitReply}
                onCancel={() => setIsReplying(false)}
              />
            </div>
          )}

          {/* Children */}
          {!isCollapsed && sortedReplies.length > 0 && (
            <div className="mt-1">
              {sortedReplies.map((child) => (
                <CommentItem
                  key={child.id}
                  comment={child}
                  level={level + 1}
                  sortBy={sortBy}
                  onReply={onReply}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onVote={onVote}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Top-level Thread Component ---------- */

export default function CommentThreadDemo() {
  const [comments, setComments] = React.useState<Comment[]>(SAMPLE_COMMENTS);
  const [sortBy, setSortBy] = React.useState<SortOption>("top");

  const handleCreateTopLevel = (text: string) => {
    const newComment: Comment = {
      id: `c-${Date.now()}`,
      authorName: "Alice", // pretend logged-in user
      avatarColor: "#4F46E5",
      content: text,
      createdAt: Date.now(),
      score: 0,
      userVote: null,
      replies: [],
    };
    setComments((prev) => [newComment, ...prev]);
  };

  const handleReply = (parentId: CommentID, text: string) => {
    const newComment: Comment = {
      id: `c-${Date.now()}`,
      authorName: "Alice",
      avatarColor: "#4F46E5",
      content: text,
      createdAt: Date.now(),
      score: 0,
      userVote: null,
      replies: [],
    };
    setComments((prev) => addReplyToComment(prev, parentId, newComment));
  };

  const handleEdit = (id: CommentID, text: string) => {
    setComments((prev) =>
      updateCommentInTree(prev, id, (c) => ({ ...c, content: text }))
    );
  };

  const handleDelete = (id: CommentID) => {
    setComments((prev) => deleteCommentInTree(prev, id));
  };

  const handleVote = (id: CommentID, vote: Vote) => {
    setComments((prev) =>
      updateCommentInTree(prev, id, (c) => {
        let score = c.score;
        // remove previous vote
        if (c.userVote === "up") score -= 1;
        if (c.userVote === "down") score += 1;
        // apply new vote
        if (vote === "up") score += 1;
        if (vote === "down") score -= 1;
        return { ...c, score, userVote: vote };
      })
    );
  };

  const sortedTopLevel = sortComments(comments, sortBy);

  return (
    <div className="mx-auto my-6 max-w-2xl rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Comments</h2>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Sort by:</span>
          <select
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
          >
            <option value="top">Top</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
      </div>

      {/* New top-level comment form */}
      <div className="mb-4">
        <CommentForm
          placeholder="Add a comment..."
          onSubmit={handleCreateTopLevel}
        />
      </div>

      {/* Thread list */}
      <div>
        {sortedTopLevel.length === 0 ? (
          <p className="text-xs text-slate-500">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          sortedTopLevel.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              level={0}
              sortBy={sortBy}
              onReply={handleReply}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onVote={handleVote}
            />
          ))
        )}
      </div>
    </div>
  );
}
