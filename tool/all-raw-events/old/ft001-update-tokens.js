const fs = require('fs');
const path = require('path');

/**
 * CSVファイルを読み込む
 * @param {string} filePath - CSVファイルのパス
 * @returns {Array} CSVデータの配列
 */
function readCSV(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',');
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length === headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header.trim()] = values[index] ? values[index].trim().replace(/^"|"$/g, '') : '';
                });
                data.push(row);
            }
        }

        return data;
    } catch (error) {
        console.error(`CSVファイルの読み込みエラー: ${filePath}`, error.message);
        return [];
    }
}

/**
 * CSV行を解析する（カンマ区切りで、ダブルクォート内のカンマは無視）
 * @param {string} line - CSV行
 * @returns {Array} 解析された値の配列
 */
function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }

    values.push(current);
    return values;
}

/**
 * 新しいCSV形式のデータを古い形式に変換する
 * @param {Object} row - 新しい形式のデータ行
 * @returns {Object} 古い形式のデータ行
 */
function convertNewFormatToOld(row) {
    // 新しい形式と古い形式が同じなので、変換は不要
    return row;
}

/**
 * 古いCSV形式のデータを新しい形式に変換する
 * @param {Object} row - 古い形式のデータ行
 * @returns {Object} 新しい形式のデータ行
 */
function convertOldFormatToNew(row) {
    // 新しい形式と古い形式が同じなので、変換は不要
    return row;
}

/**
 * データを日付順にソートする（最新順）
 * @param {Array} data - データ配列
 * @returns {Array} ソートされたデータ配列
 */
function sortByDate(data) {
    return data.sort((a, b) => {
        const dateA = new Date(a['Date'] || '');
        const dateB = new Date(b['Date'] || '');
        return dateB - dateA; // 最新順
    });
}

/**
 * 重複を排除する（Date, User, Model, Total Tokensが同じ場合は重複とみなす）
 * @param {Array} data - データ配列
 * @returns {Array} 重複排除されたデータ配列
 */
function removeDuplicates(data) {
    const seen = new Set();
    const unique = [];

    for (const row of data) {
        const key = `${row['Date']}-${row['User']}-${row['Model']}-${row['Total Tokens']}`;
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(row);
        }
    }

    return unique;
}

/**
 * CSVデータをファイルに書き込む
 * @param {string} filePath - 出力ファイルパス
 * @param {Array} data - データ配列
 * @param {Array} headers - ヘッダー配列
 */
function writeCSV(filePath, data, headers) {
    try {
        const csvContent = [
            headers.join(','),
            ...data.map(row =>
                headers.map(header => {
                    const value = row[header] || '';
                    return value.includes(',') ? `"${value}"` : value;
                }).join(',')
            )
        ].join('\n');

        fs.writeFileSync(filePath, csvContent, 'utf8');
        console.log(`CSVファイルを更新しました: ${filePath}`);
    } catch (error) {
        console.error(`CSVファイルの書き込みエラー: ${filePath}`, error.message);
    }
}

/**
 * Inputフォルダから最新の日付のusage-tokens-*.csvファイルを検索する
 * @param {string} inputDir - Inputフォルダのパス
 * @returns {string|null} 最新の日付のCSVファイルのパス、見つからない場合はnull
 */
function findLatestInputCSVFile(inputDir) {
    try {
        const files = fs.readdirSync(inputDir);
        const csvFiles = files
            .filter(file => file.startsWith('usage-tokens-') && file.endsWith('.csv'))
            .map(file => {
                const dateMatch = file.match(/usage-tokens-(\d{4}-\d{2}-\d{2})/);
                if (dateMatch) {
                    return {
                        file: file,
                        path: path.join(inputDir, file),
                        date: new Date(dateMatch[1])
                    };
                }
                return null;
            })
            .filter(item => item !== null)
            .sort((a, b) => b.date - a.date); // 最新順でソート

        if (csvFiles.length > 0) {
            const latestFile = csvFiles[0];
            console.log(`最新のCSVファイルを発見: ${latestFile.file} (日付: ${latestFile.date.toISOString().split('T')[0]})`);
            return latestFile.path;
        } else {
            console.log('InputフォルダにCSVファイルが見つかりませんでした');
            return null;
        }
    } catch (error) {
        console.error(`Inputフォルダの読み込みエラー: ${inputDir}`, error.message);
        return null;
    }
}

/**
 * データの先頭を比較して新しいデータかどうかを判定する
 * @param {Array} existingData - 既存のデータ配列
 * @param {Array} newData - 新しいデータ配列
 * @returns {boolean} 新しいデータの場合true、既存データと同じまたは古い場合はfalse
 */
