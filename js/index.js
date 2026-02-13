// トップページ専用の表示ロジックのみを保持し、データ読み込みは fc300-data-loader.js に委譲する

// 最新の記録を表示
function updateLatestRecord() {
    const latest = recordsData[recordsData.length - 1];
    if (!latest) return;

    const days = latest.日数;
    const fastRequestsDays = latest['Fast requests will refresh in X day'];
    const suggestedLines = latest['Suggested Lines: X lines'];
    const acceptedLines = latest['Accepted Lines: X Lines'];
    const tabsAccepted = latest['Tabs Accepted: X tabs'];

    const totalDays = 30;
    const daysPercentage = (days / totalDays * 100).toFixed(2);

    updateProgressBar('days-progress', daysPercentage, `${days}日 / ${totalDays}日`);

    const usageInfo = `Suggested Lines: ${suggestedLines.toLocaleString()}\nAccepted Lines: ${acceptedLines.toLocaleString()}\nTabs Accepted: ${tabsAccepted}\nFast requests will refresh in ${fastRequestsDays} day`;

    const latestUsageInfo = document.getElementById('latest-usage-info');
    if (latestUsageInfo) latestUsageInfo.textContent = usageInfo;

    const suggestedLinesElem = document.getElementById('suggested-lines-value');
    if (suggestedLinesElem) suggestedLinesElem.textContent = suggestedLines.toLocaleString();
    const acceptedLinesElem = document.getElementById('accepted-lines-value');
    if (acceptedLinesElem) acceptedLinesElem.textContent = acceptedLines.toLocaleString();
    const tabsAcceptedElem = document.getElementById('tabs-accepted-value');
    if (tabsAcceptedElem) tabsAcceptedElem.textContent = String(tabsAccepted);
}



