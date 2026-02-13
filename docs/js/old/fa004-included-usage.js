// グローバル変数
let includedUsageTable;
let apiCostChart;
let costToYouChart;
let inputWithCacheChart;
let inputWithoutCacheChart;
let cacheReadChart;
let outputChart;
let totalTokensChart;

// 共通の色パレット
const CHART_COLORS = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14', '#20c997', '#6c757d'];

// 共通のグラフ作成ヘルパー関数
function createChartDataWithReset(data, fieldName, uniqueDates) {
    const modelData = {};
    const currentData = {};
    const previousData = {};

    // データを整理
    data.forEach(record => {
        const model = record.model;
        const dateStr = record.dateStr;

        if (!modelData[model]) {
            modelData[model] = { [fieldName]: {} };
        }

        if (!modelData[model][fieldName][dateStr]) {
            modelData[model][fieldName][dateStr] = 0;
        }

        const value = parseFloat(record[fieldName]) || 0;
        modelData[model][fieldName][dateStr] += value;
    });

    const models = Object.keys(modelData);

    models.forEach(model => {
        currentData[model] = { [fieldName]: [] };
        previousData[model] = { [fieldName]: [] };

        let cumulativeValue = 0;
        let previousMonthValue = 0;

        uniqueDates.forEach((dateStr, index) => {
            const currentValue = modelData[model][fieldName][dateStr] || 0;
            const previousDate = index > 0 ? uniqueDates[index - 1] : null;
            const previousValue = previousDate ? (modelData[model][fieldName][previousDate] || 0) : 0;

            // 月ごとのリセットをチェック
            if (currentValue < previousValue && previousValue > 0) {
                cumulativeValue = currentValue;
                previousMonthValue = 0;
            } else {
                cumulativeValue = currentValue;
                previousMonthValue = previousValue;
            }

            const previousPart = previousMonthValue;
            const diffPart = cumulativeValue - previousMonthValue;

            currentData[model][fieldName].push(cumulativeValue);
            previousData[model][fieldName].push({
                previous: previousPart,
                diff: diffPart
            });
        });
    });

    return { modelData, currentData, previousData, models };
}

// 共通のグラフデータセット作成関数
function createChartDatasets(models, previousData, fieldName, fieldLabel, previousColorOpacity = '40', diffColorOpacity = '80') {
    const datasets = [];

    models.forEach((model, index) => {
        const color = CHART_COLORS[index % CHART_COLORS.length];

        datasets.push({
            label: `${model} - ${fieldLabel} (前日分)`,
            data: previousData[model][fieldName].map(item => item.previous),
            backgroundColor: color + previousColorOpacity,
            borderColor: color,
            borderWidth: 1,
            type: 'bar',
            stack: `${model}_${fieldName}`
        });

        datasets.push({
            label: `${model} - ${fieldLabel} (当日増分)`,
            data: previousData[model][fieldName].map(item => item.diff),
            backgroundColor: color + diffColorOpacity,
            borderColor: color,
            borderWidth: 1,
            type: 'bar',
            stack: `${model}_${fieldName}`
        });
    });

    return datasets;
}

// 共通のグラフオプション作成関数
function createChartOptions(title, isCurrency = false) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            title: {
                display: true,
                text: title
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                    label: function(context) {
                        const label = context.dataset.label || '';
                        const value = context.parsed.y;
                        return isCurrency ?
                            `${label}: $${value.toFixed(4)}` :
                            `${label}: ${value.toLocaleString()}`;
                    },
                    afterBody: function(context) {
                        const modelTotals = {};

                        context.forEach(item => {
                            const stack = item.dataset.stack;
                            const model = stack.split('_')[0];
                            if (!modelTotals[model]) {
                                modelTotals[model] = 0;
                            }
                            modelTotals[model] += item.parsed.y;
                        });

                        const totalLines = [];
                        Object.keys(modelTotals).forEach(model => {
                            const formattedValue = isCurrency ?
                                `$${modelTotals[model].toFixed(4)}` :
                                modelTotals[model].toLocaleString();
                            totalLines.push(`${model}: ${formattedValue}`);
                        });

                        return totalLines;
                    }
                }
            }
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
        },
        scales: {
            x: {
                stacked: true
            },
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                beginAtZero: true,
                stacked: true,
                ticks: {
                    callback: function(value) {
                        return isCurrency ?
                            `$${value.toFixed(4)}` :
                            value.toLocaleString();
                    }
                }
            }
        }
    };
}

