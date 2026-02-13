// グローバル変数
// usageEventsData は common.js で宣言済み
let usageEventsTable;
let costChart;
let inputWithCacheChart;
let inputWithoutCacheChart;
let cacheReadChart;
let outputTokensChart;
let totalTokensChart;
let kindChart;

// データ読み込みは fc300-data-loader.js に委譲

// 初期化処理
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM Content Loaded, starting initialization...');
    try {
        console.log('Loading usage events data...');
        await loadUsageEventsData();
        console.log('Initializing usage events table...');
        initializeUsageEventsTable();
        console.log('Updating usage events stats...');
        updateUsageEventsStats();
        console.log('Creating cost chart...');
        createCostChart();
        console.log('Creating column charts...');
        createColumnCharts();
        console.log('Initializing tooltips...');
        initializeTooltips();
        console.log('Initialization completed successfully');
    } catch (error) {
        console.error('初期化エラー:', error);
        showError('データの読み込み中にエラーが発生しました: ' + error.message);

        // 部分的な初期化を試行
        try {
            if (usageEventsData.length > 0) {
                initializeUsageEventsTable();
                updateUsageEventsStats();
                createCostChart();
                createColumnCharts();
                initializeTooltips();
            }
        } catch (partialError) {
            console.error('部分的な初期化も失敗:', partialError);
        }
    }
});

// Usage Events DataTableの初期化
function initializeUsageEventsTable() {
    usageEventsTable = $('#usage-events-table').DataTable({
        data: usageEventsData,
        columns: [
            {
                data: 'Date',
                render: function(data) {
                    return data.toLocaleDateString('ja-JP') + ' ' + data.toLocaleTimeString('ja-JP', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    });
                }
            },
            {
                data: 'Kind',
                render: function(data) {
                    let kindClass = '';
                    if (data === 'Included') {
                        kindClass = 'text-success';
                    } else if (data.includes('Errored')) {
                        kindClass = 'text-danger';
                    }
                    return `<span class="${kindClass}">${data}</span>`;
                }
            },
            { data: 'Model' },
            { data: 'Max Mode' },
            {
                data: 'Input (w/ Cache Write)',
                render: function(data) {
                    return data ? data.toLocaleString() : '0';
                }
            },
            {
                data: 'Input (w/o Cache Write)',
                render: function(data) {
                    return data ? data.toLocaleString() : '0';
                }
            },
            {
                data: 'Cache Read',
                render: function(data) {
                    return data ? data.toLocaleString() : '0';
                }
            },
            {
                data: 'Output Tokens',
                render: function(data) {
                    return data ? data.toLocaleString() : '0';
                }
            },
            {
                data: 'Total Tokens',
                render: function(data) {
                    const className = data > 1000000 ? 'tokens-high' : data > 100000 ? 'tokens-medium' : 'tokens-low';
                    return `<span class="${className}">${data.toLocaleString()}</span>`;
                }
            },
            { data: 'Cost' }
        ],
        order: [[0, 'desc']],
        language: {
            url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/ja.json'
        },
        responsive: true,
        pageLength: 25,
        scrollX: true
    });
}

// コストグラフの作成
function createCostChart() {
    // 日別データの集計
    const dailyData = {};
    usageEventsData.forEach(record => {
        const dateStr = record.Date.toLocaleDateString('ja-JP');
        if (!dailyData[dateStr]) {
            dailyData[dateStr] = {
                cost: 0,
                count: 0
            };
        }

        // コストの値を数値に変換（"Included"の場合は0として扱う）
        let costValue = 0;
        if (record.Cost && record.Cost !== 'Included') {
            costValue = parseFloat(record.Cost) || 0;
        }

        dailyData[dateStr].cost += costValue;
        dailyData[dateStr].count += 1;
    });

    const dates = Object.keys(dailyData)
        .map(dateStr => new Date(dateStr))
        .sort((a, b) => a - b)
        .map(date => date.toLocaleDateString('ja-JP'));

    const dailyCosts = dates.map(date => dailyData[date].cost);

    const ctx = document.getElementById('cost-chart').getContext('2d');
    costChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: '日別コスト',
                data: dailyCosts,
                borderColor: '#dc3545',
                backgroundColor: 'rgba(220, 53, 69, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'コスト推移'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            return `コスト: $${value.toFixed(2)}`;
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
                    display: true,
                    title: {
                        display: true,
                        text: '日付'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'コスト ($)'
                    },
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toFixed(2);
                        }
                    }
                }
            }
        }
    });
}

