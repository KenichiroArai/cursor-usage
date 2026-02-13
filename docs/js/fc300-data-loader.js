// データ読み込み系の共通ユーティリティ
// トップページおよび各詳細ページで共有するため、ロード専用の処理のみを定義する

// Usage Tokens（old形式）読み込み
async function loadUsageData() {
    try {
        const currentPath = window.location.pathname;
        const isTopPage =
            currentPath.endsWith('index.html') ||
            currentPath.endsWith('index.html') ||
            currentPath.endsWith('/') ||
            currentPath.endsWith('/Cursor');
        const csvPath = isTopPage
            ? 'tool/all-raw-events/data/old/usage-tokens.csv'
            : '../tool/all-raw-events/data/old/usage-tokens.csv';

        const response = await fetch(csvPath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        const lines = csvText.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
            throw new Error('CSVファイルが空またはヘッダーのみです');
        }

        const headers = lines[0].split(',').map(header => header.trim());
        const rawTokensData = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = parseCSVLine(line);
            if (values.length >= headers.length) {
                const record = {};
                headers.forEach((header, index) => {
                    record[header] = values[index] ? values[index].trim() : '';
                });
                rawTokensData.push(record);
            }
        }

        const processedTokensData = rawTokensData
            .map(record => ({
                ...record,
                Date: new Date(record.Date),
                'Input (w/ Cache Write)': parseInt(record['Input (w/ Cache Write)']) || 0,
                'Input (w/o Cache Write)': parseInt(record['Input (w/o Cache Write)']) || 0,
                'Cache Read': parseInt(record['Cache Read']) || 0,
                Output: parseInt(record.Output) || 0,
                'Total Tokens': parseInt(record['Total Tokens']) || 0,
                'Cost ($)': record['Cost ($)'] || 'Included'
            }))
            .filter(record => !isNaN(record.Date.getTime()));

        processedTokensData.sort((a, b) => a.Date - b.Date);

        await loadUsageDetailsData();
        usageData = mergeTokensData(processedTokensData, usageDetailsData);

        console.log('Merged tokens data loaded:', usageData.length, 'records');
    } catch (error) {
        console.error('CSVファイルの読み込みに失敗しました:', error);
        throw new Error('CSVファイルの読み込みに失敗しました: ' + error.message);
    }
}

// Usage Details CSV 読み込み
async function loadUsageDetailsData() {
    try {
        const currentPath = window.location.pathname;
        const isTopPage =
            currentPath.endsWith('index.html') ||
            currentPath.endsWith('index.html') ||
            currentPath.endsWith('/') ||
            currentPath.endsWith('/Cursor');
        const csvPath = isTopPage
            ? 'tool/all-raw-events/data/old/usage-details.csv'
            : '../tool/all-raw-events/data/old/usage-details.csv';

        const response = await fetch(csvPath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        const lines = csvText.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
            throw new Error('Usage Details CSVファイルが空またはヘッダーのみです');
        }

        const headers = lines[0].split(',').map(header => header.trim());
        usageDetailsData = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = parseCSVLine(line);
            if (values.length >= headers.length) {
                const record = {};
                headers.forEach((header, index) => {
                    record[header] = values[index] ? values[index].trim() : '';
                });
                usageDetailsData.push(record);
            }
        }

        usageDetailsData = usageDetailsData
            .map(record => ({
                ...record,
                Date: new Date(record.Date),
                Tokens: parseInt(record.Tokens) || 0,
                'Cost ($)': record['Cost ($)'] || 'Included'
            }))
            .filter(record => !isNaN(record.Date.getTime()));

        usageDetailsData.sort((a, b) => a.Date - b.Date);

        console.log('Usage Details data loaded:', usageDetailsData.length, 'records');
    } catch (error) {
        console.error('Usage Details CSVファイルの読み込みに失敗しました:', error);
        throw new Error('Usage Details CSVファイルの読み込みに失敗しました: ' + error.message);
    }
}