// Included Usage Summaryシート読み込み
async function loadIncludedUsageData() {
    showLoading(true);
    try {
        // 現在のページのパスに基づいて相対パスを決定
        const currentPath = window.location.pathname;
        const isTopPage = currentPath.endsWith('index.html') || currentPath.endsWith('index.html') || currentPath.endsWith('/') || currentPath.endsWith('/Cursor');
        const excelPath = isTopPage ? 'record.xlsx' : '../../record.xlsx';

        console.log('Loading Excel file from:', excelPath);
        console.log('Current path:', currentPath);

        const response = await fetch(excelPath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        console.log('Available sheets:', workbook.SheetNames);

        // Included Usage Summaryシートを探す
        let sheetName = null;

        // 1. 完全一致を試行（正確なシート名）
        sheetName = workbook.SheetNames.find(name => name === 'Included Usage Summary');

        if (sheetName) {
            console.log('Found exact match for sheet:', sheetName);
        } else {
            // 2. 部分一致を試行（フォールバック）
            sheetName = workbook.SheetNames.find(name =>
                name.includes('Included Usage Summary') ||
                name.includes('Included') ||
                name.includes('Usage') ||
                name.toLowerCase().includes('included') ||
                name.toLowerCase().includes('usage')
            );

            if (sheetName) {
                console.log('Found partial match for sheet:', sheetName);
            }
        }

        // 3. 最後の手段：最初のシートを使用（デバッグ用）
        if (!sheetName && workbook.SheetNames.length > 0) {
            console.warn('Included Usage Summaryシートが見つからないため、最初のシートを使用します:', workbook.SheetNames[0]);
            sheetName = workbook.SheetNames[0];
        }

        if (!sheetName) {
            console.error('Available sheets:', workbook.SheetNames);
            throw new Error('Included Usage Summaryシートが見つかりません。利用可能なシート: ' + workbook.SheetNames.join(', '));
        }

        console.log('Found sheet:', sheetName);

        const sheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        console.log('Raw data length:', rawData.length);
        console.log('First few rows:', rawData.slice(0, 5));

        // データを処理
        includedUsageData = processIncludedUsageData(rawData);

        console.log('Included Usage data loaded:', includedUsageData.length, 'records');
    } catch (error) {
        console.error('Included Usage Summaryシートの読み込みに失敗しました:', error);
        throw new Error('Included Usage Summaryシートの読み込みに失敗しました: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Included Usage Summaryデータの処理
function processIncludedUsageData(rawData) {
    console.log('Processing included usage data, raw data length:', rawData.length);
    console.log('Raw data sample:', rawData.slice(0, 10));

    const processedData = [];
    let currentDate = null;
    let currentMonth = null;
    let previousInput = 0;
    let monthCleared = false;

    for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length < 2) {
            console.log(`Skipping row ${i}: insufficient data`, row);
            continue;
        }

        const dateCell = row[0];
        const model = row[1] || '';
        const inputWithCache = parseInt(row[2]?.toString().replace(/,/g, '')) || 0;
        const inputWithoutCache = parseInt(row[3]?.toString().replace(/,/g, '')) || 0;
        const cacheRead = parseInt(row[4]?.toString().replace(/,/g, '')) || 0;
        const output = parseInt(row[5]?.toString().replace(/,/g, '')) || 0;
        const totalTokens = parseInt(row[6]?.toString().replace(/,/g, '')) || 0;
        const apiCost = row[7] || '';
        const costToYou = row[8] || '';

        // Inputは両方の合計
        const input = inputWithCache + inputWithoutCache;

        console.log(`Row ${i}: dateCell="${dateCell}", model="${model}", input=${input}`);

        // 日付行の場合（日付が入力されている行）
        if (dateCell && dateCell.toString().trim() && !dateCell.toString().includes('Total')) {
            const dateStr = dateCell.toString().trim();
            const date = parseDate(dateStr);
            if (date) {
                currentDate = date;
                const newMonth = date.getMonth();

                // 前のInputより下がっていれば、新しい月としてクリア
                if (input < previousInput && previousInput > 0) {
                    monthCleared = true;
                    console.log(`新しい月の開始: ${dateStr}, Input: ${input}, Previous: ${previousInput}`);
                }

                currentMonth = newMonth;
                previousInput = input;
                console.log(`Processing date: ${dateStr}, model: ${model}, input: ${input}`);
            } else {
                console.log(`Failed to parse date: ${dateStr}`);
            }
        }

        // 有効な日付とモデルがある場合にデータとして追加（auto行とTotal行の両方を含む）
        if (currentDate && model && model.toString().trim()) {
            const modelStr = model.toString().trim();
            const processedRecord = {
                date: currentDate,
                dateStr: currentDate.toLocaleDateString('ja-JP'),
                model: modelStr,
                input: input,
                inputWithCache: inputWithCache,
                inputWithoutCache: inputWithoutCache,
                output: output,
                cacheRead: cacheRead,
                totalTokens: totalTokens,
                apiCost: apiCost,
                costToYou: costToYou,
                month: currentMonth,
                monthCleared: monthCleared
            };
            processedData.push(processedRecord);
            console.log('Added record:', processedRecord);

            // 月クリアフラグをリセット
            monthCleared = false;
        }
    }

    // 日付順にソート（同じ日付の場合はモデル順）
    processedData.sort((a, b) => {
        if (a.date.getTime() === b.date.getTime()) {
            // 同じ日付の場合、Totalを後に、autoを先に
            if (a.model.toLowerCase() === 'total' && b.model.toLowerCase() === 'auto') {
                return 1;
            } else if (a.model.toLowerCase() === 'auto' && b.model.toLowerCase() === 'total') {
                return -1;
            }
            return a.model.localeCompare(b.model);
        }
        return a.date - b.date;
    });

    console.log('Processed data length:', processedData.length);
    console.log('Processed data sample:', processedData.slice(0, 3));
    return processedData;
}

// 初期化処理
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('Initializing included-usage page...');
        await loadIncludedUsageData();

        if (includedUsageData && includedUsageData.length > 0) {
            console.log('Data loaded successfully, initializing components...');
            initializeIncludedUsageTable();
            updateIncludedUsageStats();
            createIncludedUsageCharts();
        } else {
            console.warn('No included usage data found');
            const errorMessage = 'Included Usageデータが見つかりませんでした。ExcelファイルにIncluded Usage Summaryシートが存在するか確認してください。';
            showError(errorMessage);
        }
    } catch (error) {
        console.error('初期化エラー:', error);
        const errorMessage = 'データの読み込み中にエラーが発生しました: ' + error.message;
        showError(errorMessage);

        // 部分的な初期化を試行
        try {
            if (includedUsageData && includedUsageData.length > 0) {
                console.log('Attempting partial initialization...');
                initializeIncludedUsageTable();
                updateIncludedUsageStats();
                createIncludedUsageCharts();
            }
        } catch (partialError) {
            console.error('部分的な初期化も失敗:', partialError);
        }
    }
});