// カラム別グラフの作成
function createColumnCharts() {
    console.log('createColumnCharts called, data length:', usageEventsData.length);

    // 日別データの集計
    const dailyData = {};
    usageEventsData.forEach(record => {
        const dateStr = record.Date.toLocaleDateString('ja-JP');
        if (!dailyData[dateStr]) {
            dailyData[dateStr] = {
                inputWithCache: 0,
                inputWithoutCache: 0,
                cacheRead: 0,
                outputTokens: 0,
                totalTokens: 0,
                kindCounts: {}
            };
        }
        dailyData[dateStr].inputWithCache += record['Input (w/ Cache Write)'] || 0;
        dailyData[dateStr].inputWithoutCache += record['Input (w/o Cache Write)'] || 0;
        dailyData[dateStr].cacheRead += record['Cache Read'] || 0;
        dailyData[dateStr].outputTokens += record['Output Tokens'] || 0;
        dailyData[dateStr].totalTokens += record['Total Tokens'] || 0;

        // Kind別の集計
        const kind = record.Kind || 'Unknown';
        dailyData[dateStr].kindCounts[kind] = (dailyData[dateStr].kindCounts[kind] || 0) + 1;
    });

    const dates = Object.keys(dailyData)
        .map(dateStr => new Date(dateStr))
        .sort((a, b) => a - b)
        .map(date => date.toLocaleDateString('ja-JP'));

    console.log('Daily data keys:', Object.keys(dailyData));
    console.log('Dates array:', dates);

    // 各カラムのグラフを作成
    console.log('Creating Input (w/ Cache Write) chart...');
    createInputWithCacheChart(dates, dailyData);
    console.log('Creating Input (w/o Cache Write) chart...');
    createInputWithoutCacheChart(dates, dailyData);
    console.log('Creating Cache Read chart...');
    createCacheReadChart(dates, dailyData);
    console.log('Creating Output Tokens chart...');
    createOutputTokensChart(dates, dailyData);
    console.log('Creating Total Tokens chart...');
    createTotalTokensChart(dates, dailyData);
    console.log('Creating Kind chart...');
    createKindChart(dates, dailyData);
}

