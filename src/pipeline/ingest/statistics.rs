//! Statistics loading: parse, filter, tag, and package reading data.
//!
//! Uses DB queries instead of in-memory item collections for content-type
//! tagging and library-item filtering.

use crate::app::config::SiteConfig;
use crate::shelf::statistics::{PageScaling, StatisticsCalculator};
use crate::source::koreader::StatisticsParser;
use crate::store::memory::ReadingData;
use crate::store::sqlite::repo::LibraryRepository;
use anyhow::Result;
use log::info;
use std::collections::HashSet;

/// Load and process reading statistics using DB queries for filtering and tagging.
///
/// Called after library ingest at startup, and during rebuild when stats DB changes.
pub async fn load_reading_data(
    config: &SiteConfig,
    repo: &LibraryRepository,
) -> Result<Option<ReadingData>> {
    let stats_path = match config.statistics_db_path.as_ref() {
        Some(p) if p.exists() => p,
        Some(p) => {
            info!("Statistics database not found: {:?}", p);
            return Ok(None);
        }
        None => return Ok(None),
    };

    let mut data = StatisticsParser::parse(stats_path).await?;
    let total_books = data.books.len();

    if config.min_pages_per_day.is_some() || config.min_time_per_day.is_some() {
        StatisticsCalculator::filter_stats(
            &mut data,
            &config.time_config,
            config.min_pages_per_day,
            config.min_time_per_day,
        );
    }

    if !config.include_all_stats {
        let item_ids = repo.load_all_item_ids().await?;
        if !item_ids.is_empty() {
            let md5s: HashSet<String> = item_ids.into_iter().collect();
            StatisticsCalculator::filter_to_library(&mut data, &md5s);
        }
    }

    let hidden_flow_pages = repo.load_hidden_flow_pages().await?;
    data.apply_hidden_flow_adjustments(&hidden_flow_pages);

    StatisticsCalculator::populate_completions(&mut data, &config.time_config);

    let content_type_map = repo.load_content_types_by_id().await?;
    data.tag_content_types(&content_type_map);

    let page_scaling = if config.use_stable_page_metadata {
        let scaling_inputs = repo.load_scaling_inputs().await?;
        PageScaling::from_db_inputs(&scaling_inputs, &data)
    } else {
        PageScaling::disabled()
    };

    let ignored = total_books - data.books.len();
    info!(
        "Statistics: {} books ({} ignored), {} with completions",
        data.books.len(),
        ignored,
        data.books
            .iter()
            .filter(|b| b.completions.is_some())
            .count()
    );

    let reading_data = ReadingData {
        stats_data: data,
        time_config: config.time_config.clone(),
        heatmap_scale_max: config.heatmap_scale_max,
        page_scaling,
    };

    sync_reading_stats_to_db(repo, &reading_data).await?;

    Ok(Some(reading_data))
}

/// Write `last_open_at` and `total_reading_time_sec` from in-memory
/// statistics back into `library_items` so list queries can sort by them.
pub async fn sync_reading_stats_to_db(
    repo: &LibraryRepository,
    reading_data: &ReadingData,
) -> Result<()> {
    let updates: Vec<(String, Option<String>, Option<i64>)> = reading_data
        .stats_data
        .stats_by_md5
        .iter()
        .map(|(md5, stat_book)| {
            let last_open_at = stat_book
                .last_open
                .map(|ts| reading_data.time_config.format_timestamp_rfc3339(ts));
            (md5.to_lowercase(), last_open_at, stat_book.total_read_time)
        })
        .collect();

    let total = updates.len();
    let with_last_open = updates.iter().filter(|(_, lo, _)| lo.is_some()).count();
    let changed = repo.sync_reading_stats(&updates).await?;
    info!(
        "Reading stats sync: {} candidates ({} with last_open_at), {} DB rows updated",
        total, with_last_open, changed
    );
    Ok(())
}