// 前日との差を計算する関数
function calculatePreviousDayDifference(currentRecord, previousRecord) {
    if (!previousRecord) {
        return {
            totalTokens: null,
            input: null,
            output: null,
            apiCost: null
        };
    }

    return {
        totalTokens: currentRecord.totalTokens - previousRecord.totalTokens,
        input: (currentRecord.inputWithCache + currentRecord.inputWithoutCache) - (previousRecord.inputWithCache + previousRecord.inputWithoutCache),
        output: currentRecord.output - previousRecord.output,
        apiCost: parseFloat(currentRecord.apiCost || 0) - parseFloat(previousRecord.apiCost || 0)
    };
}

// 月ごとのリセットを考慮した前日との差を計算する関数
function calculatePreviousDayDifferenceWithReset(currentRecord, previousRecord) {
    if (!previousRecord) {
        return {
            totalTokens: null,
            input: null,
            output: null,
            apiCost: null
        };
    }

    // 月ごとのリセットをチェック（前日より下がっている場合はリセット）
    const isReset =
        currentRecord.totalTokens < previousRecord.totalTokens ||
        currentRecord.input < previousRecord.input ||
        currentRecord.output < previousRecord.output ||
        parseFloat(currentRecord.apiCost || 0) < parseFloat(previousRecord.apiCost || 0);

    if (isReset) {
        // リセットされた場合は、現在の値をそのまま表示（差は0）
        return {
            totalTokens: 0,
            input: 0,
            output: 0,
            apiCost: 0
        };
    }

    return {
        totalTokens: currentRecord.totalTokens - previousRecord.totalTokens,
        input: (currentRecord.inputWithCache + currentRecord.inputWithoutCache) - (previousRecord.inputWithCache + previousRecord.inputWithoutCache),
        output: currentRecord.output - previousRecord.output,
        apiCost: parseFloat(currentRecord.apiCost || 0) - parseFloat(previousRecord.apiCost || 0)
    };
}

