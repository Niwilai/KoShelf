//! Collections sync: parse KOReader's `collection.lua` and persist user shelves.
//!
//! Collections reference books by absolute KOReader path (e.g. `/mnt/us/books/...`),
//! which won't match local paths, so books are matched to library items by
//! filename (basename). Empty collections (no matched books) are skipped.

use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};

use anyhow::Result;
use log::{debug, info, warn};

use crate::app::config::SiteConfig;
use crate::source::koreader::LuaParser;
use crate::store::sqlite::repo::LibraryRepository;
use crate::store::sqlite::repo::rows::{CollectionItemRow, CollectionRow};

/// Resolve the `collection.lua` path: explicit config value, otherwise a
/// best-effort guess next to the statistics database.
fn resolve_collections_path(config: &SiteConfig) -> Option<PathBuf> {
    if let Some(path) = config.collections_path.as_ref() {
        return Some(path.clone());
    }

    config
        .statistics_db_paths
        .iter()
        .find_map(|stats| stats.parent().map(|dir| dir.join("collection.lua")))
        .filter(|path| path.exists())
}

/// Parse `collection.lua` and replace the stored collections snapshot.
///
/// Called after library ingest so books can be resolved to item IDs.
pub async fn sync_collections(config: &SiteConfig, repo: &LibraryRepository) -> Result<()> {
    let path = match resolve_collections_path(config) {
        Some(path) => path,
        None => return Ok(()),
    };

    if !path.exists() {
        info!("Collections file not found: {:?}", path);
        // Clear any previously ingested collections so the view reflects removal.
        repo.replace_collections(&[], &[]).await?;
        return Ok(());
    }

    let parser = LuaParser::new();
    let parsed = match parser.parse_collections(&path) {
        Ok(parsed) => parsed,
        Err(error) => {
            warn!("Failed to parse collections {:?}: {}", path, error);
            return Ok(());
        }
    };

    // Map basename -> item id; keep the first on collision (basenames aren't unique).
    let file_info = repo.load_all_item_file_info().await?;
    let mut by_basename: HashMap<String, String> = HashMap::new();
    for (id, file_path, _format) in file_info {
        if let Some(name) = Path::new(&file_path).file_name().and_then(|n| n.to_str()) {
            if by_basename.insert(name.to_string(), id.clone()).is_some() {
                warn!(
                    "Duplicate basename '{}' in library; collections will use the first match",
                    name
                );
            }
        }
    }

    let mut collection_rows: Vec<CollectionRow> = Vec::new();
    let mut item_rows: Vec<CollectionItemRow> = Vec::new();

    for (display_order, collection) in parsed.iter().enumerate() {
        let mut matched: Vec<String> = Vec::new();
        let mut seen: HashSet<String> = HashSet::new();

        for entry in &collection.items {
            let Some(basename) = Path::new(&entry.file).file_name().and_then(|n| n.to_str()) else {
                continue;
            };
            match by_basename.get(basename) {
                Some(item_id) => {
                    if seen.insert(item_id.clone()) {
                        matched.push(item_id.clone());
                    }
                }
                None => debug!(
                    "Collection '{}': no library item for '{}'",
                    collection.name, basename
                ),
            }
        }

        if matched.is_empty() {
            continue;
        }

        collection_rows.push(CollectionRow {
            name: collection.name.clone(),
            display_order: display_order as i64,
        });
        for (item_order, item_id) in matched.into_iter().enumerate() {
            item_rows.push(CollectionItemRow {
                collection_name: collection.name.clone(),
                item_id,
                item_order: item_order as i64,
            });
        }
    }

    let collection_count = collection_rows.len();
    repo.replace_collections(&collection_rows, &item_rows).await?;
    info!(
        "Synced {} collection(s) with {} book(s)",
        collection_count,
        item_rows.len()
    );
    Ok(())
}