// Summary統計の更新
function updateSummaryStats() {
    if (summaryData.length === 0) return;

    console.log('Summary data:', summaryData);

    // autoモデルのレコードのみを取得して日付順にソート
    const autoRecords = summaryData
        .filter(record => record.model.toLowerCase() === 'auto')
        .sort((a, b) => b.date - a.date);

    const latestRecord = autoRecords[0];
    const previousRecord = autoRecords[1]; // 前日のautoレコード

    console.log('Auto records:', autoRecords);
    console.log('Latest auto record:', latestRecord);
    console.log('Previous auto record:', previousRecord);

    if (!latestRecord) {
        console.warn('No summary record found for stats');
        return;
    }

    // 最新使用日の統計を表示
    const latestSummaryDateValue = document.getElementById('latest-summary-date-value');
    if (latestSummaryDateValue) latestSummaryDateValue.textContent = latestRecord.dateStr;

    // Total（前日との差付き）
    const latestSummaryTotalValue = document.getElementById('latest-summary-total-value');
    if (latestSummaryTotalValue) {
        const totalText = latestRecord.total.toLocaleString();
        const previousTotal = previousRecord ? previousRecord.total : 0;
        const diff = calculateDifferenceWithReset(latestRecord.total, previousTotal);
        const diffText = formatDifference(diff);
        const diffClass = getDifferenceClass(diff);

        if (diff !== null) {
            latestSummaryTotalValue.innerHTML = `${totalText} <small class="${diffClass}">(${diffText})</small>`;
        } else {
            latestSummaryTotalValue.textContent = totalText;
        }
    }

    // Cache Read（前日との差付き）
    const latestSummaryCacheReadValue = document.getElementById('latest-summary-cache-read-value');
    if (latestSummaryCacheReadValue) {
        const cacheReadText = latestRecord.cacheRead.toLocaleString();
        const previousCacheRead = previousRecord ? previousRecord.cacheRead : 0;
        const diff = calculateDifferenceWithReset(latestRecord.cacheRead, previousCacheRead);
        const diffText = formatDifference(diff);
        const diffClass = getDifferenceClass(diff);

        if (diff !== null) {
            latestSummaryCacheReadValue.innerHTML = `${cacheReadText} <small class="${diffClass}">(${diffText})</small>`;
        } else {
            latestSummaryCacheReadValue.textContent = cacheReadText;
        }
    }

    // Cache Write（前日との差付き）
    const latestSummaryCacheWriteValue = document.getElementById('latest-summary-cache-write-value');
    if (latestSummaryCacheWriteValue) {
        const cacheWriteText = latestRecord.cacheWrite.toLocaleString();
        const previousCacheWrite = previousRecord ? previousRecord.cacheWrite : 0;
        const diff = calculateDifferenceWithReset(latestRecord.cacheWrite, previousCacheWrite);
        const diffText = formatDifference(diff);
        const diffClass = getDifferenceClass(diff);

        if (diff !== null) {
            latestSummaryCacheWriteValue.innerHTML = `${cacheWriteText} <small class="${diffClass}">(${diffText})</small>`;
        } else {
            latestSummaryCacheWriteValue.textContent = cacheWriteText;
        }
    }

    // Input（前日との差付き）
    const latestSummaryInputValue = document.getElementById('latest-summary-input-value');
    if (latestSummaryInputValue) {
        const inputText = latestRecord.input.toLocaleString();
        const previousInput = previousRecord ? previousRecord.input : 0;
        const diff = calculateDifferenceWithReset(latestRecord.input, previousInput);
        const diffText = formatDifference(diff);
        const diffClass = getDifferenceClass(diff);

        if (diff !== null) {
            latestSummaryInputValue.innerHTML = `${inputText} <small class="${diffClass}">(${diffText})</small>`;
        } else {
            latestSummaryInputValue.textContent = inputText;
        }
    }

    // Output（前日との差付き）
    const latestSummaryOutputValue = document.getElementById('latest-summary-output-value');
    if (latestSummaryOutputValue) {
        const outputText = latestRecord.output.toLocaleString();
        const previousOutput = previousRecord ? previousRecord.output : 0;
        const diff = calculateDifferenceWithReset(latestRecord.output, previousOutput);
        const diffText = formatDifference(diff);
        const diffClass = getDifferenceClass(diff);

        if (diff !== null) {
            latestSummaryOutputValue.innerHTML = `${outputText} <small class="${diffClass}">(${diffText})</small>`;
        } else {
            latestSummaryOutputValue.textContent = outputText;
        }
    }

    // API Cost（前日との差付き）
    const latestSummaryApiCostValue = document.getElementById('latest-summary-api-cost-value');
    if (latestSummaryApiCostValue) {
        const apiCostText = latestRecord.apiCost;
        const previousApiCost = previousRecord ? (parseFloat(String(previousRecord.apiCost || '').replace('$', '')) || 0) : 0;
        const currentApiCost = parseFloat(String(latestRecord.apiCost || '').replace('$', '')) || 0;
        const diff = calculateDifferenceWithReset(currentApiCost, previousApiCost);
        const diffText = formatDifference(diff);
        const diffClass = getDifferenceClass(diff);

        if (diff !== null) {
            latestSummaryApiCostValue.innerHTML = `${apiCostText} <small class="${diffClass}">(${diffText})</small>`;
        } else {
            latestSummaryApiCostValue.textContent = apiCostText;
        }
    }

    // Cost to You（前日との差付き）
    const latestSummaryCostToYouValue = document.getElementById('latest-summary-cost-to-you-value');
    if (latestSummaryCostToYouValue) {
        const costToYouText = latestRecord.costToYou;
        const previousCostToYou = previousRecord ? (parseFloat(String(previousRecord.costToYou || '').replace('$', '')) || 0) : 0;
        const currentCostToYou = parseFloat(String(latestRecord.costToYou || '').replace('$', '')) || 0;
        const diff = calculateDifferenceWithReset(currentCostToYou, previousCostToYou);
        const diffText = formatDifference(diff);
        const diffClass = getDifferenceClass(diff);

        if (diff !== null) {
            latestSummaryCostToYouValue.innerHTML = `${costToYouText} <small class="${diffClass}">(${diffText})</small>`;
        } else {
            latestSummaryCostToYouValue.textContent = costToYouText;
        }
    }
}

