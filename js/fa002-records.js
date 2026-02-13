// グローバル変数
let dataTable;
let combinedLinesChart, tabsAcceptedChart;

// 初期化処理
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadExcelFile();
        initializeDataTable();
        updateLatestRecord();
        createCharts();
    } catch (error) {
        console.error('初期化エラー:', error);
        showError('データの読み込み中にエラーが発生しました: ' + error.message);

        // 部分的な初期化を試行
        try {
            if (recordsData.length > 0) {
                initializeDataTable();
                updateLatestRecord();
                createCharts();
            }
        } catch (partialError) {
            console.error('部分的な初期化も失敗:', partialError);
        }
    }
});

// 最新の記録を表示
function updateLatestRecord() {
    const latest = recordsData[recordsData.length - 1];
    if (!latest) return;

    const days = latest.日数;
    const fastRequestsDays = latest['Fast requests will refresh in X day'];
    const suggestedLines = latest['Suggested Lines: X lines'];
    const acceptedLines = latest['Accepted Lines: X Lines'];
    const tabsAccepted = latest['Tabs Accepted: X tabs'];

    // 固定値
    const totalDays = 30;

    // パーセンテージ計算
    const daysPercentage = (days / totalDays * 100).toFixed(2);
    const remainingDays = totalDays - days;

    // プログレスバーの更新
    updateProgressBar('days-progress', daysPercentage, `${days}日 / ${totalDays}日`);

    // 使用情報のテキスト作成
    const usageInfo = `Suggested Lines: ${suggestedLines.toLocaleString()}\nAccepted Lines: ${acceptedLines.toLocaleString()}\nTabs Accepted: ${tabsAccepted}\nFast requests will refresh in ${fastRequestsDays} day`;

    // 表示
    const latestUsageInfo = document.getElementById('latest-usage-info');
    if (latestUsageInfo) latestUsageInfo.textContent = usageInfo;

    // 使用統計の表示
    const suggestedLinesElem = document.getElementById('suggested-lines-value');
    if (suggestedLinesElem) suggestedLinesElem.textContent = suggestedLines.toLocaleString();
    const acceptedLinesElem = document.getElementById('accepted-lines-value');
    if (acceptedLinesElem) acceptedLinesElem.textContent = acceptedLines.toLocaleString();
    const tabsAcceptedElem = document.getElementById('tabs-accepted-value');
    if (tabsAcceptedElem) tabsAcceptedElem.textContent = String(tabsAccepted);
}

// DataTablesの初期化
function initializeDataTable() {
    dataTable = $('#records-table').DataTable({
        data: recordsData,
        columns: [
            { data: '番号' },
            { data: '記録日' },
            { data: '日数' },
            { data: 'Fast requests will refresh in X day' },
            { data: 'Suggested Lines: X lines' },
            { data: 'Accepted Lines: X Lines' },
            { data: 'Tabs Accepted: X tabs' }
        ],
        order: [[0, 'desc']],
        language: {
            url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/ja.json'
        },
        responsive: true
    });
}

// グラフの作成
function createCharts() {
    const labels = recordsData.map(record => record.記録日);
    const suggestedLinesData = recordsData.map(record => record['Suggested Lines: X lines']);
    const acceptedLinesData = recordsData.map(record => record['Accepted Lines: X Lines']);
    const tabsAcceptedData = recordsData.map(record => record['Tabs Accepted: X tabs']);

    // Combined Lines グラフ
    const combinedLinesCtx = document.getElementById('combined-lines-chart').getContext('2d');
    combinedLinesChart = new Chart(combinedLinesCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Suggested Lines',
                data: suggestedLinesData,
                borderColor: '#007bff',
                backgroundColor: 'rgba(0, 123, 255, 0.1)',
                tension: 0.4,
                fill: true
            }, {
                label: 'Accepted Lines',
                data: acceptedLinesData,
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
                    text: 'Suggested Lines & Accepted Lines 推移'
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
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    }
                }
            },
            onClick: function(event, elements) {
                if (elements.length > 0) {
                    const element = elements[0];
                    const index = element.index;
                    const datasetIndex = element.datasetIndex;
                    const date = labels[index];
                    const value = element.parsed.y;
                    const label = element.dataset.label;

                    showGraphDetail(date, label, value);
                }
            }
        }
    });

    // Tabs Accepted グラフ
    const tabsAcceptedCtx = document.getElementById('tabs-accepted-chart').getContext('2d');
    tabsAcceptedChart = new Chart(tabsAcceptedCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Tabs Accepted',
                data: tabsAcceptedData,
                borderColor: '#ffc107',
                backgroundColor: 'rgba(255, 193, 7, 0.1)',
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
                    text: 'Tabs Accepted 推移'
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
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    }
                }
            },
            onClick: function(event, elements) {
                if (elements.length > 0) {
                    const element = elements[0];
                    const index = element.index;
                    const datasetIndex = element.datasetIndex;
                    const date = labels[index];
                    const value = element.parsed.y;
                    const label = element.dataset.label;

                    showGraphDetail(date, label, value);
                }
            }
        }
    });
}

// グラフ詳細情報表示
function showGraphDetail(date, label, value) {
    // 既存のモーダルがあれば削除
    const existingModal = document.getElementById('graph-detail-modal');
    if (existingModal) {
        existingModal.remove();
    }

    // モーダルを作成
    const modal = document.createElement('div');
    modal.id = 'graph-detail-modal';
    modal.className = 'modal fade';
    modal.setAttribute('tabindex', '-1');
    modal.innerHTML = `
        <div class="modal-dialog modal-sm">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">詳細情報</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p><strong>日付:</strong> ${date}</p>
                    <p><strong>項目:</strong> ${label}</p>
                    <p><strong>値:</strong> ${value.toLocaleString()}</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">閉じる</button>
                </div>
            </div>
        </div>
    `;

    // モーダルを表示
    document.body.appendChild(modal);
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();

    // モーダルが閉じられたら要素を削除
    modal.addEventListener('hidden.bs.modal', function() {
        modal.remove();
    });
}