// 差の表示形式を整形する関数
function formatDifference(value, isPercentage = false) {
    if (value === null || value === undefined) {
        return '-';
    }

    if (value === 0) {
        return '±0';
    }

    const sign = value > 0 ? '+' : '';
    const formattedValue = Math.abs(value).toLocaleString();

    if (isPercentage) {
        return `${sign}${value.toFixed(2)}%`;
    } else {
        return `${sign}${formattedValue}`;
    }
}

// 差の表示クラスを取得する関数
function getDifferenceClass(value) {
    if (value === null || value === undefined) {
        return '';
    }
    if (value > 0) {
        return 'text-success';
    } else if (value < 0) {
        return 'text-danger';
    } else {
        return 'text-muted';
    }
}

// 前日との差を計算するためのヘルパー関数
function getPreviousDayRecord(currentRecord) {
    // 同じモデルのデータを日付順にソート
    const sameModelRecords = includedUsageData
        .filter(record => record.model === currentRecord.model)
        .sort((a, b) => a.date - b.date);

    // 現在のレコードのインデックスを見つける
    const currentIndex = sameModelRecords.findIndex(record =>
        record.date.getTime() === currentRecord.date.getTime()
    );

    // 前日のレコードがない場合はnullを返す
    if (currentIndex <= 0) {
        return null;
    }

    return sameModelRecords[currentIndex - 1];
}

// 共通のテーブル列レンダリング関数
function createTableColumnRenderer(fieldName, isCurrency = false) {
    return function(data, type, row) {
        const valueText = isCurrency ? data : data.toLocaleString();
        const previousRecord = getPreviousDayRecord(row);

        if (previousRecord && type === 'display') {
            const currentValue = isCurrency ? parseFloat(data || 0) : data;
            const previousValue = isCurrency ? parseFloat(previousRecord[fieldName] || 0) : previousRecord[fieldName];
            const diff = calculateDifferenceWithReset(currentValue, previousValue);
            const diffText = formatDifference(diff);
            const diffClass = getDifferenceClass(diff);

            if (diff !== null && diff !== 0) {
                return `${valueText} <small class="${diffClass}">(${diffText})</small>`;
            }
        }

        return valueText;
    };
}

// 月ごとのリセットを考慮した前日との差を計算する関数（グローバル）
function calculateDifferenceWithReset(currentValue, previousValue) {
    if (previousValue === null || previousValue === undefined) {
        return null;
    }

    // 前日より下がっている場合はリセット（差は0）
    if (currentValue < previousValue && previousValue > 0) {
        return 0;
    }

    return currentValue - previousValue;
}

