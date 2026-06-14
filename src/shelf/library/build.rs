//! Library item persistence helpers.
//!
//! `upsert_single_item` handles writing a single library item (row +
//! annotations + fingerprint) to the database.  Used by the ingest pipeline
//! and by the watcher's targeted rebuild.

use anyhow::{Context, Result};
use std::path::Path;

use crate::shelf::library::item_mapping::{
    capture_fingerprint_row, map_annotations_to_rows, map_item_to_row,
};
use crate::shelf::models::LibraryItem;
use crate::shelf::time_config::TimeConfig;
use crate::store::sqlite::repo::LibraryRepository;

/// Upsert a single library item (row + annotations + fingerprint).
///
/// `metadata_path` is the resolved KOReader metadata file path, or `None`
/// for items without metadata.
pub async fn upsert_single_item(
    repo: &LibraryRepository,
    item: &LibraryItem,
    metadata_path: Option<&Path>,
    time_config: &TimeConfig,
) -> Result<()> {
    let row = map_item_to_row(item, time_config);

    repo.upsert_item(&row)
        .await
        .context("Failed to upsert library item")?;

    let annotation_rows = map_annotations_to_rows(&item.id, item, time_config);
    repo.replace_annotations(&item.id, &annotation_rows)
        .await
        .context("Failed to replace annotations")?;

    if let Some(fp_row) = capture_fingerprint_row(item, metadata_path, time_config) {
        repo.upsert_fingerprint(&fp_row)
            .await
            .context("Failed to upsert fingerprint")?;

        if let Some(modified_ms) = fp_row.metadata_modified_unix_ms {
            let ts = time_config.format_timestamp_rfc3339(modified_ms / 1000);
            repo.set_last_open_at_if_newer(&item.id, &ts)
                .await
                .context("Failed to update last_open_at from metadata timestamp")?;
        }
    }

    Ok(())
}
