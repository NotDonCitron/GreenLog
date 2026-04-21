/**
 * GreenLog Canon Ingest — Execution Report Generator
 * 
 * Collects stats during ingestion and prints a detailed console report + JSON export.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export class IngestReport {
    constructor() {
        this.startTime = Date.now();
        this.sources = {};
        this.rejectionReasons = {};
        this.totalFetched = 0;
        this.totalPassed = 0;
        this.totalRejected = 0;
        this.totalInserted = 0;
        this.totalUpdated = 0;
        this.totalErrors = 0;
        this.errors = [];
    }

    /**
     * Register a source adapter and initialize its counters.
     * @param {string} sourceName
     */
    registerSource(sourceName) {
        this.sources[sourceName] = {
            fetched: 0,
            passed: 0,
            rejected: 0,
            inserted: 0,
            updated: 0,
            errors: 0,
        };
    }

    /**
     * Record a fetched record from a source.
     * @param {string} sourceName
     * @param {number} count
     */
    recordFetched(sourceName, count) {
        this.totalFetched += count;
        if (this.sources[sourceName]) this.sources[sourceName].fetched += count;
    }

    /**
     * Record a record that passed the Publish Gate.
     * @param {string} sourceName
     */
    recordPassed(sourceName) {
        this.totalPassed++;
        if (this.sources[sourceName]) this.sources[sourceName].passed++;
    }

    /**
     * Record a rejected record with reasons.
     * @param {string} sourceName
     * @param {string[]} reasons
     */
    recordRejected(sourceName, reasons) {
        this.totalRejected++;
        if (this.sources[sourceName]) this.sources[sourceName].rejected++;

        for (const reason of reasons) {
            this.rejectionReasons[reason] = (this.rejectionReasons[reason] || 0) + 1;
        }
    }

    /**
     * Record a successful database insert.
     * @param {string} sourceName
     */
    recordInserted(sourceName) {
        this.totalInserted++;
        if (this.sources[sourceName]) this.sources[sourceName].inserted++;
    }

    /**
     * Record a successful database update.
     * @param {string} sourceName
     */
    recordUpdated(sourceName) {
        this.totalUpdated++;
        if (this.sources[sourceName]) this.sources[sourceName].updated++;
    }

    /**
     * Record a database error.
     * @param {string} sourceName
     * @param {string} errorMsg
     * @param {string} strainName
     */
    recordError(sourceName, errorMsg, strainName) {
        this.totalErrors++;
        if (this.sources[sourceName]) this.sources[sourceName].errors++;
        this.errors.push({ source: sourceName, strain: strainName, error: errorMsg });
    }

    /**
     * Get success rate percentage.
     * @returns {string}
     */
    get successRate() {
        if (this.totalFetched === 0) return '0.0';
        return ((this.totalPassed / this.totalFetched) * 100).toFixed(1);
    }

    /**
     * Print a formatted console report.
     */
    printReport() {
        const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);

        console.log('\n' + '═'.repeat(60));
        console.log('  🌿 GreenLog Canon Ingest — Execution Report');
        console.log('═'.repeat(60));
        console.log(`  ⏱  Duration: ${elapsed}s`);
        console.log(`  📥 Total Fetched: ${this.totalFetched}`);
        console.log(`  ✅ Passed Gate:   ${this.totalPassed} (${this.successRate}%)`);
        console.log(`  ❌ Rejected:      ${this.totalRejected}`);
        console.log(`  💾 Inserted:      ${this.totalInserted}`);
        console.log(`  🔄 Updated:       ${this.totalUpdated}`);
        console.log(`  ⚠️  DB Errors:     ${this.totalErrors}`);

        // Per-source breakdown
        console.log('\n' + '─'.repeat(60));
        console.log('  Per-Source Breakdown:');
        for (const [name, stats] of Object.entries(this.sources)) {
            console.log(`\n  📡 ${name}:`);
            console.log(`     Fetched: ${stats.fetched} | Passed: ${stats.passed} | Rejected: ${stats.rejected}`);
            console.log(`     Inserted: ${stats.inserted} | Updated: ${stats.updated} | Errors: ${stats.errors}`);
        }

        // Rejection reasons
        if (Object.keys(this.rejectionReasons).length > 0) {
            console.log('\n' + '─'.repeat(60));
            console.log('  Rejection Reasons:');
            const sorted = Object.entries(this.rejectionReasons).sort((a, b) => b[1] - a[1]);
            for (const [reason, count] of sorted) {
                console.log(`     ${count}x — ${reason}`);
            }
        }

        // Recent errors
        if (this.errors.length > 0) {
            console.log('\n' + '─'.repeat(60));
            console.log(`  DB Errors (last ${Math.min(10, this.errors.length)}):`);
            for (const err of this.errors.slice(-10)) {
                console.log(`     [${err.source}] ${err.strain}: ${err.error}`);
            }
        }

        console.log('\n' + '═'.repeat(60) + '\n');
    }

    /**
     * Export the report as a JSON file.
     * @returns {string} Path to the written JSON file
     */
    exportJSON() {
        const outputDir = resolve(__dirname, 'output');
        mkdirSync(outputDir, { recursive: true });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `ingest-report-${timestamp}.json`;
        const outputPath = resolve(outputDir, filename);

        const report = {
            timestamp: new Date().toISOString(),
            duration_seconds: ((Date.now() - this.startTime) / 1000).toFixed(1),
            summary: {
                total_fetched: this.totalFetched,
                total_passed: this.totalPassed,
                total_rejected: this.totalRejected,
                total_inserted: this.totalInserted,
                total_updated: this.totalUpdated,
                total_errors: this.totalErrors,
                success_rate: this.successRate + '%',
            },
            sources: this.sources,
            rejection_reasons: this.rejectionReasons,
            errors: this.errors,
        };

        writeFileSync(outputPath, JSON.stringify(report, null, 2));
        console.log(`📄 Report exported: ${outputPath}`);
        return outputPath;
    }
}