// Included Usage DataTableの初期化
function initializeIncludedUsageTable() {
    includedUsageTable = $('#included-usage-table').DataTable({
        data: includedUsageData,
        columns: [
            {
                data: 'date',
                title: '日付',
                width: '100px',
                render: function(data) {
                    return data.toLocaleDateString('ja-JP');
                }
            },
            {
                data: 'model',
                title: 'モデル',
                width: '80px'
            },
            {
                data: 'inputWithCache',
                className: 'text-end',
                width: '120px',
                render: createTableColumnRenderer('inputWithCache')
            },
            {
                data: 'inputWithoutCache',
                className: 'text-end',
                width: '120px',
                render: createTableColumnRenderer('inputWithoutCache')
            },
            {
                data: 'output',
                className: 'text-end',
                width: '120px',
                render: createTableColumnRenderer('output')
            },
            {
                data: 'cacheRead',
                className: 'text-end',
                width: '120px',
                render: createTableColumnRenderer('cacheRead')
            },
            {
                data: 'totalTokens',
                className: 'text-end',
                width: '120px',
                render: createTableColumnRenderer('totalTokens')
            },
            {
                data: 'apiCost',
                className: 'text-end',
                width: '100px',
                render: createTableColumnRenderer('apiCost', true)
            },
            {
                data: 'costToYou',
                className: 'text-end',
                width: '100px',
                render: function(data, type, row) {
                    // Cost to Youが0、空、未定義、またはNaNの場合は何も表示しない
                    if (data === null || data === undefined || data === '' || data === 0 || data === '0') {
                        return '0';
                    }
                    const cost = parseFloat(data);
                    if (cost === 0 || isNaN(cost)) {
                        return '';
                    }

                    const costText = data.toString();
                    const previousRecord = getPreviousDayRecord(row);

                    if (previousRecord && type === 'display') {
                        const currentCost = parseFloat(data || 0);
                        const previousCost = parseFloat(previousRecord.costToYou || 0);
                        const diff = calculateDifferenceWithReset(currentCost, previousCost);
                        const diffText = formatDifference(diff);
                        const diffClass = getDifferenceClass(diff);

                        if (diff !== null && diff !== 0) {
                            return `${costText} <small class="${diffClass}">(${diffText})</small>`;
                        }
                    }

                    return costText;
                }
            }
        ],
        order: [[0, 'desc'], [1, 'asc']], // 日付の降順、次にモデルの昇順
        language: {
            url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/ja.json'
        },
        responsive: false, // レスポンシブを無効にして幅を固定
        scrollX: true, // 横スクロールを有効にする
        scrollCollapse: true,
        pageLength: 25,
        autoWidth: false, // 自動幅調整を無効にする
        columnDefs: [
            {
                targets: '_all',
                className: 'text-nowrap'
            }
        ]
    });
}