// Input (w/ Cache Write) グラフ
function createInputWithCacheChart(dates, dailyData) {
    const canvasElement = document.getElementById('input-with-cache-chart');
    if (!canvasElement) {
        console.error('Canvas element input-with-cache-chart not found');
        return;
    }
    console.log('Chart.js available:', typeof Chart !== 'undefined');
    const ctx = canvasElement.getContext('2d');
    const data = dates.map(date => dailyData[date].inputWithCache);

    inputWithCacheChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Input (w/ Cache Write)',
                data: data,
                borderColor: '#007bff',
                backgroundColor: 'rgba(0, 123, 255, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1000
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Input (w/ Cache Write)'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            return `Input (w/ Cache Write): ${value.toLocaleString()}`;
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
                    display: true,
                    title: {
                        display: true,
                        text: '日付'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'トークン数'
                    },
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// Input (w/o Cache Write) グラフ
function createInputWithoutCacheChart(dates, dailyData) {
    const ctx = document.getElementById('input-without-cache-chart').getContext('2d');
    const data = dates.map(date => dailyData[date].inputWithoutCache);

    inputWithoutCacheChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Input (w/o Cache Write)',
                data: data,
                borderColor: '#dc3545',
                backgroundColor: 'rgba(220, 53, 69, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Input (w/o Cache Write)'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            return `Input (w/o Cache Write): ${value.toLocaleString()}`;
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
                    display: true,
                    title: {
                        display: true,
                        text: '日付'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'トークン数'
                    },
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// Cache Read グラフ
function createCacheReadChart(dates, dailyData) {
    const ctx = document.getElementById('cache-read-chart').getContext('2d');
    const data = dates.map(date => dailyData[date].cacheRead);

    cacheReadChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Cache Read',
                data: data,
                borderColor: '#fd7e14',
                backgroundColor: 'rgba(253, 126, 20, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Cache Read'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            return `Cache Read: ${value.toLocaleString()}`;
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
                    display: true,
                    title: {
                        display: true,
                        text: '日付'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'トークン数'
                    },
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// Output Tokens グラフ
function createOutputTokensChart(dates, dailyData) {
    const ctx = document.getElementById('output-tokens-chart').getContext('2d');
    const data = dates.map(date => dailyData[date].outputTokens);

    outputTokensChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Output Tokens',
                data: data,
                borderColor: '#6f42c1',
                backgroundColor: 'rgba(111, 66, 193, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Output Tokens'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            return `Output Tokens: ${value.toLocaleString()}`;
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
                    display: true,
                    title: {
                        display: true,
                        text: '日付'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'トークン数'
                    },
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// Total Tokens グラフ
function createTotalTokensChart(dates, dailyData) {
    const ctx = document.getElementById('total-tokens-chart').getContext('2d');
    const data = dates.map(date => dailyData[date].totalTokens);

    totalTokensChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Total Tokens',
                data: data,
                borderColor: '#28a745',
                backgroundColor: 'rgba(40, 167, 69, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Total Tokens'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            return `Total Tokens: ${value.toLocaleString()}`;
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
                    display: true,
                    title: {
                        display: true,
                        text: '日付'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'トークン数'
                    },
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// Kind グラフ（イベント種別）
function createKindChart(dates, dailyData) {
    const ctx = document.getElementById('kind-chart').getContext('2d');

    // 全てのKindを取得
    const allKinds = new Set();
    dates.forEach(date => {
        Object.keys(dailyData[date].kindCounts).forEach(kind => allKinds.add(kind));
    });

    const datasets = Array.from(allKinds).map((kind, index) => {
        const colors = ['#20c997', '#e83e8c', '#ffc107', '#17a2b8', '#6c757d'];
        const color = colors[index % colors.length];

        return {
            label: kind,
            data: dates.map(date => dailyData[date].kindCounts[kind] || 0),
            backgroundColor: color + '80',
            borderColor: color,
            borderWidth: 1
        };
    });

    kindChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dates,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Kind (イベント種別)'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            return `${label}: ${value.toLocaleString()}`;
                        }
                    }
                },
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20
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
                    display: true,
                    title: {
                        display: true,
                        text: '日付'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'イベント数'
                    },
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// 統計情報の更新（usage-events.js専用）
function updateUsageEventsStats() {
    if (usageEventsData.length === 0) return;

    // 日別データの集計
    const dailyData = {};
    usageEventsData.forEach(record => {
        const dateStr = record.Date.toLocaleDateString('ja-JP');
        if (!dailyData[dateStr]) {
            dailyData[dateStr] = {
                total: 0,
                count: 0,
                max: 0,
                inputWithCacheTotal: 0,
                inputWithoutCacheTotal: 0,
                outputTotal: 0,
                cacheReadTotal: 0,
                successful: 0,
                error: 0,
                cost: 0
            };
        }
        dailyData[dateStr].total += record['Total Tokens'] || 0;
        dailyData[dateStr].count += 1;
        dailyData[dateStr].max = Math.max(dailyData[dateStr].max, record['Total Tokens'] || 0);
        dailyData[dateStr].inputWithCacheTotal += record['Input (w/ Cache Write)'] || 0;
        dailyData[dateStr].inputWithoutCacheTotal += record['Input (w/o Cache Write)'] || 0;
        dailyData[dateStr].outputTotal += record['Output Tokens'] || 0;
        dailyData[dateStr].cacheReadTotal += record['Cache Read'] || 0;

        // コストの計算（"Included"の場合は0として扱う）
        let costValue = 0;
        if (record.Cost && record.Cost !== 'Included') {
            costValue = parseFloat(record.Cost) || 0;
        }
        dailyData[dateStr].cost += costValue;

        if (record.Kind === 'Included') {
            dailyData[dateStr].successful++;
        } else if (record.Kind.includes('Errored')) {
            dailyData[dateStr].error++;
        }
    });

    // 最新使用日のデータを取得（最終データの日時から24時間前までを表示）
    const dates = Object.keys(dailyData)
        .map(dateStr => new Date(dateStr))
        .sort((a, b) => a - b)
        .map(date => date.toLocaleDateString('ja-JP'));

    // 実際のデータから最新の日時を取得
    const latestRecord = usageEventsData[usageEventsData.length - 1];
    const latestActualDate = latestRecord ? latestRecord.Date : new Date();

    // 最終行の日時から24時間前までのデータのみをフィルタリング
    const twentyFourHoursAgo = new Date(latestActualDate.getTime() - (24 * 60 * 60 * 1000)); // 24時間前

    // 表示用の日付を決定（最終データの日時を表示）
    const latestDateTime = latestActualDate.toLocaleDateString('ja-JP') + ' ' +
                          latestActualDate.toLocaleTimeString('ja-JP', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                          });

    const filteredData = usageEventsData.filter(record => {
        return record.Date >= twentyFourHoursAgo && record.Date <= latestActualDate;
    });

    // フィルタリングされたデータから統計を再計算
    const latestDailyData = {
        total: 0,
        count: 0,
        max: 0,
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
        latestDailyData.max = Math.max(latestDailyData.max, record['Total Tokens'] || 0);
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

    if (latestDailyData) {
        // 最新使用日の統計を表示
        const latestUsageDateValue = document.getElementById('latest-usage-date-value');
        if (latestUsageDateValue) latestUsageDateValue.textContent = latestDateTime;

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
    }
}

// エラーメッセージの表示
function showError(message) {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.remove('d-none');
    }
    console.error(message);
}

// ツールチップの初期化
function initializeTooltips() {
    // Bootstrap 5のツールチップを初期化
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