function isNewData(existingData, newData) {
    if (existingData.length === 0) {
        console.log('既存データがないため、新しいデータとして扱います');
        return true;
    }

    if (newData.length === 0) {
        console.log('新しいデータが空のため、処理をスキップします');
        return false;
    }

    // 既存データと新しいデータを日付順でソート
    const sortedExisting = sortByDate([...existingData]);
    const sortedNew = sortByDate([...newData]);

    // 既存データの最新（先頭）と新しいデータの最新（先頭）を比較
    const latestExisting = sortedExisting[0];
    const latestNew = sortedNew[0];

    if (!latestExisting || !latestNew) {
        console.log('データの比較に失敗しました');
        return true; // エラーの場合は安全のため新しいデータとして扱う
    }

    const existingDate = new Date(latestExisting['Date'] || '');
    const newDate = new Date(latestNew['Date'] || '');

    console.log(`既存データの最新日付: ${existingDate.toISOString().split('T')[0]}`);
    console.log(`新しいデータの最新日付: ${newDate.toISOString().split('T')[0]}`);

    if (newDate > existingDate) {
        console.log('新しいデータが既存データより新しいため、取り込みます');
        return true;
    } else if (newDate.getTime() === existingDate.getTime()) {
        // 日付が同じ場合は、より詳細な比較を行う
        const existingKey = `${latestExisting['Date']}-${latestExisting['User']}-${latestExisting['Model']}-${latestExisting['Total Tokens']}`;
        const newKey = `${latestNew['Date']}-${latestNew['User']}-${latestNew['Model']}-${latestNew['Total Tokens']}`;

        if (existingKey !== newKey) {
            console.log('日付は同じですが、データ内容が異なるため、取り込みます');
            return true;
        } else {
            console.log('既存データと同じ内容のため、取り込みをスキップします');
            return false;
        }
    } else {
        console.log('新しいデータが既存データより古いため、取り込みをスキップします');
        return false;
    }
}

/**
 * メイン処理
 */
function main() {
    const inputDir = path.join(__dirname, 'Input');
    const dataDir = path.join(__dirname, 'data');
    const outputFile = path.join(dataDir, 'usage-tokens.csv');

    console.log('CSVファイルの更新を開始します...');

    // 既存のデータを読み込む
    let existingData = [];
    if (fs.existsSync(outputFile)) {
        existingData = readCSV(outputFile);
        console.log(`既存のデータを読み込みました: ${existingData.length}件`);
    }

    // Inputフォルダから最新のCSVファイルを検索
    const inputFile = findLatestInputCSVFile(inputDir);
    if (inputFile) {
        console.log(`最新のCSVファイルを処理中: ${path.basename(inputFile)}`);
        const inputData = readCSV(inputFile);

                if (inputData.length > 0) {
            // 先頭データを比較して新しいデータかどうかを判定
            if (isNewData(existingData, inputData)) {
                // 既存のデータと新しいデータを結合
                let allData = [...existingData, ...inputData];
                console.log(`  ${inputData.length}件のデータを追加しました`);

                // 重複を排除
                const uniqueData = removeDuplicates(allData);
                console.log(`重複排除後: ${uniqueData.length}件`);

                // 日付順にソート（最新順）
                const sortedData = sortByDate(uniqueData);
                console.log(`日付順にソートしました（最新順）`);

                // ヘッダーを決定（既存のデータのヘッダーを使用）
                const headers = existingData.length > 0
                    ? Object.keys(existingData[0])
                    : ['Date', 'User', 'Kind', 'Model', 'Input (w/ Cache Write)', 'Input (w/o Cache Write)', 'Cache Read', 'Output', 'Total Tokens', 'Cost ($)'];

                // CSVファイルに書き込み
                writeCSV(outputFile, sortedData, headers);

                console.log('CSVファイルの更新が完了しました！');
                console.log(`最終的なデータ件数: ${sortedData.length}件`);
            } else {
                console.log('新しいデータではないため、取り込みをスキップしました');
            }
        } else {
            console.log('最新のCSVファイルにデータが含まれていませんでした');
        }
    } else {
        console.log('処理するCSVファイルが見つかりませんでした');
    }
}

// スクリプトが直接実行された場合のみmain()を実行
if (require.main === module) {
    main();
}

module.exports = {
    readCSV,
    parseCSVLine,
    convertNewFormatToOld,
    convertOldFormatToNew,
    sortByDate,
    removeDuplicates,
    writeCSV,
    findLatestInputCSVFile,
    isNewData,
    main
};