// Included Usage統計の更新
function updateIncludedUsageStats() {
    if (includedUsageData.length === 0) return;

    // 最新のauto行のデータを取得
    const autoRecords = includedUsageData
        .filter(record => record.model.toLowerCase() === 'auto')
        .sort((a, b) => b.date - a.date);

    const latestAutoRecord = autoRecords[0];
    const previousAutoRecord = autoRecords[1]; // 前日のデータ

    if (!latestAutoRecord) {
        console.warn('No auto record found for stats');
        return;
    }

    // 月ごとのリセットを考慮した前日との差を計算
    const differences = calculatePreviousDayDifferenceWithReset(latestAutoRecord, previousAutoRecord);

    // 最新使用日の統計を表示
    const latestUsageDateValue = document.getElementById('latest-included-usage-date-value');
    if (latestUsageDateValue) latestUsageDateValue.textContent = latestAutoRecord.dateStr;

    // Total Tokens（前日との差付き）
    const latestTotalTokensValue = document.getElementById('latest-total-tokens-value');
    if (latestTotalTokensValue) {
        const totalTokensText = latestAutoRecord.totalTokens.toLocaleString();
        const diffText = formatDifference(differences.totalTokens);
        const diffClass = getDifferenceClass(differences.totalTokens);

        if (differences.totalTokens !== null) {
            latestTotalTokensValue.innerHTML = `${totalTokensText} <small class="${diffClass}">(${diffText})</small>`;
        } else {
            latestTotalTokensValue.textContent = totalTokensText;
        }
    }

    // Input (W/CACHE WRITE)（前日との差付き）
    const latestInputWithCacheValue = document.getElementById('latest-input-with-cache-value');
    if (latestInputWithCacheValue) {
        const inputWithCacheText = latestAutoRecord.inputWithCache.toLocaleString();
        const previousInputWithCache = previousAutoRecord ? previousAutoRecord.inputWithCache : 0;
        const diff = calculateDifferenceWithReset(latestAutoRecord.inputWithCache, previousInputWithCache);
        const diffText = formatDifference(diff);
        const diffClass = getDifferenceClass(diff);

        if (diff !== null) {
            latestInputWithCacheValue.innerHTML = `${inputWithCacheText} <small class="${diffClass}">(${diffText})</small>`;
        } else {
            latestInputWithCacheValue.textContent = inputWithCacheText;
        }
    }

    // Input (W/O CACHE WRITE)（前日との差付き）
    const latestInputWithoutCacheValue = document.getElementById('latest-input-without-cache-value');
    if (latestInputWithoutCacheValue) {
        const inputWithoutCacheText = latestAutoRecord.inputWithoutCache.toLocaleString();
        const previousInputWithoutCache = previousAutoRecord ? previousAutoRecord.inputWithoutCache : 0;
        const diff = calculateDifferenceWithReset(latestAutoRecord.inputWithoutCache, previousInputWithoutCache);
        const diffText = formatDifference(diff);
        const diffClass = getDifferenceClass(diff);

        if (diff !== null) {
            latestInputWithoutCacheValue.innerHTML = `${inputWithoutCacheText} <small class="${diffClass}">(${diffText})</small>`;
        } else {
            latestInputWithoutCacheValue.textContent = inputWithoutCacheText;
        }
    }

    // Cache Read（前日との差付き）
    const latestCacheReadValue = document.getElementById('latest-cache-read-value');
    if (latestCacheReadValue) {
        const cacheReadText = latestAutoRecord.cacheRead.toLocaleString();
        const previousCacheRead = previousAutoRecord ? previousAutoRecord.cacheRead : 0;
        const diff = calculateDifferenceWithReset(latestAutoRecord.cacheRead, previousCacheRead);
        const diffText = formatDifference(diff);
        const diffClass = getDifferenceClass(diff);

        if (diff !== null) {
            latestCacheReadValue.innerHTML = `${cacheReadText} <small class="${diffClass}">(${diffText})</small>`;
        } else {
            latestCacheReadValue.textContent = cacheReadText;
        }
    }

    // Output Tokens（前日との差付き）
    const latestOutputTokensValue = document.getElementById('latest-output-tokens-value');
    if (latestOutputTokensValue) {
        const outputText = latestAutoRecord.output.toLocaleString();
        const diffText = formatDifference(differences.output);
        const diffClass = getDifferenceClass(differences.output);

        if (differences.output !== null) {
            latestOutputTokensValue.innerHTML = `${outputText} <small class="${diffClass}">(${diffText})</small>`;
        } else {
            latestOutputTokensValue.textContent = outputText;
        }
    }

    // API Cost（前日との差付き）
    const latestApiCostValue = document.getElementById('latest-api-cost-value');
    if (latestApiCostValue) {
        const apiCostText = latestAutoRecord.apiCost;
        const diffText = formatDifference(differences.apiCost);
        const diffClass = getDifferenceClass(differences.apiCost);

        if (differences.apiCost !== null) {
            latestApiCostValue.innerHTML = `${apiCostText} <small class="${diffClass}">(${diffText})</small>`;
        } else {
            latestApiCostValue.textContent = apiCostText;
        }
    }

    // Cost to You（前日との差付き）
    const latestCostToYouValue = document.getElementById('latest-cost-to-you-value');
    if (latestCostToYouValue) {
        const costToYou = parseFloat(latestAutoRecord.costToYou) || 0;
        const costToYouText = costToYou === 0 ? '0' : costToYou.toString();
        const previousCostToYou = previousAutoRecord ? (parseFloat(previousAutoRecord.costToYou) || 0) : 0;
        const diff = calculateDifferenceWithReset(costToYou, previousCostToYou);
        const diffText = formatDifference(diff);
        const diffClass = getDifferenceClass(diff);

        if (diff !== null) {
            latestCostToYouValue.innerHTML = `${costToYouText} <small class="${diffClass}">(${diffText})</small>`;
        } else {
            latestCostToYouValue.textContent = costToYouText;
        }
    }
}

// Included Usage グラフの作成
function createIncludedUsageCharts() {
    if (includedUsageData.length === 0) return;

    // 新しいグラフを作成
    try {
        createApiCostChart();
        createCostToYouChart();
        createInputWithCacheChart();
        createInputWithoutCacheChart();
        createCacheReadChart();
        createOutputChart();
        createTotalTokensChart();
    } catch (error) {
        console.error('新しいグラフの作成中にエラーが発生しました:', error);
    }
}

