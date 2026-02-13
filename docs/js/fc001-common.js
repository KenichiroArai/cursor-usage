// グローバル変数（共通で使用されるもののみ）
let recordsData = [];
let usageData = [];
let includedUsageData = [];
let summaryData = [];
let usageDetailsData = [];
let usageEventsData = [];

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

// Excelファイル読み込み（共通処理）
async function loadExcelFile() {
    showLoading(true);
    try {
        // 現在のページのパスに基づいて相対パスを決定
        const currentPath = window.location.pathname;
        const isTopPage = currentPath.endsWith('index.html') || currentPath.endsWith('index.html') || currentPath.endsWith('/') || currentPath.endsWith('/Cursor');
        const excelPath = isTopPage ? 'record.xlsx' : '../record.xlsx';

        const response = await fetch(excelPath);
        const arrayBuffer = await response.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        recordsData = XLSX.utils.sheet_to_json(firstSheet);

        // データの整形
        recordsData = recordsData.map(record => ({
            ...record,
            記録日: formatDate(record.記録日),
            日数: parseInt(record.日数) || 0,
            'Fast requests will refresh in X day': parseInt(record['Fast requests will refresh in X day']) || 0,
            'Suggested Lines: X lines': parseInt(record['Suggested Lines: X lines']) || 0,
            'Accepted Lines: X Lines': parseInt(record['Accepted Lines: X Lines']) || 0,
            'Tabs Accepted: X tabs': parseInt(record['Tabs Accepted: X tabs']) || 0
        }));
    } catch (error) {
        throw new Error('Excelファイルの読み込みに失敗しました');
    } finally {
        showLoading(false);
    }
}



// 日付文字列をDateオブジェクトに変換（共通処理）
function parseDate(dateStr) {
    if (!dateStr) return null;

    // Excelのシリアル番号形式を処理（例：45878）
    const serialNumber = parseFloat(dateStr);
    if (!isNaN(serialNumber) && serialNumber > 1) {
        // Excelのシリアル番号は1900年1月1日からの日数
        // 25569は1970年1月1日のExcelシリアル番号
        const date = new Date((serialNumber - 25569) * 86400 * 1000);
        if (!isNaN(date.getTime())) {
            return date;
        }
    }

    // 2025/7/17 形式を処理（YYYY/M/D）
    const match = dateStr.toString().match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (match) {
        const year = parseInt(match[1]);
        const month = parseInt(match[2]) - 1; // 月は0ベース
        const day = parseInt(match[3]);
        const date = new Date(year, month, day);
        return date;
    }

    // 2025-7-17 形式を処理（YYYY-M-D）
    const match2 = dateStr.toString().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match2) {
        const year = parseInt(match2[1]);
        const month = parseInt(match2[2]) - 1;
        const day = parseInt(match2[3]);
        const date = new Date(year, month, day);
        return date;
    }

    // その他の形式も試行
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
        return date;
    }

    return null;
}




// CSV行を正しくパースする関数
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current);
    return result.map(item => item.replace(/^"|"$/g, '')); // 引用符を除去
}






// プログレスバーの更新
function updateProgressBar(elementId, percentage, text) {
    const progressBar = document.getElementById(elementId);
    const label = document.getElementById(`${elementId.replace('-progress', '-label')}`);
    const value = document.getElementById(`${elementId.replace('-progress', '-value')}`);

    if (!progressBar || !label || !value) return;

    // プログレスバーの更新
    progressBar.style.width = `${percentage}%`;
    progressBar.style.backgroundColor = getProgressColor(percentage);
    progressBar.textContent = `${percentage}%`;

    // ラベルと値の更新
    const [current, total] = text.split(' / ');
    label.textContent = '使用状況';
    value.textContent = `${current} / ${total}`;
}

// ユーティリティ関数
function formatDate(serial) {
    if (!serial) return '';
    const date = new Date((serial - 25569) * 86400 * 1000);
    return date.toLocaleDateString('ja-JP');
}

function getProgressColor(percentage) {
    if (percentage >= 80) return '#28a745'; // 緑
    if (percentage >= 60) return '#17a2b8'; // 青
    if (percentage >= 40) return '#ffc107'; // 黄
    return '#dc3545'; // 赤
}

function showLoading(show) {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.classList.toggle('d-none', !show);
    }
}

function showError(message) {
    const errorElement = document.getElementById('error-message');
    if (!errorElement) return;
    errorElement.textContent = message;
    errorElement.classList.remove('d-none');
}

// Xでシェアする関数
function shareOnX() {
    const pageTitle = document.title || 'Cursor使用記録';
    const pageUrl = window.location.href;
    const text = encodeURIComponent(`${pageTitle} ${pageUrl}`);
    const shareUrl = `https://x.com/intent/tweet?text=${text}`;
    window.open(shareUrl, '_blank', 'width=550,height=420');
}

// Xシェアボタンのイベントリスナーを設定
function setupXShareButton() {
    const xShareBtn = document.getElementById('x-share-btn');
    if (xShareBtn) {
        xShareBtn.addEventListener('click', function(e) {
            e.preventDefault();
            shareOnX();
        });
    }
}

// OGPメタタグを動的に更新する関数
function updateOGPMetaTags() {
    const currentUrl = window.location.href;

    // og:urlを更新（現在のURLに確実に設定）
    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) {
        ogUrl.setAttribute('content', currentUrl);
    } else {
        // 存在しない場合は作成
        ogUrl = document.createElement('meta');
        ogUrl.setAttribute('property', 'og:url');
        ogUrl.setAttribute('content', currentUrl);
        document.head.appendChild(ogUrl);
    }
}

// DOMContentLoaded時にXシェアボタンを設定
document.addEventListener('DOMContentLoaded', function() {
    // OGPメタタグを更新
    updateOGPMetaTags();

    // ヘッダーが動的に読み込まれる場合があるため、少し遅延させて設定
    setTimeout(setupXShareButton, 100);
    // MutationObserverでヘッダーコンテナの変更を監視
    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
        const observer = new MutationObserver(function(mutations) {
            setupXShareButton();
        });
        observer.observe(headerContainer, { childList: true, subtree: true });
    }
});
