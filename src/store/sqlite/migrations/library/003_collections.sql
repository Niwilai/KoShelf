CREATE TABLE IF NOT EXISTS collections (
    name TEXT PRIMARY KEY,
    display_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS collection_items (
    collection_name TEXT NOT NULL,
    item_id TEXT NOT NULL,
    item_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (collection_name, item_id),
    FOREIGN KEY (collection_name) REFERENCES collections(name) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES library_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_collection_items_collection
    ON collection_items (collection_name, item_order);
