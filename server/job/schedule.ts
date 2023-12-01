import availabilitySync from '@server/lib/availabilitySync';
import downloadTracker from '@server/lib/downloadtracker';
import ImageProxy from '@server/lib/imageproxy';
import { plexFullScanner, plexRecentScanner } from '@server/lib/scanners/plex';
import { radarrScanner } from '@server/lib/scanners/radarr';
import { sonarrScanner } from '@server/lib/scanners/sonarr';
import type { JobId } from '@server/lib/settings';
import { getSettings } from '@server/lib/settings';
import watchlistSync from '@server/lib/watchlistsync';
import logger from '@server/logger';
import random from 'lodash/random';
import schedule from 'node-schedule';

interface ScheduledJob {
  id: JobId;
  job: schedule.Job;
  name: string;
  type: 'process' | 'command';
  interval: 'seconds' | 'minutes' | 'hours' | 'fixed';
  cronSchedule: string;
  running?: () => boolean;
  cancelFn?: () => void;
}

export const scheduledJobs: ScheduledJob[] = [];

export const startJobs = (): void => {
  const jobs = getSettings().jobs;

  // Run recently added plex scan every 5 minutes
  scheduledJobs.push({
    id: 'plex-recently-added-scan',
    name: 'Plex Recently Added Scan',
    type: 'process',
    interval: 'minutes',
    cronSchedule: jobs['plex-recently-added-scan'].schedule,
    job: schedule.scheduleJob(jobs['plex-recently-added-scan'].schedule, () => {
      logger.info('Starting scheduled job: Plex Recently Added Scan', {
        label: 'Jobs',
      });
      plexRecentScanner.run().catch((error) => {
        console.error(`Error plexRecentScanner.run: ${error}`);
      });
    }),
    running: () => plexRecentScanner.status().running,
    cancelFn: () => plexRecentScanner.cancel(),
  });

  // Run full plex scan every 24 hours
  scheduledJobs.push({
    id: 'plex-full-scan',
    name: 'Plex Full Library Scan',
    type: 'process',
    interval: 'hours',
    cronSchedule: jobs['plex-full-scan'].schedule,
    job: schedule.scheduleJob(jobs['plex-full-scan'].schedule, () => {
      logger.info('Starting scheduled job: Plex Full Library Scan', {
        label: 'Jobs',
      });
      plexFullScanner.run().catch((error) => {
        console.error(`Error plexRecentScanner.run: ${error}`);
      });
    }),
    running: () => plexFullScanner.status().running,
    cancelFn: () => plexFullScanner.cancel(),
  });

  // Watchlist Sync
  const watchlistSyncJob: ScheduledJob = {
    id: 'plex-watchlist-sync',
    name: 'Plex Watchlist Sync',
    type: 'process',
    interval: 'fixed',
    cronSchedule: jobs['plex-watchlist-sync'].schedule,
    job: schedule.scheduleJob(new Date(Date.now() + 1000 * 60 * 20), () => {
      logger.info('Starting scheduled job: Plex Watchlist Sync', {
        label: 'Jobs',
      });
      watchlistSync.syncWatchlist().catch((error) => {
        console.error(`Error syncWatchlist: ${error}`);
      });
    }),
  };

  // To help alleviate load on Plex's servers, we will add some fuzziness to the next schedule
  // after each run
  watchlistSyncJob.job.on('run', () => {
    watchlistSyncJob.job.schedule(
      new Date(Math.floor(Date.now() + 1000 * 60 * random(14, 24, true)))
    );
  });

  scheduledJobs.push(watchlistSyncJob);

  // Run full radarr scan every 24 hours
  scheduledJobs.push({
    id: 'radarr-scan',
    name: 'Radarr Scan',
    type: 'process',
    interval: 'hours',
    cronSchedule: jobs['radarr-scan'].schedule,
    job: schedule.scheduleJob(jobs['radarr-scan'].schedule, () => {
      logger.info('Starting scheduled job: Radarr Scan', { label: 'Jobs' });
      radarrScanner.run().catch((error) => {
        console.error(`Error radarrScanner.run: ${error}`);
      });
    }),
    running: () => radarrScanner.status().running,
    cancelFn: () => radarrScanner.cancel(),
  });

  // Run full sonarr scan every 24 hours
  scheduledJobs.push({
    id: 'sonarr-scan',
    name: 'Sonarr Scan',
    type: 'process',
    interval: 'hours',
    cronSchedule: jobs['sonarr-scan'].schedule,
    job: schedule.scheduleJob(jobs['sonarr-scan'].schedule, () => {
      logger.info('Starting scheduled job: Sonarr Scan', { label: 'Jobs' });
      sonarrScanner.run().catch((error) => {
        console.error(`Error sonarrScanner.run: ${error}`);
      });
    }),
    running: () => sonarrScanner.status().running,
    cancelFn: () => sonarrScanner.cancel(),
  });

  // Checks if media is still available in plex/sonarr/radarr libs
  scheduledJobs.push({
    id: 'availability-sync',
    name: 'Media Availability Sync',
    type: 'process',
    interval: 'hours',
    cronSchedule: jobs['availability-sync'].schedule,
    job: schedule.scheduleJob(jobs['availability-sync'].schedule, () => {
      logger.info('Starting scheduled job: Media Availability Sync', {
        label: 'Jobs',
      });
      availabilitySync.run().catch((error) => {
        console.error(`Error availabilitySync.run: ${error}`);
      });
    }),
    running: () => availabilitySync.running,
    cancelFn: () => availabilitySync.cancel(),
  });

  // Run download sync every minute
  scheduledJobs.push({
    id: 'download-sync',
    name: 'Download Sync',
    type: 'command',
    interval: 'seconds',
    cronSchedule: jobs['download-sync'].schedule,
    job: schedule.scheduleJob(jobs['download-sync'].schedule, () => {
      logger.debug('Starting scheduled job: Download Sync', {
        label: 'Jobs',
      });
      downloadTracker.updateDownloads();
    }),
  });

  // Reset download sync everyday at 01:00 am
  scheduledJobs.push({
    id: 'download-sync-reset',
    name: 'Download Sync Reset',
    type: 'command',
    interval: 'hours',
    cronSchedule: jobs['download-sync-reset'].schedule,
    job: schedule.scheduleJob(jobs['download-sync-reset'].schedule, () => {
      logger.info('Starting scheduled job: Download Sync Reset', {
        label: 'Jobs',
      });
      downloadTracker.resetDownloadTracker().catch((error) => {
        console.error(`Error downloadTracker.resetDownloadTracker: ${error}`);
      });
    }),
  });

  // Run image cache cleanup every 24 hours
  scheduledJobs.push({
    id: 'image-cache-cleanup',
    name: 'Image Cache Cleanup',
    type: 'process',
    interval: 'hours',
    cronSchedule: jobs['image-cache-cleanup'].schedule,
    job: schedule.scheduleJob(jobs['image-cache-cleanup'].schedule, () => {
      logger.info('Starting scheduled job: Image Cache Cleanup', {
        label: 'Jobs',
      });
      // Clean TMDB image cache
      ImageProxy.clearCache('tmdb').catch((error) => {
        console.error(`Error ImageProxy.clearCache: ${error}`);
      });
    }),
  });

  logger.info('Scheduled jobs loaded', { label: 'Jobs' });
};