// トークンデータの統合
function mergeTokensData(tokensData, detailsData) {
    const mergedData = [];
    const detailsMap = new Map();

    detailsData.forEach(detail => {
        const key = detail.Date.toISOString();
        detailsMap.set(key, detail);
    });

    tokensData.forEach(token => {
        const key = token.Date.toISOString();
        const detail = detailsMap.get(key);

        if (detail) {
            mergedData.push({
                ...token,
                'Max Mode': detail['Max Mode'] || token['Max Mode'] || 'No',
                Kind: detail['Kind'] || token['Kind'] || 'Included in Pro'
            });
        } else {
            mergedData.push(token);
        }
    });

    detailsData.forEach(detail => {
        const key = detail.Date.toISOString();
        const existingToken = mergedData.find(token => token.Date.toISOString() === key);

        if (!existingToken) {
            mergedData.push({
                Date: detail.Date,
                User: detail.User || 'You',
                Kind: detail.Kind || 'Included in Pro',
                'Max Mode': detail['Max Mode'] || 'No',
                Model: detail.Model || 'auto',
                'Input (w/ Cache Write)': 0,
                'Input (w/o Cache Write)': 0,
                'Cache Read': 0,
                Output: 0,
                'Total Tokens': detail.Tokens || 0,
                'Cost ($)': detail['Cost ($)'] || 'Included'
            });
        }
    });

    mergedData.sort((a, b) => a.Date - b.Date);
    return mergedData;
}