// Usage Events統計の更新
function updateUsageEventsStats() {
    if (usageEventsData.length === 0) return;

    console.log('Usage Events data:', usageEventsData);

    // データを日付順にソート
    const sortedData = usageEventsData
        .map(record => ({
            ...record,
            Date: new Date(record.Date),
            'Input (w/ Cache Write)': parseInt(record['Input (w/ Cache Write)']) || 0,
            'Input (w/o Cache Write)': parseInt(record['Input (w/o Cache Write)']) || 0,
            'Cache Read': parseInt(record['Cache Read']) || 0,
            'Output Tokens': parseInt(record['Output Tokens']) || 0,
            'Total Tokens': parseInt(record['Total Tokens']) || 0,
            'Cost': record['Cost'] || 'Included'
        }))
        .filter(record => !isNaN(record.Date.getTime()))
        .sort((a, b) => a.Date - b.Date);

    // 最新使用日のデータを取得（最終データの日時から24時間前までを表示）
    const latestRecord = sortedData[sortedData.length - 1];
    if (!latestRecord) return;

    const latestActualDate = latestRecord.Date;
    const twentyFourHoursAgo = new Date(latestActualDate.getTime() - (24 * 60 * 60 * 1000));

    // 表示用の日付を決定（最終データの日時を表示）
    const latestDateTime = latestActualDate.toLocaleDateString('ja-JP') + ' ' +
                          latestActualDate.toLocaleTimeString('ja-JP', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                          });

    // 24時間以内のデータをフィルタリング
    const filteredData = sortedData.filter(record => {
        return record.Date >= twentyFourHoursAgo && record.Date <= latestActualDate;
    });

    // フィルタリングされたデータから統計を計算
    const latestDailyData = {
        total: 0,
        count: 0,
        inputWithCacheTotal: 0,
        inputWithoutCacheTotal: 0,
        outputTotal: 0,
        cacheReadTotal: 0,
        successful: 0,
        error: 0,
        cost: 0
    };

    filteredData.forEach(record => {
        latestDailyData.total += record['Total Tokens'] || 0;
        latestDailyData.count += 1;
        latestDailyData.inputWithCacheTotal += record['Input (w/ Cache Write)'] || 0;
        latestDailyData.inputWithoutCacheTotal += record['Input (w/o Cache Write)'] || 0;
        latestDailyData.outputTotal += record['Output Tokens'] || 0;
        latestDailyData.cacheReadTotal += record['Cache Read'] || 0;

        // コストの計算（"Included"の場合は0として扱う）
        let costValue = 0;
        if (record.Cost && record.Cost !== 'Included') {
            costValue = parseFloat(record.Cost) || 0;
        }
        latestDailyData.cost += costValue;

        if (record.Kind === 'Included') {
            latestDailyData.successful++;
        } else if (record.Kind.includes('Errored')) {
            latestDailyData.error++;
        }
    });

    // 最新使用日の統計を表示
    const latestUsageEventsDateValue = document.getElementById('latest-usage-events-date-value');
    if (latestUsageEventsDateValue) latestUsageEventsDateValue.textContent = latestDateTime;

    // イベント数を統合表示（成功/総数）
    const latestEventsCombinedValue = document.getElementById('latest-events-combined-value');
    if (latestEventsCombinedValue) {
        latestEventsCombinedValue.textContent = `${latestDailyData.successful.toLocaleString()}/${latestDailyData.count.toLocaleString()}`;
    }

    const latestTotalTokensValue = document.getElementById('latest-total-tokens-value');
    if (latestTotalTokensValue) latestTotalTokensValue.textContent = latestDailyData.total.toLocaleString();

    const latestInputWithCacheValue = document.getElementById('latest-input-with-cache-value');
    if (latestInputWithCacheValue) latestInputWithCacheValue.textContent = latestDailyData.inputWithCacheTotal.toLocaleString();

    const latestInputWithoutCacheValue = document.getElementById('latest-input-without-cache-value');
    if (latestInputWithoutCacheValue) latestInputWithoutCacheValue.textContent = latestDailyData.inputWithoutCacheTotal.toLocaleString();

    const latestCacheReadValue = document.getElementById('latest-cache-read-value');
    if (latestCacheReadValue) latestCacheReadValue.textContent = latestDailyData.cacheReadTotal.toLocaleString();

    const latestOutputTokensValue = document.getElementById('latest-output-tokens-value');
    if (latestOutputTokensValue) latestOutputTokensValue.textContent = latestDailyData.outputTotal.toLocaleString();

    const latestCostValue = document.getElementById('latest-cost-value');
    if (latestCostValue) {
        if (latestDailyData.cost > 0) {
            latestCostValue.textContent = `$${latestDailyData.cost.toFixed(2)}`;
        } else {
            latestCostValue.textContent = '$0.00';
        }
    }

    // 最新の使用情報を表示（他のセクションと統一性を保つため削除）
    const latestUsageEventsInfo = document.getElementById('latest-usage-events-info');
    if (latestUsageEventsInfo) {
        latestUsageEventsInfo.innerHTML = '';
    }
}

// 初期化処理
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadExcelFile();
        await loadUsageData(); // 統合されたトークンデータを読み込み
        await loadIncludedUsageData();
        await loadSummaryData(); // Summaryデータを読み込み
        await loadUsageEventsData(); // Usage Eventsデータを読み込み
        updateLatestRecord();
        updateSummaryStats(); // Summary統計を更新
        updateUsageEventsStats(); // Usage Events統計を更新
    } catch (error) {
        console.error('初期化エラー:', error);
        showError('データの読み込み中にエラーが発生しました: ' + error.message);

        // 部分的な初期化を試行
        try {
            if (recordsData.length > 0) {
                updateLatestRecord();
            }
            if (summaryData.length > 0) {
                updateSummaryStats();
            }
            if (usageEventsData.length > 0) {
                updateUsageEventsStats();
            }
        } catch (partialError) {
            console.error('部分的な初期化も失敗:', partialError);
        }
    }
});
