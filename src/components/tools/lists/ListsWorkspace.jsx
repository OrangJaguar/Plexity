import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown, ChevronLeft, ChevronUp, Cloud, Loader2, Plus, Search, Star,
} from 'lucide-react';
import ListsItemDrawer from '@/components/tools/lists/ListsItemDrawer';
import { CreateListModal, CreateTopicModal, MoveItemModal } from '@/components/tools/lists/ListsModals';
import {
  ListsEmptyBlock, ListsStarRating, ListsStatusBadge, ListsTagChip, ListsTopicIcon,
} from '@/components/tools/lists/lists-shared';
import {
  applySavedView,
  collectAllTags,
  countItemsInList,
  filterItems,
  getTemplate,
  listsForTopic,
  newItem,
  newList,
  normalizeListsWorkspace,
  itemsForList,
  SAVED_VIEWS,
  SORT_OPTIONS,
  sortItems,
} from '@/lib/tools/lists/lists-model';
import { useCommandBarDraft } from '@/hooks/useCommandBarDraft';
import { useIsMobile } from '@/hooks/use-mobile';

export default function ListsWorkspace({ data, saveDocument }) {
  const isMobile = useIsMobile();
  const [workspace, setWorkspace] = useState(() => normalizeListsWorkspace(data));
  const [saveState, setSaveState] = useState('saved');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [sortId, setSortId] = useState('manual');
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [topicModalOpen, setTopicModalOpen] = useState(false);
  const [listModalOpen, setListModalOpen] = useState(false);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [moveItem, setMoveItem] = useState(null);
  const [quickTitle, setQuickTitle] = useState('');
  const saveTimer = useRef(null);
  const { action, clearAction } = useCommandBarDraft('action');

  useEffect(() => {
    if (saveState === 'saving') return;
    setWorkspace(normalizeListsWorkspace(data));
  }, [data, saveState]);

  const persist = useCallback((next) => {
    setSaveState('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveDocument(next)
        .then(() => setSaveState('saved'))
        .catch(() => setSaveState('error'));
    }, 650);
  }, [saveDocument]);

  const updateWorkspace = useCallback((updater) => {
    setWorkspace((prev) => {
      const next = normalizeListsWorkspace(
        typeof updater === 'function' ? updater(prev) : { ...prev, ...updater, updatedAt: Date.now() },
      );
      persist(next);
      return next;
    });
  }, [persist]);

  const activeTopicId = workspace.ui.activeTopicId;
  const activeListId = workspace.ui.activeListId;
  const activeTopic = workspace.topics.find((t) => t.id === activeTopicId) || null;
  const activeList = workspace.lists.find((l) => l.id === activeListId) || null;
  const topicLists = useMemo(() => listsForTopic(workspace.lists, activeTopicId), [workspace.lists, activeTopicId]);

  const savedViewId = activeListId
    ? (workspace.ui.viewByList?.[activeListId] || 'all')
    : 'all';

  const setSavedView = (viewId) => {
    if (!activeListId) return;
    updateWorkspace((prev) => ({
      ...prev,
      ui: {
        ...prev.ui,
        viewByList: { ...prev.ui.viewByList, [activeListId]: viewId },
      },
    }));
  };

  const listItems = useMemo(() => {
    if (!activeList) return [];
    let items = itemsForList(workspace.items, activeList.id);
    items = applySavedView(items, savedViewId, activeList.templateId);
    items = filterItems(items, { status: statusFilter, tag: tagFilter, query: search });
    return sortItems(items, sortId);
  }, [workspace.items, activeList, savedViewId, statusFilter, tagFilter, search, sortId]);

  const allTags = useMemo(() => {
    if (!activeList) return [];
    return collectAllTags(itemsForList(workspace.items, activeList.id));
  }, [workspace.items, activeList]);

  const selectedItem = workspace.items.find((i) => i.id === selectedItemId) || null;

  const selectTopic = (topicId) => {
    updateWorkspace((prev) => {
      const lists = listsForTopic(prev.lists, topicId);
      return {
        ...prev,
        ui: {
          ...prev.ui,
          activeTopicId: topicId,
          activeListId: isMobile ? null : (lists[0]?.id ?? null),
        },
      };
    });
    setSearch('');
    setStatusFilter('');
    setTagFilter('');
  };

  const selectList = (listId) => {
    updateWorkspace((prev) => ({
      ...prev,
      ui: { ...prev.ui, activeListId: listId },
    }));
    setSearch('');
    setStatusFilter('');
    setTagFilter('');
  };

  const clearListSelection = () => {
    updateWorkspace((prev) => ({
      ...prev,
      ui: { ...prev.ui, activeListId: null },
    }));
    setSearch('');
    setStatusFilter('');
    setTagFilter('');
  };

  const addTopic = (topic) => {
    updateWorkspace((prev) => ({
      ...prev,
      topics: [...prev.topics, { ...topic, order: prev.topics.length }],
      ui: { ...prev.ui, activeTopicId: topic.id, activeListId: null },
    }));
  };

  const addList = (list) => {
    updateWorkspace((prev) => ({
      ...prev,
      lists: [...prev.lists, list],
      ui: { ...prev.ui, activeTopicId: list.topicId, activeListId: list.id },
    }));
  };

  useEffect(() => {
    if (!action) return;
    if (action.actionId === 'addListItem' && action.payload?.text && activeList) {
      const item = newItem(activeList.id, action.payload.text, { templateId: activeList.templateId });
      updateWorkspace((prev) => ({ ...prev, items: [...prev.items, item] }));
      setSelectedItemId(item.id);
      setDrawerOpen(true);
      clearAction();
    }
    if (action.actionId === 'createList') {
      const name = action.payload?.name?.trim();
      if (name && activeTopic) {
        addList(newList(activeTopic.id, name));
      } else {
        setListModalOpen(true);
      }
      clearAction();
    }
  }, [action, activeList, activeTopic, clearAction, updateWorkspace]);

  const quickAddItem = () => {
    const title = quickTitle.trim();
    if (!title || !activeList) return;
    const item = newItem(activeList.id, title, { templateId: activeList.templateId });
    updateWorkspace((prev) => ({
      ...prev,
      items: [...prev.items, item],
    }));
    setQuickTitle('');
    setSelectedItemId(item.id);
    setDrawerOpen(true);
  };

  const saveItem = (item) => {
    updateWorkspace((prev) => ({
      ...prev,
      items: prev.items.map((i) => (i.id === item.id ? { ...item, updatedAt: Date.now() } : i)),
    }));
  };

  const deleteItem = (itemId) => {
    updateWorkspace((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.id !== itemId),
    }));
    setDrawerOpen(false);
    setSelectedItemId(null);
  };

  const duplicateItemAction = (copy) => {
    updateWorkspace((prev) => ({ ...prev, items: [...prev.items, copy] }));
    setSelectedItemId(copy.id);
  };

  const moveItemAction = (itemId, targetListId) => {
    updateWorkspace((prev) => ({
      ...prev,
      items: prev.items.map((i) => (i.id === itemId ? { ...i, listId: targetListId, updatedAt: Date.now() } : i)),
    }));
  };

  const archiveItem = (item) => {
    updateWorkspace((prev) => ({
      ...prev,
      items: prev.items.map((i) => (i.id === item.id ? { ...i, archived: true, updatedAt: Date.now() } : i)),
    }));
    setDrawerOpen(false);
  };

  const reorderItem = (itemId, direction) => {
    if (!activeList || sortId !== 'manual') return;
    const items = sortItems(itemsForList(workspace.items, activeList.id).filter((i) => !i.archived), 'manual');
    const idx = items.findIndex((i) => i.id === itemId);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (idx < 0 || swapIdx < 0 || swapIdx >= items.length) return;
    const a = items[idx];
    const b = items[swapIdx];
    updateWorkspace((prev) => ({
      ...prev,
      items: prev.items.map((i) => {
        if (i.id === a.id) return { ...i, order: b.order };
        if (i.id === b.id) return { ...i, order: a.order };
        return i;
      }),
    }));
  };

  const deleteTopic = (topicId) => {
    const listIds = workspace.lists.filter((l) => l.topicId === topicId).map((l) => l.id);
    updateWorkspace((prev) => {
      const topics = prev.topics.filter((t) => t.id !== topicId);
      return {
        ...prev,
        topics,
        lists: prev.lists.filter((l) => l.topicId !== topicId),
        items: prev.items.filter((i) => !listIds.includes(i.listId)),
        ui: {
          activeTopicId: topics[0]?.id ?? null,
          activeListId: null,
          viewByList: prev.ui.viewByList,
        },
      };
    });
  };

  const tpl = activeList ? getTemplate(activeList.templateId) : null;

  const workspaceClass = [
    'lists-workspace',
    isMobile ? 'lists-workspace--mobile' : '',
    isMobile && activeList ? 'lists-workspace--show-items' : '',
    isMobile && !activeList ? 'lists-workspace--show-lists' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={workspaceClass}>
      <aside className="lists-workspace-topics">
        <div className="lists-workspace-brand">
          <div className={`lists-save-indicator lists-save-indicator--${saveState}`}>
            {saveState === 'saving' ? <Loader2 size={14} className="lists-save-spinner" /> : <Cloud size={14} />}
            <span>{saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Save failed' : 'Saved'}</span>
          </div>
        </div>
        <div className="lists-panel-head">
          <strong>Topics</strong>
          <button type="button" className="lists-icon-btn" onClick={() => setTopicModalOpen(true)} aria-label="New topic">
            <Plus size={16} />
          </button>
        </div>
        <nav className="lists-topic-nav" aria-label="Topics">
          {workspace.topics.sort((a, b) => a.order - b.order).map((topic) => (
            <button
              key={topic.id}
              type="button"
              className={`lists-topic-btn${topic.id === activeTopicId ? ' is-active' : ''}`}
              onClick={() => selectTopic(topic.id)}
            >
              <ListsTopicIcon icon={topic.icon} size={15} />
              <span className="lists-topic-btn-label">{topic.name}</span>
              <span className="lists-topic-count">{listsForTopic(workspace.lists, topic.id).length}</span>
            </button>
          ))}
        </nav>
        {activeTopic && !isMobile && (
          <button type="button" className="lists-text-btn lists-text-btn--danger" onClick={() => deleteTopic(activeTopic.id)}>
            Delete topic
          </button>
        )}
      </aside>

      <aside className="lists-workspace-lists">
        {activeTopic ? (
          <>
            <div className="lists-panel-head">
              <div>
                <strong>{activeTopic.name}</strong>
                <span className="lists-panel-sub">Lists</span>
              </div>
              <button type="button" className="lists-icon-btn" onClick={() => setListModalOpen(true)} aria-label="New list">
                <Plus size={16} />
              </button>
            </div>
            <div className="lists-list-nav">
              {topicLists.length === 0 ? (
                <ListsEmptyBlock
                  title="No lists yet"
                  lead={`Create a list inside ${activeTopic.name} — e.g. “Watchlist” or “Favorites.”`}
                  action={(
                    <button type="button" className="lists-btn lists-btn--primary lists-btn--sm" onClick={() => setListModalOpen(true)}>
                      Create list
                    </button>
                  )}
                />
              ) : (
                topicLists.map((list) => (
                  <button
                    key={list.id}
                    type="button"
                    className={`lists-list-btn${list.id === activeListId ? ' is-active' : ''}`}
                    onClick={() => selectList(list.id)}
                  >
                    <span className="lists-list-btn-title">{list.title}</span>
                    {list.description && <span className="lists-list-btn-desc">{list.description}</span>}
                    <span className="lists-list-btn-meta">
                      {getTemplate(list.templateId).label} · {countItemsInList(workspace.items, list.id)} items
                    </span>
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          <ListsEmptyBlock title="Select a topic" lead="Topics group your collections — Movies, Books, Prompts, and more." />
        )}
      </aside>

      <main className="lists-workspace-main">
        {!activeList ? (
          <ListsEmptyBlock
            title={activeTopic ? 'Choose or create a list' : 'Welcome to Lists'}
            lead={activeTopic
              ? 'Lists are where your items live — a watchlist, reading list, prompt library, or anything else.'
              : 'Your personal collection system for movies, books, restaurants, prompts, ideas, and more.'}
            action={activeTopic && (
              <button type="button" className="lists-btn lists-btn--primary" onClick={() => setListModalOpen(true)}>
                Create your first list
              </button>
            )}
          />
        ) : (
          <>
            <header className="lists-main-head">
              {isMobile && (
                <button
                  type="button"
                  className="lists-mobile-back"
                  onClick={clearListSelection}
                  aria-label="Back to lists"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              <div className="lists-main-head-text">
                <p className="lists-breadcrumb">{activeTopic?.name} / {activeList.title}</p>
                <h1>{activeList.title}</h1>
                {activeList.description && <p className="lists-main-desc">{activeList.description}</p>}
              </div>
              <span className="lists-template-pill">{tpl?.label} template</span>
            </header>

            <div className="lists-quick-add">
              <input
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && quickAddItem()}
                placeholder={tpl?.emptyHint || 'Quick add — title only, details later'}
              />
              <button type="button" className="lists-btn lists-btn--primary" onClick={quickAddItem} disabled={!quickTitle.trim()}>
                Add item
              </button>
            </div>

            <div className="lists-toolbar">
              <div className="lists-view-chips">
                {SAVED_VIEWS.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    className={`lists-view-chip${savedViewId === v.id ? ' is-active' : ''}`}
                    onClick={() => setSavedView(v.id)}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
              <div className="lists-toolbar-filters">
                <div className="lists-search-wrap">
                  <Search size={14} />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items" />
                </div>
                <select value={sortId} onChange={(e) => setSortId(e.target.value)} aria-label="Sort">
                  {SORT_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
                  <option value="">All statuses</option>
                  {tpl?.statuses.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                {allTags.length > 0 && (
                  <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} aria-label="Filter by tag">
                    <option value="">All tags</option>
                    {allTags.map((t) => <option key={t} value={t}>#{t}</option>)}
                  </select>
                )}
              </div>
            </div>

            {listItems.length === 0 ? (
              <ListsEmptyBlock
                title="No items yet"
                lead={tpl?.emptyHint}
                action={(
                  <button
                    type="button"
                    className="lists-btn lists-btn--ghost"
                    onClick={() => {
                      const item = newItem(activeList.id, tpl?.exampleTitle || 'First item', { templateId: activeList.templateId });
                      updateWorkspace((prev) => ({ ...prev, items: [...prev.items, item] }));
                      setSelectedItemId(item.id);
                      setDrawerOpen(true);
                    }}
                  >
                    Add example item
                  </button>
                )}
              />
            ) : (
              <ul className="lists-item-grid">
                {listItems.map((item) => (
                  <li key={item.id}>
                    <article
                      className={`lists-item-card${item.isFavorite ? ' is-favorite' : ''}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => { setSelectedItemId(item.id); setDrawerOpen(true); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { setSelectedItemId(item.id); setDrawerOpen(true); } }}
                    >
                      <div className="lists-item-card-top">
                        <div>
                          <h3>{item.title || 'Untitled'}</h3>
                          {item.subtitle && <p className="lists-item-subtitle">{item.subtitle}</p>}
                        </div>
                        <div className="lists-item-card-badges">
                          {item.isFavorite && <Star size={14} className="lists-favorite-icon" fill="currentColor" />}
                          <ListsStatusBadge templateId={activeList.templateId} statusId={item.status} />
                        </div>
                      </div>
                      {activeList.templateId === 'prompts' && item.extra?.promptText && (
                        <p className="lists-item-prompt-preview">{item.extra.promptText.slice(0, 120)}{item.extra.promptText.length > 120 ? '…' : ''}</p>
                      )}
                      {item.notes && activeList.templateId !== 'prompts' && (
                        <p className="lists-item-notes-preview">{item.notes.slice(0, 100)}{item.notes.length > 100 ? '…' : ''}</p>
                      )}
                      <div className="lists-item-card-footer">
                        {item.rating != null && <ListsStarRating value={item.rating} readOnly size={12} />}
                        <div className="lists-item-tags">
                          {item.tags.slice(0, 3).map((t) => <ListsTagChip key={t} tag={t} />)}
                        </div>
                        {sortId === 'manual' && (
                          <div className="lists-item-reorder">
                            <button type="button" className="lists-icon-btn" onClick={(e) => { e.stopPropagation(); reorderItem(item.id, 'up'); }} aria-label="Move up">
                              <ChevronUp size={14} />
                            </button>
                            <button type="button" className="lists-icon-btn" onClick={(e) => { e.stopPropagation(); reorderItem(item.id, 'down'); }} aria-label="Move down">
                              <ChevronDown size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>

      <ListsItemDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        item={selectedItem}
        list={activeList}
        allLists={workspace.lists}
        onSave={saveItem}
        onDelete={deleteItem}
        onDuplicate={duplicateItemAction}
        onMove={(item) => { setMoveItem(item); setMoveModalOpen(true); }}
        onArchive={archiveItem}
      />

      <CreateTopicModal open={topicModalOpen} onOpenChange={setTopicModalOpen} onCreate={addTopic} />
      <CreateListModal open={listModalOpen} onOpenChange={setListModalOpen} topic={activeTopic} onCreate={addList} />
      <MoveItemModal
        open={moveModalOpen}
        onOpenChange={setMoveModalOpen}
        item={moveItem}
        lists={workspace.lists}
        topics={workspace.topics}
        currentListId={activeListId}
        onMove={moveItemAction}
      />
    </div>
  );
}