// Usage Events CSV 読み込み
async function loadUsageEventsData() {
    showLoading(true);
    try {
        const currentPath = window.location.pathname;
        const isTopPage =
            currentPath.endsWith('index.html') ||
            currentPath.endsWith('index.html') ||
            currentPath.endsWith('/') ||
            currentPath.endsWith('/Cursor');
        const csvPath = isTopPage
            ? 'tool/all-raw-events/data/usage-events.csv'
            : '../tool/all-raw-events/data/usage-events.csv';

        console.log('Loading Usage Events CSV file from:', csvPath);
        console.log('Current path:', currentPath);

        const response = await fetch(csvPath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const csvText = await response.text();
        usageEventsData = parseUsageEventsCSV(csvText);

        console.log('Loaded usage events data:', usageEventsData.length, 'records');
        console.log('Usage events data sample:', usageEventsData.slice(0, 3));
    } catch (error) {
        console.error('Usage Events CSVファイルの読み込みエラー:', error);
        throw new Error('Usage Events CSVファイルの読み込みに失敗しました: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Included Usage Summary シート読み込み
async function loadIncludedUsageData() {
    showLoading(true);
    try {
        const currentPath = window.location.pathname;
        const isTopPage =
            currentPath.endsWith('index.html') ||
            currentPath.endsWith('index.html') ||
            currentPath.endsWith('/') ||
            currentPath.endsWith('/Cursor');
        const excelPath = isTopPage ? 'record.xlsx' : '../record.xlsx';

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

        let sheetName = workbook.SheetNames.find(name => name === 'Included Usage Summary');

        if (!sheetName) {
            sheetName = workbook.SheetNames.find(name =>
                name.includes('Included Usage Summary') ||
                name.includes('Included') ||
                name.includes('Usage') ||
                name.toLowerCase().includes('included') ||
                name.toLowerCase().includes('usage')
            );
        }

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

        includedUsageData = processIncludedUsageData(rawData);

        console.log('Included Usage data loaded:', includedUsageData.length, 'records');
    } catch (error) {
        console.error('Included Usage Summaryシートの読み込みに失敗しました:', error);
        throw new Error('Included Usage Summaryシートの読み込みに失敗しました: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Included Usage Summary データの処理
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

        const input = inputWithCache + inputWithoutCache;

        if (dateCell && dateCell.toString().trim() && !dateCell.toString().includes('Total')) {
            const dateStr = dateCell.toString().trim();
            const date = parseDate(dateStr);
            if (date) {
                currentDate = date;
                const newMonth = date.getMonth();

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

            monthCleared = false;
        }
    }

    processedData.sort((a, b) => {
        if (a.date.getTime() === b.date.getTime()) {
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

// Summary シート読み込み
async function loadSummaryData() {
    showLoading(true);
    try {
        const currentPath = window.location.pathname;
        const isTopPage =
            currentPath.endsWith('index.html') ||
            currentPath.endsWith('index.html') ||
            currentPath.endsWith('/') ||
            currentPath.endsWith('/Cursor');
        const excelPath = isTopPage ? 'record.xlsx' : '../record.xlsx';

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

        let sheetName = workbook.SheetNames.find(name => name === 'Summary');

        if (!sheetName) {
            sheetName = workbook.SheetNames.find(name =>
                name.includes('Summary') || name.toLowerCase().includes('summary')
            );
        }

        if (!sheetName && workbook.SheetNames.length > 0) {
            console.warn('Summaryシートが見つからないため、最初のシートを使用します:', workbook.SheetNames[0]);
            sheetName = workbook.SheetNames[0];
        }

        if (!sheetName) {
            console.error('Available sheets:', workbook.SheetNames);
            throw new Error('Summaryシートが見つかりません。利用可能なシート: ' + workbook.SheetNames.join(', '));
        }

        console.log('Found sheet:', sheetName);

        const sheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        console.log('Raw data length:', rawData.length);
        console.log('First few rows:', rawData.slice(0, 5));

        summaryData = processSummaryData(rawData);

        console.log('Summary data loaded:', summaryData.length, 'records');
        console.log('Summary data sample:', summaryData.slice(0, 3));
    } catch (error) {
        console.error('Summaryシートの読み込みに失敗しました:', error);
        throw new Error('Summaryシートの読み込みに失敗しました: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Summary データの処理
function processSummaryData(rawData) {
    console.log('Processing summary data, raw data length:', rawData.length);
    console.log('Raw data sample:', rawData.slice(0, 10));

    const processedData = [];

    for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length < 2) {
            console.log(`Skipping row ${i}: insufficient data`, row);
            continue;
        }

        const dateStr = row[0];
        const model = row[1];
        const cacheRead = row[2];
        const cacheWrite = row[3];
        const input = row[4];
        const output = row[5];
        const total = row[6];
        const apiCost = row[7];
        const costToYou = row[8];

        let date;
        if (dateStr instanceof Date) {
            date = dateStr;
        } else if (typeof dateStr === 'string') {
            const parsedDate = new Date(dateStr);
            if (isNaN(parsedDate.getTime())) {
                console.log(`Skipping row ${i}: invalid date`, dateStr);
                continue;
            }
            date = parsedDate;
        } else if (typeof dateStr === 'number') {
            date = new Date((dateStr - 25569) * 86400 * 1000);
        } else {
            console.log(`Skipping row ${i}: invalid date type`, dateStr);
            continue;
        }

        const processedRecord = {
            date: date,
            dateStr: date.toLocaleDateString('ja-JP'),
            model: model || '',
            cacheRead: parseFloat(cacheRead) || 0,
            cacheWrite: parseFloat(cacheWrite) || 0,
            input: parseFloat(input) || 0,
            output: parseFloat(output) || 0,
            total: parseFloat(total) || 0,
            apiCost: apiCost || '$0',
            costToYou: costToYou || '$0'
        };

        processedData.push(processedRecord);
    }

    console.log('Processed summary data:', processedData.length, 'records');
    return processedData;
}

// Usage Events CSV のパース
function parseUsageEventsCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
        console.warn('Usage Events CSVファイルが空またはヘッダーのみです');
        return [];
    }

    const headers = parseCSVLine(lines[0]);
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === headers.length) {
            const row = {};
            headers.forEach((header, index) => {
                const headerName = header.trim();
                const value = values[index].trim();
                row[headerName] = value;
            });
            data.push(row);
        }
    }

    // データの整形（DateをDateオブジェクトに変換、数値フィールドを数値に変換）
    const processedData = data.map(record => ({
        ...record,
        Date: new Date(record.Date),
        'Input (w/ Cache Write)': parseInt(record['Input (w/ Cache Write)']) || 0,
        'Input (w/o Cache Write)': parseInt(record['Input (w/o Cache Write)']) || 0,
        'Cache Read': parseInt(record['Cache Read']) || 0,
        'Output Tokens': parseInt(record['Output Tokens']) || 0,
        'Total Tokens': parseInt(record['Total Tokens']) || 0,
        'Cost': record['Cost'] || 'Included'
    })).filter(record => !isNaN(record.Date.getTime())); // 無効な日付を除外

    // 日付順にソート
    processedData.sort((a, b) => a.Date - b.Date);

    console.log('Parsed usage events data:', processedData.length, 'records');
    return processedData;
}