// 共通のグラフ作成関数
function createIncludedUsageChart(config) {
    const {
        fieldName,
        fieldLabel,
        chartId,
        chartTitle,
        isCurrency = false,
        previousColorOpacity = '40',
        diffColorOpacity = '80',
        chartVariable
    } = config;

    try {
        if (includedUsageData.length === 0) return;

        // 日付の重複を除去してソート
        const uniqueDates = [...new Set(includedUsageData.map(record => record.dateStr))]
            .map(dateStr => new Date(dateStr))
            .sort((a, b) => a - b)
            .map(date => date.toLocaleDateString('ja-JP'));

        // 共通のデータ処理関数を使用
        const { previousData, models } = createChartDataWithReset(includedUsageData, fieldName, uniqueDates);

        // 共通のデータセット作成関数を使用
        const datasets = createChartDatasets(models, previousData, fieldName, fieldLabel, previousColorOpacity, diffColorOpacity);

        // グラフを作成
        const ctx = document.getElementById(chartId);
        if (!ctx) {
            console.warn(`${chartId} canvas not found`);
            return;
        }

        window[chartVariable] = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: uniqueDates,
                datasets: datasets
            },
            options: createChartOptions(chartTitle, isCurrency)
        });
    } catch (error) {
        console.error(`${fieldLabel} chart creation error:`, error);
    }
}

// API Cost グラフの作成
function createApiCostChart() {
    createIncludedUsageChart({
        fieldName: 'apiCost',
        fieldLabel: 'API Cost',
        chartId: 'api-cost-chart',
        chartTitle: 'API Cost 積立推移',
        isCurrency: true,
        chartVariable: 'apiCostChart'
    });
}

// Cost to You グラフの作成
function createCostToYouChart() {
    createIncludedUsageChart({
        fieldName: 'costToYou',
        fieldLabel: 'Cost to You',
        chartId: 'cost-to-you-chart',
        chartTitle: 'Cost to You 積立推移',
        isCurrency: true,
        previousColorOpacity: '20',
        diffColorOpacity: '60',
        chartVariable: 'costToYouChart'
    });
}

// Total Tokens グラフの作成
function createTotalTokensChart() {
    createIncludedUsageChart({
        fieldName: 'totalTokens',
        fieldLabel: 'Total Tokens',
        chartId: 'total-tokens-chart',
        chartTitle: 'Total Tokens 積立推移',
        isCurrency: false,
        chartVariable: 'totalTokensChart'
    });
}

// Input W/CACHE WRITE グラフの作成
function createInputWithCacheChart() {
    createIncludedUsageChart({
        fieldName: 'inputWithCache',
        fieldLabel: 'Input W/CACHE WRITE',
        chartId: 'input-with-cache-chart',
        chartTitle: 'Input (W/CACHE WRITE) 積立推移',
        isCurrency: false,
        chartVariable: 'inputWithCacheChart'
    });
}

// Input W/O CACHE WRITE グラフの作成
function createInputWithoutCacheChart() {
    createIncludedUsageChart({
        fieldName: 'inputWithoutCache',
        fieldLabel: 'Input W/O CACHE WRITE',
        chartId: 'input-without-cache-chart',
        chartTitle: 'Input (W/O CACHE WRITE) 積立推移',
        isCurrency: false,
        chartVariable: 'inputWithoutCacheChart'
    });
}

// Cache Read グラフの作成
function createCacheReadChart() {
    createIncludedUsageChart({
        fieldName: 'cacheRead',
        fieldLabel: 'Cache Read',
        chartId: 'cache-read-chart',
        chartTitle: 'Cache Read 積立推移',
        isCurrency: false,
        previousColorOpacity: '30',
        diffColorOpacity: '70',
        chartVariable: 'cacheReadChart'
    });
}

// Output グラフの作成
function createOutputChart() {
    createIncludedUsageChart({
        fieldName: 'output',
        fieldLabel: 'Output',
        chartId: 'output-chart',
        chartTitle: 'Output 積立推移',
        isCurrency: false,
        previousColorOpacity: '20',
        diffColorOpacity: '60',
        chartVariable: 'outputChart'
    });
}
